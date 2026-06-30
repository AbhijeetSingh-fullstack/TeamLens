import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useGlobalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';
import { updateTaskAnalysis } from '../../utils/analytics';

const CATEGORIES = ['Update', 'New Project', 'Feature', 'Bug', 'Review', 'Revision'];

export default function ManagerTasks() {
  const { teamCode } = useGlobalSearchParams<{ teamCode: string }>();
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalVisible, setModalVisible] = useState(false);
  const [isMemberModalVisible, setMemberModalVisible] = useState(false);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'Update',
    priority: 'medium',
  });
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 86400000));
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Assignment State
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [instructionsMap, setInstructionsMap] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);

  const fetchTasksAndMembers = async () => {
    if (!teamCode) return;
    try {
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('team_code', teamCode)
        .single();

      if (!teamData) return;

      // Fetch Members
      const { data: membersData } = await supabase
        .from('team_members')
        .select('*, roles(role_name)')
        .eq('team_id', teamData.id)
        .eq('status', 'approved');

      if (membersData) setMembers(membersData);

      // Fetch Tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select(`
          *,
          task_assignments(
            id,
            member_id,
            status,
            submission_notes,
            submission_image_url,
            revisions_count,
            team_members(member_name, roles(role_name))
          )
        `)
        .eq('team_id', teamData.id)
        .order('created_at', { ascending: false });

      if (tasksData) {
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        const filtered = tasksData.filter(t => {
          if (t.status !== 'completed') return true;
          if (!t.completed_at) return true;
          return new Date(t.completed_at).getTime() > twentyFourHoursAgo;
        });
        setTasks(filtered);
      }
    } catch (e) {
      console.log('Error fetching tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksAndMembers();
    const interval = setInterval(fetchTasksAndMembers, 5000);
    return () => clearInterval(interval);
  }, [teamCode]);

  const addMember = (memberId: string) => {
    if (!selectedMembers.includes(memberId)) {
      setSelectedMembers([...selectedMembers, memberId]);
    }
    setMemberModalVisible(false);
  };

  const removeMember = (memberId: string) => {
    setSelectedMembers(selectedMembers.filter(id => id !== memberId));
    const newInstructions = { ...instructionsMap };
    delete newInstructions[memberId];
    setInstructionsMap(newInstructions);
  };

  const handleCreateTask = async () => {
    if (!newTask.title || selectedMembers.length === 0) {
      Alert.alert("Missing Info", "Please provide a task title and select at least one team member.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (!teamCode) throw new Error("No team found");

      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('team_code', teamCode)
        .single();

      if (!teamData) throw new Error("No team found");

      // 1. Create the base task
      const { data: createdTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          team_id: teamData.id,
          title: newTask.title,
          description: newTask.description,
          category: newTask.category,
          priority: newTask.priority,
          due_date: dueDate.toISOString(),
          status: 'open',
          created_by: teamData.created_by
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // 2. Create task assignments for each selected member
      const assignments = selectedMembers.map(memberId => ({
        task_id: createdTask.id,
        member_id: memberId,
        specific_instructions: instructionsMap[memberId] || '',
        status: 'open'
      }));

      const { error: assignError } = await supabase
        .from('task_assignments')
        .insert(assignments);

      if (assignError) throw assignError;

      // 3. Update analytics for each assigned member
      for (const memberId of selectedMembers) {
        await updateTaskAnalysis(teamData.id, memberId, { assigned: true });
      }

      // Reset and close
      setModalVisible(false);
      setNewTask({ title: '', description: '', category: 'Update', priority: 'Medium' });
      setSelectedMembers([]);
      setInstructionsMap({});
      fetchTasksAndMembers();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestRevision = async (assignmentId: string, currentRevisions: number, taskId: string, memberId: string, teamId: string) => {
    try {
      // Increment revisions_count and set status to revision
      const { error } = await supabase
        .from('task_assignments')
        .update({
          status: 'revision',
          revisions_count: currentRevisions + 1
        })
        .eq('id', assignmentId);

      if (error) throw error;

      // Also update parent task to open so it goes back to active
      await supabase.from('tasks').update({ status: 'open', completed_at: null }).eq('id', taskId);

      // Update analytics (-1 pt per revision, count incremented upon completion)
      await updateTaskAnalysis(teamId, memberId, { points: -1 });

      setDetailModalVisible(false);
      fetchTasksAndMembers();
      Alert.alert("Revision Requested", "Task has been sent back to the employee.");
    } catch (e: any) {
      Alert.alert("Failed", "Could not request revision: " + e.message);
    }
  };

  const viewDetails = (task: any) => {
    setSelectedTask(task);
    setDetailModalVisible(true);
  };

  const filteredTasks = tasks.filter(t => {
    if (!t.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    // Hide if completed > 1 hour ago
    if (t.status === 'completed' && t.completed_at) {
      const completedTime = new Date(t.completed_at).getTime();
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      if (completedTime < oneHourAgo) {
        return false;
      }
    }
    return true;
  });

  const renderTask = ({ item }: { item: any }) => {
    const isOverdue = new Date(item.due_date) < new Date() && item.status !== 'completed';

    return (
      <TouchableOpacity 
        onPress={() => viewDetails(item)}
        className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-100"
      >
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-1">
              <View className="bg-indigo-50 px-2 py-0.5 rounded text-center">
                <Text className="text-[10px] font-bold text-indigo-500 uppercase">{item.category || 'Task'}</Text>
              </View>
              <View className={`px-2 py-0.5 rounded text-center ${item.priority === 'high' ? 'bg-red-50' : 'bg-orange-50'}`}>
                <Text className={`text-[10px] font-bold uppercase ${item.priority === 'high' ? 'text-red-500' : 'text-orange-500'}`}>{item.priority}</Text>
              </View>
            </View>
            <Text className="text-slate-800 font-bold text-lg">{item.title}</Text>
          </View>
          <View className={`px-2 py-1 rounded-lg items-center ${item.status === 'completed' ? 'bg-emerald-50' : isOverdue ? 'bg-red-50' : 'bg-slate-50'}`}>
            <Feather name={item.status === 'completed' ? 'check-circle' : isOverdue ? 'alert-circle' : 'clock'} size={14} color={item.status === 'completed' ? '#10b981' : isOverdue ? '#ef4444' : '#64748b'} />
            <Text className={`text-[10px] font-bold mt-1 ${item.status === 'completed' ? 'text-emerald-600' : isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
              {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        </View>

        {item.description ? (
          <Text className="text-slate-500 text-sm mb-4" numberOfLines={2}>{item.description}</Text>
        ) : null}

        <View className="bg-slate-50 rounded-xl p-3">
          <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Assigned To</Text>
          {item.task_assignments?.map((assign: any, idx: number) => (
            <View key={idx} className="flex-row items-center gap-2 mb-1">
              <View className={`w-6 h-6 rounded-full ${assign.status === 'completed' ? 'bg-emerald-100' : assign.status === 'revision' ? 'bg-red-100' : 'bg-indigo-100'} items-center justify-center`}>
                <Feather name={assign.status === 'revision' ? 'refresh-ccw' : 'user'} size={10} color={assign.status === 'completed' ? '#10b981' : assign.status === 'revision' ? '#ef4444' : '#4f46e5'} />
              </View>
              <Text className={`text-sm font-semibold ${assign.status === 'completed' ? 'text-emerald-700' : assign.status === 'revision' ? 'text-red-600' : 'text-slate-700'}`}>{assign.team_members?.member_name}</Text>
              <Text className="text-slate-400 text-xs">({assign.team_members?.roles?.role_name})</Text>
              {assign.status === 'completed' && <Feather name="check-circle" size={12} color="#10b981" className="ml-auto" />}
              {assign.status === 'revision' && <Text className="ml-auto text-[10px] font-bold text-red-500 uppercase">Revision Requested</Text>}
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  const getUnselectedMembers = () => members
    .filter(m => !selectedMembers.includes(m.id))
    .sort((a, b) => a.member_name.localeCompare(b.member_name));

  return (
    <SafeAreaView className="flex-1 bg-[#F9F9FB]">
      <View className="px-5 py-4 bg-white border-b border-slate-100 z-10">
        <Text className="text-2xl font-extrabold text-slate-800 mb-4">Tasks</Text>
        <View className="flex-row items-center bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            placeholder="Search tasks..."
            className="flex-1 ml-3 text-slate-800 font-medium"
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={item => item.id}
          renderItem={renderTask}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="items-center justify-center mt-10">
              <Feather name="check-square" size={40} color="#cbd5e1" className="mb-4" />
              <Text className="text-slate-400 font-medium text-center">No tasks found.{'\n'}Tap the + button to create one.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="w-14 h-14 bg-indigo-600 rounded-full items-center justify-center shadow-lg elevation-5"
        style={{ position: 'absolute', bottom: 100, right: 20, zIndex: 50, shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
      >
        <Feather name="plus" size={24} color="white" />
      </TouchableOpacity>

      <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
          <View className="px-5 py-4 border-b border-slate-100 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-slate-800">Create New Task</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} className="w-8 h-8 items-center justify-center bg-slate-100 rounded-full">
              <Feather name="x" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-5">
            <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Task Title</Text>
            <TextInput
              placeholder="E.g., Implement new onboarding flow"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-800 font-medium"
              value={newTask.title}
              onChangeText={t => setNewTask({ ...newTask, title: t })}
            />

            <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">General Description (Optional)</Text>
            <TextInput
              placeholder="High level overview of this task..."
              multiline
              numberOfLines={3}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-800 min-h-[80px]"
              value={newTask.description}
              onChangeText={t => setNewTask({ ...newTask, description: t })}
              style={{ textAlignVertical: 'top' }}
            />

            <View className="flex-row gap-4 mb-6">
              <View className="flex-1">
                <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setNewTask({ ...newTask, category: cat })}
                      className={`mr-2 px-3 py-1.5 rounded-lg border ${newTask.category === cat ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}
                    >
                      <Text className={`text-xs font-bold ${newTask.category === cat ? 'text-indigo-600' : 'text-slate-500'}`}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Deadline</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
              >
                <Text className="text-slate-800 font-medium">{dueDate.toLocaleDateString()}</Text>
                <Feather name="calendar" size={16} color="#4f46e5" />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dueDate}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onValueChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) setDueDate(selectedDate);
                  }}
                  onDismiss={() => setShowDatePicker(false)}
                />
              )}
            </View>

            {/* Assignments */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-slate-800 font-extrabold text-lg">Assign Employees</Text>
              <TouchableOpacity
                onPress={() => setMemberModalVisible(true)}
                className="flex-row items-center bg-indigo-50 px-3 py-1.5 rounded-full"
              >
                <Feather name="plus" size={14} color="#4f46e5" />
                <Text className="text-indigo-600 font-bold text-xs ml-1">Add Member</Text>
              </TouchableOpacity>
            </View>

            {selectedMembers.length === 0 ? (
              <View className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-5 items-center justify-center mb-6">
                <Feather name="users" size={24} color="#94a3b8" className="mb-2" />
                <Text className="text-slate-400 font-medium text-sm text-center">No employees assigned yet.{'\n'}Click 'Add Member' to start assigning.</Text>
              </View>
            ) : (
              selectedMembers.map(memberId => {
                const member = members.find(m => m.id === memberId);
                if (!member) return null;

                return (
                  <View key={member.id} className="mb-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <View className="p-3 bg-slate-50 flex-row items-center justify-between border-b border-slate-200">
                      <View className="flex-row items-center gap-2">
                        <View className="w-8 h-8 rounded-full bg-indigo-100 items-center justify-center">
                          <Feather name="user" size={14} color="#4f46e5" />
                        </View>
                        <View>
                          <Text className="text-slate-800 font-bold text-sm">{member.member_name}</Text>
                          <Text className="text-slate-500 text-[10px] uppercase tracking-wider">{member.roles?.role_name}</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => removeMember(member.id)} className="w-8 h-8 items-center justify-center rounded-full bg-red-50">
                        <Feather name="trash-2" size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>

                    <View className="p-3">
                      <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-wider mb-2">Specific Instructions</Text>
                      <TextInput
                        placeholder={`What should ${member.member_name.split(' ')[0]} do?`}
                        multiline
                        className="bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-800"
                        value={instructionsMap[member.id] || ''}
                        onChangeText={t => setInstructionsMap({ ...instructionsMap, [member.id]: t })}
                        style={{ textAlignVertical: 'top', minHeight: 80 }}
                      />
                    </View>
                  </View>
                );
              })
            )}

            <TouchableOpacity
              onPress={handleCreateTask}
              disabled={isSubmitting || selectedMembers.length === 0}
              className={`mt-6 mb-10 py-4 rounded-xl items-center shadow-sm ${isSubmitting || selectedMembers.length === 0 ? 'bg-indigo-300' : 'bg-indigo-600'}`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Assign Task</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Select Member Modal */}
      <Modal visible={isMemberModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl min-h-[50%] max-h-[80%]">
            <View className="p-5 border-b border-slate-100 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-slate-800">Select Employee</Text>
              <TouchableOpacity onPress={() => setMemberModalVisible(false)} className="w-8 h-8 items-center justify-center bg-slate-100 rounded-full">
                <Feather name="x" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView className="p-5">
              {getUnselectedMembers().length === 0 ? (
                <Text className="text-slate-500 text-center mt-5">All team members have been assigned.</Text>
              ) : (
                getUnselectedMembers().map(member => (
                  <TouchableOpacity
                    key={member.id}
                    onPress={() => addMember(member.id)}
                    className="flex-row items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl mb-3"
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center">
                        <Feather name="user" size={18} color="#4f46e5" />
                      </View>
                      <View>
                        <Text className="text-slate-800 font-bold">{member.member_name}</Text>
                        <Text className="text-slate-500 text-xs">{member.roles?.role_name}</Text>
                      </View>
                    </View>
                    <Feather name="plus-circle" size={20} color="#4f46e5" />
                  </TouchableOpacity>
                ))
              )}
              <View className="h-10" />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Task Detail Modal */}
      <Modal visible={isDetailModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-white pt-12">
          <View className="px-5 py-4 border-b border-slate-100 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-slate-800">Task Details</Text>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)} className="w-8 h-8 items-center justify-center bg-slate-100 rounded-full">
              <Feather name="x" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          {selectedTask && (
            <ScrollView className="flex-1 p-5">
              <View className="mb-6">
                <Text className="text-slate-800 font-bold text-2xl mb-2">{selectedTask.title}</Text>
                {selectedTask.description ? (
                  <Text className="text-slate-600 text-base leading-6">{selectedTask.description}</Text>
                ) : null}
              </View>

              <Text className="text-slate-800 font-bold text-lg mb-4">Team Submissions</Text>

              {selectedTask.task_assignments?.map((assign: any, idx: number) => (
                <View key={idx} className="bg-slate-50 rounded-2xl p-5 mb-4 border border-slate-200">
                  <View className="flex-row items-center gap-3 mb-4 border-b border-slate-200 pb-3">
                    <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center">
                      <Feather name="user" size={18} color="#059669" />
                    </View>
                    <View>
                      <Text className="text-slate-800 font-bold text-base">{assign.team_members?.member_name}</Text>
                      <Text className="text-slate-500 text-xs uppercase tracking-wider">{assign.team_members?.roles?.role_name}</Text>
                    </View>
                    {assign.status === 'completed' && (
                      <Feather name="check-circle" size={20} color="#10b981" className="ml-auto" />
                    )}
                  </View>

                  {assign.status === 'completed' ? (
                    <>
                      {assign.submission_notes ? (
                        <View className="mb-4">
                          <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-wider mb-2">Submission Notes</Text>
                          <Text className="text-slate-700 italic">"{assign.submission_notes}"</Text>
                        </View>
                      ) : (
                        <Text className="text-slate-400 italic mb-4">No notes provided.</Text>
                      )}

                      {assign.submission_image_url && (
                        <View className="mb-4">
                          <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-wider mb-2">Attached Evidence</Text>
                          <Image
                            source={{ uri: assign.submission_image_url }}
                            className="w-full h-48 rounded-xl bg-slate-200"
                            resizeMode="cover"
                          />
                        </View>
                      )}

                      <TouchableOpacity
                        onPress={() => handleRequestRevision(assign.id, assign.revisions_count || 0, selectedTask.id, assign.member_id, selectedTask.team_id)}
                        className="mt-2 bg-red-50 border border-red-100 py-3 rounded-xl items-center flex-row justify-center gap-2"
                      >
                        <Feather name="refresh-ccw" size={16} color="#ef4444" />
                        <Text className="text-red-500 font-bold">Request Revision (-1 pt)</Text>
                      </TouchableOpacity>
                    </>
                  ) : assign.status === 'revision' ? (
                    <View className="bg-red-50 p-4 rounded-xl border border-red-100 flex-row items-center gap-3">
                      <Feather name="alert-circle" size={20} color="#ef4444" />
                      <Text className="text-red-600 font-medium flex-1">Revision has been requested for this task.</Text>
                    </View>
                  ) : (
                    <Text className="text-slate-400 italic">Task is currently in progress...</Text>
                  )}
                </View>
              ))}
              <View className="h-10" />
            </ScrollView>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
