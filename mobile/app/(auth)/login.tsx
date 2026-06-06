import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Eye, EyeOff } from 'lucide-react-native';
import { FontAwesome } from '@expo/vector-icons';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/authStore';
import { isValidEmail, isValidPassword } from '@/utils/validators';
import { getApiErrorMessage } from '@/services/api';

WebBrowser.maybeCompleteAuthSession();

type Tab = 'signin' | 'signup';

export default function LoginScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { setAuth } = useAuthStore();

  const [, , promptGoogleAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  const loginMutation = useMutation({
    mutationFn: () => authService.login({ email: email.trim(), password }),
    onSuccess: async (res) => {
      const { token, user } = res.data.data;
      await setAuth(token, user);
      routeByRole(user.role);
    },
    onError: (err) => {
      Alert.alert('Sign In Failed', getApiErrorMessage(err));
    },
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      authService.register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role: 'client',
      }),
    onSuccess: async (res) => {
      const { token, user } = res.data.data;
      await setAuth(token, user);
      router.push('/(auth)/role-selection');
    },
    onError: (err) => {
      Alert.alert('Sign Up Failed', getApiErrorMessage(err));
    },
  });

  const googleMutation = useMutation({
    mutationFn: (idToken: string) => authService.googleAuth(idToken),
    onSuccess: async (res) => {
      const { token, user, requiresRoleSelection } = res.data.data as {
        token: string;
        user: import('@/types/user').User;
        requiresRoleSelection?: boolean;
      };
      await setAuth(token, user);
      if (requiresRoleSelection) {
        router.push('/(auth)/role-selection');
      } else {
        routeByRole(user.role);
      }
    },
    onError: (err) => {
      Alert.alert('Google Sign In Failed', getApiErrorMessage(err));
    },
  });

  function routeByRole(role: string) {
    if (role === 'client') router.replace('/(client)/(tabs)');
    else if (role === 'barber') router.replace('/(barber)/(tabs)');
    else if (role === 'staff_barber') router.replace('/(staff)/(tabs)');
  }

  function validateSignIn(): boolean {
    const e: Record<string, string> = {};
    if (!isValidEmail(email)) e.email = 'Enter a valid email address.';
    if (!isValidPassword(password)) e.password = 'Password must be at least 8 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateSignUp(): boolean {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Full name is required.';
    if (!isValidEmail(email)) e.email = 'Enter a valid email address.';
    if (!isValidPassword(password)) e.password = 'Password must be at least 8 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (activeTab === 'signin') {
      if (validateSignIn()) loginMutation.mutate();
    } else {
      if (validateSignUp()) registerMutation.mutate();
    }
  }

  async function handleGoogleSignIn() {
    const result = await promptGoogleAsync();
    if (result?.type === 'success' && result.authentication?.idToken) {
      googleMutation.mutate(result.authentication.idToken);
    }
  }

  async function handleAppleSignIn() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const fullNameStr = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ');
      const res = await authService.appleAuth(
        credential.identityToken!,
        fullNameStr || undefined,
      );
      const { token, user } = res.data.data;
      await setAuth(token, user);
      routeByRole(user.role);
    } catch (err: unknown) {
      if ((err as { code?: string }).code !== 'ERR_CANCELED') {
        Alert.alert('Apple Sign In Failed', 'Something went wrong. Please try again.');
      }
    }
  }

  const isLoading =
    loginMutation.isPending || registerMutation.isPending || googleMutation.isPending;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-16 pb-8">

          {/* Logo */}
          <View className="items-center mb-10">
            <Image
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              source={require('../../assets/app logo.png')}
              style={{ width: 150, height: 180 }}
              resizeMode="contain"
            />
            <Text className="text-sm text-neutral-500 mt-2">
              {activeTab === 'signin'
                ? 'Welcome back! Please sign in.'
                : 'Create your account to get started.'}
            </Text>
          </View>

          {/* Toggle Pill */}
          <View className="flex-row bg-neutral-100 rounded-full p-1 mb-8">
            <Pressable
              onPress={() => {
                setActiveTab('signin');
                setErrors({});
              }}
              className={`flex-1 py-3 rounded-full items-center ${
                activeTab === 'signin' ? 'bg-primary' : 'bg-transparent'
              }`}
            >
              <Text
                className={`font-semibold text-sm ${
                  activeTab === 'signin' ? 'text-white' : 'text-neutral-500'
                }`}
              >
                Sign In
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setActiveTab('signup');
                setErrors({});
              }}
              className={`flex-1 py-3 rounded-full items-center ${
                activeTab === 'signup' ? 'bg-primary' : 'bg-transparent'
              }`}
            >
              <Text
                className={`font-semibold text-sm ${
                  activeTab === 'signup' ? 'text-white' : 'text-neutral-500'
                }`}
              >
                Sign Up
              </Text>
            </Pressable>
          </View>

          {/* Form Fields */}
          <View className="gap-4">
            {activeTab === 'signup' && (
              <View className="gap-1">
                <Text className="text-sm font-medium text-neutral-700 ml-1">Full Name</Text>
                <TextInput
                  value={fullName}
                  onChangeText={(v) => {
                    setFullName(v);
                    setErrors((e) => ({ ...e, fullName: '' }));
                  }}
                  placeholder="Enter your full name"
                  placeholderTextColor="#A0AEC0"
                  autoCapitalize="words"
                  className={`bg-neutral-100 rounded-full px-5 py-4 text-sm text-neutral-800 border ${
                    errors.fullName ? 'border-danger' : 'border-transparent'
                  }`}
                />
                {errors.fullName ? (
                  <Text className="text-xs text-danger ml-2">{errors.fullName}</Text>
                ) : null}
              </View>
            )}

            <View className="gap-1">
              <Text className="text-sm font-medium text-neutral-700 ml-1">Email</Text>
              <TextInput
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setErrors((e) => ({ ...e, email: '' }));
                }}
                placeholder="Enter your email"
                placeholderTextColor="#A0AEC0"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className={`bg-neutral-100 rounded-full px-5 py-4 text-sm text-neutral-800 border ${
                  errors.email ? 'border-danger' : 'border-transparent'
                }`}
              />
              {errors.email ? (
                <Text className="text-xs text-danger ml-2">{errors.email}</Text>
              ) : null}
            </View>

            <View className="gap-1">
              <Text className="text-sm font-medium text-neutral-700 ml-1">Password</Text>
              <View
                className={`flex-row items-center bg-neutral-100 rounded-full px-5 border ${
                  errors.password ? 'border-danger' : 'border-transparent'
                }`}
              >
                <TextInput
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setErrors((e) => ({ ...e, password: '' }));
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor="#A0AEC0"
                  secureTextEntry={!showPassword}
                  className="flex-1 py-4 text-sm text-neutral-800"
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  className="pl-2"
                  hitSlop={8}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#A0AEC0" />
                  ) : (
                    <Eye size={20} color="#A0AEC0" />
                  )}
                </Pressable>
              </View>
              {errors.password ? (
                <Text className="text-xs text-danger ml-2">{errors.password}</Text>
              ) : null}
            </View>

            {activeTab === 'signin' && (
              <View className="flex-row justify-end">
                <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
                  <Text className="text-sm text-accent font-medium">Forgot password?</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Primary Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            className={`bg-primary rounded-full py-4 items-center mt-8 ${
              isLoading ? 'opacity-60' : 'active:opacity-80'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">
                {activeTab === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </Pressable>

          {/* OR Divider */}
          <View className="flex-row items-center gap-3 my-6">
            <View className="flex-1 h-px bg-neutral-200" />
            <Text className="text-xs text-neutral-400 font-medium">or continue with</Text>
            <View className="flex-1 h-px bg-neutral-200" />
          </View>

          {/* Social Buttons */}
          <View className="flex-row justify-center gap-4">
            {/* Google */}
            <Pressable
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              className="w-14 h-14 rounded-full border border-neutral-200 bg-white items-center justify-center active:opacity-70"
            >
              <FontAwesome name="google" size={22} color="#DB4437" />
            </Pressable>

            {/* Apple — iOS only */}
            {Platform.OS === 'ios' && (
              <Pressable
                onPress={handleAppleSignIn}
                disabled={isLoading}
                className="w-14 h-14 rounded-full border border-neutral-200 bg-white items-center justify-center active:opacity-70"
              >
                <FontAwesome name="apple" size={24} color="#000000" />
              </Pressable>
            )}
          </View>

          {/* Bottom Link */}
          <View className="flex-row justify-center items-center mt-8 gap-1">
            <Text className="text-sm text-neutral-500">
              {activeTab === 'signin' ? "Don't have an account?" : 'Already have an account?'}
            </Text>
            <Pressable
              onPress={() => {
                setActiveTab(activeTab === 'signin' ? 'signup' : 'signin');
                setErrors({});
              }}
            >
              <Text className="text-sm text-accent font-semibold">
                {activeTab === 'signin' ? ' Sign Up' : ' Sign In'}
              </Text>
            </Pressable>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
