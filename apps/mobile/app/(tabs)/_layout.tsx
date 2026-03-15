import { Tabs } from 'expo-router';
import { BookOpenIcon, HomeIcon, MessageSquareIcon, UserIcon } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#06B6D4',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: () => <Icon as={HomeIcon} className="size-6" />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: () => <Icon as={BookOpenIcon} className="size-6" />,
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Practice',
          tabBarIcon: () => <Icon as={MessageSquareIcon} className="size-6" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => <Icon as={UserIcon} className="size-6" />,
        }}
      />
    </Tabs>
  );
}
