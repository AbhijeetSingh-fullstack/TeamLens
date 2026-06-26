import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { useSignIn } from '@clerk/clerk-expo';
import { Feather } from '@expo/vector-icons';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSignInPress = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        setTimeout(() => {
          router.replace('/');
        }, 100);
      } else {
        setError('Complete sign in action required.');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FE]">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-10 pb-6 justify-center">
          
          <View className="mb-10 items-center">
            <View className="w-16 h-16 bg-indigo-600 rounded-2xl items-center justify-center mb-6 shadow-sm">
              <Text className="text-white font-extrabold text-2xl">TL</Text>
            </View>
            <Text className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Welcome Back</Text>
            <Text className="text-slate-500 text-base text-center">
              Sign in to continue to your TeamLens dashboard
            </Text>
          </View>

          <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
            <View className="gap-4">
              <View>
                <Text className="text-slate-600 text-sm font-medium mb-2 ml-1">Email</Text>
                <TextInput
                  autoCapitalize="none"
                  value={emailAddress}
                  placeholder="Enter your email"
                  placeholderTextColor="#94a3b8"
                  onChangeText={(emailAddress) => setEmailAddress(emailAddress)}
                  className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-4 text-slate-800 text-base"
                />
              </View>

              <View>
                <Text className="text-slate-600 text-sm font-medium mb-2 ml-1">Password</Text>
                <TextInput
                  value={password}
                  placeholder="Enter your password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={true}
                  onChangeText={(password) => setPassword(password)}
                  className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-4 text-slate-800 text-base"
                />
              </View>

              {error ? <Text className="text-red-500 text-sm mt-1">{error}</Text> : null}

                <TouchableOpacity 
                  onPress={onSignInPress} 
                  disabled={loading}
                  style={[
                    { width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
                    { backgroundColor: loading ? '#818cf8' : '#4f46e5' }
                  ]}
                >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">Sign In</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row justify-center mt-4">
            <Text className="text-slate-500">Don't have an account? </Text>
            <Link href="/(auth)/sign-up" asChild>
              <TouchableOpacity>
                <Text className="text-indigo-600 font-bold">Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
