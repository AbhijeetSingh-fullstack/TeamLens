import { Feather } from '@expo/vector-icons';
import { useGlobalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';
import { updateTaskAnalysis } from '../../utils/analytics';

export default function ManagerProjects() {
  const { teamCode } = useGlobalSearchParams<{ teamCode: string }>();
  const [archivedTasks, setArchivedTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // For viewing submissions
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isModalVisible, setModalVisible] = useState(false);

  const [isRevisionModalVisible, setRevisionModalVisible] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [revisionData, setRevisionData] = useState<any>(null);

  const openRevisionModal = (assign: any) => {
    setRevisionData({
      assignmentId: assign.id,
      currentRevisions: assign.revisions_count || 0,
      taskId: selectedTask.id,
      memberId: assign.member_id,
      teamId: selectedTask.team_id,
      currentInstructions: assign.specific_instructions || ''
    });
    setRevisionNotes('');
    setRevisionModalVisible(true);
  };

  const handleRequestRevision = async () => {
    if (!revisionData || !revisionNotes.trim()) {
      alert("Please enter revision notes.");
      return;
    }

    try {
      const { assignmentId, currentRevisions, taskId, memberId, teamId, currentInstructions } = revisionData;
      
      const newInstructions = currentInstructions + '\n\n--- Revision Notes ---\n' + revisionNotes;

      const { error } = await supabase
        .from('task_assignments')
        .update({
          status: 'revision',
          revisions_count: currentRevisions + 1,
          specific_instructions: newInstructions,
          completed_at: null,
          submission_notes: null,
          submission_image_url: null
        })
        .eq('id', assignmentId);

      if (error) throw error;

      // Also update parent task to open so it goes back to active tasks
      await supabase.from('tasks').update({ status: 'open', completed_at: null }).eq('id', taskId);

      // Update analytics (-1 points per revision, but count is incremented upon completion)
      await updateTaskAnalysis(teamId, memberId, { points: -1 });

      setRevisionModalVisible(false);
      setModalVisible(false);
      fetchArchivedTasks();
      alert("Revision requested! Task sent back to employee.");
    } catch (e: any) {
      alert("Failed to request revision: " + e.message);
    }
  };

  const fetchArchivedTasks = async () => {
    if (!teamCode) return;
    try {
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('team_code', teamCode)
        .single();

      if (!teamData) return;

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
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (tasksData) {
        setArchivedTasks(tasksData);
      }
    } catch (e) {
      console.log('Error fetching archived tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedTasks();
    const interval = setInterval(fetchArchivedTasks, 10000); // 10s refresh
    return () => clearInterval(interval);
  }, [teamCode]);

  const viewDetails = (task: any) => {
    setSelectedTask(task);
    setModalVisible(true);
  };

  const renderArchivedTask = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        onPress={() => viewDetails(item)}
        className="bg-white p-5 rounded-2xl mb-4 shadow-sm border border-slate-100 flex-row items-center justify-between"
      >
        <View className="flex-1 pr-4">
          <View className="flex-row items-center gap-2 mb-2">
            <View className="bg-indigo-50 px-2 py-0.5 rounded text-center">
              <Text className="text-[10px] font-bold text-indigo-500 uppercase">{item.category || 'Task'}</Text>
            </View>
            <View className="bg-emerald-50 px-2 py-0.5 rounded flex-row items-center gap-1">
              <Feather name="archive" size={10} color="#059669" />
              <Text className="text-[10px] font-bold text-emerald-600 uppercase">Archived</Text>
            </View>
          </View>
          <Text className="text-slate-800 font-bold text-lg mb-1">{item.title}</Text>
          <Text className="text-slate-500 text-xs">
            Completed on {new Date(item.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
        <View className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center">
          <Feather name="chevron-right" size={20} color="#94a3b8" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9F9FB]">
      <View className="px-5 py-4 bg-white border-b border-slate-100 z-10">
        <Text className="text-2xl font-extrabold text-slate-800 mb-1">Project Archive</Text>
        <Text className="text-slate-500 text-sm">Review fully completed and archived tasks.</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={archivedTasks}
          keyExtractor={item => item.id}
          renderItem={renderArchivedTask}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="items-center justify-center mt-20">
              <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
                <Feather name="archive" size={24} color="#94a3b8" />
              </View>
              <Text className="text-slate-500 font-medium text-center">No projects archived yet.{'\n'}Tasks move here when completed.</Text>
            </View>
          }
        />
      )}

      {/* Task Detail Modal */}
      <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-white pt-12">
          <View className="px-5 py-4 border-b border-slate-100 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-slate-800">Project Details</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} className="w-8 h-8 items-center justify-center bg-slate-100 rounded-full">
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
                    <Feather name="check-circle" size={20} color="#10b981" className="ml-auto" />
                  </View>

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
                    onPress={() => openRevisionModal(assign)}
                    className="mt-2 bg-red-50 border border-red-100 py-3 rounded-xl items-center flex-row justify-center gap-2"
                  >
                    <Feather name="refresh-ccw" size={16} color="#ef4444" />
                    <Text className="text-red-500 font-bold">Request Revision (-1 pt)</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View className="h-10" />
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Revision Modal */}
      <Modal visible={isRevisionModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center px-4">
          <View className="bg-white rounded-3xl p-5 shadow-xl">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-slate-800">Request Revision</Text>
              <TouchableOpacity onPress={() => setRevisionModalVisible(false)} className="w-8 h-8 items-center justify-center bg-slate-100 rounded-full">
                <Feather name="x" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text className="text-slate-500 mb-4 text-sm">Please provide specific instructions on what needs to be changed or improved.</Text>
            
            <TextInput
              placeholder="What needs to be revised?"
              multiline
              numberOfLines={4}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-6 text-slate-800 text-sm"
              style={{ textAlignVertical: 'top', minHeight: 100 }}
              value={revisionNotes}
              onChangeText={setRevisionNotes}
            />

            <TouchableOpacity
              onPress={handleRequestRevision}
              className="bg-red-500 py-4 rounded-xl items-center shadow-sm"
            >
              <Text className="text-white font-bold text-base">Send Revision Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
