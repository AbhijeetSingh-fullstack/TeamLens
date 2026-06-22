import { View, Text, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FF]">
      <StatusBar barStyle="dark-content" />
      
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 30, paddingBottom: 30 }} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* Header / Logo */}
        <View className="items-center mb-8">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 bg-indigo-600 rounded-xl items-center justify-center shadow-sm">
              <Text className="text-white font-extrabold text-lg">⚡</Text>
            </View>
            <Text className="text-2xl font-bold text-slate-800">TeamLens</Text>
          </View>
        </View>

        {/* Title Area */}
        <View className="items-center mb-8">
          <Text className="text-4xl font-extrabold text-center text-slate-900 mb-4 tracking-tight leading-[48px]">
            Welcome to TeamLens. How would you like to start?
          </Text>
          <Text className="text-slate-500 text-center text-base leading-6 px-2">
            Set up your workspace in seconds and start managing team productivity with precision.
          </Text>
        </View>

        {/* Action Cards */}
        <View className="gap-5 mb-8">
          
          {/* Create Team Card */}
          <TouchableOpacity 
            onPress={() => router.push('/create-team')}
            className="w-full bg-white/70 rounded-[32px] p-6 border border-slate-200 shadow-sm active:bg-white"
          >
            <View className="w-14 h-14 bg-indigo-50 rounded-2xl items-center justify-center mb-4 border border-indigo-100">
              <Text className="text-indigo-600 text-2xl">👥</Text>
            </View>
            <Text className="text-2xl font-bold text-slate-900 mb-2">Create a Team</Text>
            <Text className="text-slate-500 text-sm leading-6 mb-5">
              Start a new team, invite members, and manage productivity. Perfect for managers, founders, and administrators.
            </Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-indigo-700 font-bold text-base">Get Started</Text>
              <Text className="text-indigo-700 font-bold text-lg">→</Text>
            </View>
          </TouchableOpacity>

          {/* Join Team Card */}
          <TouchableOpacity className="w-full bg-white/70 rounded-[32px] p-6 border border-slate-200 shadow-sm active:bg-white">
            <View className="w-14 h-14 bg-indigo-50 rounded-2xl items-center justify-center mb-4 border border-indigo-100">
              <Text className="text-indigo-600 text-2xl">➡️</Text>
            </View>
            <Text className="text-2xl font-bold text-slate-900 mb-2">Join a Team</Text>
            <Text className="text-slate-500 text-sm leading-6 mb-5">
              Enter your organization code to join your team and start tracking tasks. For team members and employees.
            </Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-indigo-700 font-bold text-base">Connect Now</Text>
              <Text className="text-indigo-700 font-bold text-lg">→</Text>
            </View>
          </TouchableOpacity>

        </View>

        {/* Footer Area */}
        <View className="items-center gap-3 mt-auto pt-6">
          <TouchableOpacity className="flex-row items-center gap-2">
            <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">↳ SIGN OUT</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text className="text-indigo-500 text-xs font-medium">Switch to a different account</Text>
          </TouchableOpacity>
          
          <Text className="text-slate-400 text-[10px] mt-4 font-medium">
            TeamLens Platform v1.0.0 • Secure Enterprise Onboarding
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}







