import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { useGlobalSearchParams, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function MemberAnalytics() {
  const { memberId, teamId } = useGlobalSearchParams<{ memberId: string, teamId: string }>();
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState(0);
  const [stats, setStats] = useState({ assigned: 0, completed: 0, revisions: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (memberId && teamId) {
        fetchAnalytics();
        const interval = setInterval(fetchAnalytics, 5000);
        return () => clearInterval(interval);
      }
    }, [memberId, teamId])
  );

  const fetchAnalytics = async () => {
    try {
      setErrorMsg(null);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      // Start of today for point calculations
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const { data: assignments } = await supabase
        .from('task_assignments')
        .select(`
          id, status, completed_at, revisions_count, created_at,
          tasks!inner(created_at, due_date, team_id)
        `)
        .eq('member_id', memberId)
        .eq('tasks.team_id', teamId)
        .gte('created_at', startOfMonth);

      if (error) throw error;

      if (!assignments) return;

      let assignedCount = assignments.length;
      let completedCount = assignments.filter(a => a.status === 'completed').length;
      let totalRevisions = assignments.reduce((acc, curr) => acc + (curr.revisions_count || 0), 0);

      setStats({ assigned: assignedCount, completed: completedCount, revisions: totalRevisions });

      let calculatedPoints = 0;

      assignments.forEach((a: any) => {
        if (a.status === 'completed' && a.completed_at) {
          const createdAt = new Date(a.tasks.created_at).getTime();
          const dueDate = new Date(a.tasks.due_date).getTime();
          const completedAt = new Date(a.completed_at).getTime();

          const totalDuration = dueDate - createdAt;
          const timeRemaining = dueDate - completedAt;

          let earned = 0;
          if (timeRemaining < 0) {
            earned = -1;
          } else {
            const percentRemaining = (timeRemaining / totalDuration) * 100;
            if (percentRemaining >= 75) earned = 10;
            else if (percentRemaining >= 50) earned = 7;
            else if (percentRemaining >= 25) earned = 3;
          }

          const revisions = a.revisions_count || 0;
          earned -= revisions;

          calculatedPoints += earned;
        }
      });

      setPoints(calculatedPoints);
    } catch (e: any) {
      console.log('Error fetching analytics:', e);
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const maxGraphValue = Math.max(stats.assigned, stats.completed, stats.revisions, 1);
  const assignedHeight = Math.max(20, (stats.assigned / maxGraphValue) * 120);
  const completedHeight = Math.max(20, (stats.completed / maxGraphValue) * 120);
  const revisionsHeight = Math.max(20, (stats.revisions / maxGraphValue) * 120);

  return (
    <SafeAreaView className="flex-1 bg-[#F9F9FB]">
      <View className="px-5 py-4 bg-white border-b border-slate-100 z-10 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-extrabold text-slate-800 mb-1">My Performance</Text>
          <Text className="text-slate-500 text-sm">Monthly breakdown</Text>
        </View>
        <View className="bg-indigo-600 px-4 py-2 rounded-2xl shadow-sm shadow-indigo-300 items-center">
          <Text className="text-indigo-100 text-[10px] font-bold uppercase tracking-wider mb-0.5">Points</Text>
          <Text className="text-white font-extrabold text-xl">{points}</Text>
        </View>
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
          
          <View className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 mb-6">
            <Text className="text-slate-800 font-bold text-lg mb-6">Monthly Activity Graph</Text>

            <View className="flex-row items-end justify-between h-48 border-b border-slate-100 pb-2 px-2">
              {/* Assigned Bar */}
              <View className="items-center flex-1">
                <Text className="text-slate-500 font-bold mb-2 text-xs">{stats.assigned}</Text>
                <View className="w-12 bg-indigo-200 rounded-t-xl" style={{ height: assignedHeight }} />
                <Text className="text-slate-600 font-bold mt-3 text-xs">Assigned</Text>
              </View>
              {/* Completed Bar */}
              <View className="items-center flex-1">
                <Text className="text-slate-500 font-bold mb-2 text-xs">{stats.completed}</Text>
                <View className="w-12 bg-emerald-400 rounded-t-xl shadow-sm shadow-emerald-200" style={{ height: completedHeight }} />
                <Text className="text-slate-600 font-bold mt-3 text-xs">Completed</Text>
              </View>
              {/* Revisions Bar */}
              <View className="items-center flex-1">
                <Text className="text-slate-500 font-bold mb-2 text-xs">{stats.revisions}</Text>
                <View className="w-12 bg-rose-400 rounded-t-xl shadow-sm shadow-rose-200" style={{ height: revisionsHeight }} />
                <Text className="text-slate-600 font-bold mt-3 text-xs">Revisions</Text>
              </View>
            </View>
          </View>

          <View className="bg-white rounded-[20px] p-6 shadow-sm border border-slate-100">
            <View className="flex-row items-center gap-2 mb-4">
              <Feather name="info" size={18} color="#64748b" />
              <Text className="text-slate-800 font-bold text-base">How points are calculated</Text>
            </View>
            <Text className="text-slate-500 text-xs mb-4 leading-5">Points are officially locked in at midnight each day and reset at the beginning of the month.</Text>
            
            <View className="gap-3">
              <View className="flex-row justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <Text className="text-slate-700 text-sm font-medium">Submitted with {'>'}75% time left</Text>
                <Text className="text-emerald-600 font-bold">+10 pts</Text>
              </View>
              <View className="flex-row justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <Text className="text-slate-700 text-sm font-medium">Submitted with {'>'}50% time left</Text>
                <Text className="text-emerald-600 font-bold">+7 pts</Text>
              </View>
              <View className="flex-row justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <Text className="text-slate-700 text-sm font-medium">Submitted with {'>'}25% time left</Text>
                <Text className="text-emerald-600 font-bold">+3 pts</Text>
              </View>
              <View className="flex-row justify-between items-center bg-red-50/50 p-3 rounded-xl border border-red-50">
                <Text className="text-slate-700 text-sm font-medium">Submitted after deadline</Text>
                <Text className="text-red-500 font-bold">-1 pt</Text>
              </View>
              <View className="flex-row justify-between items-center bg-red-50/50 p-3 rounded-xl border border-red-50">
                <Text className="text-slate-700 text-sm font-medium">Per requested revision</Text>
                <Text className="text-red-500 font-bold">-1 pt</Text>
              </View>
            </View>
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}
