import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, isToday, isTomorrow } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, Text, TouchableOpacity, View, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';

export default function MemberDashboard() {
  const { teamName, memberName, roleName, memberId, teamId } = useLocalSearchParams<{
    teamName: string,
    memberName: string,
    roleName: string,
    memberId: string,
    teamId: string
  }>();

  const router = useRouter();

  const [stats, setStats] = useState({
    totalMembers: 0,
    assignedTasks: 0,
    productivityScore: 0
  });

  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsVisible, setNotificationsVisible] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  useEffect(() => {
    if (!teamId || !memberId) return;

    const fetchData = async () => {
      // Check Eviction Status First
      const { data: memberStatus } = await supabase
        .from('team_members')
        .select('status')
        .eq('id', memberId)
        .single();

      if (!memberStatus || memberStatus.status !== 'approved') {
        // Kick them out!
        router.replace('/');
        return;
      }

      // Fetch Total Members
      const { count: membersCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('status', 'approved');

      // Fetch Task Assignments
      const { data: assignments } = await supabase
        .from('task_assignments')
        .select(`
          id, status, created_at,
          tasks!inner (id, title, due_date, priority, status)
        `)
        .eq('member_id', memberId);

      const assignedCount = assignments?.filter(a => a.status === 'open').length || 0;
      const completedCount = assignments?.filter(a => a.status === 'completed').length || 0;
      const totalTasks = assignments?.length || 0;
      const score = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

      setStats({
        totalMembers: membersCount || 1, // Fallback to 1 (themselves)
        assignedTasks: assignedCount,
        productivityScore: score
      });

      // Upcoming Deadlines (Open assignments ordered by date)
      const openAssignments = assignments?.filter(a => a.status === 'open') || [];
      const upcoming = openAssignments
        .map(a => a.tasks)
        .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 3);

      setDeadlines(upcoming);

      // Recent Activity (Tasks Assigned to me + General Activities)
      const { data: recentActs } = await supabase
        .from('activities')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(5);

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).getTime();

      const newTaskActs = (assignments || [])
        .filter(a => a.status !== 'revision' && new Date(a.created_at).getTime() > oneDayAgo)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map(a => ({
          id: a.id,
          type: 'new_task',
          action: `Assigned new task: ${a.tasks.title}`,
          created_at: a.created_at,
          taskTitle: a.tasks.title
        }));

      const revisionActs = (assignments || [])
        .filter(a => a.status === 'revision')
        .map(a => ({
          id: a.id + '_rev',
          type: 'revision',
          action: `Revision requested for: ${a.tasks.title}`,
          created_at: a.created_at, // Use assignment creation time so it doesn't change every poll
          taskTitle: a.tasks.title
        }));

      const allNotifs = [...revisionActs, ...newTaskActs].slice(0, 10);
      setNotifications(allNotifs);
      
      // Check for unread notifications
      const storedSeen = await AsyncStorage.getItem('member_lastSeenNotifications');
      const lastSeen = storedSeen ? parseInt(storedSeen) : 0;
      
      let latestNotificationTime = 0;
      allNotifs.forEach(n => {
        if (n.created_at) {
          const t = new Date(n.created_at).getTime();
          if (t > latestNotificationTime) latestNotificationTime = t;
        }
      });
      setHasUnreadNotifications(latestNotificationTime > lastSeen);

      // Merge and sort
      const mergedActivities = [...(recentActs || []), ...newTaskActs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      setActivities(mergedActivities);

      // Check for unread messages (receiver_id is memberId)
      const { data: latestMessages } = await supabase
        .from('messages')
        .select('sender_id, created_at')
        .eq('receiver_id', memberId)
        .eq('team_id', teamId);

      if (latestMessages) {
        const stored = await AsyncStorage.getItem('lastReadTimes');
        const lastReadTimes = stored ? JSON.parse(stored) : {};
        let hasUnread = false;
        for (const msg of latestMessages) {
          const lastRead = lastReadTimes[msg.sender_id || 'manager'] || 0;
          if (new Date(msg.created_at).getTime() > lastRead) {
            hasUnread = true;
            break;
          }
        }
        setHasUnreadMessages(hasUnread);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Polling every 5s
    return () => clearInterval(interval);
  }, [teamId, memberId]);

  const formatDueDate = (dateString: string) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
    if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  const formatTimeAgo = (dateString: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9F9FB]">
      <StatusBar barStyle="dark-content" />
      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Header */}
        <View className="flex-row items-center justify-between mb-8">
          <Text className="text-xl font-bold text-slate-800">TeamLens</Text>
          <View className="flex-row items-center gap-4">
            <TouchableOpacity 
              className="relative w-10 h-10 items-center justify-center"
              onPress={async () => {
                setNotificationsVisible(true);
                setHasUnreadNotifications(false);
                await AsyncStorage.setItem('member_lastSeenNotifications', Date.now().toString());
              }}
            >
              <Feather name="bell" size={24} color="#475569" />
              {hasUnreadNotifications && (
                <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              className="relative w-10 h-10 items-center justify-center"
              onPress={() => router.push({ pathname: '/message', params: { teamName, memberName, memberId, teamId } })}
            >
              <Feather name="message-square" size={24} color="#4f46e5" />
              {hasUnreadMessages && (
                <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Title Area */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-slate-900 mb-1">Dashboard</Text>
          <Text className="text-slate-500 text-xs">
            Welcome back, {memberName ? memberName.split(' ')[0] : 'there'}. Here's your overview for today.
          </Text>
        </View>

        {/* Stats Cards Vertical */}
        <View className="gap-4 mb-6">

          {/* Card 1: Active Members */}
          <View className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-100 flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <View className="w-12 h-12 bg-emerald-50 rounded-2xl items-center justify-center">
                <Feather name="users" size={20} color="#10b981" />
              </View>
              <View>
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">ACTIVE MEMBERS</Text>
                <Text className="text-3xl font-extrabold text-slate-900">{stats.totalMembers}</Text>
              </View>
            </View>
            <View className="bg-emerald-50 px-3 py-1 rounded-full">
              <Text className="text-emerald-600 text-[10px] font-bold">{teamName}</Text>
            </View>
          </View>

          {/* Card 2: Tasks Assigned */}
          <View className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-100 flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <View className="w-12 h-12 bg-indigo-50 rounded-2xl items-center justify-center">
                <Feather name="clipboard" size={20} color="#4f46e5" />
              </View>
              <View>
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">TASKS ASSIGNED</Text>
                <Text className="text-3xl font-extrabold text-slate-900">{stats.assignedTasks}</Text>
              </View>
            </View>
            <View className="bg-indigo-50 px-3 py-1 rounded-full">
              <Text className="text-indigo-600 text-[10px] font-bold">To You</Text>
            </View>
          </View>

          {/* Card 3: Productivity Score */}
          <View className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-100 flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <View className="w-12 h-12 bg-orange-50 rounded-2xl items-center justify-center">
                <Feather name="target" size={20} color="#ea580c" />
              </View>
              <View>
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">PRODUCTIVITY SCORE</Text>
                <Text className="text-3xl font-extrabold text-indigo-600">{stats.productivityScore}%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Upcoming Deadlines */}
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-slate-800 font-bold text-sm">Upcoming Deadlines</Text>
            <TouchableOpacity><Text className="text-indigo-600 text-[10px] font-bold">View All</Text></TouchableOpacity>
          </View>

          <View className="gap-3">
            {deadlines.length === 0 ? (
              <View className="py-4 items-center justify-center">
                <Text className="text-slate-400 text-xs">No upcoming deadlines! 🎉</Text>
              </View>
            ) : (
              deadlines.map(task => (
                <View key={task.id} className="border border-slate-100 rounded-xl p-3 flex-row items-start gap-3">
                  <View className="w-4 h-4 rounded border border-slate-300 mt-0.5" />
                  <View className="flex-1">
                    <View className="flex-row justify-between items-start mb-1">
                      <Text className="text-slate-800 font-bold text-xs flex-1">{task.title}</Text>
                      <View className={`px-2 py-0.5 rounded text-center ml-2 ${task.priority === 'high' ? 'bg-red-50' : task.priority === 'medium' ? 'bg-orange-50' : 'bg-slate-50'}`}>
                        <Text className={`text-[8px] font-bold uppercase ${task.priority === 'high' ? 'text-red-500' : task.priority === 'medium' ? 'text-orange-500' : 'text-slate-500'}`}>
                          {task.priority || 'NORMAL'}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-3">
                      <View className="flex-row items-center gap-1">
                        <Feather name="clock" size={10} color="#94a3b8" />
                        <Text className="text-slate-400 text-[10px]">{formatDueDate(task.due_date)}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Recent Activity */}
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
          <Text className="text-slate-800 font-bold text-sm mb-4">Recent Activity</Text>

          <View className="pl-2">
            {activities.length === 0 ? (
              <View className="py-4 items-center justify-center">
                <Text className="text-slate-400 text-xs">No recent activity</Text>
              </View>
            ) : (
              activities.map((activity, index) => (
                <View key={activity.id} className={`border-l border-slate-200 ml-1.5 pl-4 relative ${index === activities.length - 1 ? '' : 'pb-6'}`}>
                  <View className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${index === 0 ? 'bg-indigo-600 -left-1.5 w-3 h-3' : 'bg-slate-300'}`} />
                  <Text className="text-slate-700 text-xs mb-0.5 leading-4">{activity.action}</Text>
                  <Text className="text-slate-400 text-[9px]">{formatTimeAgo(activity.created_at)}</Text>
                </View>
              ))
            )}
          </View>
        </View>

      </ScrollView>

      {/* Notifications Modal */}
      <Modal visible={isNotificationsVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl min-h-[50%] max-h-[80%]">
            <View className="p-5 border-b border-slate-100 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-slate-800">Notifications</Text>
              <TouchableOpacity onPress={() => setNotificationsVisible(false)} className="w-8 h-8 items-center justify-center bg-slate-100 rounded-full">
                <Feather name="x" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView className="p-5">
              {notifications.length === 0 ? (
                <Text className="text-slate-500 text-center mt-5">No new notifications.</Text>
              ) : (
                notifications.map(notif => (
                  <View key={notif.id} className="border-b border-slate-100 pb-4 mb-4">
                    <View className="flex-row items-center gap-3 mb-2">
                      <View className={`w-8 h-8 rounded-full ${notif.type === 'revision' ? 'bg-red-100' : 'bg-indigo-100'} items-center justify-center`}>
                        <Feather name={notif.type === 'revision' ? 'refresh-ccw' : 'clipboard'} size={14} color={notif.type === 'revision' ? '#ef4444' : '#4f46e5'} />
                      </View>
                      <View className="flex-1">
                        <Text className={`font-bold text-sm ${notif.type === 'revision' ? 'text-red-600' : 'text-slate-800'}`}>
                          {notif.type === 'revision' ? 'Revision Requested' : 'New Task Assigned'}
                        </Text>
                        <Text className="text-slate-500 text-xs">{notif.type === 'revision' ? 'Action required' : formatTimeAgo(notif.created_at)}</Text>
                      </View>
                    </View>
                    <View className={`${notif.type === 'revision' ? 'bg-red-50/50 border-red-100' : 'bg-indigo-50/50 border-indigo-100'} p-3 rounded-xl ml-11 border`}>
                      <Text className={`${notif.type === 'revision' ? 'text-red-900' : 'text-indigo-900'} text-sm font-medium`}>{notif.taskTitle || notif.action.replace('Assigned new task: ', '')}</Text>
                    </View>
                  </View>
                ))
              )}
              <View className="h-10" />
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
