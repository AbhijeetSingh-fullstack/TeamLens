import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { View, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useEffect, useRef } from 'react';

const { width } = Dimensions.get('window');
const TAB_BAR_WIDTH = width - 40; // Since left/right absolute positioning is 20
const TAB_WIDTH = TAB_BAR_WIDTH / 5; // 5 tabs

function CustomTabBar({ state, descriptors, navigation }: any) {
  const slideAnim = useRef(new Animated.Value(state.index * TAB_WIDTH)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: state.index * TAB_WIDTH,
      useNativeDriver: true,
      bounciness: 10,
      speed: 14,
    }).start();
  }, [state.index]);

  return (
    <View style={{
      position: 'absolute',
      bottom: 20,
      left: 20,
      right: 20,
      backgroundColor: '#ffffff',
      borderRadius: 30,
      height: 70,
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
    }}>
      {/* Overflow hidden container to clip the spring overshoot without hiding the drop shadow */}
      <View style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 30,
        overflow: 'hidden',
      }}>
        {/* Sliding Pill Indicator */}
        <Animated.View style={{
          position: 'absolute',
          width: TAB_WIDTH,
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateX: slideAnim }]
        }}>
          {/* The actual highlighted background shape */}
          <View className="w-14 h-12 bg-indigo-50 rounded-2xl" />
        </Animated.View>
      </View>

      {/* Tab Buttons */}
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          // Determine icon name
          let iconName: any = 'home';
          if (route.name === 'tasks') iconName = 'check-square';
          if (route.name === 'analytics') iconName = 'bar-chart-2';
          if (route.name === 'message') iconName = 'message-square';
          if (route.name === 'profile') iconName = 'user';

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={1}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}
            >
              <Feather 
                name={iconName} 
                size={24} 
                color={isFocused ? '#4f46e5' : '#94a3b8'} 
                style={{ zIndex: 1 }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function MemberTabsLayout() {
  return (
    <Tabs 
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="tasks" />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="message" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
