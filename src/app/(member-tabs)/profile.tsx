import { View, Text, TouchableOpacity, ScrollView, StatusBar, Image, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useClerk, useUser } from '@clerk/clerk-expo';

export default function MemberProfile() {
  const { teamName, memberName, roleName, memberId, teamId } = useGlobalSearchParams<{ 
    teamName: string, 
    memberName: string, 
    roleName: string,
    memberId: string,
    teamId: string
  }>();
  
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();

  const [stats, setStats] = useState({
    assignedTasks: 0,
    completedTasks: 0,
    productivityScore: 0
  });

  useEffect(() => {
    if (!memberId) return;

    const fetchStats = async () => {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', memberId);

      const assignedCount = tasks?.length || 0;
      const completedCount = tasks?.filter(t => t.status === 'completed').length || 0;
      const score = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;

      setStats({
        assignedTasks: assignedCount,
        completedTasks: completedCount,
        productivityScore: score
      });
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [memberId]);

  const [isExitModalVisible, setIsExitModalVisible] = useState(false);

  const handleExitTeam = () => {
    setIsExitModalVisible(true);
  };

  const confirmExitTeam = async () => {
    setIsExitModalVisible(false);
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);
        
      if (error) throw error;
      
      router.replace({ pathname: '/', params: { skipAutoLogin: 'true' } });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9F9FB]">
      <StatusBar barStyle="dark-content" />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}>
        
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8">
          <Text className="text-xl font-bold text-slate-800">Profile</Text>
        </View>

        {/* Profile Card */}
        <View className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 items-center mb-6">
          <View className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden border-4 border-indigo-50 mb-4">
             <Image source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(memberName || user?.fullName || 'User')}&background=4f46e5&color=fff` }} className="w-full h-full" resizeMode="cover" />
          </View>
          <Text className="text-2xl font-bold text-slate-800 mb-1">{memberName || user?.fullName}</Text>
          <View className="bg-indigo-50 px-3 py-1 rounded-full mb-4">
            <Text className="text-indigo-600 font-bold text-xs">{roleName || 'Member'}</Text>
          </View>
          


          <Text className="text-slate-400 text-sm mt-2">{teamName}</Text>
        </View>

        {/* Stats Grid */}
        <Text className="text-slate-800 font-bold text-lg mb-4">Your Performance</Text>
        <View className="flex-row gap-4 mb-6">
          {/* Productivity */}
          <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 items-center justify-center">
            <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center mb-2">
              <Feather name="target" size={18} color="#ea580c" />
            </View>
            <Text className="text-2xl font-extrabold text-slate-800 mb-1">{stats.productivityScore}%</Text>
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider text-center">Score</Text>
          </View>

          {/* Completed */}
          <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 items-center justify-center">
            <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center mb-2">
              <Feather name="check-circle" size={18} color="#10b981" />
            </View>
            <Text className="text-2xl font-extrabold text-slate-800 mb-1">{stats.completedTasks}</Text>
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider text-center">Completed</Text>
          </View>

          {/* Assigned */}
          <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 items-center justify-center">
            <View className="w-10 h-10 rounded-full bg-indigo-50 items-center justify-center mb-2">
              <Feather name="briefcase" size={18} color="#4f46e5" />
            </View>
            <Text className="text-2xl font-extrabold text-slate-800 mb-1">{stats.assignedTasks}</Text>
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider text-center">Total</Text>
          </View>
        </View>

        {/* Settings Links */}
        <Text className="text-slate-800 font-bold text-lg mb-4">Settings</Text>
        <View className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

          <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-slate-50">
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center">
                <Feather name="bell" size={16} color="#64748b" />
              </View>
              <Text className="text-slate-700 font-medium text-sm">Notifications</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#cbd5e1" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push('/privacy-policy')}
            className="flex-row items-center justify-between p-4 border-b border-slate-50"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center">
                <Feather name="shield" size={16} color="#64748b" />
              </View>
              <Text className="text-slate-700 font-medium text-sm">Privacy Policy</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#cbd5e1" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleExitTeam}
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-full bg-red-50 items-center justify-center">
                <Feather name="log-out" size={16} color="#ef4444" />
              </View>
              <Text className="text-red-600 font-bold text-sm">Exit Team</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Exit Team Modal */}
      <Modal visible={isExitModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <View className="w-12 h-12 bg-red-50 rounded-full items-center justify-center mb-4">
              <Feather name="log-out" size={24} color="#ef4444" />
            </View>
            <Text className="text-xl font-bold text-slate-800 mb-2">Leave Team</Text>
            <Text className="text-slate-500 mb-6 leading-6">Do you want to leave this team and return to the onboarding screen? You will lose access to all tasks and data.</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 }}>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginRight: 8 }}
                onPress={() => setIsExitModalVisible(false)}
              >
                <Text style={{ color: '#475569', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: '#dc2626', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginLeft: 8 }}
                onPress={confirmExitTeam}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Yes, Leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
