import { useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useUser } from '@clerk/clerk-expo';
import { registerForPushNotificationsAsync, triggerLocalNotification } from '../utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useAppNotifications() {
  const { user } = useUser();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    registerForPushNotificationsAsync(user?.id);

    if (!user?.id) return;

    // Listen for new messages
    const messagesSubscription = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMessage = payload.new;
          
          // Try to get memberId to match receiver_id
          let memberId = null;
          const memberDataStr = await AsyncStorage.getItem(`member_team_${user.id}`);
          if (memberDataStr) {
            const memberData = JSON.parse(memberDataStr);
            memberId = memberData.memberId;
          }

          // If the current user is the receiver, show notification
          // If we are manager, we are 'manager' as receiver_id, which we don't know exactly unless we check team_id
          // But typically we can just check if we are receiving the message.
          
          // Let's do a loose check: if they sent it, don't notify. If we received it, notify.
          // Note: In this app, sender_id is either 'manager' or memberId. receiver_id is 'manager' or memberId.
          if (newMessage.sender_id !== 'manager' && newMessage.sender_id !== memberId) {
             // We are likely the receiver
             triggerLocalNotification(
              'New Message',
              newMessage.content.length > 30 ? newMessage.content.substring(0, 30) + '...' : newMessage.content,
              { type: 'message' }
            );
          }
        }
      )
      .subscribe();

    // Listen for task assignments (New Tasks & Revisions)
    const tasksSubscription = supabase
      .channel('public:task_assignments')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_assignments' },
        async (payload) => {
          const assignment = payload.new;
          
          let memberId = null;
          const memberDataStr = await AsyncStorage.getItem(`member_team_${user.id}`);
          if (memberDataStr) {
            memberId = JSON.parse(memberDataStr).memberId;
          }

          if (memberId && assignment.member_id === memberId) {
            triggerLocalNotification(
              'New Task Assigned',
              'You have been assigned a new task. Tap to view details.',
              { type: 'task' }
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'task_assignments' },
        async (payload) => {
          const newAssign = payload.new;
          const oldAssign = payload.old;
          
          // Check if it's a revision request (manager -> member)
          let memberId = null;
          const memberDataStr = await AsyncStorage.getItem(`member_team_${user.id}`);
          if (memberDataStr) {
            memberId = JSON.parse(memberDataStr).memberId;
          }

          if (memberId && newAssign.member_id === memberId && newAssign.status === 'revision' && oldAssign.status !== 'revision') {
            triggerLocalNotification(
              'Revision Requested',
              'A task has been returned to you for revision.',
              { type: 'task_revision' }
            );
          }
          
          // Check if it's a task completion (member -> manager)
          const managerDataStr = await AsyncStorage.getItem(`manager_team_${user.id}`);
          if (managerDataStr && newAssign.status === 'completed' && oldAssign.status !== 'completed') {
            // For a manager, they manage a specific team. We would need to verify the task belongs to their team,
            // but assuming one manager per device for simplicity.
            triggerLocalNotification(
              'Task Completed',
              'A team member has completed their task.',
              { type: 'task_completed' }
            );
          }
        }
      )
      .subscribe();

    // Listen for team member changes (Join Requests & Leaves)
    const membersSubscription = supabase
      .channel('public:team_members')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_members' },
        async (payload) => {
          const newMember = payload.new;
          
          // Only notify manager if it's a pending request
          const managerDataStr = await AsyncStorage.getItem(`manager_team_${user.id}`);
          if (managerDataStr && newMember.status === 'pending') {
            triggerLocalNotification(
              'New Join Request',
              `${newMember.member_name} has requested to join your team.`,
              { type: 'join_request' }
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'team_members' },
        async (payload) => {
          const deletedMember = payload.old;
          
          // Notify manager if a member leaves/is removed
          const managerDataStr = await AsyncStorage.getItem(`manager_team_${user.id}`);
          if (managerDataStr && deletedMember) {
            triggerLocalNotification(
              'Member Left',
              `A member has left your team or been removed.`,
              { type: 'member_left' }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesSubscription);
      supabase.removeChannel(tasksSubscription);
      supabase.removeChannel(membersSubscription);
    };
  }, [user?.id]);
}

export function AppNotificationHandler() {
  useAppNotifications();
  return null;
}
