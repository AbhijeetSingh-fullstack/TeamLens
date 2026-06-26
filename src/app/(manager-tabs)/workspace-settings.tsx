import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase';

type RoleInfo = {
  id: string;
  team_id: string;
  role_name: string;
};

export default function WorkspaceSettingsScreen() {
  const router = useRouter();
  const { teamCode } = useGlobalSearchParams<{ teamCode: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    fetchData();
  }, [teamCode]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Get team details
      let codeToFetch = teamCode;
      
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
        } else {
          setIsLoading(false);
          return;
        }
      }

      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('team_code', codeToFetch)
        .single();

      if (teamError) throw teamError;

      setTeamId(teamData.id);
      setTeamName(teamData.team_name);

      // 2. Get roles for this team
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .eq('team_id', teamData.id)
        .order('created_at', { ascending: true });

      if (rolesError) throw rolesError;
      
      setRoles(rolesData || []);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTeamName = async () => {
    if (!teamId || !teamName.trim()) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('teams')
        .update({ team_name: teamName.trim() })
        .eq('id', teamId);
        
      if (error) throw error;
      Alert.alert("Success", "Workspace name updated!");
    } catch (error: any) {
      Alert.alert("Error", "Failed to update workspace name.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRole = async () => {
    if (!teamId || !newRole.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('roles')
        .insert([{ team_id: teamId, role_name: newRole.trim() }])
        .select()
        .single();
        
      if (error) throw error;
      
      setRoles([...roles, data]);
      setNewRole('');
    } catch (error: any) {
      Alert.alert("Error", "Failed to add role.");
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    Alert.alert(
      "Delete Role",
      `Are you sure you want to delete the role "${roleName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('roles')
                .delete()
                .eq('id', roleId);
                
              if (error) throw error;
              setRoles(roles.filter(r => r.id !== roleId));
            } catch (error: any) {
              Alert.alert("Error", "Failed to delete role. It may be assigned to members.");
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F8F9FE]">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FE]">
      <StatusBar barStyle="dark-content" />
      
      {/* Header Bar */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-slate-200/50 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2">
          <Feather name="arrow-left" size={24} color="#334155" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-800">Workspace Settings</Text>
        <View className="w-10 h-10" />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          
          <View className="mb-8">
            <Text className="text-slate-800 font-extrabold text-2xl mb-1">General</Text>
            <Text className="text-slate-500 text-sm">Update your workspace identity and structure.</Text>
          </View>

          {/* Workspace Name Section */}
          <View className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-6">
            <Text className="text-slate-600 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Workspace Name</Text>
            <View className="flex-row items-center gap-3">
              <TextInput
                value={teamName}
                onChangeText={setTeamName}
                placeholder="E.g. Engineering Team"
                className="flex-1 bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-3 text-slate-800 font-medium"
                placeholderTextColor="#94a3b8"
              />
              <TouchableOpacity 
                onPress={handleUpdateTeamName}
                disabled={isSaving}
                className="bg-indigo-600 px-5 py-3.5 rounded-xl shadow-sm"
              >
                {isSaving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white font-bold text-sm">Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Roles Management Section */}
          <Text className="text-slate-800 font-extrabold text-xl mb-4 mt-2">Manage Roles</Text>
          
          <View className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-6">
            
            {/* Add New Role */}
            <View className="flex-row items-center gap-3 mb-6">
              <TextInput
                value={newRole}
                onChangeText={setNewRole}
                placeholder="New role name (e.g. Designer)"
                className="flex-1 bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-3 text-slate-800 font-medium"
                placeholderTextColor="#94a3b8"
              />
              <TouchableOpacity 
                onPress={handleAddRole}
                disabled={!newRole.trim()}
                className={`px-4 py-3.5 rounded-xl shadow-sm ${newRole.trim() ? 'bg-indigo-100' : 'bg-slate-100'}`}
              >
                <Text className={`font-bold text-sm ${newRole.trim() ? 'text-indigo-700' : 'text-slate-400'}`}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* List Roles */}
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3 ml-1">Current Roles ({roles.length})</Text>
            
            {roles.length === 0 ? (
              <Text className="text-slate-500 italic py-2">No roles configured.</Text>
            ) : (
              <View className="gap-2">
                {roles.map(role => (
                  <View key={role.id} className="flex-row items-center justify-between bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                    <View className="flex-row items-center gap-3">
                      <View className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center border border-slate-100">
                        <Feather name="briefcase" size={14} color="#64748b" />
                      </View>
                      <Text className="text-slate-800 font-bold">{role.role_name}</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => handleDeleteRole(role.id, role.role_name)}
                      className="w-8 h-8 items-center justify-center rounded-lg active:bg-red-50"
                    >
                      <Feather name="trash-2" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
