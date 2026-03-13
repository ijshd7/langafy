import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const { signIn, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    setValidationError('');
    return true;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    try {
      clearError();
      await signIn(email, password);
      // Navigate to home after successful sign in
      router.replace('/(tabs)');
    } catch (err) {
      // Error is already set in auth context
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <ScrollView className="flex-1" contentContainerClassName="flex-grow justify-center px-6">
        <View className="mb-8">
          <Text className="text-3xl font-bold text-foreground mb-2">Welcome back</Text>
          <Text className="text-base text-muted-foreground">Sign in to continue learning</Text>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-foreground mb-2">Email</Text>
          <TextInput
            className="border border-input rounded-lg px-4 py-3 bg-background text-foreground"
            placeholder="you@example.com"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-foreground mb-2">Password</Text>
          <TextInput
            className="border border-input rounded-lg px-4 py-3 bg-background text-foreground"
            placeholder="••••••"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            secureTextEntry
            autoComplete="password"
          />
        </View>

        {(validationError || error) && (
          <View className="bg-destructive/10 border border-destructive rounded-lg px-4 py-3 mb-6">
            <Text className="text-sm text-destructive font-medium">
              {validationError || error}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleSignIn}
          disabled={loading}
          className={`rounded-lg py-3 mb-6 ${loading ? 'bg-primary/50' : 'bg-primary'}`}
        >
          <Text className="text-center text-base font-semibold text-primary-foreground">
            {loading ? 'Signing in...' : 'Sign in'}
          </Text>
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text className="text-sm text-muted-foreground">Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')} disabled={loading}>
            <Text className="text-sm font-semibold text-primary">Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
