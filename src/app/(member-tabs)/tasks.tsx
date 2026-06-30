import { Feather } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useGlobalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';
import { updateTaskAnalysis } from '../../utils/analytics';

export default function MemberTasks() {
  const { memberId } = useGlobalSearchParams<{ memberId: string }>();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Submission State
  const [isSubmitModalVisible, setSubmitModalVisible] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submissionImage, setSubmissionImage] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTasks = async () => {
    if (!memberId) return;
    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .select(`
          id,
          status,
          created_at,
          completed_at,
          specific_instructions,
          submission_notes,
          submission_image_url,
          revisions_count,
          tasks!inner (
            id,
            team_id,
            title,
            description,
            category,
            priority,
            due_date,
            status
          )
        `)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (data) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).getTime();
        const filtered = data.filter(a => {
          if (a.status === 'completed' && a.completed_at) {
            return new Date(a.completed_at).getTime() > oneDayAgo;
          }
          return true;
        });
        setAssignments(filtered);
      }
    } catch (e) {
      console.log('Error fetching assigned tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [memberId]);

  const openSubmitModal = (assignment: any) => {
    setSelectedAssignment(assignment);
    setSubmissionNotes('');
    setSubmissionImage(null);
    setSubmitModalVisible(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setSubmissionImage(result.assets[0]);
    }
  };

  const handleSubmitTask = async () => {
    if (!selectedAssignment) {
      Alert.alert("Error", "No assignment selected.");
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = null;

      // 1. Upload Image if present
      if (submissionImage && submissionImage.base64) {
        // Safe extraction of extension, defaulting to jpeg
        const uriParts = submissionImage.uri.split('.');
        let ext = uriParts[uriParts.length - 1].split('?')[0].toLowerCase();
        if (ext === 'jpg') ext = 'jpeg';

        const fileName = `${selectedAssignment.tasks.id}/${memberId}_${Date.now()}.${ext}`;
        const contentType = submissionImage.mimeType || `image/${ext}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('task-submissions')
          .upload(fileName, decode(submissionImage.base64), {
            contentType: contentType,
          });

        if (uploadError) {
          console.error("Storage Error:", uploadError);
          throw new Error("Image Upload Error: " + uploadError.message);
        }

        if (uploadData) {
          const { data: publicUrlData } = supabase.storage.from('task-submissions').getPublicUrl(uploadData.path);
          imageUrl = publicUrlData.publicUrl;
        }
      }

      // 2. Update Task Assignment
      const now = new Date().toISOString();
      const { error: assignError } = await supabase
        .from('task_assignments')
        .update({
          status: 'completed',
          submission_notes: submissionNotes,
          submission_image_url: imageUrl,
          completed_at: now
        })
        .eq('id', selectedAssignment.id);

      if (assignError) {
        console.error("Assignment Update Error:", assignError);
        throw new Error("Failed to update assignment: " + assignError.message);
      }

      // Calculate points
      const createdDate = new Date(selectedAssignment.created_at).getTime();
      const dueDate = new Date(selectedAssignment.tasks.due_date).getTime();
      const completedDate = new Date(now).getTime();

      let earnedPoints = 10;

      if (selectedAssignment.status === 'revision' || selectedAssignment.revisions_count > 0) {
        earnedPoints = 0;
      } else if (completedDate > dueDate) {
        earnedPoints = -1;
      } else {
        const totalDuration = dueDate - createdDate;
        if (totalDuration > 0) {
          const timeRemaining = dueDate - completedDate;
          const percentageRemaining = (timeRemaining / totalDuration) * 100;
          
          if (percentageRemaining >= 75) {
            earnedPoints = 10;
          } else if (percentageRemaining >= 50) {
            earnedPoints = 7;
          } else if (percentageRemaining >= 25) {
            earnedPoints = 4;
          } else {
            earnedPoints = 2;
          }
        }
      }
      
      let analyticsUpdate: any = { points: earnedPoints };
      
      if (selectedAssignment.status === 'revision' || selectedAssignment.revisions_count > 0) {
        analyticsUpdate.revision = true;
      } else {
        analyticsUpdate.completed = true;
      }
      
      // Update analytics
      await updateTaskAnalysis(selectedAssignment.tasks.team_id, memberId, analyticsUpdate);

      // 3. Check if all assignments for this task are completed
      const { data: allAssigns, error: allAssignsError } = await supabase
        .from('task_assignments')
        .select('status')
        .eq('task_id', selectedAssignment.tasks.id);

      if (allAssignsError) {
        console.error("All Assigns Error:", allAssignsError);
        throw new Error("Failed to check other assignments: " + allAssignsError.message);
      }

      if (allAssigns && allAssigns.every(a => a.status === 'completed')) {
        // Update parent task to completed
        const { error: parentTaskError } = await supabase
          .from('tasks')
          .update({ status: 'completed', completed_at: now })
          .eq('id', selectedAssignment.tasks.id);

        if (parentTaskError) {
          console.error("Parent Task Update Error:", parentTaskError);
          throw new Error("Failed to update parent task: " + parentTaskError.message);
        }
      }

      setSubmitModalVisible(false);
      fetchTasks();
      Alert.alert("Success", "Task submitted successfully! Great job.");

    } catch (error: any) {
      console.error("Submit Error:", error);
      Alert.alert("Error Occurred", error?.message || "An unexpected error occurred while submitting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAssignments = assignments.filter(a =>
    a.tasks?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTask = ({ item }: { item: any }) => {
    const task = item.tasks;
    if (!task) return null;

    const isOverdue = new Date(task.due_date) < new Date() && item.status !== 'completed';
    const isCompleted = item.status === 'completed';

    return (
      <View className={`bg-white p-5 rounded-2xl mb-4 shadow-sm border ${isCompleted ? 'border-emerald-200 bg-emerald-50/20 opacity-80' : 'border-slate-100'}`}>
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-2">
              <View className="bg-indigo-50 px-2 py-0.5 rounded text-center">
                <Text className="text-[10px] font-bold text-indigo-500 uppercase">{task.category || 'Task'}</Text>
              </View>
              <View className={`px-2 py-0.5 rounded text-center ${task.priority === 'high' ? 'bg-red-50' : 'bg-orange-50'}`}>
                <Text className={`text-[10px] font-bold uppercase ${task.priority === 'high' ? 'text-red-500' : 'text-orange-500'}`}>{task.priority}</Text>
              </View>
              {isOverdue && (
                <View className="bg-red-500 px-2 py-0.5 rounded text-center">
                  <Text className="text-[10px] font-bold text-white uppercase">Overdue</Text>
                </View>
              )}
            </View>
            <Text className={`font-bold text-lg ${isCompleted ? 'text-emerald-800' : 'text-slate-800'}`}>{task.title}</Text>
          </View>

          {isCompleted ? (
            <View className="bg-emerald-100 px-3 py-1.5 rounded-lg flex-row items-center gap-1 border border-emerald-200">
              <Feather name="check-circle" size={12} color="#059669" />
              <Text className="text-emerald-700 font-bold text-xs">Done</Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-2">
              {item.status === 'revision' && (
                <View className="bg-red-50 px-2 py-1.5 rounded-lg border border-red-100 flex-row items-center gap-1">
                  <Feather name="alert-circle" size={10} color="#ef4444" />
                  <Text className="text-[10px] font-bold text-red-500 uppercase">Revision Requested</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => openSubmitModal(item)}
                className="bg-indigo-600 px-4 py-2 rounded-xl flex-row items-center shadow-sm"
              >
                <Text className="text-white font-bold text-xs">Submit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {task.description ? (
          <Text className="text-slate-500 text-sm mb-4 leading-5">{task.description}</Text>
        ) : null}

        <View className={`${isCompleted ? 'bg-white' : 'bg-indigo-50/50'} rounded-xl p-4 border ${isCompleted ? 'border-emerald-100' : 'border-indigo-100'}`}>
          <View className="flex-row items-center gap-2 mb-2">
            <Feather name="info" size={14} color={isCompleted ? '#059669' : '#4f46e5'} />
            <Text className={`${isCompleted ? 'text-emerald-700' : 'text-indigo-600'} font-bold text-xs uppercase tracking-wider`}>Your Instructions</Text>
          </View>
          <Text className="text-slate-700 text-sm font-medium">
            {item.specific_instructions || "No specific instructions provided. Follow the general description."}
          </Text>
        </View>

        {isCompleted && item.submission_notes && (
          <View className="mt-4 pt-4 border-t border-emerald-100">
            <Text className="text-emerald-700 font-bold text-xs uppercase tracking-wider mb-2">Your Submission</Text>
            <Text className="text-slate-600 text-sm italic">"{item.submission_notes}"</Text>
          </View>
        )}

        <View className={`mt-4 pt-4 flex-row items-center justify-between ${isCompleted ? '' : 'border-t border-slate-100'}`}>
          <View className="flex-row items-center gap-2">
            <Feather name="calendar" size={14} color="#94a3b8" />
            <Text className="text-slate-500 text-xs font-semibold">
              Due: {new Date(task.due_date).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9F9FB]">
      <View className="px-5 py-4 bg-white border-b border-slate-100 z-10">
        <Text className="text-2xl font-extrabold text-slate-800 mb-4">My Tasks</Text>
        <View className="flex-row items-center bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            placeholder="Search my tasks..."
            className="flex-1 ml-3 text-slate-800 font-medium"
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={filteredAssignments}
          keyExtractor={item => item.id}
          renderItem={renderTask}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="items-center justify-center mt-10">
              <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
                <Feather name="check-circle" size={24} color="#94a3b8" />
              </View>
              <Text className="text-slate-500 font-medium text-center">You have no tasks assigned.{'\n'}Enjoy your day!</Text>
            </View>
          }
        />
      )}

      {/* Submit Task Modal */}
      <Modal visible={isSubmitModalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
          <View className="px-5 py-4 border-b border-slate-100 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-slate-800">Submit Task</Text>
            <TouchableOpacity onPress={() => setSubmitModalVisible(false)} className="w-8 h-8 items-center justify-center bg-slate-100 rounded-full">
              <Feather name="x" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-5" keyboardShouldPersistTaps="handled">
            <View className="mb-6">
              <Text className="text-slate-800 font-bold text-xl mb-1">{selectedAssignment?.tasks?.title}</Text>
              <Text className="text-slate-500 text-sm">Please provide details of your completed work.</Text>
            </View>

            <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Submission Notes</Text>
            <TextInput
              placeholder="What did you accomplish? Any notes for the manager?"
              multiline
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-6 text-slate-800 min-h-[120px]"
              value={submissionNotes}
              onChangeText={setSubmissionNotes}
              style={{ textAlignVertical: 'top' }}
            />

            <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2">Upload Evidence (Optional)</Text>
            <TouchableOpacity
              onPress={pickImage}
              className={`border-2 border-dashed rounded-xl items-center justify-center mb-6 overflow-hidden ${submissionImage ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-300 bg-slate-50 min-h-[150px]'}`}
            >
              {submissionImage ? (
                <View className="w-full relative">
                  <Image source={{ uri: submissionImage.uri }} className="w-full h-48" resizeMode="cover" />
                  <View className="absolute inset-0 bg-black/20 items-center justify-center">
                    <View className="bg-white/90 px-4 py-2 rounded-lg flex-row items-center shadow-sm">
                      <Feather name="edit-2" size={14} color="#4f46e5" />
                      <Text className="text-indigo-600 font-bold ml-2">Change Image</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="items-center py-8">
                  <View className="w-12 h-12 bg-indigo-100 rounded-full items-center justify-center mb-3">
                    <Feather name="camera" size={20} color="#4f46e5" />
                  </View>
                  <Text className="text-slate-600 font-medium text-center">Tap to upload a screenshot or photo</Text>
                  <Text className="text-slate-400 text-xs mt-1">JPEG, PNG supported</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmitTask}
              disabled={isSubmitting}
              className={`py-4 rounded-xl items-center shadow-sm mb-10 ${isSubmitting ? 'bg-indigo-400' : 'bg-indigo-600'}`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center gap-2">
                  <Feather name="check" size={18} color="white" />
                  <Text className="text-white font-bold text-base">Mark as Completed</Text>
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
