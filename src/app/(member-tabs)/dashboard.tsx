import { View, Text, TouchableOpacity, ScrollView, StatusBar, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function MemberOnboardingScreen() {
  const router = useRouter();
  const { teamName, memberName, roleName } = useLocalSearchParams<{ teamName: string, memberName: string, roleName: string }>();

  return (
    <SafeAreaView className="flex-1 bg-[#F9F9FB]">
      <StatusBar barStyle="dark-content" />
      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8">
          <Text className="text-xl font-bold text-slate-800">WorkPulse</Text>
          <View className="flex-row items-center gap-4">
            <TouchableOpacity className="relative w-10 h-10 items-center justify-center">
              <Feather name="bell" size={24} color="#475569" />
              <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            </TouchableOpacity>
            <View className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
               <Image source={{ uri: 'https://i.pravatar.cc/100' }} className="w-full h-full" />
            </View>
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
          
          {/* Card 1: Tasks Assigned */}
          <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex-row items-center justify-between">
            <View>
              <View className="w-10 h-10 bg-indigo-50 rounded-xl items-center justify-center mb-3">
                 <Feather name="clipboard" size={20} color="#4f46e5" />
              </View>
              <Text className="text-[10px] font-bold text-slate-400 tracking-wider mb-1">TASKS ASSIGNED</Text>
              <Text className="text-3xl font-extrabold text-slate-900">12</Text>
            </View>
            <View className="bg-indigo-50 px-3 py-1 rounded-full self-start mt-1">
              <Text className="text-indigo-600 text-[10px] font-bold">Today</Text>
            </View>
          </View>

          {/* Card 2: Completed */}
          <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex-row items-center justify-between">
            <View>
              <View className="w-10 h-10 bg-purple-50 rounded-xl items-center justify-center mb-3">
                 <Feather name="check-circle" size={20} color="#9333ea" />
              </View>
              <Text className="text-[10px] font-bold text-slate-400 tracking-wider mb-1">COMPLETED</Text>
              <View className="flex-row items-baseline gap-2">
                <Text className="text-3xl font-extrabold text-slate-900">8</Text>
                <Text className="text-green-500 text-xs font-bold">↗ +2</Text>
              </View>
            </View>
            <View className="bg-purple-50 px-3 py-1 rounded-full self-start mt-1">
              <Text className="text-purple-600 text-[10px] font-bold">This Week</Text>
            </View>
          </View>

          {/* Card 3: Productivity Score */}
          <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <View className="w-10 h-10 bg-orange-50 rounded-xl items-center justify-center mb-3">
               <Feather name="target" size={20} color="#ea580c" />
            </View>
            <Text className="text-[10px] font-bold text-slate-400 tracking-wider mb-1">PRODUCTIVITY SCORE</Text>
            <Text className="text-3xl font-extrabold text-indigo-600 mb-3">92%</Text>
            
            <View className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <View className="w-[92%] h-full bg-indigo-600 rounded-full" />
            </View>
          </View>
        </View>

        {/* Weekly Productivity Chart (Mock) */}
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
          <View className="flex-row justify-between items-center mb-6">
             <Text className="text-slate-800 font-bold text-sm">Weekly Productivity</Text>
             <Text className="text-slate-400 text-lg">•••</Text>
          </View>
          <View className="h-40 items-center justify-center relative">
            {/* Simple CSS-based mock chart layout */}
            <View className="absolute left-0 top-0 bottom-0 w-6 justify-between py-2">
              {[100, 80, 60, 40, 20, 0].map(val => (
                <Text key={val} className="text-[8px] text-slate-400 text-right pr-1">{val}</Text>
              ))}
            </View>
            
            {/* Chart lines */}
            <View className="ml-6 flex-1 w-full h-full border-l border-b border-slate-200">
               {/* Grid lines */}
               {[0, 1, 2, 3, 4].map(i => (
                 <View key={i} className="w-full h-[20%] border-t border-slate-100" />
               ))}
               
               {/* Fake Area Chart visually represented by a gradient box and dots */}
               <View className="absolute bottom-0 w-full h-[60%] bg-indigo-50 opacity-50" />
               <View className="absolute inset-0 flex-row justify-between items-end px-2">
                  {[40, 55, 80, 60, 85, 70, 80].map((h, i) => (
                    <View key={i} className="items-center" style={{ height: `${h}%` }}>
                      <View className="w-2 h-2 rounded-full bg-white border-2 border-indigo-600 -top-1" />
                    </View>
                  ))}
               </View>
            </View>
            
            {/* X Axis */}
            <View className="ml-6 mt-2 flex-row justify-between w-full px-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <Text key={day} className="text-[8px] text-slate-400">{day}</Text>
              ))}
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
             <View className="border border-slate-100 rounded-xl p-3 flex-row items-start gap-3">
               <View className="w-4 h-4 rounded border border-slate-300 mt-0.5" />
               <View className="flex-1">
                 <View className="flex-row justify-between items-start mb-1">
                   <Text className="text-slate-800 font-bold text-xs flex-1">Finalize Q3 Marketing Report</Text>
                   <View className="bg-red-50 px-2 py-0.5 rounded text-center ml-2">
                     <Text className="text-red-500 text-[8px] font-bold">HIGH</Text>
                   </View>
                 </View>
                  <View className="flex-row items-center gap-3">
                    <View className="flex-row items-center gap-1">
                      <Feather name="clock" size={10} color="#94a3b8" />
                      <Text className="text-slate-400 text-[10px]">Today, 5:00 PM</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Feather name="folder" size={10} color="#94a3b8" />
                      <Text className="text-slate-400 text-[10px]">Marketing</Text>
                    </View>
                  </View>
               </View>
             </View>

             <View className="border border-slate-100 rounded-xl p-3 flex-row items-start gap-3">
               <View className="w-4 h-4 rounded border border-slate-300 mt-0.5" />
               <View className="flex-1">
                 <View className="flex-row justify-between items-start mb-1">
                   <Text className="text-slate-800 font-bold text-xs flex-1">Review Design Mockups</Text>
                   <View className="bg-orange-50 px-2 py-0.5 rounded text-center ml-2">
                     <Text className="text-orange-500 text-[8px] font-bold">MED</Text>
                   </View>
                 </View>
                  <View className="flex-row items-center gap-3">
                    <View className="flex-row items-center gap-1">
                      <Feather name="clock" size={10} color="#94a3b8" />
                      <Text className="text-slate-400 text-[10px]">Tomorrow, 10:00 AM</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Feather name="folder" size={10} color="#94a3b8" />
                      <Text className="text-slate-400 text-[10px]">Product</Text>
                    </View>
                  </View>
               </View>
             </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
          <Text className="text-slate-800 font-bold text-sm mb-4">Recent Activity</Text>
          
          <View className="pl-2">
            <View className="border-l border-slate-200 ml-1.5 pb-6 pl-4 relative">
              <View className="absolute -left-1.5 top-1 w-3 h-3 bg-indigo-600 rounded-full border-2 border-white" />
              <Text className="text-slate-700 text-xs mb-0.5">Manager approved <Text className="font-bold">Task #204</Text></Text>
              <Text className="text-slate-400 text-[9px]">10 mins ago</Text>
            </View>

            <View className="border-l border-slate-200 ml-1.5 pb-6 pl-4 relative">
              <View className="absolute -left-[5px] top-1 w-2.5 h-2.5 bg-slate-300 rounded-full border-2 border-white" />
              <Text className="text-slate-700 text-xs mb-0.5">New project assigned: <Text className="font-bold text-indigo-600">Website Redesign</Text></Text>
              <Text className="text-slate-400 text-[9px]">2 hours ago</Text>
            </View>

            <View className="border-l border-slate-200 ml-1.5 pb-6 pl-4 relative">
              <View className="absolute -left-[5px] top-1 w-2.5 h-2.5 bg-slate-300 rounded-full border-2 border-white" />
              <Text className="text-slate-700 text-xs mb-0.5">You completed <Text className="font-bold">Task #201</Text></Text>
              <Text className="text-slate-400 text-[9px]">Yesterday, 4:30 PM</Text>
            </View>

            <View className="ml-1.5 pl-4 relative">
              <View className="absolute -left-[5px] top-1 w-2.5 h-2.5 bg-slate-300 rounded-full border-2 border-white" />
              <Text className="text-slate-700 text-xs mb-0.5">Commented on Q3 Report</Text>
              <Text className="text-slate-400 text-[9px]">Yesterday, 2:15 PM</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
