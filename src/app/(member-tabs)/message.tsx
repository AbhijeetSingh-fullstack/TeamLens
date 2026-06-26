import { View, Text, TouchableOpacity, FlatList, StatusBar, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MemberMessageScreen() {
  const router = useRouter();
  const { teamName, memberName, memberId, teamId } = useGlobalSearchParams<{ 
    teamName: string, 
    memberName: string, 
    memberId: string,
    teamId: string
  }>();

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadMap, setUnreadMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchMembers = async () => {
      if (!teamId) return;
      try {
        const { data: teamData } = await supabase
          .from('teams')
          .select('manager_name')
          .eq('id', teamId)
          .single();

        const { data, error } = await supabase
          .from('team_members')
          .select('*, roles(role_name)')
          .eq('team_id', teamId)
          .eq('status', 'approved')
          .neq('id', memberId); // Exclude self
          
        if (!error && data) {
          const managerItem = {
            id: 'manager',
            member_name: teamData?.manager_name || 'Creator',
            roles: { role_name: 'Creator' }
          };
          setMembers([managerItem, ...data]);
        }

        // Fetch unread status
        const { data: latestMessages } = await supabase
          .from('messages')
          .select('sender_id, created_at')
          .eq('receiver_id', memberId)
          .eq('team_id', teamId);

        if (latestMessages) {
          const stored = await AsyncStorage.getItem('lastReadTimes');
          const lastReadTimes = stored ? JSON.parse(stored) : {};
          const unread: Record<string, boolean> = {};
          for (const msg of latestMessages) {
            const senderId = msg.sender_id || 'manager';
            const lastRead = lastReadTimes[senderId] || 0;
            if (new Date(msg.created_at).getTime() > lastRead) {
              unread[senderId] = true;
            }
          }
          setUnreadMap(unread);
        }

      } catch (e) {
        console.log('Error fetching members:', e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMembers();
    const interval = setInterval(fetchMembers, 3000);
    return () => clearInterval(interval);
  }, [teamId, memberId]);

  const handleMessageMember = (member: any) => {
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: member.id,
        receiverName: member.member_name,
        teamId: teamId,
        senderId: memberId,
        senderName: memberName
      }
    });
  };

  const renderMember = ({ item }: { item: any }) => (
    <TouchableOpacity 
      onPress={() => handleMessageMember(item)}
      className={`p-4 rounded-2xl mb-3 shadow-sm border flex-row items-center justify-between ${
        unreadMap[item.id] ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100'
      }`}
    >
      <View className="flex-row items-center gap-3">
        <View className={`w-12 h-12 rounded-full overflow-hidden items-center justify-center ${
          unreadMap[item.id] ? 'bg-white border border-indigo-100' : 'bg-slate-50 border border-slate-100'
        }`}>
          {item.profile_image_url ? (
            <Image source={{ uri: item.profile_image_url }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <Image source={{ uri: `https://ui-avatars.com/api/?name=${item.member_name}&background=4f46e5&color=fff` }} className="w-full h-full" resizeMode="cover" />
          )}
        </View>
        <View>
          <View className="flex-row items-center">
            <Text className={`font-bold text-base ${unreadMap[item.id] ? 'text-indigo-900' : 'text-slate-800'}`}>
              {item.member_name}
            </Text>
            {unreadMap[item.id] && (
              <View className="bg-indigo-500 px-2 py-0.5 rounded-full ml-2">
                <Text className="text-[10px] text-white font-bold tracking-wider">NEW</Text>
              </View>
            )}
          </View>
          <Text className={`text-xs font-semibold ${unreadMap[item.id] ? 'text-indigo-600' : 'text-slate-500'}`}>
            {item.roles?.role_name || 'Member'}
          </Text>
        </View>
      </View>
      <View className={`w-10 h-10 rounded-full items-center justify-center ${
        unreadMap[item.id] ? 'bg-indigo-500 shadow-sm' : 'bg-slate-50'
      }`}>
        <Feather name="message-circle" size={18} color={unreadMap[item.id] ? "white" : "#64748b"} />
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
          <Text className="text-slate-500 text-xs font-medium">{teamName}</Text>
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
              <Text className="text-slate-500 font-medium">No other team members yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
