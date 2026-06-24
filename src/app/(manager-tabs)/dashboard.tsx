import { View, Text, TouchableOpacity, ScrollView, Image, StatusBar, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Member = {
  id: string;
  member_name: string;
  role_id: string;
  status: string;
  roles?: { role_name: string };
};

export default function ManagerDashboard() {
  const router = useRouter();
  const { teamCode, teamName } = useLocalSearchParams<{ teamCode: string, teamName: string }>();

  const [stats, setStats] = useState({
    activeMembers: 1,
    openTasks: 0,
    productivityScore: 0
  });

  const [members, setMembers] = useState<Member[]>([]);
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [recentCompletions, setRecentCompletions] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [displayTeamCode, setDisplayTeamCode] = useState(teamCode || '');
  const [displayTeamName, setDisplayTeamName] = useState(teamName || '');

  const [showNotifications, setShowNotifications] = useState(false);
  const [showManageTeam, setShowManageTeam] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  // Poll for new members and roles
  useEffect(() => {
    const fetchData = async () => {
      try {
        let codeToFetch = teamCode || displayTeamCode;

        if (!codeToFetch) {
          // Fallback for development hot reloads when URL params are lost
          const { data: latestTeam } = await supabase
            .from('teams')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (latestTeam) {
            codeToFetch = latestTeam.team_code;
            setDisplayTeamCode(latestTeam.team_code);
            setDisplayTeamName(latestTeam.team_name);
          } else {
            return;
          }
        }

        // First get team ID using the code
        const { data: teamData } = await supabase
          .from('teams')
          .select('*')
          .eq('team_code', codeToFetch)
          .single();

        if (teamData) {
          setTeamId(teamData.id);
          setIsLocked(teamData.is_locked || false);
          setDisplayTeamCode(teamData.team_code);
          setDisplayTeamName(teamData.team_name);

          const { data: membersData } = await supabase
            .from('team_members')
            .select('*, roles(role_name)')
            .eq('team_id', teamData.id);

          if (membersData) {
            setMembers(membersData.filter(m => m.status === 'approved' || !m.status));
            setPendingMembers(membersData.filter(m => m.status === 'pending'));

            // Fetch tasks to calculate dynamic stats
            const { data: tasksData } = await supabase
              .from('tasks')
              .select('status')
              .eq('team_id', teamData.id);

            const openTasksCount = tasksData?.filter(t => t.status === 'open').length || 0;
            const completedTasksCount = tasksData?.filter(t => t.status === 'completed').length || 0;
            const totalTasks = tasksData?.length || 0;
            const pScore = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

            setStats({
              activeMembers: 1 + membersData.filter(m => m.status === 'approved').length,
              openTasks: openTasksCount,
              productivityScore: pScore
            });
          }

          const { data: rolesData } = await supabase
            .from('roles')
            .select('*')
            .eq('team_id', teamData.id);
          
          if (rolesData) setRoles(rolesData);

          // Check for unread messages (receiver_id is null for manager)
          const { data: latestMessages } = await supabase
            .from('messages')
            .select('sender_id, created_at')
            .is('receiver_id', null)
            .eq('team_id', teamData.id);

          if (latestMessages) {
            const stored = await AsyncStorage.getItem('lastReadTimes');
            const lastReadTimes = stored ? JSON.parse(stored) : {};
            let hasUnread = false;
            for (const msg of latestMessages) {
              const lastRead = lastReadTimes[msg.sender_id || 'unknown'] || 0;
              if (new Date(msg.created_at).getTime() > lastRead) {
                hasUnread = true;
                break;
              }
            }
            setHasUnreadMessages(hasUnread);
          }

          // Fetch recent task completions
          const { data: completionsData } = await supabase
            .from('task_assignments')
            .select(`
              id,
              status,
              completed_at,
              submission_notes,
              tasks!inner(title, team_id),
              team_members(member_name)
            `)
            .eq('status', 'completed')
            .eq('tasks.team_id', teamData.id)
            .order('completed_at', { ascending: false })
            .limit(5);
            
          if (completionsData) {
            // Only show ones completed in the last 24 hours
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).getTime();
            const recent = completionsData.filter(c => c.completed_at && new Date(c.completed_at).getTime() > oneDayAgo);
            setRecentCompletions(recent);
          }

        }
      } catch (error) {
        console.log('Error fetching data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [teamCode]);

  const handleApprove = async (memberId: string) => {
    try {
      await supabase
        .from('team_members')
        .update({ status: 'approved' })
        .eq('id', memberId);
      
      setPendingMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (e) {
      alert("Failed to approve");
    }
  };

  const handleDecline = async (memberId: string) => {
    try {
      await supabase
        .from('team_members')
        .update({ status: 'declined' })
        .eq('id', memberId);
      
      setPendingMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (e) {
      alert("Failed to decline");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await supabase.from('team_members').delete().eq('id', memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (e) {
      alert("Failed to remove member");
    }
  };

  const handleChangeRole = async (memberId: string, roleId: string) => {
    try {
      await supabase.from('team_members').update({ role_id: roleId }).eq('id', memberId);
      // Let the polling catch the UI update
    } catch (e) {
      alert("Failed to change role");
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim() || !teamId) return;
    try {
      await supabase.from('roles').insert([{ team_id: teamId, role_name: newRoleName.trim() }]);
      setNewRoleName('');
    } catch (e) {
      alert("Failed to add role");
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const isUsed = members.some(m => m.role_id === roleId);
    if (isUsed) {
      alert("Cannot delete a role that is currently assigned to a member.");
      return;
    }
    try {
      await supabase.from('roles').delete().eq('id', roleId);
      setRoles(prev => prev.filter(r => r.id !== roleId));
    } catch (e) {
      alert("Failed to delete role");
    }
  };

  const handleToggleLock = async () => {
    if (!teamId) return;
    try {
      const newStatus = !isLocked;
      setIsLocked(newStatus); // optimistic update
      await supabase.from('teams').update({ is_locked: newStatus }).eq('id', teamId);
    } catch (e) {
      alert("Failed to toggle team lock status");
      setIsLocked(!isLocked); // revert on error
    }
  };


  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FE]">
      <StatusBar barStyle="dark-content" />
      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-extrabold text-slate-800">TeamLens</Text>
          <View className="flex-row items-center gap-4">
            <TouchableOpacity 
              className="w-10 h-10 items-center justify-center relative"
              onPress={() => setShowNotifications(true)}
            >
              <Feather name="bell" size={24} color="#4f46e5" />
              {(pendingMembers.length > 0 || recentCompletions.length > 0) && (
                <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              className="w-10 h-10 items-center justify-center relative"
              onPress={() => router.push({ pathname: '/message', params: { teamCode: displayTeamCode } })}
            >
              <Feather name="message-square" size={24} color="#4f46e5" />
              {hasUnreadMessages && (
                <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Card */}
        <View className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 mb-5">
          <Text className="text-2xl font-bold text-slate-800 mb-2">{displayTeamName || 'Product Design Team'}</Text>
          <Text className="text-slate-500 leading-5 mb-6 text-sm">
            Orchestrating visual excellence and user-centric flows across all TeamLens flagship products.
          </Text>

          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity 
              onPress={handleToggleLock}
              className={`w-14 items-center justify-center rounded-xl border ${isLocked ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}
            >
              <Feather name={isLocked ? "lock" : "unlock"} size={20} color={isLocked ? "#ef4444" : "#10b981"} />
            </TouchableOpacity>
            
            <View className="flex-1 bg-[#F4F5FA] rounded-xl flex-row items-center justify-between p-4 border border-indigo-50">
              <Text className="text-indigo-400 font-bold text-xs uppercase tracking-wider">Invite Code</Text>
              <View className="flex-row items-center gap-3">
                <Text className="text-indigo-600 font-bold text-base tracking-widest">{displayTeamCode || 'WP-829X-92'}</Text>
                <Feather name="copy" size={16} color="#94a3b8" />
              </View>
            </View>
          </View>

          <View className="flex-row items-center gap-3">
            <TouchableOpacity className="flex-1 bg-indigo-600 py-3.5 rounded-xl flex-row items-center justify-center gap-2 shadow-sm shadow-indigo-200 active:bg-indigo-700">
              <Feather name="user-plus" size={16} color="white" />
              <Text className="text-white font-bold text-sm">Invite More</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowManageTeam(true)}
              className="flex-1 bg-white border border-slate-200 py-3.5 rounded-xl flex-row items-center justify-center gap-2 active:bg-slate-50"
            >
              <Feather name="settings" size={16} color="#64748b" />
              <Text className="text-slate-700 font-medium text-sm">Manage Team</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Stat Cards */}
        <View className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-100 mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-4">
            <View className="w-12 h-12 bg-indigo-50 rounded-2xl items-center justify-center">
              <Feather name="users" size={20} color="#4f46e5" />
            </View>
            <View>
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Active Members</Text>
              <Text className="text-slate-800 font-bold text-xl">{stats.activeMembers}</Text>
            </View>
          </View>
          <Text className="text-emerald-500 text-xs font-medium">↗ +{members.length} this week</Text>
        </View>

        <View className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-100 mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-4">
            <View className="w-12 h-12 bg-purple-50 rounded-2xl items-center justify-center">
              <Feather name="check-circle" size={20} color="#9333ea" />
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
              <Feather name="zap" size={20} color="#f97316" />
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
          <TouchableOpacity onPress={() => setShowManageTeam(true)}>
            <Text className="text-indigo-600 text-sm font-medium">View All Directory</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-[20px] shadow-sm border border-slate-100 overflow-hidden mb-6">
          <View className="flex-row items-center px-5 py-3 bg-slate-50/50 border-b border-slate-100">
            <Text className="flex-1 text-slate-400 text-xs font-bold uppercase tracking-wider">Member</Text>
            <Text className="w-24 text-slate-400 text-xs font-bold uppercase tracking-wider">Role</Text>
          </View>
          
          {members.length === 0 ? (
            <View className="px-5 py-10 items-center justify-center">
              <View className="w-16 h-16 bg-slate-50 rounded-full items-center justify-center mb-3">
                <Feather name="user-x" size={28} color="#cbd5e1" />
              </View>
              <Text className="text-slate-500 font-medium mb-1">No members yet</Text>
              <Text className="text-slate-400 text-xs text-center px-6">
                Share your invite code {displayTeamCode ? `(${displayTeamCode})` : ''} with your team so they can join your workspace.
              </Text>
            </View>
          ) : (
            members.map((member, index) => (
              <View 
                key={member.id} 
                className={`flex-row items-center px-5 py-4 ${index !== members.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <View className="flex-1 flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center">
                    <Text className="text-indigo-600 font-bold text-xs">{member.member_name.substring(0,2).toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text className="text-slate-800 font-bold text-sm">{member.member_name}</Text>
                  </View>
                </View>
                <View className="w-24 flex-row items-center justify-between">
                  <Text className="text-slate-600 text-sm font-medium">{member.roles?.role_name || 'Member'}</Text>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>

      {/* Notifications Modal */}
      <Modal visible={showNotifications} animationType="slide" transparent={true}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl min-h-[50%] p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-slate-800">Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)} className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center">
                <Feather name="x" size={16} color="#475569" />
              </TouchableOpacity>
            </View>

            {pendingMembers.length === 0 && recentCompletions.length === 0 ? (
              <View className="items-center justify-center py-10">
                <Text className="text-slate-400">No new notifications</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {pendingMembers.map(member => (
                  <View key={member.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
                    <Text className="text-indigo-600 font-bold text-xs mb-1 uppercase tracking-wider">New Joining Request</Text>
                    <Text className="text-slate-800 font-bold text-lg mb-1">{member.member_name}</Text>
                    <Text className="text-slate-500 text-sm mb-4">Wants to join as <Text className="font-bold">{member.roles?.role_name || 'Member'}</Text></Text>
                    
                    <View className="flex-row gap-3">
                      <TouchableOpacity 
                        onPress={() => handleDecline(member.id)}
                        className="flex-1 bg-white border border-red-200 py-3 rounded-xl items-center"
                      >
                        <Text className="text-red-500 font-bold">Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleApprove(member.id)}
                        className="flex-1 bg-indigo-600 py-3 rounded-xl items-center shadow-sm"
                      >
                        <Text className="text-white font-bold">Accept</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {recentCompletions.map(completion => (
                  <View key={completion.id} className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-4">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Feather name="check-circle" size={14} color="#059669" />
                      <Text className="text-emerald-600 font-bold text-xs uppercase tracking-wider">Task Completed</Text>
                    </View>
                    <Text className="text-slate-800 font-bold text-base mb-1">{completion.tasks?.title}</Text>
                    <Text className="text-slate-600 text-sm mb-3">
                      <Text className="font-bold text-slate-800">{completion.team_members?.member_name}</Text> just submitted this task.
                    </Text>
                    
                    {completion.submission_notes ? (
                      <View className="bg-white/60 p-3 rounded-xl border border-emerald-50">
                        <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Notes</Text>
                        <Text className="text-slate-700 italic text-sm">"{completion.submission_notes}"</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Manage Team Modal */}
      <Modal visible={showManageTeam} animationType="slide" transparent={true}>
        <View className="flex-1 bg-[#F8F9FE] pt-12">
          <View className="flex-row justify-between items-center px-6 mb-6">
            <Text className="text-3xl font-extrabold text-slate-800">Manage Team</Text>
            <TouchableOpacity onPress={() => setShowManageTeam(false)} className="w-10 h-10 bg-white shadow-sm border border-slate-200 rounded-full items-center justify-center">
              <Feather name="x" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
            {/* Roles Section */}
            <View className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-100 mb-6">
              <Text className="text-lg font-bold text-slate-800 mb-4">Team Roles</Text>
              
              <View className="flex-row gap-2 mb-4">
                <TextInput
                  value={newRoleName}
                  onChangeText={setNewRoleName}
                  placeholder="New Role Name"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800"
                />
                <TouchableOpacity 
                  onPress={handleAddRole}
                  className="bg-indigo-600 px-5 rounded-xl items-center justify-center"
                >
                  <Text className="text-white font-bold">Add</Text>
                </TouchableOpacity>
              </View>

              {roles.map(role => (
                <View key={role.id} className="flex-row justify-between items-center py-3 border-b border-slate-50">
                  <Text className="text-slate-700 font-medium">{role.role_name}</Text>
                  <TouchableOpacity onPress={() => handleDeleteRole(role.id)} className="w-8 h-8 items-center justify-center bg-red-50 rounded-full">
                    <Feather name="trash-2" size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Members Section */}
            <View className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-100 mb-10">
              <Text className="text-lg font-bold text-slate-800 mb-4">Team Members</Text>
              
              {members.length === 0 ? (
                <Text className="text-slate-500 text-center py-4">No active members.</Text>
              ) : (
                members.map((member, index) => (
                  <View key={member.id} className={`py-4 ${index !== members.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <View className="flex-row justify-between items-center mb-3">
                      <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center">
                          <Text className="text-indigo-600 font-bold text-xs">{member.member_name.substring(0,2).toUpperCase()}</Text>
                        </View>
                        <Text className="text-slate-800 font-bold">{member.member_name}</Text>
                      </View>
                      
                      <TouchableOpacity 
                        onPress={() => handleRemoveMember(member.id)}
                        className="bg-red-50 px-3 py-1.5 rounded-lg flex-row items-center gap-1 border border-red-100"
                      >
                        <Feather name="user-minus" size={12} color="#ef4444" />
                        <Text className="text-red-600 text-xs font-bold">Remove</Text>
                      </TouchableOpacity>
                    </View>

                    <Text className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-2">Change Role:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                      {roles.map(role => (
                        <TouchableOpacity
                          key={role.id}
                          onPress={() => handleChangeRole(member.id, role.id)}
                          className={`px-4 py-2 rounded-xl border ${member.role_id === role.id ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}
                        >
                          <Text className={`${member.role_id === role.id ? 'text-indigo-600 font-bold' : 'text-slate-600'}`}>{role.role_name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
