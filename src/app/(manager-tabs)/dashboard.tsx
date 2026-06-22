import { View, Text, TouchableOpacity, ScrollView, Image, StatusBar, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { Feather } from '@expo/vector-icons';

type Member = {
  id: string;
  member_name: string;
  role_id: string;
  status: string;
  roles?: { role_name: string };
};

export default function ManagerDashboard() {
  const router = useRouter();
  const { teamCode, teamName } = useLocalSearchParams<{ teamCode: string, teamName: string }>();

  const [stats, setStats] = useState({
    activeMembers: 1,
    openTasks: 0,
    productivityScore: 0
  });

  const [members, setMembers] = useState<Member[]>([]);
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Poll for new members
  useEffect(() => {
    if (!teamCode) return;

    const fetchMembers = async () => {
      try {
        // First get team ID using the code
        const { data: teamData } = await supabase
          .from('teams')
          .select('id')
          .eq('team_code', teamCode)
          .single();

        if (teamData) {
          const { data: membersData } = await supabase
            .from('team_members')
            .select('*, roles(role_name)')
            .eq('team_id', teamData.id);

          if (membersData) {
            setMembers(membersData.filter(m => m.status === 'approved' || !m.status));
            setPendingMembers(membersData.filter(m => m.status === 'pending'));
            setStats(prev => ({ ...prev, activeMembers: 1 + membersData.filter(m => m.status === 'approved').length }));
          }
        }
      } catch (error) {
        console.log('Error fetching members:', error);
      }
    };

    fetchMembers();
    const interval = setInterval(fetchMembers, 3000);
    return () => clearInterval(interval);
  }, [teamCode]);

  const handleApprove = async (memberId: string) => {
    try {
      await supabase
        .from('team_members')
        .update({ status: 'approved' })
        .eq('id', memberId);
      
      setPendingMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (e) {
      alert("Failed to approve");
    }
  };

  const handleDecline = async (memberId: string) => {
    try {
      await supabase
        .from('team_members')
        .update({ status: 'declined' })
        .eq('id', memberId);
      
      setPendingMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (e) {
      alert("Failed to decline");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FE]">
      <StatusBar barStyle="dark-content" />
      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-extrabold text-slate-800">TeamLens</Text>
          <View className="flex-row items-center gap-4">
            <TouchableOpacity 
              className="w-10 h-10 items-center justify-center relative"
              onPress={() => setShowNotifications(true)}
            >
              <Feather name="bell" size={24} color="#4f46e5" />
              {pendingMembers.length > 0 && (
                <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </TouchableOpacity>
            <Image 
              source={{ uri: 'https://i.pravatar.cc/150?img=11' }} 
              className="w-10 h-10 rounded-full bg-slate-200"
            />
          </View>
        </View>

        {/* Hero Card */}
        <View className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 mb-5">
          <Text className="text-2xl font-bold text-slate-800 mb-2">{teamName || 'Product Design Team'}</Text>
          <Text className="text-slate-500 leading-5 mb-6 text-sm">
            Orchestrating visual excellence and user-centric flows across all TeamLens flagship products.
          </Text>

          <View className="bg-[#F4F5FA] rounded-xl flex-row items-center justify-between p-4 mb-6 border border-indigo-50">
            <Text className="text-indigo-400 font-bold text-xs uppercase tracking-wider">Invite Code</Text>
            <View className="flex-row items-center gap-3">
              <Text className="text-indigo-600 font-bold text-base tracking-widest">{teamCode || 'WP-829X-92'}</Text>
              <Feather name="copy" size={16} color="#94a3b8" />
            </View>
          </View>

          <View className="flex-row items-center gap-3">
            <TouchableOpacity className="flex-1 bg-indigo-600 py-3.5 rounded-xl flex-row items-center justify-center gap-2 shadow-sm shadow-indigo-200 active:bg-indigo-700">
              <Feather name="user-plus" size={16} color="white" />
              <Text className="text-white font-bold text-sm">Invite More</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-white border border-slate-200 py-3.5 rounded-xl flex-row items-center justify-center gap-2 active:bg-slate-50">
              <Feather name="settings" size={16} color="#64748b" />
              <Text className="text-slate-700 font-medium text-sm">Manage Roles</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Stat Cards */}
        <View className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-100 mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-4">
            <View className="w-12 h-12 bg-indigo-50 rounded-2xl items-center justify-center">
              <Feather name="users" size={20} color="#4f46e5" />
            </View>
            <View>
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Active Members</Text>
              <Text className="text-slate-800 font-bold text-xl">{stats.activeMembers}</Text>
            </View>
          </View>
          <Text className="text-emerald-500 text-xs font-medium">↗ +{members.length} this week</Text>
        </View>

        <View className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-100 mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-4">
            <View className="w-12 h-12 bg-purple-50 rounded-2xl items-center justify-center">
              <Feather name="check-circle" size={20} color="#9333ea" />
            </View>
            <View>
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Open Tasks</Text>
              <Text className="text-slate-800 font-bold text-xl">{stats.openTasks}</Text>
            </View>
          </View>
          <Text className="text-slate-400 text-xs font-medium">{stats.openTasks > 0 ? `! ${stats.openTasks} high priority` : 'All caught up'}</Text>
        </View>

        <View className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-100 mb-6 flex-row items-center justify-between">
          <View className="flex-row items-center gap-4">
            <View className="w-12 h-12 bg-orange-50 rounded-2xl items-center justify-center">
              <Feather name="zap" size={20} color="#f97316" />
            </View>
            <View>
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Productivity Score</Text>
              <Text className="text-slate-800 font-bold text-xl">{stats.productivityScore}%</Text>
            </View>
          </View>
          <Text className="text-slate-400 text-xs font-medium">-- from last mo.</Text>
        </View>

        {/* Dynamic Team Members List */}
        <View className="flex-row items-center justify-between mb-4 mt-2">
          <Text className="text-slate-800 font-bold text-base">Team Members</Text>
          <TouchableOpacity>
            <Text className="text-indigo-600 text-sm font-medium">View All Directory</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-[20px] shadow-sm border border-slate-100 overflow-hidden mb-6">
          <View className="flex-row items-center px-5 py-3 bg-slate-50/50 border-b border-slate-100">
            <Text className="flex-1 text-slate-400 text-xs font-bold uppercase tracking-wider">Member</Text>
            <Text className="w-24 text-slate-400 text-xs font-bold uppercase tracking-wider">Role</Text>
          </View>
          
          {members.length === 0 ? (
            <View className="px-5 py-10 items-center justify-center">
              <View className="w-16 h-16 bg-slate-50 rounded-full items-center justify-center mb-3">
                <Feather name="user-x" size={28} color="#cbd5e1" />
              </View>
              <Text className="text-slate-500 font-medium mb-1">No members yet</Text>
              <Text className="text-slate-400 text-xs text-center px-6">
                Share your invite code {teamCode ? `(${teamCode})` : ''} with your team so they can join your workspace.
              </Text>
            </View>
          ) : (
            members.map((member, index) => (
              <View 
                key={member.id} 
                className={`flex-row items-center px-5 py-4 ${index !== members.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <View className="flex-1 flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center">
                    <Text className="text-indigo-600 font-bold text-xs">{member.member_name.substring(0,2).toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text className="text-slate-800 font-bold text-sm">{member.member_name}</Text>
                  </View>
                </View>
                <View className="w-24 flex-row items-center justify-between">
                  <Text className="text-slate-600 text-sm font-medium">{member.roles?.role_name || 'Member'}</Text>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>

      {/* Notifications Modal */}
      <Modal visible={showNotifications} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl min-h-[50%] p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-slate-800">Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)} className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center">
                <Feather name="x" size={16} color="#475569" />
              </TouchableOpacity>
            </View>

            {pendingMembers.length === 0 ? (
              <View className="items-center justify-center py-10">
                <Text className="text-slate-400">No new notifications</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {pendingMembers.map(member => (
                  <View key={member.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
                    <Text className="text-indigo-600 font-bold text-xs mb-1 uppercase tracking-wider">New Joining Request</Text>
                    <Text className="text-slate-800 font-bold text-lg mb-1">{member.member_name}</Text>
                    <Text className="text-slate-500 text-sm mb-4">Wants to join as <Text className="font-bold">{member.roles?.role_name || 'Member'}</Text></Text>
                    
                    <View className="flex-row gap-3">
                      <TouchableOpacity 
                        onPress={() => handleDecline(member.id)}
                        className="flex-1 bg-white border border-red-200 py-3 rounded-xl items-center"
                      >
                        <Text className="text-red-500 font-bold">Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleApprove(member.id)}
                        className="flex-1 bg-indigo-600 py-3 rounded-xl items-center shadow-sm"
                      >
                        <Text className="text-white font-bold">Accept</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
