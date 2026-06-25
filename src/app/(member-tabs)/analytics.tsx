import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';

import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MemberAnalytics() {
  const [memberId, setMemberId] = useState<string>('');
  const [teamId, setTeamId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState(0);
  const [stats, setStats] = useState({ assigned: 0, completed: 0, revisions: 0 });

  useEffect(() => {
    const init = async () => {
      let mId = memberId;
      let tId = teamId;
      if (!mId) {
        mId = await AsyncStorage.getItem('memberId') || '';
        setMemberId(mId);
      }
      if (!tId) {
        tId = await AsyncStorage.getItem('teamId') || '';
        setTeamId(tId);
      }
      if (mId && tId) {
        fetchAnalytics(mId, tId);
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchAnalytics = async (mId: string, tId: string) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: assignments } = await supabase
        .from('task_assignments')
        .select(`
          id, status, completed_at, revisions_count, created_at,
          tasks!inner(created_at, due_date, team_id, category)
        `)
        .eq('member_id', mId)
        .eq('tasks.team_id', tId)
        .gte('created_at', startOfMonth);

      if (!assignments) return;

      let assignedCount = assignments.length;
      let completedCount = assignments.filter(a => a.status === 'completed').length;
      let revisionsCount = assignments.reduce((acc, curr) => acc + (curr.revisions_count || 0), 0);

      setStats({ assigned: assignedCount, completed: completedCount, revisions: revisionsCount });

      let calculatedPoints = 0;

      assignments.forEach((a: any) => {
        let penalty = a.revisions_count || 0;
        if (a.tasks?.category === 'Revision') penalty += 1;
        calculatedPoints -= penalty;

        if (a.status === 'completed' && a.completed_at) {
          if (a.tasks?.category !== 'Revision') {
             calculatedPoints += 10;
          }
        }
      });

      setPoints(calculatedPoints);
    } catch (e) {
      console.log("Member Analytics Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const maxGraphValue = Math.max(stats.assigned, stats.completed, stats.revisions, 1);
  const assignedHeight = (stats.assigned / maxGraphValue) * 100;
  const completedHeight = (stats.completed / maxGraphValue) * 100;
  const revisionsHeight = (stats.revisions / maxGraphValue) * 100;

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
                <View className="w-12 bg-indigo-200 rounded-t-xl" style={{ height: `${assignedHeight}%`, minHeight: 20 }} />
                <Text className="text-slate-600 font-bold mt-3 text-xs">Assigned</Text>
              </View>
              {/* Completed Bar */}
              <View className="items-center flex-1">
                <Text className="text-slate-500 font-bold mb-2 text-xs">{stats.completed}</Text>
                <View className="w-12 bg-emerald-400 rounded-t-xl shadow-sm shadow-emerald-200" style={{ height: `${completedHeight}%`, minHeight: 20 }} />
                <Text className="text-slate-600 font-bold mt-3 text-xs">Completed</Text>
              </View>
              {/* Revisions Bar */}
              <View className="items-center flex-1">
                <Text className="text-slate-500 font-bold mb-2 text-xs">{stats.revisions}</Text>
                <View className="w-12 bg-rose-400 rounded-t-xl shadow-sm shadow-rose-200" style={{ height: `${revisionsHeight}%`, minHeight: 20 }} />
                <Text className="text-slate-600 font-bold mt-3 text-xs">Revisions</Text>
              </View>
            </View>
          </View>

          <View className="bg-white rounded-[20px] p-6 shadow-sm border border-slate-100">
            <View className="flex-row items-center gap-2 mb-4">
              <Feather name="info" size={18} color="#64748b" />
              <Text className="text-slate-800 font-bold text-base">How points are calculated</Text>
            </View>
            <Text className="text-slate-500 text-xs mb-4 leading-5">Points are calculated based on the task completion with due time and revision assigned.</Text>

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
