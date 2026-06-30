import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../utils/supabase';
import { useUser } from '@clerk/clerk-expo';

export default function CreateTeamScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [teamName, setTeamName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [workspacePassword, setWorkspacePassword] = useState('');
  const [roles, setRoles] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.fullName) {
      setManagerName(user.fullName);
    } else if (user?.firstName) {
      setManagerName(`${user.firstName} ${user.lastName || ''}`.trim());
    }
  }, [user]);

  const handleAddRole = () => {
    setRoles([...roles, '']);
  };

  const handleRemoveRole = (index: number) => {
    const newRoles = roles.filter((_, i) => i !== index);
    setRoles(newRoles);
  };

  const handleRoleChange = (text: string, index: number) => {
    const newRoles = [...roles];
    newRoles[index] = text;
    setRoles(newRoles);
  };

  const handleCreateTeam = async () => {
    if (!teamName || !orgName || !managerName || !workspacePassword) {
      alert("Please fill in all required fields.");
      return;
    }
    const validRoles = roles.filter(role => role.trim() !== '');

    // Generate 6 character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let generatedCode = '';
    for (let i = 0; i < 6; i++) {
      generatedCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    setIsSubmitting(true);
    try {
      // 1. Insert Organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([{ organization_name: orgName }])
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Insert Team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert([{ 
          organization_id: orgData.id, 
          team_name: teamName, 
          manager_name: managerName,
          team_code: generatedCode,
          workspace_password: workspacePassword
        }])
        .select()
        .single();

      if (teamError) throw teamError;

      // 3. Insert Roles
      if (validRoles.length > 0) {
        const rolesToInsert = validRoles.map(role => ({
          team_id: teamData.id,
          role_name: role
        }));

        const { error: rolesError } = await supabase
          .from('roles')
          .insert(rolesToInsert);

        if (rolesError) throw rolesError;
      }

      // 4. Save to local storage for auto-login using the current user's ID
      if (user) {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        await AsyncStorage.setItem(`manager_team_${user.id}`, JSON.stringify({
          teamCode: generatedCode,
          teamName: teamName
        }));
      }

      router.push({
        pathname: '/(manager-tabs)/dashboard',
        params: { teamCode: generatedCode, teamName: teamName }
      });
    } catch (error: any) {
      console.error('Error creating team:', error.message);
      alert('Failed to create team: ' + error.message);
      setIsSubmitting(false);
    }
  };

  const [isTestLogin, setIsTestLogin] = useState(false);
  const [testLoginCode, setTestLoginCode] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleTestLogin = async () => {
    if (!testLoginCode || !loginPassword) {
      alert("Please enter both team code and password.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('team_code', testLoginCode.toUpperCase())
        .eq('workspace_password', loginPassword)
        .single();
        
      if (error || !data) {
        throw new Error("Invalid team code or password.");
      }

      if (user) {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        await AsyncStorage.setItem(`manager_team_${user.id}`, JSON.stringify({
          teamCode: data.team_code,
          teamName: data.team_name
        }));
      }

      router.push({
        pathname: '/(manager-tabs)/dashboard',
        params: { teamCode: data.team_code, teamName: data.team_name }
      });
      // Do not set isSubmitting to false here, to avoid updating an unmounted component
    } catch (err: any) {
      alert(err.message);
      setIsSubmitting(false);
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
          
          {/* Breadcrumb & Title Area */}
          <View className="mb-6 flex-row justify-between items-start">
            <View className="flex-1 pr-4">
              <View className="flex-row items-center gap-2 mb-3">
                <Text className="text-indigo-600 text-xs font-semibold">Admin</Text>
                <Text className="text-slate-400 text-xs">{'>'}</Text>
                <Text className="text-slate-800 text-xs font-bold">{isTestLogin ? 'Manager Login' : 'Add Team'}</Text>
              </View>
              <Text className="text-2xl font-bold text-slate-800 mb-2">{isTestLogin ? 'Sign in to existing workspace' : 'New Team Setup'}</Text>
              <Text className="text-slate-500 text-sm leading-5">
                {isTestLogin ? 'Log back into a workspace you created using your team code and password.' : 'Configure the workspace environment for a new team entity within your network.'}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setIsTestLogin(!isTestLogin)}
              className="bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100"
            >
              <Text className="text-indigo-600 text-[10px] font-bold">{isTestLogin ? 'Create Mode' : 'Manager Login'}</Text>
            </TouchableOpacity>
          </View>

          {isTestLogin ? (
            /* TEST LOGIN UI */
            <View className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
              <View className="flex-row items-center gap-3 mb-5">
                <View className="bg-green-50 w-10 h-10 rounded-xl items-center justify-center">
                  <Text className="text-green-600 font-bold text-lg">🔑</Text>
                </View>
                <Text className="text-slate-800 font-medium">Workspace Login</Text>
              </View>
              
              <Text className="text-slate-500 text-sm mb-2">Team Code</Text>
              <TextInput
                value={testLoginCode}
                onChangeText={setTestLoginCode}
                placeholder="e.g. A1B2C3"
                autoCapitalize="characters"
                className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-3 text-slate-800 mb-4"
                placeholderTextColor="#94a3b8"
              />

              <Text className="text-slate-500 text-sm mb-2">Workspace Password</Text>
              <TextInput
                value={loginPassword}
                onChangeText={setLoginPassword}
                placeholder="Enter workspace password"
                secureTextEntry
                className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-3 text-slate-800 mb-6"
                placeholderTextColor="#94a3b8"
              />

              <TouchableOpacity 
                onPress={handleTestLogin}
                disabled={isSubmitting}
                className={`w-full py-4 rounded-xl items-center shadow-md ${isSubmitting ? 'bg-indigo-400' : 'bg-indigo-600 active:bg-indigo-700'}`}
              >
                <Text className="text-white font-bold text-base">
                  {isSubmitting ? 'Loading...' : 'Login to Dashboard'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* CREATE TEAM UI */
            <>
              {/* Card 1: Organization & Team Details */}
              <View className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
                
                <View className="flex-row items-center gap-3 mb-5">
                  <View className="bg-indigo-50 w-10 h-10 rounded-xl items-center justify-center">
                    {/* Placeholder icon */}
                    <Text className="text-indigo-600 font-bold text-lg">🏢</Text>
                  </View>
                  <Text className="text-slate-800 font-medium">Team Details</Text>
                </View>

                <View className="gap-4">
                  {/* Organization Name */}
                  <View>
                    <Text className="text-slate-500 text-sm mb-2">Organization Name</Text>
                    <TextInput
                      value={orgName}
                      onChangeText={setOrgName}
                      placeholder="e.g. Acme Global Industries"
                      className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-3 text-slate-800"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  
                  {/* Team Name */}
                  <View>
                    <Text className="text-slate-500 text-sm mb-2">Team Name</Text>
                    <TextInput
                      value={teamName}
                      onChangeText={setTeamName}
                      placeholder="e.g. Product Engineering"
                      className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-3 text-slate-800"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  {/* Manager Name */}
                  <View>
                    <Text className="text-slate-500 text-sm mb-2">Manager Name</Text>
                    <TextInput
                      value={managerName}
                      onChangeText={setManagerName}
                      placeholder="Search by name or email..."
                      className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-3 text-slate-800"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  {/* Workspace Password */}
                  <View>
                    <Text className="text-slate-500 text-sm mb-2">Workspace Password</Text>
                    <TextInput
                      value={workspacePassword}
                      onChangeText={setWorkspacePassword}
                      placeholder="Set a password for your workspace"
                      secureTextEntry
                      className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-3 text-slate-800"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>
              </View>

              {/* Card 2: Roles */}
              <View className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                
                <View className="flex-row items-center gap-3 mb-5">
                  <View className="bg-indigo-50 w-10 h-10 rounded-xl items-center justify-center">
                    <Text className="text-indigo-600 font-bold text-lg">🛡️</Text>
                  </View>
                  <Text className="text-slate-800 font-medium">Roles Configuration</Text>
                </View>

                <View className="gap-3 mb-4">
                  {roles.map((role, index) => (
                    <View key={index} className="flex-row items-center gap-2">
                      <TextInput
                        value={role}
                        onChangeText={(text) => handleRoleChange(text, index)}
                        placeholder={`e.g. Software Engineer`}
                        className="flex-1 bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-3 text-slate-800"
                        placeholderTextColor="#94a3b8"
                      />
                      {roles.length > 1 && (
                        <TouchableOpacity 
                          onPress={() => handleRemoveRole(index)}
                          className="p-3 bg-red-50 rounded-xl border border-red-100"
                        >
                          <Text className="text-red-500 font-medium text-xs">Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>

                <TouchableOpacity 
                  onPress={handleAddRole}
                  className="py-3 rounded-xl border border-indigo-200 bg-indigo-50/50 items-center"
                >
                  <Text className="text-indigo-600 font-medium text-sm">+ Add Role</Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity 
                onPress={handleCreateTeam}
                disabled={isSubmitting}
                className={`w-full py-4 rounded-xl items-center shadow-md mt-8 ${isSubmitting ? 'bg-indigo-400' : 'bg-indigo-600 active:bg-indigo-700'}`}
              >
                <Text className="text-white font-bold text-base">
                  {isSubmitting ? 'Creating...' : 'Create Team Workspace'}
                </Text>
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


