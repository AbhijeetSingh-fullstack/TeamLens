import { Feather } from '@expo/vector-icons';
import { useGlobalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';

export default function ManagerProjects() {
  const { teamCode } = useGlobalSearchParams<{ teamCode: string }>();
  const [archivedTasks, setArchivedTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // For viewing submissions
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isModalVisible, setModalVisible] = useState(false);

  const handleRequestRevision = async (assignmentId: string, revisionsCount: number, taskId: string) => {
    try {
      const { error } = await supabase
        .from('task_assignments')
        .update({
          status: 'open',
          revisions_count: revisionsCount + 1,
          completed_at: null,
          submission_notes: null,
          submission_image_url: null
        })
        .eq('id', assignmentId);

      if (error) throw error;

      // Also update parent task to open so it goes back to active tasks
      await supabase.from('tasks').update({ status: 'open', completed_at: null }).eq('id', taskId);

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
            status,
            submission_notes,
            submission_image_url,
            team_members(member_name, roles(role_name))
          )
        `)
        .eq('team_id', teamData.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (tasksData) {
        // Filter out tasks completed less than 24 hours ago
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        const filtered = tasksData.filter(t => {
          if (!t.completed_at) return false;
          return new Date(t.completed_at).getTime() <= twentyFourHoursAgo;
        });
        setArchivedTasks(filtered);
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
              <Text className="text-slate-500 font-medium text-center">No projects archived yet.{'\n'}Tasks move here 24 hour after completion.</Text>
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
                    onPress={() => handleRequestRevision(assign.id, assign.revisions_count || 0, selectedTask.id)}
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
    </SafeAreaView>
  );
}
