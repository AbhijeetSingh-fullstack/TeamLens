import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function MemberTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#4f46e5' }}>
      <Tabs.Screen 
        name="dashboard" 
        options={{ 
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Feather name="home" size={20} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="tasks" 
        options={{ 
          title: 'Tasks',
          tabBarIcon: ({ color }) => <Feather name="check-square" size={20} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="analytics" 
        options={{ 
          title: 'Analytics',
          tabBarIcon: ({ color }) => <Feather name="bar-chart-2" size={20} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="message" 
        options={{ 
          title: 'Message',
          tabBarIcon: ({ color }) => <Feather name="message-square" size={20} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile',
          tabBarIcon: ({ color }) => <Feather name="user" size={20} color={color} />
        }} 
      />
    </Tabs>
  );
}
