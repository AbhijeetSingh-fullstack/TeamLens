import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../utils/supabase';

export default function CreateTeamScreen() {
  const router = useRouter();
  const [teamName, setTeamName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [roles, setRoles] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!teamName || !orgName || !managerName) {
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
          team_code: generatedCode
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

  const handleTestLogin = async () => {
    if (!testLoginCode) {
      alert("Please enter a team code.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('team_code', testLoginCode.toUpperCase())
        .single();
        
      if (error || !data) {
        throw new Error("Team not found for code: " + testLoginCode);
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
          <View className="w-8 h-8 bg-indigo-600 rounded-lg items-center justify-center">
            <Text className="text-white font-bold text-xs">TL</Text>
          </View>
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
                <Text className="text-slate-800 text-xs font-bold">{isTestLogin ? 'Test Login' : 'Add Team'}</Text>
              </View>
              <Text className="text-2xl font-bold text-slate-800 mb-2">{isTestLogin ? 'Login to Team' : 'New Team Setup'}</Text>
              <Text className="text-slate-500 text-sm leading-5">
                {isTestLogin ? 'Quickly bypass to an existing team dashboard for testing.' : 'Configure the workspace environment for a new team entity within your network.'}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setIsTestLogin(!isTestLogin)}
              className="bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100"
            >
              <Text className="text-indigo-600 text-[10px] font-bold">{isTestLogin ? 'Create Mode' : 'Test Login'}</Text>
            </TouchableOpacity>
          </View>

          {isTestLogin ? (
            /* TEST LOGIN UI */
            <View className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
              <View className="flex-row items-center gap-3 mb-5">
                <View className="bg-green-50 w-10 h-10 rounded-xl items-center justify-center">
                  <Text className="text-green-600 font-bold text-lg">🔑</Text>
                </View>
                <Text className="text-slate-800 font-medium">Testing: Enter Existing Team Code</Text>
              </View>
              <TextInput
                value={testLoginCode}
                onChangeText={setTestLoginCode}
                placeholder="e.g. A1B2C3"
                autoCapitalize="characters"
                className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-3 text-slate-800 mb-4"
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


