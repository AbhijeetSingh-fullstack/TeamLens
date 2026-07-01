import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { useSignIn } from '@clerk/clerk-expo';
import { Feather } from '@expo/vector-icons';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingSecondFactor, setPendingSecondFactor] = useState(false);
  const [code, setCode] = useState('');

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
        console.log("Sign In Attempt Incomplete:", JSON.stringify(signInAttempt, null, 2));
        if (signInAttempt.status === 'needs_first_factor' || signInAttempt.status === 'needs_second_factor') {
          try {
            if (signInAttempt.status === 'needs_second_factor') {
              await signIn.prepareSecondFactor({ strategy: 'email_code' });
            } else {
              const emailFactor = signInAttempt.supportedFirstFactors.find((f: any) => f.strategy === 'email_code') as any;
              if (emailFactor) {
                await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: emailFactor.emailAddressId });
              }
            }
            setPendingSecondFactor(true);
          } catch (prepareErr: any) {
            setError(prepareErr.errors?.[0]?.longMessage || 'Failed to send verification code.');
          }
        } else {
          setError(`Action required: ${signInAttempt.status}`);
        }
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError('');

    try {
      let completeSignIn;
      if (signIn.status === 'needs_second_factor') {
        completeSignIn = await signIn.attemptSecondFactor({ strategy: 'email_code', code });
      } else {
        completeSignIn = await signIn.attemptFirstFactor({ strategy: 'email_code', code });
      }

      if (completeSignIn.status === 'complete') {
        await setActive({ session: completeSignIn.createdSessionId });
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
        <View className="flex-1 px-6 pt-10 pb-6 justify-center">
          
          <View className="mb-10 items-center">
            <Image 
              source={require('../../../assets/images/TeamLens.png')} 
              style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 24 }}
              resizeMode="contain"
            />
            <Text className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Welcome Back</Text>
            <Text className="text-slate-500 text-base text-center">
              Sign in to continue to your TeamLens dashboard
            </Text>
          </View>

          <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
            {!pendingSecondFactor ? (
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
                  <View className="relative justify-center">
                    <TextInput
                      value={password}
                      placeholder="Enter your password"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showPassword}
                      onChangeText={(password) => setPassword(password)}
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

                <View className="flex-row justify-end">
                  <Link href="/(auth)/forgot-password" asChild>
                    <TouchableOpacity>
                      <Text className="text-indigo-600 text-sm font-medium">Forgot Password?</Text>
                    </TouchableOpacity>
                  </Link>
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
            ) : (
              <View className="gap-4">
                <Text className="text-slate-700 text-base mb-2">
                  A verification code has been sent to your email to verify this login. Please enter it below.
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
                    <Text className="text-white font-bold text-base">Verify & Sign In</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
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
