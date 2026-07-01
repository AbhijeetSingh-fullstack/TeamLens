import * as Device from 'expo-device';
import { Platform } from 'react-native';

let Notifications: any;
try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (error) {
  console.log('expo-notifications is not available in this environment', error);
}

export async function registerForPushNotificationsAsync(userId?: string) {
  let token;

  if (!Notifications) {
    return;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      const projectId = 'dd7ed27c-6c86-448d-86c6-d67641d80594'; // Your EAS project ID from app.json
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('====================================');
      console.log('EXPO PUSH TOKEN:');
      console.log(token);
      console.log('====================================');
      
      if (userId && token) {
        const { supabase } = await import('./supabase');
        await supabase
          .from('user_push_tokens')
          .upsert(
            { user_id: userId, push_token: token, updated_at: new Date().toISOString() }, 
            { onConflict: 'user_id' }
          );
      }
      
    } else {
      console.log('Must use physical device for Push Notifications');
    }
  } catch (error) {
    console.log('Error registering for push notifications:', error);
  }

  return token;
}

export async function triggerLocalNotification(title: string, body: string, data?: any) {
  if (!Notifications) {
    return;
  }
  
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
      },
      trigger: null, // null means trigger immediately
    });
  } catch (error) {
    console.log('Error triggering local notification:', error);
  }
}

export async function sendExpoPushNotification(params: { recipientUserId?: string, memberId?: string, title: string, body: string, data?: any }) {
  try {
    const { supabase } = await import('./supabase');
    let userId = params.recipientUserId;

    // If we only have memberId, fetch the user_id from team_members
    if (!userId && params.memberId) {
      const { data: memberData } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('id', params.memberId)
        .single();
      
      if (memberData && memberData.user_id) {
        userId = memberData.user_id;
      }
    }

    if (!userId) {
      console.log('No user_id provided or found for push notification');
      return;
    }

    const { data: tokenData, error } = await supabase
      .from('user_push_tokens')
      .select('push_token')
      .eq('user_id', userId)
      .single();

    if (error || !tokenData || !tokenData.push_token) {
      console.log(`No push token found for user ${userId}`);
      return;
    }

    const message = {
      to: tokenData.push_token,
      sound: 'default',
      title: params.title,
      body: params.body,
      data: params.data || {},
    };

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    console.log(`Push notification sent to ${userId}`);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

