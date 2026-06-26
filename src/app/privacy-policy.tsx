import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      
      {/* Header Bar */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-slate-100 bg-white shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2">
          <Feather name="arrow-left" size={24} color="#334155" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-800">Privacy Policy</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView className="flex-1 px-6 pt-6 bg-[#F8F9FE]" contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        
        <View className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6">
          <Text className="text-slate-800 font-extrabold text-2xl mb-2">TeamLens Privacy Policy</Text>
          <Text className="text-slate-500 text-sm mb-8">Last Updated: June 2026</Text>

          <Text className="text-slate-800 font-bold text-lg mb-3">1. Information We Collect</Text>
          <Text className="text-slate-600 leading-6 mb-6">
            We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us. This information may include: name, email, phone number, postal address, profile picture, and workspace data.
          </Text>

          <Text className="text-slate-800 font-bold text-lg mb-3">2. How We Use Information</Text>
          <Text className="text-slate-600 leading-6 mb-6">
            We may use the information we collect about you to provide, maintain, and improve our services, such as facilitating payments, sending receipts, providing products and services you request, developing new features, providing customer support to users, develop safety features, authenticate users, and send product updates.
          </Text>

          <Text className="text-slate-800 font-bold text-lg mb-3">3. Sharing of Information</Text>
          <Text className="text-slate-600 leading-6 mb-6">
            We may share the information we collect about you as described in this statement or as described at the time of collection or sharing. We do not sell your personal data to third parties. Information is only shared within your specific workspace environment for collaboration purposes.
          </Text>

          <Text className="text-slate-800 font-bold text-lg mb-3">4. Data Security</Text>
          <Text className="text-slate-600 leading-6 mb-6">
            We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction. We use industry standard encryption and authentication mechanisms through Clerk and Supabase.
          </Text>

          <Text className="text-slate-800 font-bold text-lg mb-3">5. User Rights</Text>
          <Text className="text-slate-600 leading-6 mb-6">
            You have the right to access, correct, update or request deletion of your personal information. If you wish to exercise these rights, you can do so through your profile settings or by contacting our support team directly.
          </Text>

          <View className="h-[1px] bg-slate-100 my-6" />

          <Text className="text-slate-500 text-sm italic text-center">
            If you have any questions about this Privacy Policy, please contact us at abhijeet200508@gmail.com
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
