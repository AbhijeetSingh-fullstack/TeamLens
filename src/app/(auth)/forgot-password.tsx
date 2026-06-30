import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { useSignIn } from '@clerk/clerk-expo';
import { Feather } from '@expo/vector-icons';

export default function ForgotPasswordScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [code, setCode] = useState('');
  const [successfulCreation, setSuccessfulCreation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Send password reset code
  const onRequestReset = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: emailAddress,
      });
      setSuccessfulCreation(true);
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'An error occurred during password reset');
    } finally {
      setLoading(false);
    }
  };

  // Reset password with code and new password
  const onResetPassword = async () => {
    if (!isLoaded) return;
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        setTimeout(() => {
          router.replace('/');
        }, 100);
      } else {
        setError('Complete sign in action required.');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'An error occurred while resetting password');
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
            <Image 
              source={require('../../../assets/images/TeamLens.png')} 
              style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 24 }}
              resizeMode="contain"
            />
            <Text className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Reset Password</Text>
            <Text className="text-slate-500 text-base text-center">
              {successfulCreation ? 'Enter your verification code and new password' : 'Enter your email to receive a reset code'}
            </Text>
          </View>

          <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
            {!successfulCreation ? (
              <View className="gap-4">
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

                {error ? <Text className="text-red-500 text-sm mt-1">{error}</Text> : null}

                <TouchableOpacity 
                  onPress={onRequestReset} 
                  disabled={loading}
                  className={`w-full py-4 rounded-xl items-center shadow-sm mt-4 ${loading ? 'bg-indigo-400' : 'bg-indigo-600'}`}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-base">Send Reset Code</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View className="gap-4">
                <View className="mb-4">
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
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-slate-600 text-sm font-medium mb-2 ml-1">New Password</Text>
                  <View className="relative justify-center">
                    <TextInput
                      value={password}
                      placeholder="Create a new password"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showPassword}
                      onChangeText={setPassword}
                      className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-4 pr-12 text-slate-800 text-base"
                    />
                    <TouchableOpacity 
                      className="absolute right-4"
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View>
                  <Text className="text-slate-600 text-sm font-medium mb-2 ml-1">Confirm New Password</Text>
                  <View className="relative justify-center">
                    <TextInput
                      value={confirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showConfirmPassword}
                      onChangeText={setConfirmPassword}
                      className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-4 pr-12 text-slate-800 text-base"
                    />
                    <TouchableOpacity 
                      className="absolute right-4"
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Feather name={showConfirmPassword ? "eye" : "eye-off"} size={20} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                </View>

                {error ? <Text className="text-red-500 text-sm mt-1">{error}</Text> : null}

                <TouchableOpacity 
                  onPress={onResetPassword} 
                  disabled={loading}
                  className={`w-full py-4 rounded-xl items-center shadow-sm mt-4 ${loading ? 'bg-indigo-400' : 'bg-indigo-600'}`}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-base">Reset Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View className="flex-row justify-center mt-4">
            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity>
                <Text className="text-indigo-600 font-bold">Back to Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
