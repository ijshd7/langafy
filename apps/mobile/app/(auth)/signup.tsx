import { router } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

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
      className="flex-1 bg-background"
    >
      <ScrollView className="flex-1" contentContainerClassName="flex-grow justify-center px-6">
        <View className="mb-8">
          <Text className="text-3xl font-bold text-foreground mb-2">Create account</Text>
          <Text className="text-base text-muted-foreground">Start learning a new language</Text>
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
            autoComplete="password-new"
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-foreground mb-2">Confirm password</Text>
          <TextInput
            className="border border-input rounded-lg px-4 py-3 bg-background text-foreground"
            placeholder="••••••"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading}
            secureTextEntry
            autoComplete="password-new"
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
          onPress={handleSignUp}
          disabled={loading}
          className={`rounded-lg py-3 mb-6 ${loading ? 'bg-primary/50' : 'bg-primary'}`}
        >
          <Text className="text-center text-base font-semibold text-primary-foreground">
            {loading ? 'Creating account...' : 'Sign up'}
          </Text>
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text className="text-sm text-muted-foreground">Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} disabled={loading}>
            <Text className="text-sm font-semibold text-primary">Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
