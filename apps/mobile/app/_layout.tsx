import '@/global.css';

import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NAV_THEME } from '@/lib/theme';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useAuth } from '@/hooks/useAuth';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

/**
 * Navigation layout that handles auth-gated routing
 */
function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Check if user is in the auth route group
    const inAuthGroup = segments[0] === '(auth)';

    if (user && inAuthGroup) {
      // User is authenticated but in auth screens - redirect to home
      router.replace('/(tabs)');
    } else if (!user && !inAuthGroup) {
      // User is not authenticated and not in auth screens - redirect to login
      router.replace('/(auth)/login');
    }
  }, [user, loading, segments]);

  // Show splash screen while loading auth state
  if (loading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <RootLayoutNav />
        <PortalHost />
      </ThemeProvider>
    </AuthProvider>
  );
}
