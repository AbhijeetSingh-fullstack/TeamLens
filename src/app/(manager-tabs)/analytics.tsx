import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { useGlobalSearchParams, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ManagerAnalytics() {
  const { teamCode } = useGlobalSearchParams<{ teamCode: string }>();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState({ assigned: 0, completed: 0, revisions: 0 });
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
      const interval = setInterval(fetchAnalytics, 5000);
      return () => clearInterval(interval);
    }, [teamCode, user?.id])
  );

  const fetchAnalytics = async () => {
    try {
      let currentTeamCode = teamCode;
      
      if (!currentTeamCode) {
        if (user) {
          const managerDataStr = await AsyncStorage.getItem(`manager_team_${user.id}`);
          if (managerDataStr) {
            const managerData = JSON.parse(managerDataStr);
            currentTeamCode = managerData.teamCode;
          }
        }
        
        if (!currentTeamCode) {
          setLoading(false);
          return;
        }
      }

      const { data: teamData } = await supabase.from('teams').select('id').eq('team_code', currentTeamCode).single();
      if (!teamData) return;

      const now = new Date();
      const month_year = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Get analytics from dedicated table
      const { data: analyticsData, error } = await supabase
        .from('task_analysis')
        .select(`
          *,
          team_members(member_name, roles(role_name))
        `)
        .eq('team_id', teamData.id)
        .eq('month_year', month_year);

      if (error) {
        console.error("Task Analysis Error:", error);
        throw error;
      }

      let assignedThisMonth = 0;
      let completedThisMonth = 0;
      let totalRevisions = 0;

      const sortedLeaderboard = (analyticsData || [])
        .filter(a => a.team_members) // Ensure member exists
        .map((a: any) => {
          assignedThisMonth += (a.assigned_count || 0);
          completedThisMonth += (a.completed_count || 0);
          totalRevisions += (a.revisions_count || 0);

          return {
            id: a.member_id,
            name: a.team_members?.member_name || 'Unknown',
            role: a.team_members?.roles?.role_name || '',
            points: a.points || 0,
            tasksCompleted: a.completed_count || 0,
            tasksAssigned: a.assigned_count || 0,
            revisionsCount: a.revisions_count || 0
          };
        })
        .sort((a, b) => b.points - a.points);

      setMonthlyStats({ assigned: assignedThisMonth, completed: completedThisMonth, revisions: totalRevisions });
      setLeaderboard(sortedLeaderboard);
    } catch (e) {
      console.log("Analytics Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const maxGraphValue = Math.max(monthlyStats.assigned, monthlyStats.completed, monthlyStats.revisions, 1000);
  const maxBarHeight = 120;
  const assignedHeightPx = monthlyStats.assigned > 0 ? Math.max((monthlyStats.assigned / maxGraphValue) * maxBarHeight, 4) : 0;
  const completedHeightPx = monthlyStats.completed > 0 ? Math.max((monthlyStats.completed / maxGraphValue) * maxBarHeight, 4) : 0;
  const revisionsHeightPx = monthlyStats.revisions > 0 ? Math.max((monthlyStats.revisions / maxGraphValue) * maxBarHeight, 4) : 0;

  return (
    <SafeAreaView className="flex-1 bg-[#F9F9FB]">
      <View className="px-5 py-4 bg-white border-b border-slate-100 z-10">
        <Text className="text-2xl font-extrabold text-slate-800 mb-1">Analytics</Text>
        <Text className="text-slate-500 text-sm">Monthly team performance & leaderboard</Text>
      </View>

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

            <View className="flex-row items-end justify-between px-2 h-48 border-b border-slate-100 pb-2">
              <View className="items-center justify-end h-full">
                <Text className="text-slate-500 font-bold mb-2 text-xs">{monthlyStats.assigned}</Text>
                <View className="w-14 bg-slate-200 rounded-t-xl" style={{ height: assignedHeightPx }} />
                <Text className="text-slate-500 font-medium mt-3 text-[10px] uppercase">Assigned</Text>
              </View>
              <View className="items-center justify-end h-full">
                <Text className="text-slate-500 font-bold mb-2 text-xs">{monthlyStats.completed}</Text>
                <View className="w-14 bg-emerald-400 rounded-t-xl shadow-sm shadow-emerald-200" style={{ height: completedHeightPx }} />
                <Text className="text-slate-500 font-medium mt-3 text-[10px] uppercase">Completed</Text>
              </View>
              <View className="items-center justify-end h-full">
                <Text className="text-slate-500 font-bold mb-2 text-xs">{monthlyStats.revisions}</Text>
                <View className="w-14 bg-rose-400 rounded-t-xl shadow-sm shadow-rose-200" style={{ height: revisionsHeightPx }} />
                <Text className="text-slate-500 font-medium mt-3 text-[10px] uppercase">Revisions</Text>
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
                <TouchableOpacity 
                  key={member.id} 
                  onPress={() => { setSelectedMember(member); setModalVisible(true); }}
                  className="bg-white rounded-[20px] p-4 shadow-sm border border-slate-100 mb-3 flex-row items-center justify-between"
                >
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
                </TouchableOpacity>
              ))
            )}
          </View>

        </ScrollView>
      )}

      {/* Member Stats Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end pt-20">
          <View className="bg-white rounded-t-[32px] p-6 pb-12 shadow-xl">
            <View className="flex-row items-center justify-between mb-8">
              <View>
                <Text className="text-2xl font-extrabold text-slate-800 mb-1">{selectedMember?.name}</Text>
                <Text className="text-slate-500 font-medium">{selectedMember?.role}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} className="w-10 h-10 items-center justify-center bg-slate-100 rounded-full">
                <Feather name="x" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-between mb-4 gap-4">
              <View className="flex-1 bg-indigo-50 rounded-[24px] p-5 shadow-sm border border-indigo-100 items-center justify-center">
                <View className="w-10 h-10 bg-indigo-100 rounded-full items-center justify-center mb-3">
                  <Feather name="clipboard" size={16} color="#4f46e5" />
                </View>
                <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-wider mb-1 text-center">Assigned</Text>
                <Text className="text-3xl font-extrabold text-indigo-900">{selectedMember?.tasksAssigned || 0}</Text>
              </View>

              <View className="flex-1 bg-emerald-50 rounded-[24px] p-5 shadow-sm border border-emerald-100 items-center justify-center">
                <View className="w-10 h-10 bg-emerald-100 rounded-full items-center justify-center mb-3">
                  <Feather name="check-circle" size={16} color="#059669" />
                </View>
                <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-wider mb-1 text-center">Completed</Text>
                <Text className="text-3xl font-extrabold text-emerald-900">{selectedMember?.tasksCompleted || 0}</Text>
              </View>

              <View className="flex-1 bg-red-50 rounded-[24px] p-5 shadow-sm border border-red-100 items-center justify-center">
                <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center mb-3">
                  <Feather name="refresh-ccw" size={16} color="#dc2626" />
                </View>
                <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-wider mb-1 text-center">Revisions</Text>
                <Text className="text-3xl font-extrabold text-red-900">{selectedMember?.revisionsCount || 0}</Text>
              </View>
            </View>
            
            <View className="bg-orange-50 rounded-[24px] p-6 shadow-sm border border-orange-100 flex-row items-center justify-between mt-2">
              <View className="flex-row items-center gap-4">
                <View className="w-12 h-12 bg-orange-100 rounded-full items-center justify-center shadow-sm">
                  <Feather name="award" size={24} color="#ea580c" />
                </View>
                <View>
                  <Text className="text-orange-900 font-bold text-xl">Total Score</Text>
                  <Text className="text-orange-700/80 font-medium text-xs">Performance points</Text>
                </View>
              </View>
              <Text className="text-orange-700 font-extrabold text-4xl">{selectedMember?.points || 0}</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
