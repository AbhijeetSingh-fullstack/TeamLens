import { View, Text, TouchableOpacity, ScrollView, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function MemberOnboardingScreen() {
  const router = useRouter();
  const { teamName, memberName, roleName } = useLocalSearchParams<{ teamName: string, memberName: string, roleName: string }>();

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FE]">
      <StatusBar barStyle="dark-content" />
      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8">
          <Text className="text-2xl font-extrabold text-slate-800">TeamLens</Text>
          <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center border border-indigo-200">
            <Text className="text-indigo-600 font-bold text-sm">
              {memberName ? memberName.substring(0, 2).toUpperCase() : 'ME'}
            </Text>
          </View>
        </View>

        {/* Welcome Hero */}
        <View className="items-center mb-8 mt-4">
          <View className="w-24 h-24 bg-indigo-50 border border-indigo-100 rounded-full items-center justify-center mb-6">
            <Text className="text-indigo-500 text-5xl">👋</Text>
          </View>
          
          <Text className="text-3xl font-bold text-slate-800 mb-2 text-center">
            Welcome, {memberName ? memberName.split(' ')[0] : 'there'}!
          </Text>
          
          <Text className="text-slate-500 text-center leading-6 text-base px-4">
            You've officially joined <Text className="font-semibold text-slate-700">{teamName || 'the team'}</Text> as a <Text className="font-semibold text-indigo-600">{roleName || 'Member'}</Text>. We're excited to have you on board!
          </Text>
        </View>

        {/* Getting Started Checklist */}
        <Text className="text-slate-800 font-bold text-lg mb-4 px-1">Your Getting Started Checklist</Text>

        <View className="bg-white rounded-[20px] shadow-sm border border-slate-100 overflow-hidden mb-8">
          
          {/* Checklist Item 1 */}
          <View className="flex-row items-start p-5 border-b border-slate-100">
            <View className="w-6 h-6 rounded-full bg-indigo-600 items-center justify-center mr-4 mt-0.5">
              <Text className="text-white text-xs font-bold">✓</Text>
            </View>
            <View className="flex-1">
              <Text className="text-slate-800 font-bold text-base mb-1 line-through opacity-70">Join the Workspace</Text>
              <Text className="text-slate-400 text-xs">You've successfully connected to your team.</Text>
            </View>
          </View>

          {/* Checklist Item 2 */}
          <View className="flex-row items-start p-5 border-b border-slate-100 bg-indigo-50/30">
            <View className="w-6 h-6 rounded-full border-2 border-indigo-400 items-center justify-center mr-4 mt-0.5" />
            <View className="flex-1">
              <Text className="text-slate-800 font-bold text-base mb-1">Set up your profile</Text>
              <Text className="text-slate-500 text-xs mb-3">Add a profile picture and complete your bio so your team knows who you are.</Text>
              <TouchableOpacity className="bg-white border border-slate-200 py-2 px-4 rounded-lg self-start">
                <Text className="text-slate-700 font-medium text-xs">Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Checklist Item 3 */}
          <View className="flex-row items-start p-5">
            <View className="w-6 h-6 rounded-full border-2 border-slate-300 items-center justify-center mr-4 mt-0.5" />
            <View className="flex-1">
              <Text className="text-slate-700 font-bold text-base mb-1">Review Open Tasks</Text>
              <Text className="text-slate-400 text-xs">Check out the project board to see what the team is working on right now.</Text>
            </View>
          </View>
          
        </View>

        <TouchableOpacity 
          onPress={() => router.push('/')}
          className="w-full py-4 rounded-xl items-center shadow-md bg-indigo-600 active:bg-indigo-700 mb-6"
        >
          <Text className="text-white font-bold text-base">Go to My Dashboard</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
