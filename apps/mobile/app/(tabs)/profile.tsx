import { useRouter } from 'expo-router';
import {
  BookOpen,
  ChevronRight,
  Flame,
  LogOut,
  Star,
  Trophy,
} from 'lucide-react-native';
import React from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { useProgress } from '@/hooks/useProgress';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { data: progress, loading } = useProgress();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';

  return (
    <ScrollView className="bg-background flex-1">
      <View className="px-4 pb-8 pt-12">
        {/* User info */}
        <View className="mb-8 items-center">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-cyan-500/20">
            <Text className="text-3xl font-bold text-cyan-400">
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="text-foreground text-xl font-bold">{displayName}</Text>
          {email ? (
            <Text className="text-muted-foreground mt-1 text-sm">{email}</Text>
          ) : null}
          {progress?.cefrLevel ? (
            <View className="mt-3 rounded-full bg-cyan-500/20 px-4 py-1.5">
              <Text className="text-sm font-semibold text-cyan-400">
                {progress.language} &middot; {progress.cefrLevel}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Stats cards */}
        <View className="mb-8 flex-row gap-3">
          <View className="border-border bg-card flex-1 items-center rounded-xl border p-4">
            <Icon as={Flame} className="mb-2 size-6 text-orange-400" accessible={false} />
            <Text className="text-foreground text-2xl font-bold">
              {loading ? '—' : (progress?.currentStreak ?? 0)}
            </Text>
            <Text className="text-muted-foreground text-xs">Day Streak</Text>
          </View>

          <View className="border-border bg-card flex-1 items-center rounded-xl border p-4">
            <Icon as={Star} className="mb-2 size-6 text-yellow-400" accessible={false} />
            <Text className="text-foreground text-2xl font-bold">
              {loading ? '—' : (progress?.totalPoints ?? 0)}
            </Text>
            <Text className="text-muted-foreground text-xs">Points</Text>
          </View>

          <View className="border-border bg-card flex-1 items-center rounded-xl border p-4">
            <Icon as={Trophy} className="mb-2 size-6 text-emerald-400" accessible={false} />
            <Text className="text-foreground text-2xl font-bold">
              {loading ? '—' : (progress?.completedExercises ?? 0)}
            </Text>
            <Text className="text-muted-foreground text-xs">Exercises</Text>
          </View>
        </View>

        {/* Menu items */}
        <View className="border-border bg-card overflow-hidden rounded-xl border">
          <Pressable
            onPress={() => router.push('/vocabulary')}
            accessibilityRole="button"
            accessibilityLabel="My Vocabulary"
            className="active:bg-accent flex-row items-center justify-between border-b border-slate-200 px-4 py-4">
            <View className="flex-row items-center gap-3">
              <Icon as={BookOpen} className="size-5 text-cyan-400" accessible={false} />
              <Text className="text-foreground text-base font-medium">My Vocabulary</Text>
            </View>
            <Icon as={ChevronRight} className="text-muted-foreground size-5" accessible={false} />
          </Pressable>

          <Pressable
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sign Out"
            className="active:bg-accent flex-row items-center gap-3 px-4 py-4">
            <Icon as={LogOut} className="size-5 text-red-400" accessible={false} />
            <Text className="text-base font-medium text-red-400">Sign Out</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
