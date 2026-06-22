import { View, Text, TouchableOpacity, ScrollView, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

// Define the Member type for our dynamic list
type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  status: 'active' | 'away' | 'offline';
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { teamCode, teamName } = useLocalSearchParams<{ teamCode: string, teamName: string }>();

  // Dynamic States for the Dashboard
  const [stats, setStats] = useState({
    activeMembers: 1, // Starts with 1 (the manager)
    openTasks: 0,
    productivityScore: 0
  });

  // Empty by default until members join using the invite code
  const [members, setMembers] = useState<Member[]>([]);

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FE]">
      <StatusBar barStyle="dark-content" />
      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-extrabold text-slate-800">TeamLens</Text>
          <View className="flex-row items-center gap-4">
            <View className="w-10 h-10 items-center justify-center">
              <Text className="text-indigo-600 text-xl">🔔</Text>
              <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            </View>
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
              <Text className="text-slate-400">📋</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-3">
            <TouchableOpacity className="flex-1 bg-indigo-600 py-3.5 rounded-xl flex-row items-center justify-center gap-2 shadow-sm shadow-indigo-200 active:bg-indigo-700">
              <Text className="text-white text-sm">👤+</Text>
              <Text className="text-white font-bold text-sm">Invite More</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-white border border-slate-200 py-3.5 rounded-xl flex-row items-center justify-center gap-2 active:bg-slate-50">
              <Text className="text-slate-500 text-sm">⚙️</Text>
              <Text className="text-slate-700 font-medium text-sm">Manage Roles</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Stat Cards */}
        <View className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-100 mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-4">
            <View className="w-12 h-12 bg-indigo-50 rounded-2xl items-center justify-center">
              <Text className="text-indigo-600 text-xl">👥</Text>
            </View>
            <View>
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Active Members</Text>
              <Text className="text-slate-800 font-bold text-xl">{stats.activeMembers}</Text>
            </View>
          </View>
          <Text className="text-emerald-500 text-xs font-medium">↗ +{stats.activeMembers} this week</Text>
        </View>

        <View className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-100 mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-4">
            <View className="w-12 h-12 bg-purple-50 rounded-2xl items-center justify-center">
              <Text className="text-purple-600 text-xl">✓</Text>
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
              <Text className="text-orange-500 text-xl">⚡</Text>
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
            /* Empty State */
            <View className="px-5 py-10 items-center justify-center">
              <View className="w-16 h-16 bg-slate-50 rounded-full items-center justify-center mb-3">
                <Text className="text-slate-300 text-3xl">👋</Text>
              </View>
              <Text className="text-slate-500 font-medium mb-1">No members yet</Text>
              <Text className="text-slate-400 text-xs text-center px-6">
                Share your invite code {teamCode ? `(${teamCode})` : ''} with your team so they can join your workspace.
              </Text>
            </View>
          ) : (
            /* Dynamic Member Mapping */
            members.map((member, index) => (
              <View 
                key={member.id} 
                className={`flex-row items-center px-5 py-4 ${index !== members.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <View className="flex-1 flex-row items-center gap-3">
                  <Image source={{ uri: member.avatar }} className="w-10 h-10 rounded-full bg-slate-200" />
                  <View>
                    <Text className="text-slate-800 font-bold text-sm">{member.name}</Text>
                    <Text className="text-slate-400 text-xs">{member.email}</Text>
                  </View>
                </View>
                <View className="w-24 flex-row items-center justify-between">
                  <Text className="text-slate-600 text-sm font-medium">{member.role}</Text>
                  <View className={`w-2 h-2 rounded-full ${member.status === 'active' ? 'bg-emerald-400' : member.status === 'away' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
