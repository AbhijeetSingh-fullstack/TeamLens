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

export async function registerForPushNotificationsAsync() {
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
