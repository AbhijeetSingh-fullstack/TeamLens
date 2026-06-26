import { View, Text, TouchableOpacity, StatusBar, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Redirect } from 'expo-router';
import { useAuth, useClerk, useUser } from '@clerk/clerk-expo';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  
  const [isCheckingAutoLogin, setIsCheckingAutoLogin] = useState(true);

  useEffect(() => {
    async function checkAutoLogin() {
      if (!isLoaded) return;
      if (!isSignedIn || !user) {
        setIsCheckingAutoLogin(false);
        return;
      }

      try {
        // 1. Check if they are an active team member
        const { data: memberData } = await supabase
          .from('team_members')
          .select('team_id, member_name, id, status, teams(team_code, team_name)')
          .eq('user_id', user.id)
          .single();

        if (memberData && memberData.teams && memberData.status !== 'rejected') {
          router.replace({
            pathname: '/(member-tabs)/dashboard',
            params: {
              teamName: memberData.teams.team_name,
              memberName: memberData.member_name,
              memberId: memberData.id,
              teamId: memberData.team_id
            }
          });
          return;
        }

        // 2. Check if they are a manager (by matching their full name as a fallback since there's no manager_id)
        const userFullName = user.fullName || `${user.firstName} ${user.lastName || ''}`.trim();
        const { data: managerData } = await supabase
          .from('teams')
          .select('*')
          .eq('manager_name', userFullName)
          .single();

        if (managerData) {
          router.replace({
            pathname: '/(manager-tabs)/dashboard',
            params: {
              teamCode: managerData.team_code,
              teamName: managerData.team_name
            }
          });
          return;
        }

      } catch (err) {
        console.error("Auto-login error:", err);
      } finally {
        setIsCheckingAutoLogin(false);
      }
    }

    checkAutoLogin();
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded || isCheckingAutoLogin) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F5F7FF]">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  // If not signed in, directly redirect to the login page
  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FF]">
      <StatusBar barStyle="dark-content" />
      
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 30, paddingBottom: 30 }} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* Header / Logo */}
        <View className="items-center mb-8">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 bg-indigo-600 rounded-xl items-center justify-center shadow-sm">
              <Text className="text-white font-extrabold text-lg">⚡</Text>
            </View>
            <Text className="text-2xl font-bold text-slate-800">TeamLens</Text>
          </View>
        </View>

        {/* Title Area */}
        <View className="items-center mb-8">
          <Text className="text-4xl font-extrabold text-center text-slate-900 mb-4 tracking-tight leading-[48px]">
            Welcome to TeamLens. How would you like to start?
          </Text>
          <Text className="text-slate-500 text-center text-base leading-6 px-2">
            Set up your workspace in seconds and start managing team productivity with precision.
          </Text>
        </View>

        {/* Action Cards */}
        <View className="gap-5 mb-8">
          
          {/* Create Team Card */}
          <TouchableOpacity 
            onPress={() => router.push('/create-team')}
            className="w-full bg-white/70 rounded-[32px] p-6 border border-slate-200 shadow-sm active:bg-white"
          >
            <View className="w-14 h-14 bg-indigo-50 rounded-2xl items-center justify-center mb-4 border border-indigo-100">
              <Text className="text-indigo-600 text-2xl">👥</Text>
            </View>
            <Text className="text-2xl font-bold text-slate-900 mb-2">Create a Team</Text>
            <Text className="text-slate-500 text-sm leading-6 mb-5">
              Start a new team, invite members, and manage productivity. Perfect for managers, founders, and administrators.
            </Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-indigo-700 font-bold text-base">Get Started</Text>
              <Text className="text-indigo-700 font-bold text-lg">→</Text>
            </View>
          </TouchableOpacity>

          {/* Join Team Card */}
          <TouchableOpacity 
            onPress={() => router.push('/join-team')}
            className="w-full bg-white/70 rounded-[32px] p-6 border border-slate-200 shadow-sm active:bg-white"
          >
            <View className="w-14 h-14 bg-indigo-50 rounded-2xl items-center justify-center mb-4 border border-indigo-100">
              <Text className="text-indigo-600 text-2xl">➡️</Text>
            </View>
            <Text className="text-2xl font-bold text-slate-900 mb-2">Join a Team</Text>
            <Text className="text-slate-500 text-sm leading-6 mb-5">
              Enter your organization code to join your team and start tracking tasks. For team members and employees.
            </Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-indigo-700 font-bold text-base">Connect Now</Text>
              <Text className="text-indigo-700 font-bold text-lg">→</Text>
            </View>
          </TouchableOpacity>

          {/* Test Login Card */}
          <TouchableOpacity 
            onPress={() => router.push('/test-login')}
            className="w-full bg-white/70 rounded-[32px] p-6 border border-slate-200 shadow-sm active:bg-white"
          >
            <View className="w-14 h-14 bg-emerald-50 rounded-2xl items-center justify-center mb-4 border border-emerald-100">
              <Text className="text-emerald-600 text-2xl">🔑</Text>
            </View>
            <Text className="text-2xl font-bold text-slate-900 mb-2">Test Login</Text>
            <Text className="text-slate-500 text-sm leading-6 mb-5">
              Already approved? Enter your team code to instantly log back in as an existing employee.
            </Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-emerald-700 font-bold text-base">Login Now</Text>
              <Text className="text-emerald-700 font-bold text-lg">→</Text>
            </View>
          </TouchableOpacity>
          
        </View>

        {/* Footer Area */}
        <View className="items-center gap-3 mt-auto pt-6">
          {isSignedIn && (
            <TouchableOpacity onPress={() => signOut()} className="flex-row items-center gap-2">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">↳ SIGN OUT</Text>
            </TouchableOpacity>
          )}
          
          <Text className="text-slate-400 text-[10px] mt-4 font-medium">
            TeamLens Platform v1.0.0 • Secure Enterprise Onboarding
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}







