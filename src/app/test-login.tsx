import { View, Text, TouchableOpacity, StatusBar, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { supabase } from '../utils/supabase';

export default function TestLoginScreen() {
  const router = useRouter();
  const [teamCode, setTeamCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [teamData, setTeamData] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!teamCode.trim()) {
      setError('Please enter a team code');
      return;
    }

    setLoading(true);
    setError('');
    setMembers([]);
    setTeamData(null);

    try {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('team_code', teamCode.trim().toUpperCase())
        .single();

      if (teamError || !team) {
        throw new Error('Team not found');
      }

      setTeamData(team);

      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('*, roles(role_name)')
        .eq('team_id', team.id)
        .eq('status', 'approved');

      if (membersError) throw membersError;

      setMembers(membersData || []);
      if (!membersData || membersData.length === 0) {
        setError('No approved employees found for this team.');
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loginAsMember = async (member: any) => {
    await AsyncStorage.setItem('memberId', member.id);
    await AsyncStorage.setItem('teamId', teamData.id);
    router.replace({
      pathname: '/(member-tabs)/dashboard',
      params: {
        teamName: teamData.team_name,
        memberName: member.member_name,
        roleName: member.roles?.role_name || 'Member',
        memberId: member.id,
        teamId: teamData.id
      }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FF]">
      <StatusBar barStyle="dark-content" />
      <View className="px-5 pt-4 pb-6 flex-row items-center justify-between border-b border-slate-200 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center">
          <Feather name="arrow-left" size={20} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-800">Test Login</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-2xl font-bold text-slate-800 mb-2">Employee Test Login</Text>
        <Text className="text-slate-500 mb-6 text-sm leading-6">
          Enter a team code to view and login as an approved employee. This is a testing utility.
        </Text>

        <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
          <Text className="text-slate-700 font-bold mb-2 text-xs uppercase tracking-wider">Team Code</Text>
          <View className="flex-row gap-3">
            <TextInput
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-semibold"
              placeholder="e.g. LRWCEE"
              placeholderTextColor="#94a3b8"
              value={teamCode}
              onChangeText={setTeamCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity 
              onPress={handleSearch}
              disabled={loading}
              className="bg-indigo-600 rounded-xl px-6 items-center justify-center shadow-sm"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold">Search</Text>
              )}
            </TouchableOpacity>
          </View>
          {error ? <Text className="text-red-500 text-xs mt-2">{error}</Text> : null}
        </View>

        {teamData && (
          <View className="mb-6">
            <Text className="text-slate-800 font-bold text-lg mb-4">
              Select Employee to Login
            </Text>
            
            <View className="gap-3">
              {members.map(member => (
                <TouchableOpacity 
                  key={member.id}
                  onPress={() => loginAsMember(member)}
                  className="bg-white rounded-xl p-4 flex-row items-center justify-between border border-slate-200 shadow-sm"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 items-center justify-center">
                      <Feather name="user" size={20} color="#4f46e5" />
                    </View>
                    <View>
                      <Text className="text-slate-800 font-bold text-base">{member.member_name}</Text>
                      <Text className="text-indigo-600 text-xs font-semibold">{member.roles?.role_name || 'Member'}</Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={20} color="#cbd5e1" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
