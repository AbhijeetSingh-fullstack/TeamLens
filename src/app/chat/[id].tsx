import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, StatusBar, Image, ActivityIndicator, Linking, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { decode } from 'base64-arraybuffer';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Message = {
  id: string;
  sender_id: string | null;
  sender_name: string;
  content: string;
  created_at: string;
  receiver_id?: string | null; // Optional since it might not exist in schema yet
};

export default function ChatScreen() {
  const router = useRouter();
  const { id: receiverId, receiverName, teamId, senderId, senderName } = useLocalSearchParams<{
    id: string;
    receiverName: string;
    teamId: string;
    senderId: string;
    senderName: string;
  }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = async () => {
    if (!teamId) return;
    try {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: true });

      if (senderId && receiverId) {
        const myId = senderId === 'manager' ? 'null' : senderId;
        const theirId = receiverId === 'manager' ? 'null' : receiverId;
        
        const filter1 = myId === 'null' ? `and(sender_id.is.null,receiver_id.eq.${theirId})` : theirId === 'null' ? `and(sender_id.eq.${myId},receiver_id.is.null)` : `and(sender_id.eq.${myId},receiver_id.eq.${theirId})`;
        const filter2 = theirId === 'null' ? `and(sender_id.is.null,receiver_id.eq.${myId})` : myId === 'null' ? `and(sender_id.eq.${theirId},receiver_id.is.null)` : `and(sender_id.eq.${theirId},receiver_id.eq.${myId})`;

        query = query.or(`${filter1},${filter2}`);
      }

      const { data, error } = await query;
        
      if (!error && data) {
        // Soft filter in JS if receiver_id happens to be returned
        const filtered = data.filter(m => {
          if ('receiver_id' in m) {
            const isToMe = m.receiver_id === senderId || (m.receiver_id === null && senderId === 'manager');
            const isFromMe = m.sender_id === senderId || (m.sender_id === null && senderId === 'manager');
            const isToThem = m.receiver_id === receiverId || (m.receiver_id === null && receiverId === 'manager');
            const isFromThem = m.sender_id === receiverId || (m.sender_id === null && receiverId === 'manager');
            return (isFromMe && isToThem) || (isFromThem && isToMe);
          }
          // If no receiver_id column exists, just show all messages for the team as a fallback
          return true;
        });
        setMessages(filtered);
        
        // Mark as read
        const theirId = receiverId === 'manager' ? 'manager' : receiverId;
        if (theirId) {
          const stored = await AsyncStorage.getItem('lastReadTimes');
          const lastReadTimes = stored ? JSON.parse(stored) : {};
          lastReadTimes[theirId] = Date.now();
          await AsyncStorage.setItem('lastReadTimes', JSON.stringify(lastReadTimes));
        }
      }
    } catch (e) {
      console.log('Error fetching messages:', e);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Poll for new messages
    return () => clearInterval(interval);
  }, [teamId, senderId, receiverId]);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
        setSelectedImageBase64(result.assets[0].base64 || null);
      }
    } catch (e: any) {
      alert(e.message || "An error occurred selecting image.");
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !teamId || isSending) return;
    
    setIsSending(true);
    const contentText = newMessage.trim();
    const imageUri = selectedImage;
    const imageBase64 = selectedImageBase64;
    
    setNewMessage('');
    setSelectedImage(null);
    setSelectedImageBase64(null);
    
    try {
      let finalContent = contentText;

      if (imageUri) {
        let ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
        if (ext.length > 4 || ext.includes('/')) {
           ext = 'jpg';
        }
        const fileExt = ext === 'png' ? 'png' : 'jpeg';
        const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
        let bucketName = 'FIlEs';
        let uploadResult;

        if (imageUri.startsWith('blob:') || Platform.OS === 'web') {
           const response = await fetch(imageUri);
           const blob = await response.blob();
           uploadResult = await supabase.storage.from(bucketName).upload(fileName, blob, { contentType: `image/${fileExt}` });
        } else {
           if (!imageBase64) throw new Error("Image data missing");
           const arrayBuffer = decode(imageBase64);
           uploadResult = await supabase.storage.from(bucketName).upload(fileName, arrayBuffer, { contentType: `image/${fileExt}` });
        }
        
        if (uploadResult.error) {
           throw new Error(`Upload Failed: ${uploadResult.error.message}`);
        }

        const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);
        finalContent = `[IMG]${data.publicUrl}[/IMG] ${contentText}`.trim();
      }

      const payload: any = {
        team_id: teamId,
        sender_id: senderId === 'manager' ? null : senderId,
        sender_name: senderName || 'User',
        content: finalContent
      };

      let insertRes = await supabase.from('messages').insert([{ ...payload, receiver_id: receiverId === 'manager' ? null : receiverId }]);
      if (insertRes.error && (insertRes.error.code === 'PGRST204' || insertRes.error.message.includes('receiver_id'))) {
         const { error: fallbackError } = await supabase.from('messages').insert([payload]);
         if (fallbackError) throw fallbackError;
      } else if (insertRes.error) {
         throw insertRes.error;
      }

      // Send Push Notification
      try {
        const { sendExpoPushNotification } = await import('../../utils/notifications');
        
        let actualRecipientUserId = null;
        let actualMemberId = null;

        if (receiverId === 'manager') {
          // Fetch manager user_id
          const { data: teamData } = await supabase
            .from('teams')
            .select('organization_id')
            .eq('id', teamId)
            .single();
            
          if (teamData?.organization_id) {
            const { data: orgData } = await supabase
              .from('organizations')
              .select('created_by')
              .eq('id', teamData.organization_id)
              .single();
            if (orgData?.created_by) {
              actualRecipientUserId = orgData.created_by;
            }
          }
        } else if (receiverId) {
          actualMemberId = receiverId;
        }

        if (actualRecipientUserId || actualMemberId) {
          await sendExpoPushNotification({
            recipientUserId: actualRecipientUserId,
            memberId: actualMemberId,
            title: `New Message from ${senderName || 'User'}`,
            body: contentText || 'Sent an image.',
            data: { type: 'chat', teamId }
          });
        }
      } catch (pushErr) {
        console.error("Push Notification error:", pushErr);
      }

      fetchMessages();
    } catch (e: any) {
      alert(e.message || "Failed to send message.");
      setNewMessage(contentText);
      setSelectedImage(imageUri);
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === (senderId === 'manager' ? null : senderId);
    
    // Backwards compatibility for the first few messages sent with [IMAGE] tag
    let imageUrl = null;
    let textContent = item.content;

    if (item.content.startsWith('[IMAGE]')) {
       imageUrl = item.content.replace('[IMAGE]', '');
       textContent = '';
    } else {
       const imgMatch = item.content.match(/\[IMG\](.*?)\[\/IMG\]/);
       if (imgMatch) {
          imageUrl = imgMatch[1];
          textContent = item.content.replace(/\[IMG\].*?\[\/IMG\]/, '').trim();
       }
    }

    return (
      <View className={`mb-4 max-w-[80%] ${isMe ? 'self-end' : 'self-start'}`}>
        {!isMe && (
          <Text className="text-slate-500 text-xs mb-1 ml-1 font-medium">
            {item.sender_name}
          </Text>
        )}
        <View 
          className={`rounded-2xl overflow-hidden ${
             isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'
          } ${
             (imageUrl && !textContent) 
               ? '' 
               : (isMe ? 'bg-indigo-600' : 'bg-white border border-slate-100 shadow-sm')
          }`}
        >
          {imageUrl && (
             <TouchableOpacity 
               activeOpacity={0.9}
               onPress={() => setFullScreenImage(imageUrl)}
               style={{ width: 224, height: 224, backgroundColor: '#e2e8f0', overflow: 'hidden' }}
             >
               <Image source={{ uri: imageUrl }} style={{ width: 224, height: 224 }} resizeMode="cover" />
             </TouchableOpacity>
          )}
          {!!textContent && (
            <Text className={`text-base px-3 py-2 ${isMe ? 'text-white' : 'text-slate-800'}`}>
              {textContent}
            </Text>
          )}
        </View>
        <Text className={`text-[10px] text-slate-400 mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      className="flex-1 bg-white"
    >
      <SafeAreaView className="flex-1" edges={['top']}>
        <StatusBar barStyle="dark-content" />
        {/* Header */}
        <View className="px-4 py-3 border-b border-slate-200 bg-white flex-row items-center gap-3 z-10 shadow-sm">
          <TouchableOpacity 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            }} 
            className="w-10 h-10 items-center justify-center"
          >
            <Feather name="arrow-left" size={24} color="#64748b" />
          </TouchableOpacity>
          <View className="w-10 h-10 rounded-full bg-indigo-50 items-center justify-center border border-indigo-100">
             <Feather name="user" size={18} color="#4f46e5" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-800">{receiverName}</Text>
            <Text className="text-emerald-500 text-xs font-bold">Online</Text>
          </View>
        </View>

        {/* Chat Area */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-20">
              <View className="w-16 h-16 bg-indigo-50 rounded-full items-center justify-center mb-4">
                <Feather name="message-square" size={24} color="#4f46e5" />
              </View>
              <Text className="text-slate-500 font-medium text-center px-8">
                This is the start of your conversation with {receiverName}.
              </Text>
            </View>
          }
        />

        {/* Input Area */}
        <View className="bg-white border-t border-slate-100 flex-col pt-2 pb-2">
          
          {/* Image Preview Area */}
          {selectedImage && (
            <View className="px-4 pt-3 flex-row items-end">
              <View className="relative rounded-xl overflow-hidden shadow-sm border border-slate-200" style={{ width: 80, height: 80 }}>
                <Image source={{ uri: selectedImage }} style={{ width: 80, height: 80 }} resizeMode="cover" />
                <TouchableOpacity 
                  onPress={() => { setSelectedImage(null); setSelectedImageBase64(null); }}
                  className="absolute top-1 right-1 bg-black/60 rounded-full w-6 h-6 items-center justify-center"
                  style={{ zIndex: 50, elevation: 5 }}
                >
                  <Feather name="x" size={14} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View className="p-4 flex-row items-center gap-2">
            <TouchableOpacity 
              onPress={handlePickImage}
              disabled={isSending}
              className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center border border-slate-200"
            >
              <Feather name="paperclip" size={20} color="#64748b" />
            </TouchableOpacity>
            
            <View className="flex-1 bg-slate-50 border border-slate-200 rounded-3xl flex-row items-center px-4 py-1 min-h-[48px]">
              <TextInput
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder={selectedImage ? "Add a caption..." : "Type a message..."}
                placeholderTextColor="#94a3b8"
                className="flex-1 py-2 text-slate-800 text-base"
                multiline
                maxLength={500}
              />
            </View>
            
            <TouchableOpacity 
              onPress={handleSendMessage}
              disabled={(!newMessage.trim() && !selectedImage) || isSending}
              className={`w-12 h-12 rounded-full items-center justify-center ${
                (!newMessage.trim() && !selectedImage) || isSending ? 'bg-slate-200' : 'bg-indigo-600'
              }`}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Feather name="send" size={20} color="white" className="ml-1" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Full Screen Image Modal */}
      <Modal visible={!!fullScreenImage} transparent={true} animationType="fade">
        <View 
          className="flex-1 justify-center items-center" 
          style={Platform.OS === 'web' ? { backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' } as any : { backgroundColor: 'rgba(0,0,0,0.95)' }}
        >
          <TouchableOpacity 
            onPress={() => setFullScreenImage(null)}
            style={{ 
              position: 'absolute', 
              top: 48, 
              left: 24, 
              zIndex: 50, 
              elevation: 5, 
              width: 48, 
              height: 48,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Feather name="x" size={28} color="white" />
          </TouchableOpacity>
          {fullScreenImage && (
            <Image 
              source={{ uri: fullScreenImage }} 
              style={{ width: '100%', height: '80%' }} 
              resizeMode="contain" 
            />
          )}
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}
