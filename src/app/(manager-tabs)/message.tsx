import { View, Text, TouchableOpacity, FlatList, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';

export default function ManagerMessageScreen() {
  const router = useRouter();
  const { teamCode } = useGlobalSearchParams<{ teamCode: string }>();

  const [teamData, setTeamData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      if (!teamCode) return;
      const { data } = await supabase
        .from('teams')
        .select('*')
        .eq('team_code', teamCode)
        .single();
        
      if (data) {
        setTeamData(data);
        fetchMembers(data.id);
      }
    };
    fetchTeam();
  }, [teamCode]);

  const fetchMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*, roles(role_name)')
        .eq('team_id', teamId)
        .eq('status', 'approved');
        
      if (!error && data) {
        setMembers(data);
      }
    } catch (e) {
      console.log('Error fetching members:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageMember = (member: any) => {
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: member.id,
        receiverName: member.member_name,
        teamId: teamData.id,
        senderId: 'manager',
        senderName: teamData.manager_name
      }
    });
  };

  const renderMember = ({ item }: { item: any }) => (
    <TouchableOpacity 
      onPress={() => handleMessageMember(item)}
      className="bg-white p-4 rounded-2xl mb-3 shadow-sm border border-slate-100 flex-row items-center justify-between"
    >
      <View className="flex-row items-center gap-3">
        <View className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 items-center justify-center">
          <Feather name="user" size={20} color="#4f46e5" />
        </View>
        <View>
          <Text className="text-slate-800 font-bold text-base">{item.member_name}</Text>
          <Text className="text-indigo-600 text-xs font-semibold">{item.roles?.role_name || 'Member'}</Text>
        </View>
      </View>
      <View className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center">
        <Feather name="message-circle" size={18} color="#64748b" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F9F9FB]">
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="px-5 py-4 border-b border-slate-200 bg-white flex-row items-center justify-between z-10">
        <View>
          <Text className="text-xl font-bold text-slate-800">Messages</Text>
          <Text className="text-slate-500 text-xs font-medium">{teamData?.team_name || 'Loading...'}</Text>
        </View>
        <View className="bg-indigo-50 w-10 h-10 rounded-full items-center justify-center border border-indigo-100">
          <Feather name="search" size={18} color="#4f46e5" />
        </View>
      </View>

      <View className="px-5 pt-4 pb-2">
        <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider">Select a Team Member</Text>
      </View>

      {/* Members Directory */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={item => item.id}
          renderItem={renderMember}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="items-center justify-center mt-10">
              <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
                <Feather name="users" size={24} color="#94a3b8" />
              </View>
              <Text className="text-slate-500 font-medium">No team members yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
