import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';

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
  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = async () => {
    if (!teamId) return;
    try {
      // Fetch all messages for the team for now
      // If receiver_id exists, we would filter by (sender=me AND receiver=them) OR (sender=them AND receiver=me)
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: true });
        
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !teamId || isSending) return;
    
    setIsSending(true);
    const content = newMessage.trim();
    setNewMessage('');
    
    try {
      const payload: any = {
        team_id: teamId,
        sender_id: senderId === 'manager' ? null : senderId,
        sender_name: senderName || 'User',
        content: content
      };

      // Try inserting with receiver_id. If it fails due to schema, we fallback to without it.
      let { error } = await supabase.from('messages').insert([{ ...payload, receiver_id: receiverId === 'manager' ? null : receiverId }]);
      
      if (error && error.code === 'PGRST204') { // Column not found error roughly
         const { error: fallbackError } = await supabase.from('messages').insert([payload]);
         if (fallbackError) throw fallbackError;
      } else if (error) {
         // Maybe PGRST isn't exact, let's just attempt fallback on any error for now
         const { error: fallbackError } = await supabase.from('messages').insert([payload]);
         if (fallbackError) throw fallbackError;
      }

      fetchMessages();
    } catch (e) {
      alert("Failed to send message.");
      setNewMessage(content); // restore on fail
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === (senderId === 'manager' ? null : senderId);

    return (
      <View className={`mb-4 max-w-[80%] ${isMe ? 'self-end' : 'self-start'}`}>
        {!isMe && (
          <Text className="text-slate-500 text-xs mb-1 ml-1 font-medium">
            {item.sender_name}
          </Text>
        )}
        <View 
          className={`p-3 rounded-2xl ${
            isMe 
              ? 'bg-indigo-600 rounded-tr-sm' 
              : 'bg-white border border-slate-100 rounded-tl-sm shadow-sm'
          }`}
        >
          <Text className={`text-base ${isMe ? 'text-white' : 'text-slate-800'}`}>
            {item.content}
          </Text>
        </View>
        <Text className={`text-[10px] text-slate-400 mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9F9FB]">
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-4 py-3 border-b border-slate-200 bg-white flex-row items-center gap-3 z-10 shadow-sm">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
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
        <View className="p-4 bg-white border-t border-slate-100 flex-row items-center gap-3 pb-8">
          <View className="flex-1 bg-slate-50 border border-slate-200 rounded-full flex-row items-center px-4 py-1">
            <TextInput
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor="#94a3b8"
              className="flex-1 py-3 text-slate-800 text-base"
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity 
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            className={`w-12 h-12 rounded-full items-center justify-center ${
              !newMessage.trim() || isSending ? 'bg-slate-200' : 'bg-indigo-600'
            }`}
          >
            <Feather name="send" size={20} color="white" className="ml-1" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
