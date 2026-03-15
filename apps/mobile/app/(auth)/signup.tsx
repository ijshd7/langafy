import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

import { useAuth } from '@/hooks/useAuth';

export default function SignupScreen() {
  const { signUp, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const validateForm = () => {
    if (!email.trim()) {
      setValidationError('Email is required');
      return false;
    }
    if (!email.includes('@')) {
      setValidationError('Please enter a valid email');
      return false;
    }
    if (!password.trim()) {
      setValidationError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    try {
      clearError();
      await signUp(email, password);
      // Navigate to home after successful sign up
      router.replace('/(tabs)');
    } catch {
      // Error is already set in auth context
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="bg-background flex-1">
      <ScrollView className="flex-1" contentContainerClassName="flex-grow justify-center px-6">
        <View className="mb-8">
          <Text className="text-foreground mb-2 text-3xl font-bold">Create account</Text>
          <Text className="text-muted-foreground text-base">Start learning a new language</Text>
        </View>

        <View className="mb-6">
          <Text className="text-foreground mb-2 text-sm font-medium">Email</Text>
          <TextInput
            className="border-input bg-background text-foreground rounded-lg border px-4 py-3"
            placeholder="you@example.com"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accessibilityLabel="Email address"
          />
        </View>

        <View className="mb-6">
          <Text className="text-foreground mb-2 text-sm font-medium">Password</Text>
          <TextInput
            className="border-input bg-background text-foreground rounded-lg border px-4 py-3"
            placeholder="••••••"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            secureTextEntry
            autoComplete="password-new"
            accessibilityLabel="New password"
          />
        </View>

        <View className="mb-6">
          <Text className="text-foreground mb-2 text-sm font-medium">Confirm password</Text>
          <TextInput
            className="border-input bg-background text-foreground rounded-lg border px-4 py-3"
            placeholder="••••••"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading}
            secureTextEntry
            autoComplete="password-new"
            accessibilityLabel="Confirm password"
          />
        </View>

        {(validationError || error) && (
          <View
            accessibilityLiveRegion="assertive"
            className="bg-destructive/10 border-destructive mb-6 rounded-lg border px-4 py-3">
            <Text className="text-destructive text-sm font-medium">{validationError || error}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleSignUp}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={loading ? 'Creating account' : 'Sign up'}
          accessibilityState={{ disabled: loading }}
          className={`mb-6 rounded-lg py-3 ${loading ? 'bg-primary/50' : 'bg-primary'}`}>
          <Text className="text-primary-foreground text-center text-base font-semibold">
            {loading ? 'Creating account...' : 'Sign up'}
          </Text>
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text className="text-muted-foreground text-sm">Already have an account? </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            disabled={loading}
            accessibilityRole="link"
            accessibilityLabel="Sign in - go to login">
            <Text className="text-primary text-sm font-semibold">Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
