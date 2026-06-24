import { View, Text, TouchableOpacity, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useGlobalSearchParams } from 'expo-router';

export default function MemberTasks() {
  const { memberId } = useGlobalSearchParams<{ memberId: string }>();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTasks = async () => {
    if (!memberId) return;
    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .select(`
          id,
          status,
          specific_instructions,
          tasks (
            id,
            title,
            description,
            category,
            priority,
            due_date,
            status
          )
        `)
        .eq('member_id', memberId)
        .order('tasks(due_date)', { ascending: true });

      if (data) setAssignments(data);
    } catch (e) {
      console.log('Error fetching assigned tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [memberId]);

  const toggleTaskStatus = async (assignment: any) => {
    const newStatus = assignment.status === 'completed' ? 'open' : 'completed';
    try {
      // Optimistic update
      setAssignments(assignments.map(a => 
        a.id === assignment.id ? { ...a, status: newStatus } : a
      ));
      
      await supabase
        .from('task_assignments')
        .update({ status: newStatus })
        .eq('id', assignment.id);
    } catch (e) {
      console.log(e);
      fetchTasks(); // Revert on error
    }
  };

  const filteredAssignments = assignments.filter(a => 
    a.tasks?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTask = ({ item }: { item: any }) => {
    const task = item.tasks;
    if (!task) return null;
    
    const isOverdue = new Date(task.due_date) < new Date() && item.status !== 'completed';
    
    return (
      <View className={`bg-white p-5 rounded-2xl mb-4 shadow-sm border ${item.status === 'completed' ? 'border-emerald-100 opacity-75' : 'border-slate-100'}`}>
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-2">
              <View className="bg-indigo-50 px-2 py-0.5 rounded text-center">
                <Text className="text-[10px] font-bold text-indigo-500 uppercase">{task.category || 'Task'}</Text>
              </View>
              <View className={`px-2 py-0.5 rounded text-center ${task.priority === 'high' ? 'bg-red-50' : 'bg-orange-50'}`}>
                <Text className={`text-[10px] font-bold uppercase ${task.priority === 'high' ? 'text-red-500' : 'text-orange-500'}`}>{task.priority}</Text>
              </View>
              {isOverdue && (
                <View className="bg-red-500 px-2 py-0.5 rounded text-center">
                  <Text className="text-[10px] font-bold text-white uppercase">Overdue</Text>
                </View>
              )}
            </View>
            <Text className={`font-bold text-lg ${item.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => toggleTaskStatus(item)}
            className={`w-8 h-8 rounded-full items-center justify-center border-2 ${item.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'}`}
          >
            {item.status === 'completed' && <Feather name="check" size={16} color="white" />}
          </TouchableOpacity>
        </View>

        {task.description ? (
          <Text className="text-slate-500 text-sm mb-4 leading-5">{task.description}</Text>
        ) : null}

        <View className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
          <View className="flex-row items-center gap-2 mb-2">
            <Feather name="info" size={14} color="#4f46e5" />
            <Text className="text-indigo-600 font-bold text-xs uppercase tracking-wider">Your Instructions</Text>
          </View>
          <Text className="text-slate-700 text-sm font-medium">
            {item.specific_instructions || "No specific instructions provided. Follow the general description."}
          </Text>
        </View>

        <View className="mt-4 pt-4 border-t border-slate-100 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Feather name="calendar" size={14} color="#94a3b8" />
            <Text className="text-slate-500 text-xs font-semibold">
              Due: {new Date(task.due_date).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9F9FB]">
      <View className="px-5 py-4 bg-white border-b border-slate-100 z-10">
        <Text className="text-2xl font-extrabold text-slate-800 mb-4">My Tasks</Text>
        <View className="flex-row items-center bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            placeholder="Search my tasks..."
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
          data={filteredAssignments}
          keyExtractor={item => item.id}
          renderItem={renderTask}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="items-center justify-center mt-10">
              <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
                <Feather name="check-circle" size={24} color="#94a3b8" />
              </View>
              <Text className="text-slate-500 font-medium text-center">You have no tasks assigned.{'\n'}Enjoy your day!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
