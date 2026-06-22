import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function OnboardingScreen() {
  const router = useRouter();
  const { teamCode, teamName } = useLocalSearchParams<{ teamCode: string, teamName: string }>();

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FE] items-center justify-center p-6">
      <View className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 items-center w-full max-w-md">
        
        <View className="w-20 h-20 bg-green-50 border border-green-100 rounded-full items-center justify-center mb-6">
          <Text className="text-green-500 text-4xl">🎉</Text>
        </View>
        
        <Text className="text-2xl font-bold text-slate-800 mb-2 text-center">
          Workspace Ready!
        </Text>
        
        <Text className="text-slate-500 text-center leading-6 mb-8">
          You've successfully created the <Text className="font-semibold text-slate-700">{teamName || 'Team'}</Text> workspace.
        </Text>

        <View className="w-full bg-[#F4F5FA] rounded-2xl p-6 items-center mb-8 border border-slate-200/60">
          <Text className="text-slate-500 font-medium mb-3 text-sm uppercase tracking-wider">Your Unique Team Code</Text>
          <View className="flex-row items-center gap-2">
            {teamCode ? teamCode.split('').map((char, i) => (
              <View key={i} className="w-10 h-12 bg-white rounded-lg items-center justify-center border border-slate-200 shadow-sm">
                <Text className="text-indigo-600 font-bold text-xl">{char}</Text>
              </View>
            )) : null}
          </View>
          <Text className="text-slate-400 text-xs mt-4 text-center">
            Share this code with your team members so they can join your workspace.
          </Text>
        </View>

        <TouchableOpacity 
          onPress={() => router.push('/')}
          className="w-full py-4 rounded-xl items-center shadow-sm bg-indigo-600 active:bg-indigo-700"
        >
          <Text className="text-white font-bold text-base">Go to Dashboard</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}
