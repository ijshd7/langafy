import { Stack } from 'expo-router';

/**
 * Learn tab stack layout with navigation header
 */
export default function LearnLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: '#06B6D4',
        headerBackTitle: '',
      }}
    />
  );
}
