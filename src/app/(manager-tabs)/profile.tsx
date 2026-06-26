import { View, Text, TouchableOpacity, ScrollView, StatusBar, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useClerk, useUser } from '@clerk/clerk-expo';

export default function ManagerProfile() {
  const { teamCode, teamName } = useGlobalSearchParams<{ teamCode: string, teamName: string }>();
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();

  const [managerName, setManagerName] = useState('Manager');
  const [orgName, setOrgName] = useState('Organization');
  const [displayTeamCode, setDisplayTeamCode] = useState(teamCode || '');
  const [displayTeamName, setDisplayTeamName] = useState(teamName || '');
  const [stats, setStats] = useState({
    activeMembers: 0,
    openTasks: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      let codeToFetch = teamCode || displayTeamCode;
      
      if (!codeToFetch) {
        // Fallback for hot reloading
        const { data: latestTeam } = await supabase
          .from('teams')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (latestTeam) {
          codeToFetch = latestTeam.team_code;
          setDisplayTeamCode(latestTeam.team_code);
          setDisplayTeamName(latestTeam.team_name);
        } else {
          return;
        }
      }

      // Fetch team data
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('team_code', codeToFetch)
        .single();

      if (teamData) {
        setDisplayTeamCode(teamData.team_code);
        setDisplayTeamName(teamData.team_name);
        setManagerName(teamData.manager_name);
        
        if (teamData.organization_id) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('organization_name')
            .eq('id', teamData.organization_id)
            .single();
            
          if (orgData) {
            setOrgName(orgData.organization_name);
          }
        }

        // Fetch stats
        const { count: membersCount } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamData.id)
          .eq('status', 'approved');

        const { count: tasksCount } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamData.id)
          .eq('status', 'open');

        setStats({
          activeMembers: (membersCount || 0) + 1,
          openTasks: tasksCount || 0
        });
      }
    };

    fetchData();
  }, [teamCode]);

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to log out of the manager dashboard?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace('/');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9F9FB]">
      <StatusBar barStyle="dark-content" />
      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8">
          <Text className="text-xl font-bold text-slate-800">Profile</Text>
          <TouchableOpacity onPress={handleSignOut} className="w-10 h-10 bg-white rounded-full items-center justify-center border border-slate-200 shadow-sm">
            <Feather name="log-out" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 items-center mb-6">
          <View className="w-24 h-24 rounded-full bg-slate-200 overflow-hidden border-4 border-indigo-50 mb-4 relative">
             <Image source={{ uri: user?.imageUrl || `https://ui-avatars.com/api/?name=${user?.firstName || managerName}&background=4f46e5&color=fff&size=200` }} className="w-full h-full" />
          </View>
          <Text className="text-2xl font-bold text-slate-800 mb-1">{user?.fullName || managerName}</Text>
          <View className="bg-emerald-50 px-3 py-1 rounded-full mb-4 border border-emerald-100 flex-row items-center gap-1">
            <Feather name="shield" size={12} color="#10b981" />
            <Text className="text-emerald-600 font-bold text-xs uppercase tracking-wider">Creator</Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => router.push('/edit-profile')}
            className="flex-row items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200"
          >
            <Feather name="edit-2" size={14} color="#475569" />
            <Text className="text-slate-600 font-bold text-xs">Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Workspace Info */}
        <Text className="text-slate-800 font-bold text-lg mb-4">Workspace Details</Text>
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
          
          <View className="flex-row items-center justify-between border-b border-slate-50 pb-4 mb-4">
            <View>
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">TEAM NAME</Text>
              <Text className="text-slate-800 font-bold text-base">{displayTeamName}</Text>
            </View>
            <View className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center">
              <Feather name="flag" size={18} color="#64748b" />
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">TEAM CODE</Text>
              <Text className="text-indigo-600 font-bold text-xl tracking-[0.2em]">{displayTeamCode}</Text>
            </View>
            <TouchableOpacity className="bg-indigo-50 px-3 py-2 rounded-xl">
              <Text className="text-indigo-600 font-bold text-xs">Share</Text>
            </TouchableOpacity>
          </View>
          
        </View>

        {/* Quick Stats */}
        <Text className="text-slate-800 font-bold text-lg mb-4">Team Overview</Text>
        <View className="flex-row gap-4 mb-6">
          <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mb-3">
              <Feather name="users" size={18} color="#3b82f6" />
            </View>
            <Text className="text-2xl font-extrabold text-slate-800 mb-1">{stats.activeMembers}</Text>
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Members</Text>
          </View>

          <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center mb-3">
              <Feather name="list" size={18} color="#f97316" />
            </View>
            <Text className="text-2xl font-extrabold text-slate-800 mb-1">{stats.openTasks}</Text>
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Open Tasks</Text>
          </View>
        </View>

        {/* Settings Links */}
        <Text className="text-slate-800 font-bold text-lg mb-4">Settings</Text>
        <View className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <TouchableOpacity 
            onPress={() => router.push({ pathname: '/(manager-tabs)/workspace-settings', params: { teamCode: displayTeamCode } })}
            className="flex-row items-center justify-between p-4 border-b border-slate-50"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-full bg-indigo-50 items-center justify-center">
                <Feather name="settings" size={16} color="#4f46e5" />
              </View>
              <Text className="text-slate-700 font-medium text-sm">Workspace Settings</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#cbd5e1" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => router.push('/privacy-policy')}
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center">
                <Feather name="shield" size={16} color="#64748b" />
              </View>
              <Text className="text-slate-700 font-medium text-sm">Privacy Policy</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
