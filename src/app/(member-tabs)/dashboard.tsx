import { View, Text, TouchableOpacity, ScrollView, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { format, isToday, isTomorrow } from 'date-fns';

export default function MemberDashboard() {
  const { teamName, memberName, roleName, memberId, teamId } = useLocalSearchParams<{ 
    teamName: string, 
    memberName: string, 
    roleName: string,
    memberId: string,
    teamId: string
  }>();

  const router = useRouter();

  const [stats, setStats] = useState({
    totalMembers: 0,
    assignedTasks: 0,
    productivityScore: 0
  });

  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    if (!teamId || !memberId) return;

    const fetchData = async () => {
      // Check Eviction Status First
      const { data: memberStatus } = await supabase
        .from('team_members')
        .select('status')
        .eq('id', memberId)
        .single();

      if (!memberStatus || memberStatus.status !== 'approved') {
        // Kick them out!
        router.replace('/');
        return;
      }

      // Fetch Total Members
      const { count: membersCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('status', 'approved');

      // Fetch Tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', memberId);

      const assignedCount = tasks?.filter(t => t.status === 'open').length || 0;
      const completedCount = tasks?.filter(t => t.status === 'completed').length || 0;
      const totalTasks = tasks?.length || 0;
      const score = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

      setStats({
        totalMembers: membersCount || 1, // Fallback to 1 (themselves)
        assignedTasks: assignedCount,
        productivityScore: score
      });

      // Upcoming Deadlines (Open tasks ordered by date)
      const { data: upcoming } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', memberId)
        .eq('status', 'open')
        .order('due_date', { ascending: true })
        .limit(3);

      setDeadlines(upcoming || []);

      // Recent Activity
      const { data: recentActs } = await supabase
        .from('activities')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(5);

      setActivities(recentActs || []);
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Polling every 5s
    return () => clearInterval(interval);
  }, [teamId, memberId]);

  const formatDueDate = (dateString: string) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
    if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  const formatTimeAgo = (dateString: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9F9FB]">
      <StatusBar barStyle="dark-content" />
      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8">
          <Text className="text-xl font-bold text-slate-800">TeamLens</Text>
          <View className="flex-row items-center gap-4">
            <TouchableOpacity className="relative w-10 h-10 items-center justify-center">
              <Feather name="bell" size={24} color="#475569" />
              <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            </TouchableOpacity>
            <View className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
               <Image source={{ uri: `https://ui-avatars.com/api/?name=${memberName || 'User'}&background=4f46e5&color=fff` }} className="w-full h-full" />
            </View>
          </View>
        </View>

        {/* Title Area */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-slate-900 mb-1">Dashboard</Text>
          <Text className="text-slate-500 text-xs">
            Welcome back, {memberName ? memberName.split(' ')[0] : 'there'}. Here's your overview for today.
          </Text>
        </View>

        {/* Stats Cards Vertical */}
        <View className="gap-4 mb-6">
          
          {/* Card 1: Active Members */}
          <View className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-100 flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <View className="w-12 h-12 bg-emerald-50 rounded-2xl items-center justify-center">
                <Feather name="users" size={20} color="#10b981" />
              </View>
              <View>
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">ACTIVE MEMBERS</Text>
                <Text className="text-3xl font-extrabold text-slate-900">{stats.totalMembers}</Text>
              </View>
            </View>
            <View className="bg-emerald-50 px-3 py-1 rounded-full">
              <Text className="text-emerald-600 text-[10px] font-bold">{teamName}</Text>
            </View>
          </View>

          {/* Card 2: Tasks Assigned */}
          <View className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-100 flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <View className="w-12 h-12 bg-indigo-50 rounded-2xl items-center justify-center">
                <Feather name="clipboard" size={20} color="#4f46e5" />
              </View>
              <View>
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">TASKS ASSIGNED</Text>
                <Text className="text-3xl font-extrabold text-slate-900">{stats.assignedTasks}</Text>
              </View>
            </View>
            <View className="bg-indigo-50 px-3 py-1 rounded-full">
              <Text className="text-indigo-600 text-[10px] font-bold">To You</Text>
            </View>
          </View>

          {/* Card 3: Productivity Score */}
          <View className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-100 flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <View className="w-12 h-12 bg-orange-50 rounded-2xl items-center justify-center">
                <Feather name="target" size={20} color="#ea580c" />
              </View>
              <View>
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">PRODUCTIVITY SCORE</Text>
                <Text className="text-3xl font-extrabold text-indigo-600">{stats.productivityScore}%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Upcoming Deadlines */}
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
          <View className="flex-row justify-between items-center mb-4">
             <Text className="text-slate-800 font-bold text-sm">Upcoming Deadlines</Text>
             <TouchableOpacity><Text className="text-indigo-600 text-[10px] font-bold">View All</Text></TouchableOpacity>
          </View>
          
          <View className="gap-3">
             {deadlines.length === 0 ? (
               <View className="py-4 items-center justify-center">
                 <Text className="text-slate-400 text-xs">No upcoming deadlines! 🎉</Text>
               </View>
             ) : (
               deadlines.map(task => (
                 <View key={task.id} className="border border-slate-100 rounded-xl p-3 flex-row items-start gap-3">
                   <View className="w-4 h-4 rounded border border-slate-300 mt-0.5" />
                   <View className="flex-1">
                     <View className="flex-row justify-between items-start mb-1">
                       <Text className="text-slate-800 font-bold text-xs flex-1">{task.title}</Text>
                       <View className={`px-2 py-0.5 rounded text-center ml-2 ${task.priority === 'high' ? 'bg-red-50' : task.priority === 'medium' ? 'bg-orange-50' : 'bg-slate-50'}`}>
                         <Text className={`text-[8px] font-bold uppercase ${task.priority === 'high' ? 'text-red-500' : task.priority === 'medium' ? 'text-orange-500' : 'text-slate-500'}`}>
                           {task.priority || 'NORMAL'}
                         </Text>
                       </View>
                     </View>
                      <View className="flex-row items-center gap-3">
                        <View className="flex-row items-center gap-1">
                          <Feather name="clock" size={10} color="#94a3b8" />
                          <Text className="text-slate-400 text-[10px]">{formatDueDate(task.due_date)}</Text>
                        </View>
                      </View>
                   </View>
                 </View>
               ))
             )}
          </View>
        </View>

        {/* Recent Activity */}
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
          <Text className="text-slate-800 font-bold text-sm mb-4">Recent Activity</Text>
          
          <View className="pl-2">
            {activities.length === 0 ? (
               <View className="py-4 items-center justify-center">
                 <Text className="text-slate-400 text-xs">No recent activity</Text>
               </View>
            ) : (
              activities.map((activity, index) => (
                <View key={activity.id} className={`border-l border-slate-200 ml-1.5 pl-4 relative ${index === activities.length - 1 ? '' : 'pb-6'}`}>
                  <View className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${index === 0 ? 'bg-indigo-600 -left-1.5 w-3 h-3' : 'bg-slate-300'}`} />
                  <Text className="text-slate-700 text-xs mb-0.5 leading-4">{activity.action}</Text>
                  <Text className="text-slate-400 text-[9px]">{formatTimeAgo(activity.created_at)}</Text>
                </View>
              ))
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
