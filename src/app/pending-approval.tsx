import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function PendingApprovalScreen() {
  const router = useRouter();
  const { teamName, memberName, roleName } = useLocalSearchParams<{ teamName: string, memberName: string, roleName: string }>();

  useEffect(() => {
    // Poll the team_members table to check if this user has been approved
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('team_members')
          .select('id, team_id, status')
          .eq('member_name', memberName)
          .eq('status', 'approved')
          .single();

        if (data && data.status === 'approved') {
          router.replace({
            pathname: '/(member-tabs)/dashboard',
            params: { teamName, memberName, roleName, memberId: data.id, teamId: data.team_id }
          });
        }
      } catch (err) {
        // Still pending or error, do nothing
      }
    };

    const intervalId = setInterval(checkStatus, 3000);
    return () => clearInterval(intervalId);
  }, [memberName, teamName, roleName]);

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FE] items-center justify-center px-6">
      <View className="bg-white rounded-3xl p-8 items-center shadow-sm border border-slate-100 w-full">
        <View className="w-20 h-20 bg-indigo-50 rounded-full items-center justify-center mb-6 border-4 border-indigo-100">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
        
        <Text className="text-2xl font-bold text-slate-800 text-center mb-3">
          Waiting for Approval
        </Text>
        
        <Text className="text-slate-500 text-center text-sm leading-6 mb-2">
          Hi {memberName ? memberName.split(' ')[0] : 'there'}, you've successfully requested to join <Text className="font-bold text-slate-700">{teamName}</Text> as a <Text className="font-bold text-indigo-600">{roleName}</Text>.
        </Text>
        
        <Text className="text-slate-400 text-center text-xs">
          Your manager will review your request shortly. Please hold tight, you will be redirected automatically once approved!
        </Text>
      </View>
    </SafeAreaView>
  );
}
