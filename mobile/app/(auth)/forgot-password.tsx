import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { authService } from '@/services/auth';
import { isValidEmail } from '@/utils/validators';
import { getApiErrorMessage } from '@/services/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authService.forgotPassword(email.trim()),
    onSuccess: () => setSent(true),
    onError: (err) => Alert.alert('Error', getApiErrorMessage(err)),
  });

  function handleSubmit() {
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError('');
    mutation.mutate();
  }

  if (sent) {
    return (
      <View className="flex-1 bg-white px-6 items-center justify-center">
        <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-6">
          <Text className="text-4xl">✉️</Text>
        </View>
        <Text className="text-xl font-bold text-neutral-800 text-center">Check your email</Text>
        <Text className="text-sm text-neutral-500 mt-3 text-center px-4">
          If an account exists for{' '}
          <Text className="font-semibold text-neutral-700">{email}</Text>, you'll receive a
          password reset link shortly.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="bg-primary rounded-full py-4 px-8 mt-8 active:opacity-80"
        >
          <Text className="text-white font-bold">Back to Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white px-6">
      {/* Back */}
      <Pressable onPress={() => router.back()} className="mt-14 mb-8 self-start">
        <Text className="text-accent font-semibold text-sm">← Back</Text>
      </Pressable>

      {/* Header */}
      <Text className="text-2xl font-bold text-neutral-800">Forgot password?</Text>
      <Text className="text-sm text-neutral-500 mt-2 mb-8">
        Enter your email and we'll send you a link to reset your password.
      </Text>

      {/* Email Input */}
      <View className="gap-1 mb-6">
        <Text className="text-sm font-medium text-neutral-700 ml-1">Email</Text>
        <TextInput
          value={email}
          onChangeText={(v) => { setEmail(v); setEmailError(''); }}
          placeholder="Enter your email"
          placeholderTextColor="#A0AEC0"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          className={`bg-neutral-100 rounded-full px-5 py-4 text-sm text-neutral-800 border ${emailError ? 'border-danger' : 'border-transparent'}`}
        />
        {emailError ? <Text className="text-xs text-danger ml-2">{emailError}</Text> : null}
      </View>

      {/* Submit Button */}
      <Pressable
        onPress={handleSubmit}
        disabled={mutation.isPending}
        className={`bg-primary rounded-full py-4 items-center ${mutation.isPending ? 'opacity-60' : 'active:opacity-80'}`}
      >
        {mutation.isPending ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-base">Send Reset Link</Text>
        )}
      </Pressable>
    </View>
  );
}
