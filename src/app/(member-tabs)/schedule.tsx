import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useMemo, createElement } from 'react';
import { supabase } from '../../utils/supabase';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  parseISO,
  startOfDay,
  setHours,
  setMinutes
} from 'date-fns';

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Schedule() {
  const [memberId, setMemberId] = useState<string>('');
  const [teamId, setTeamId] = useState<string>('');

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(new Date().getTime() + 60 * 60 * 1000)); // +1 hour
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadIds = async () => {
      let mId = memberId;
      if (!mId) {
        mId = await AsyncStorage.getItem('memberId') || '';
        setMemberId(mId);
      }
      if (mId) {
        fetchSchedules(mId);
      } else {
        setLoading(false);
      }
    };
    loadIds();
  }, [currentMonth]);



  const fetchSchedules = async (userId: string) => {
    try {
      setLoading(true);
      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching schedules:', error);
      } else {
        setSchedules(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!memberId) {
      Alert.alert('Authentication Error', 'Could not verify your identity. Please sign out and log back in.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for the schedule.');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('schedules')
        .insert({
          user_id: memberId,
          title: title.trim(),
          description: description.trim(),
          date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: format(startTime, 'HH:mm:ss'),
          end_time: format(endTime, 'HH:mm:ss'),
        });

      if (error) throw error;

      setModalVisible(false);
      setTitle('');
      setDescription('');
      fetchSchedules(memberId);
      console.log('Schedule saved successfully!');
    } catch (err: any) {
      console.error('Supabase Insert Error:', err);
      if (Platform.OS === 'web') {
        window.alert('Error: ' + (err.message || 'Failed to add schedule'));
      } else {
        Alert.alert('Error', err.message || 'Failed to add schedule');
      }
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    // Reset times to current time on selected date
    const now = new Date();
    let st = new Date(selectedDate);
    st.setHours(now.getHours(), now.getMinutes(), 0, 0);
    
    let et = new Date(st);
    et.setHours(st.getHours() + 1);

    setStartTime(st);
    setEndTime(et);
    setTitle('');
    setDescription('');
    setModalVisible(true);
  };

  const openStartPicker = () => {
    if (Platform.OS === 'android') {
      setModalVisible(false);
      setTimeout(() => setShowStartPicker(true), 100);
    } else {
      setShowStartPicker(true);
    }
  };

  const openEndPicker = () => {
    if (Platform.OS === 'android') {
      setModalVisible(false);
      setTimeout(() => setShowEndPicker(true), 100);
    } else {
      setShowEndPicker(true);
    }
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // Calendar generation
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Selected date schedules
  const selectedDateSchedules = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return schedules.filter(s => s.date === dateStr);
  }, [schedules, selectedDate]);

  // Helper to check if a day has schedules
  const hasSchedule = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedules.some(s => s.date === dateStr);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="px-6 py-4 flex-row items-center justify-between bg-white border-b border-slate-100">
        <Text className="text-2xl font-extrabold text-slate-800 tracking-tight">Schedule</Text>
        <TouchableOpacity onPress={openAddModal} className="w-10 h-10 bg-indigo-600 rounded-full items-center justify-center shadow-sm">
          <Feather name="plus" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Calendar Section */}
        <View className="bg-white mx-4 mt-6 rounded-[24px] p-5 shadow-sm border border-slate-100">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-slate-800">
              {format(currentMonth, 'MMMM yyyy')}
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={prevMonth} className="w-10 h-10 bg-slate-50 items-center justify-center rounded-full">
                <Feather name="chevron-left" size={20} color="#64748b" />
              </TouchableOpacity>
              <TouchableOpacity onPress={nextMonth} className="w-10 h-10 bg-slate-50 items-center justify-center rounded-full">
                <Feather name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row justify-between mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <View key={day} className="w-10 items-center">
                <Text className="text-slate-400 font-bold text-xs">{day}</Text>
              </View>
            ))}
          </View>

          <View className="flex-row flex-wrap justify-start">
            {/* Blank spaces for first day of month padding */}
            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
              <View key={`empty-${i}`} className="w-[14.28%] h-12" />
            ))}
            
            {daysInMonth.map((date) => {
              const isSelected = isSameDay(date, selectedDate);
              const hasEvents = hasSchedule(date);
              const isToday = isSameDay(date, new Date());

              return (
                <TouchableOpacity
                  key={date.toString()}
                  onPress={() => setSelectedDate(date)}
                  className={`w-[14.28%] h-12 items-center justify-center`}
                >
                  <View className={`w-9 h-9 items-center justify-center rounded-full ${isSelected ? 'bg-indigo-600' : isToday ? 'bg-indigo-50' : ''}`}>
                    <Text className={`font-semibold ${isSelected ? 'text-white' : isToday ? 'text-indigo-600' : 'text-slate-700'}`}>
                      {format(date, 'd')}
                    </Text>
                    {hasEvents && !isSelected && (
                      <View className="w-1.5 h-1.5 bg-indigo-400 rounded-full absolute bottom-1" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Timeline Section */}
        <View className="mt-8 px-4">
          <Text className="text-lg font-bold text-slate-800 mb-6">
            {isSameDay(selectedDate, new Date()) ? 'Today' : format(selectedDate, 'EEEE, MMM do')}
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 40 }} />
          ) : selectedDateSchedules.length === 0 ? (
            <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 32, alignItems: 'center', justifyContent: 'center', elevation: 2, borderColor: '#f1f5f9', borderWidth: 1, marginTop: 8 }}>
              <View style={{ width: 64, height: 64, backgroundColor: '#f8fafc', borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Feather name="calendar" size={24} color="#94a3b8" />
              </View>
              <Text style={{ color: '#64748b', fontWeight: '500', textAlign: 'center' }}>No schedules for this day.</Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {selectedDateSchedules.map((event) => {
                let startStr = event.start_time;
                let endStr = event.end_time || '';
                
                try {
                  if (event.date && event.start_time) {
                    startStr = format(parseISO(`${event.date}T${event.start_time}`), 'h:mm a');
                  }
                  if (event.date && event.end_time) {
                    endStr = format(parseISO(`${event.date}T${event.end_time}`), 'h:mm a');
                  }
                } catch (e) {
                  // Fallback to raw string if parsing fails
                  console.error('Date parsing error:', e);
                }

                return (
                  <View key={event.id} style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, elevation: 2, borderColor: '#f1f5f9', borderWidth: 1, flexDirection: 'row' }}>
                    <View style={{ width: 6, backgroundColor: '#6366f1', borderRadius: 9999, marginRight: 16 }} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <View style={{ backgroundColor: '#eef2ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 }}>
                          <Text style={{ color: '#4338ca', fontWeight: 'bold', fontSize: 12 }}>{startStr} - {endStr}</Text>
                        </View>
                        <TouchableOpacity style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#f8fafc' }}>
                          <Feather name="more-horizontal" size={16} color="#64748b" />
                        </TouchableOpacity>
                      </View>
                      <Text style={{ color: '#1e293b', fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>{event.title}</Text>
                      {event.description ? (
                        <Text style={{ color: '#64748b', fontSize: 14 }} numberOfLines={2}>{event.description}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Schedule Modal */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end pt-20">
          <View className="bg-white rounded-t-[32px] p-6 pb-12 shadow-xl">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-extrabold text-slate-800">Add Schedule</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center">
                <Feather name="x" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-slate-500 font-bold text-xs mb-2 ml-1 uppercase">Date</Text>
              <View className="bg-slate-50 px-4 py-3.5 rounded-2xl border border-slate-100 flex-row items-center">
                <Feather name="calendar" size={16} color="#64748b" />
                <Text className="text-slate-800 font-bold ml-3 flex-1">{format(selectedDate, 'EEEE, MMMM do, yyyy')}</Text>
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-slate-500 font-bold text-xs mb-2 ml-1 uppercase">Title</Text>
              <TextInput
                className="bg-slate-50 px-4 py-3.5 rounded-2xl text-slate-800 font-medium border border-slate-100"
                placeholder="e.g. Team Standup"
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View className="flex-row gap-4 mb-4">
              <View className="flex-1">
                <Text className="text-slate-500 font-bold text-xs mb-2 ml-1 uppercase">Start Time</Text>
                {Platform.OS === 'web' ? (
                  createElement('input', {
                    type: 'time',
                    value: format(startTime, 'HH:mm'),
                    onChange: (e: any) => {
                      if (e.target.value) {
                        const [h, m] = e.target.value.split(':');
                        const newTime = new Date(startTime);
                        newTime.setHours(parseInt(h, 10), parseInt(m, 10), 0);
                        setStartTime(newTime);
                      }
                    },
                    style: {
                      backgroundColor: '#f8fafc',
                      padding: '14px 16px',
                      borderRadius: '16px',
                      border: '1px solid #f1f5f9',
                      color: '#1e293b',
                      fontWeight: '500',
                      fontSize: '14px',
                      width: '100%',
                      outline: 'none'
                    }
                  })
                ) : (
                  <TouchableOpacity 
                    onPress={openStartPicker}
                    className="bg-slate-50 px-4 py-3.5 rounded-2xl border border-slate-100 flex-row items-center justify-between"
                  >
                    <Text className="text-slate-800 font-medium">{format(startTime, 'h:mm a')}</Text>
                    <Feather name="clock" size={16} color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>

              <View className="flex-1">
                <Text className="text-slate-500 font-bold text-xs mb-2 ml-1 uppercase">End Time</Text>
                {Platform.OS === 'web' ? (
                  createElement('input', {
                    type: 'time',
                    value: format(endTime, 'HH:mm'),
                    onChange: (e: any) => {
                      if (e.target.value) {
                        const [h, m] = e.target.value.split(':');
                        const newTime = new Date(endTime);
                        newTime.setHours(parseInt(h, 10), parseInt(m, 10), 0);
                        setEndTime(newTime);
                      }
                    },
                    style: {
                      backgroundColor: '#f8fafc',
                      padding: '14px 16px',
                      borderRadius: '16px',
                      border: '1px solid #f1f5f9',
                      color: '#1e293b',
                      fontWeight: '500',
                      fontSize: '14px',
                      width: '100%',
                      outline: 'none'
                    }
                  })
                ) : (
                  <TouchableOpacity 
                    onPress={openEndPicker}
                    className="bg-slate-50 px-4 py-3.5 rounded-2xl border border-slate-100 flex-row items-center justify-between"
                  >
                    <Text className="text-slate-800 font-medium">{format(endTime, 'h:mm a')}</Text>
                    <Feather name="clock" size={16} color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>
            </View>



            <View className="mb-8">
              <Text className="text-slate-500 font-bold text-xs mb-2 ml-1 uppercase">Description (Optional)</Text>
              <TextInput
                className="bg-slate-50 px-4 py-3.5 rounded-2xl text-slate-800 font-medium border border-slate-100 h-24"
                placeholder="Add meeting notes or link..."
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <TouchableOpacity 
              onPress={handleAddSchedule}
              disabled={saving}
              className={`bg-indigo-600 py-4 rounded-2xl items-center shadow-sm ${saving ? 'opacity-70' : ''}`}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Save Schedule</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {Platform.OS !== 'web' && showStartPicker && (
        <DateTimePicker
          value={startTime}
          mode="time"
          is24Hour={false}
          display="default"
          onValueChange={(event, selectedDate) => {
            setShowStartPicker(Platform.OS === 'ios');
            if (selectedDate) setStartTime(selectedDate);
            if (Platform.OS === 'android') {
              setTimeout(() => setModalVisible(true), 50);
            }
          }}
          onDismiss={() => {
            setShowStartPicker(false);
            if (Platform.OS === 'android') {
              setTimeout(() => setModalVisible(true), 50);
            }
          }}
        />
      )}

      {Platform.OS !== 'web' && showEndPicker && (
        <DateTimePicker
          value={endTime}
          mode="time"
          is24Hour={false}
          display="default"
          onValueChange={(event, selectedDate) => {
            setShowEndPicker(Platform.OS === 'ios');
            if (selectedDate) setEndTime(selectedDate);
            if (Platform.OS === 'android') {
              setTimeout(() => setModalVisible(true), 50);
            }
          }}
          onDismiss={() => {
            setShowEndPicker(false);
            if (Platform.OS === 'android') {
              setTimeout(() => setModalVisible(true), 50);
            }
          }}
        />
      )}



    </SafeAreaView>
  );
}
