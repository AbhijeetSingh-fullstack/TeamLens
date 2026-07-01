import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../utils/supabase';
import { useUser } from '@clerk/clerk-expo';

type TeamInfo = {
  id: string;
  team_name: string;
  organization_id: string;
};

type RoleInfo = {
  id: string;
  role_name: string;
};

export default function JoinTeamScreen() {
  const router = useRouter();
  const { user } = useUser();
  
  // Step 1 State
  const [teamCode, setTeamCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [availableRoles, setAvailableRoles] = useState<RoleInfo[]>([]);

  // Step 2 State
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');

  useEffect(() => {
    if (user) {
      if (user.fullName) {
        setMemberName(user.fullName);
      } else if (user.firstName) {
        setMemberName(`${user.firstName} ${user.lastName || ''}`.trim());
      }
      if (user.primaryEmailAddress) {
        setMemberEmail(user.primaryEmailAddress.emailAddress);
      }
    }
  }, [user]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const handleVerifyCode = async () => {
    if (!teamCode || teamCode.length < 6) {
      alert("Please enter a valid 6-character team code.");
      return;
    }

    setIsVerifying(true);
    try {
      // Find the team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('team_code', teamCode.toUpperCase())
        .single();

      if (teamError || !teamData) {
        console.error('TEAM JOIN ERROR:', teamError);
        throw new Error("Invalid team code. Please check and try again.");
      }

      if (teamData.is_locked) {
        throw new Error("This team is currently locked and not accepting new applications.");
      }

      setTeamInfo(teamData);

      // Find the roles for this team
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .eq('team_id', teamData.id);

      if (rolesError) throw rolesError;
      
      setAvailableRoles(rolesData || []);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!memberName || !memberEmail || !selectedRoleId || !teamInfo) {
      alert("Please fill in all details and select a role.");
      return;
    }

    setIsJoining(true);
    try {
      const selectedRole = availableRoles.find(r => r.id === selectedRoleId);

      // Insert member into team_members table
      // Note: This will likely fail with a user_id constraint error since we don't have auth yet.
      const { data: insertedMember, error: joinError } = await supabase
        .from('team_members')
        .insert([{
          team_id: teamInfo.id,
          user_id: user?.id,
          member_name: memberName,
          role_id: selectedRoleId,
          status: 'pending',
          profile_image_url: user?.imageUrl
        }])
        .select()
        .single();

      if (joinError) {
        throw new Error(joinError.message);
      }

      if (user && insertedMember) {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        await AsyncStorage.setItem(`member_team_${user.id}`, JSON.stringify({
          memberId: insertedMember.id
        }));
      }

      if (teamInfo.organization_id) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('created_by')
          .eq('id', teamInfo.organization_id)
          .single();
          
        if (orgData && orgData.created_by) {
          const { sendExpoPushNotification } = await import('../utils/notifications');
          await sendExpoPushNotification({
            recipientUserId: orgData.created_by,
            title: 'New Team Member Request',
            body: `${memberName} has requested to join your team.`,
            data: { type: 'join_request' }
          });
        }
      }

      // Route to pending approval screen
      router.push({
        pathname: '/pending-approval',
        params: { 
          teamName: teamInfo.team_name,
          memberName: memberName,
          roleName: selectedRole?.role_name || 'Member'
        }
      });
      // Do not set isJoining to false here, to avoid updating an unmounted component
    } catch (error: any) {
      alert('Failed to join team: ' + error.message);
      setIsJoining(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FE]">
      <StatusBar barStyle="dark-content" />
      
      {/* Header Bar */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-slate-200/50 bg-white">
        <View className="flex-row items-center gap-3">
          <Image 
            source={require('../../assets/images/TeamLens.png')} 
            style={{ width: 32, height: 32, borderRadius: 8 }}
            resizeMode="contain"
          />
          <Text className="text-lg font-bold text-slate-900">TeamLens</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-slate-500 font-medium">Cancel</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          
          <View className="mb-6">
            <View className="flex-row items-center gap-2 mb-3">
              <Text className="text-indigo-600 text-xs font-semibold">Join</Text>
              <Text className="text-slate-400 text-xs">{'>'}</Text>
              <Text className="text-slate-800 text-xs font-bold">Connect to Workspace</Text>
            </View>
            <Text className="text-2xl font-bold text-slate-800 mb-2">Join Your Team</Text>
            <Text className="text-slate-500 text-sm leading-5">
              {!teamInfo 
                ? "Enter the 6-character code provided by your team manager to connect to your workspace."
                : `You are joining ${teamInfo.team_name}. Please provide your details and select your role.`}
            </Text>
          </View>

          {!teamInfo ? (
            /* STEP 1: VERIFY CODE */
            <View className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <Text className="text-slate-500 text-sm mb-3 font-medium">Team Invite Code</Text>
              <TextInput
                value={teamCode}
                onChangeText={text => setTeamCode(text.toUpperCase())}
                placeholder="e.g. WP829X"
                maxLength={6}
                autoCapitalize="characters"
                className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-4 text-slate-800 font-bold tracking-widest text-center text-xl mb-6"
                placeholderTextColor="#94a3b8"
              />
              
              <TouchableOpacity 
                onPress={handleVerifyCode}
                disabled={isVerifying}
                className={`w-full py-4 rounded-xl items-center shadow-sm ${isVerifying ? 'bg-indigo-400' : 'bg-indigo-600 active:bg-indigo-700'}`}
              >
                <Text className="text-white font-bold text-base">
                  {isVerifying ? 'Verifying Code...' : 'Verify Code'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* STEP 2: ENTER DETAILS & SELECT ROLE */
            <View>
              {/* User Details */}
              <View className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-5">
                <Text className="text-slate-800 font-bold mb-4 border-b border-slate-100 pb-3">Your Details</Text>
                
                <View className="mb-4">
                  <Text className="text-slate-500 text-xs mb-2 uppercase tracking-wider font-bold">Full Name</Text>
                  <TextInput
                    value={memberName}
                    onChangeText={setMemberName}
                    placeholder="e.g. Alex Rivera"
                    className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-3 text-slate-800"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View>
                  <Text className="text-slate-500 text-xs mb-2 uppercase tracking-wider font-bold">Work Email</Text>
                  <TextInput
                    value={memberEmail}
                    onChangeText={setMemberEmail}
                    placeholder="alex@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-3 text-slate-800"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              {/* Role Selection */}
              <View className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-6">
                <Text className="text-slate-800 font-bold mb-4 border-b border-slate-100 pb-3">Select Your Role</Text>
                
                {availableRoles.length === 0 ? (
                  <Text className="text-slate-500 italic py-2">No roles found for this team.</Text>
                ) : (
                  <View className="gap-3">
                    {availableRoles.map(role => (
                      <TouchableOpacity 
                        key={role.id}
                        onPress={() => setSelectedRoleId(role.id)}
                        className={`flex-row items-center p-4 rounded-xl border ${selectedRoleId === role.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}
                      >
                        <View className={`w-5 h-5 rounded-full border items-center justify-center mr-3 ${selectedRoleId === role.id ? 'border-indigo-600' : 'border-slate-300'}`}>
                          {selectedRoleId === role.id && <View className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                        </View>
                        <Text className={`font-medium ${selectedRoleId === role.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                          {role.role_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <TouchableOpacity 
                onPress={handleJoinTeam}
                disabled={isJoining || !selectedRoleId}
                className={`w-full py-4 rounded-xl items-center shadow-md ${(!selectedRoleId || isJoining) ? 'bg-indigo-300' : 'bg-indigo-600 active:bg-indigo-700'}`}
              >
                <Text className="text-white font-bold text-base">
                  {isJoining ? 'Joining...' : 'Complete Setup & Join'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
