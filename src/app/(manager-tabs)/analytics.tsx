import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { useGlobalSearchParams, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function ManagerAnalytics() {
  const { teamCode } = useGlobalSearchParams<{ teamCode: string }>();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState({ assigned: 0, completed: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (teamCode) {
        fetchAnalytics();
        const interval = setInterval(fetchAnalytics, 5000);
        return () => clearInterval(interval);
      }
    }, [teamCode])
  );

  const fetchAnalytics = async () => {
    try {
      setErrorMsg(null);
      const { data: teamData, error: teamError } = await supabase.from('teams').select('id').eq('team_code', teamCode).single();
      if (teamError) throw teamError;
      if (!teamData) return;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      
      // The start of today (to only count tasks finished before today for points)
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      // Get all tasks for this month to count assigned
      const { data: allTasks } = await supabase
        .from('tasks')
        .select('id, created_at, status')
        .eq('team_id', teamData.id)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

      // Get all task assignments with completed_at for leaderboard
      const { data: assignments } = await supabase
        .from('task_assignments')
        .select(`
          id, status, completed_at, revisions_count,
          member_id,
          tasks!inner(created_at, due_date, team_id),
          team_members(member_name, roles(role_name))
        `)
        .eq('tasks.team_id', teamData.id);

      if (!assignments) return;

      let assignedThisMonth = allTasks?.length || 0;
      let completedThisMonth = allTasks?.filter(t => t.status === 'completed').length || 0;
      
      setMonthlyStats({ assigned: assignedThisMonth, completed: completedThisMonth });

      // Calculate Leaderboard
      const pointsMap: Record<string, any> = {};

      assignments.forEach((a: any) => {
        const memberId = a.member_id;
        if (!pointsMap[memberId]) {
          pointsMap[memberId] = {
            id: memberId,
            name: a.team_members?.member_name || 'Unknown',
            role: a.team_members?.roles?.role_name || '',
            points: 0,
            tasksCompleted: 0
          };
        }

        // Calculate points in realtime for testing (removed < startOfToday restriction)
        if (a.status === 'completed' && a.completed_at && a.completed_at >= startOfMonth) {
          const createdAt = new Date(a.tasks.created_at).getTime();
          const dueDate = new Date(a.tasks.due_date).getTime();
          const completedAt = new Date(a.completed_at).getTime();

          const totalDuration = dueDate - createdAt;
          const timeRemaining = dueDate - completedAt;

          let earned = 0;
          if (timeRemaining < 0) {
            earned = -1; // Missed deadline
          } else {
            const percentRemaining = (timeRemaining / totalDuration) * 100;
            if (percentRemaining >= 75) earned = 10;
            else if (percentRemaining >= 50) earned = 7;
            else if (percentRemaining >= 25) earned = 3;
            else earned = 0;
          }

          const revisions = a.revisions_count || 0;
          earned -= revisions;

          pointsMap[memberId].points += earned;
          pointsMap[memberId].tasksCompleted += 1;
        }
      });

      const sortedLeaderboard = Object.values(pointsMap).sort((a: any, b: any) => b.points - a.points);
      setLeaderboard(sortedLeaderboard);
      setLoading(false);
    } catch (e: any) {
      console.log('Error fetching analytics:', e);
      setErrorMsg(e.message);
      setLoading(false);
    }
  };

  const maxGraphValue = Math.max(monthlyStats.assigned, monthlyStats.completed, 1);
  const assignedHeight = Math.max(20, (monthlyStats.assigned / maxGraphValue) * 120);
  const completedHeight = Math.max(20, (monthlyStats.completed / maxGraphValue) * 120);

  return (
    <SafeAreaView className="flex-1 bg-[#F9F9FB]">
      <View className="px-5 py-4 bg-white border-b border-slate-100 z-10">
        <Text className="text-2xl font-extrabold text-slate-800 mb-1">Analytics</Text>
        <Text className="text-slate-500 text-sm">Monthly team performance & leaderboard</Text>
      </View>

      {errorMsg && (
        <View className="m-5 p-4 bg-red-50 border border-red-200 rounded-xl">
          <Text className="text-red-600 font-bold mb-1">Database Sync Error</Text>
          <Text className="text-red-500 text-xs">{errorMsg}</Text>
        </View>
      )}

      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#4f46e5" /></View>
      ) : (
        <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          
          {/* Monthly Graph */}
          <View className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 mb-8">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-slate-800 font-bold text-lg">Task Volume (This Month)</Text>
              <View className="bg-indigo-50 px-3 py-1 rounded-full">
                <Text className="text-indigo-600 font-bold text-xs uppercase tracking-wider">{new Date().toLocaleString('default', { month: 'long' })}</Text>
              </View>
            </View>

            <View className="flex-row items-end justify-center h-48 gap-8 border-b border-slate-100 pb-2">
              <View className="items-center">
                <Text className="text-slate-500 font-bold mb-2 text-xs">{monthlyStats.assigned}</Text>
                <View className="w-16 bg-slate-200 rounded-t-xl" style={{ height: assignedHeight }} />
                <Text className="text-slate-600 font-medium mt-3 text-sm">Assigned</Text>
              </View>
              <View className="items-center">
                <Text className="text-slate-500 font-bold mb-2 text-xs">{monthlyStats.completed}</Text>
                <View className="w-16 bg-emerald-400 rounded-t-xl shadow-sm shadow-emerald-200" style={{ height: completedHeight }} />
                <Text className="text-slate-600 font-medium mt-3 text-sm">Completed</Text>
              </View>
            </View>
          </View>

          {/* Leaderboard */}
          <View className="mb-2">
            <View className="flex-row items-center gap-2 mb-4">
              <Feather name="award" size={20} color="#f59e0b" />
              <Text className="text-slate-800 font-extrabold text-xl">Top Performers</Text>
            </View>
            <Text className="text-slate-400 text-xs mb-4">Points update at midnight based on completion speed & revisions.</Text>

            {leaderboard.length === 0 ? (
              <View className="bg-white rounded-[20px] p-8 items-center border border-slate-100">
                <Text className="text-slate-400 font-medium">No completions logged for points yet.</Text>
              </View>
            ) : (
              leaderboard.map((member, index) => (
                <View key={member.id} className="bg-white rounded-[20px] p-4 shadow-sm border border-slate-100 mb-3 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-4">
                    <View className={`w-8 h-8 rounded-full items-center justify-center ${index === 0 ? 'bg-amber-100' : index === 1 ? 'bg-slate-100' : index === 2 ? 'bg-orange-50' : 'bg-slate-50'}`}>
                      <Text className={`font-bold text-sm ${index === 0 ? 'text-amber-600' : index === 1 ? 'text-slate-500' : index === 2 ? 'text-orange-600' : 'text-slate-400'}`}>
                        #{index + 1}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-slate-800 font-bold text-base">{member.name}</Text>
                      <Text className="text-slate-400 text-xs">{member.role} • {member.tasksCompleted} Tasks</Text>
                    </View>
                  </View>
                  <View className="bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                    <Text className="text-indigo-600 font-bold text-base">{member.points} pts</Text>
                  </View>
                </View>
              ))
            )}
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}
