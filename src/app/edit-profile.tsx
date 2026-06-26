import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, Image, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../utils/supabase';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setProfileImage(user.imageUrl);
    }
  }, [user]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], // Fixes the deprecation warning
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.2, // Lower quality to avoid 10MB limit
        base64: true, // Need base64 for Clerk in React Native
      });

      if (!result.canceled && result.assets[0].uri && result.assets[0].base64) {
        setProfileImage(result.assets[0].uri);
        const mimeType = result.assets[0].mimeType || 'image/jpeg';
        setBase64Image(`data:${mimeType};base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    console.log("Starting save process...");
    setIsSaving(true);
    try {
      console.log("Updating name to:", firstName, lastName);
      // Update name
      await user.update({
        firstName,
        lastName,
      });
      console.log("Name updated successfully!");

      // Update image if a new one was selected and it's a local file URI
      if (base64Image) {
        console.log("Uploading base64 image to clerk...");
        await user.setProfileImage({
          file: base64Image,
        });
        console.log("Image updated successfully!");
      }

      console.log("Reloading user...");
      // Reload to ensure updates reflect in session
      await user.reload();
      console.log("Save process complete!");

      // Sync to Supabase
      const newFullName = `${firstName} ${lastName}`.trim();
      const updatedImage = user.imageUrl || profileImage;

      // Update for team members
      await supabase
        .from('team_members')
        .update({ 
          member_name: newFullName, 
          profile_image_url: updatedImage 
        })
        .eq('user_id', user.id);

      // If they created a team, try to update teams table
      // (Since we don't have manager_id, we do a best effort match on their name or just update it if they are logged in as a member)
      await supabase
        .from('teams')
        .update({ 
          manager_name: newFullName, 
          manager_image_url: updatedImage 
        })
        .eq('manager_name', user.fullName || newFullName);

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        router.back();
      }, 1500);

    } catch (error: any) {
      console.error("Profile save error:", error);
      Alert.alert('Error', error.errors?.[0]?.longMessage || error.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F8F9FE]">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FE]">
      <StatusBar barStyle="dark-content" />
      
      {/* Header Bar */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-slate-200/50 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2">
          <Feather name="arrow-left" size={24} color="#334155" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-800">Edit Profile</Text>
        <View className="w-10 h-10" />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          
          {/* Profile Picture Upload */}
          <View className="items-center mb-8">
            <View className="relative">
              <View className="w-28 h-28 rounded-full bg-slate-200 overflow-hidden border-4 border-white shadow-sm">
                {profileImage ? (
                  <Image source={{ uri: profileImage }} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <View className="w-full h-full bg-indigo-100 items-center justify-center">
                    <Feather name="user" size={40} color="#4f46e5" />
                  </View>
                )}
              </View>
              <TouchableOpacity 
                onPress={pickImage}
                className="absolute bottom-0 right-0 w-9 h-9 bg-indigo-600 rounded-full border-2 border-white items-center justify-center shadow-md active:bg-indigo-700"
              >
                <Feather name="camera" size={16} color="white" />
              </TouchableOpacity>
            </View>
            <Text className="text-slate-500 text-sm mt-3 font-medium">Tap to change picture</Text>
          </View>

          {/* Form Fields */}
          <View className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-6">
            <View className="mb-4">
              <Text className="text-slate-600 text-xs font-bold uppercase tracking-wider mb-2 ml-1">First Name</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter first name"
                className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-3 text-slate-800 font-medium"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View>
              <Text className="text-slate-600 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Last Name</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter last name"
                className="w-full bg-[#F4F5FA] border border-slate-200/60 rounded-xl px-4 py-3 text-slate-800 font-medium"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <TouchableOpacity 
            onPress={handleSave}
            disabled={isSaving}
            className={`w-full py-4 rounded-xl items-center shadow-md ${isSaving ? 'bg-indigo-400' : 'bg-indigo-600 active:bg-indigo-700'}`}
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Save Changes</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View className="flex-1 bg-black/40 items-center justify-center">
          <View className="bg-white p-6 rounded-3xl items-center shadow-xl w-64 border border-slate-100">
            <View className="w-16 h-16 bg-emerald-100 rounded-full items-center justify-center mb-4">
              <Feather name="check" size={32} color="#10b981" />
            </View>
            <Text className="text-xl font-extrabold text-slate-800 mb-2">Saved!</Text>
            <Text className="text-slate-500 text-center font-medium">Your profile has been updated successfully.</Text>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
