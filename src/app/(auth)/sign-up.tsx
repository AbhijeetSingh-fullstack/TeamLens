import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { useSignUp } from '@clerk/clerk-expo';
import { Feather } from '@expo/vector-icons';

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSignUpPress = async () => {
    if (!isLoaded) return;
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await signUp.create({
        firstName,
        lastName,
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError('');

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        setTimeout(() => {
          router.replace('/');
        }, 100);
      } else {
        setError('Verification failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'Verification error');
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
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          
          <View className="mb-8 items-center">
            <View className="w-16 h-16 bg-indigo-600 rounded-2xl items-center justify-center mb-6 shadow-sm">
              <Text className="text-white font-extrabold text-2xl">TL</Text>
            </View>
            <Text className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Create Account</Text>
            <Text className="text-slate-500 text-base text-center">
              {pendingVerification ? 'Verify your email address' : 'Join TeamLens and manage your workspace'}
            </Text>
          </View>

          <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
            {!pendingVerification ? (
              <View className="gap-4">
                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Text className="text-slate-600 text-sm font-medium mb-2 ml-1">First Name</Text>
                    <TextInput
                      value={firstName}
                      placeholder="John"
                      placeholderTextColor="#94a3b8"
                      onChangeText={setFirstName}
                      className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-4 text-slate-800 text-base"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-600 text-sm font-medium mb-2 ml-1">Last Name</Text>
                    <TextInput
                      value={lastName}
                      placeholder="Doe"
                      placeholderTextColor="#94a3b8"
                      onChangeText={setLastName}
                      className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-4 text-slate-800 text-base"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-slate-600 text-sm font-medium mb-2 ml-1">Email</Text>
                  <TextInput
                    autoCapitalize="none"
                    value={emailAddress}
                    placeholder="Enter your email"
                    placeholderTextColor="#94a3b8"
                    onChangeText={setEmailAddress}
                    className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-4 text-slate-800 text-base"
                  />
                </View>

                <View>
                  <Text className="text-slate-600 text-sm font-medium mb-2 ml-1">Password</Text>
                  <TextInput
                    value={password}
                    placeholder="Create a password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={true}
                    onChangeText={setPassword}
                    className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-4 text-slate-800 text-base"
                  />
                </View>

                <View>
                  <Text className="text-slate-600 text-sm font-medium mb-2 ml-1">Confirm Password</Text>
                  <TextInput
                    value={confirmPassword}
                    placeholder="Confirm password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={true}
                    onChangeText={setConfirmPassword}
                    className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-4 text-slate-800 text-base"
                  />
                </View>

                {error ? <Text className="text-red-500 text-sm mt-1">{error}</Text> : null}

                <TouchableOpacity 
                  onPress={onSignUpPress} 
                  disabled={loading}
                  className={`w-full py-4 rounded-xl items-center shadow-sm mt-4 ${loading ? 'bg-indigo-400' : 'bg-indigo-600'}`}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-base">Create Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View className="gap-4">
                <Text className="text-slate-700 text-base mb-2">
                  A verification code has been sent to {emailAddress}. Please enter it below.
                </Text>
                
                <View className="mb-6">
                  <Text className="text-slate-600 text-sm font-medium mb-4 text-center">Verification Code</Text>
                  <View className="relative">
                    <View className="flex-row justify-between w-full" pointerEvents="none">
                      {[0, 1, 2, 3, 4, 5].map((index) => {
                        const digit = code[index] || '';
                        const isFocused = code.length === index;
                        return (
                          <View 
                            key={index} 
                            style={[
                              { width: 48, height: 56, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
                              isFocused ? { borderColor: '#6366f1', backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 } : { borderColor: 'rgba(226, 232, 240, 0.6)', backgroundColor: '#F4F5FA' }
                            ]}
                          >
                            <Text className="text-2xl font-extrabold text-slate-800">{digit}</Text>
                          </View>
                        );
                      })}
                    </View>
                    <TextInput
                      value={code}
                      onChangeText={(val) => setCode(val.replace(/[^0-9]/g, '').slice(0, 6))}
                      keyboardType="number-pad"
                      maxLength={6}
                      className="absolute inset-0 w-full h-full"
                      style={{ opacity: 0 }}
                      autoFocus
                    />
                  </View>
                </View>

                {error ? <Text className="text-red-500 text-sm mt-1">{error}</Text> : null}

                <TouchableOpacity 
                  onPress={onPressVerify} 
                  disabled={loading}
                  style={[
                    { width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
                    { backgroundColor: loading ? '#818cf8' : '#4f46e5' }
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-base">Verify Email</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {!pendingVerification && (
            <View className="flex-row justify-center mt-4">
              <Text className="text-slate-500">Already have an account? </Text>
              <Link href="/(auth)/sign-in" asChild>
                <TouchableOpacity>
                  <Text className="text-indigo-600 font-bold">Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
