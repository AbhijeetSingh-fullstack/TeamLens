import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false
}: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white w-full rounded-3xl p-6 shadow-2xl">
          <View className="items-center mb-5">
            <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${isDestructive ? 'bg-red-50' : 'bg-indigo-50'}`}>
              <Feather name={isDestructive ? 'alert-triangle' : 'info'} size={28} color={isDestructive ? '#ef4444' : '#4f46e5'} />
            </View>
            <Text className="text-xl font-extrabold text-slate-800 text-center mb-2">{title}</Text>
            <Text className="text-slate-500 text-center text-sm">{message}</Text>
          </View>
          
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onCancel}
              className="flex-1 py-3.5 rounded-xl bg-slate-100 items-center justify-center"
            >
              <Text className="text-slate-700 font-bold">{cancelText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => {
                onCancel(); // Close immediately on press
                setTimeout(() => onConfirm(), 100); // Allow animation or context close
              }}
              className={`flex-1 py-3.5 rounded-xl items-center justify-center shadow-sm ${isDestructive ? 'bg-red-500' : 'bg-indigo-600'}`}
            >
              <Text className="text-white font-bold">{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
