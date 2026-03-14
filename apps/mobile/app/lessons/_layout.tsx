import { Stack } from 'expo-router';

/**
 * Lesson detail stack layout
 * Renders full-screen lesson without tab bar
 */
export default function LessonsLayout() {
  return <Stack screenOptions={{ headerShown: true }} />;
}
