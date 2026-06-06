import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/authStore';
import { getApiErrorMessage } from '@/services/api';
import type { UserRole } from '@/types/user';

type RoleOption = {
  role: UserRole;
  label: string;
  subtitle: string;
  emoji: string;
  description: string;
};

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'client',
    label: 'I\'m a Client',
    subtitle: 'Looking for a barber',
    emoji: '💈',
    description: 'Search for barbers, book appointments, and pay online.',
  },
  {
    role: 'barber',
    label: 'I\'m a Barber',
    subtitle: 'Offering haircut services',
    emoji: '✂️',
    description: 'Set up your barbershop or mobile barber profile, manage bookings, and earn.',
  },
];

export default function RoleSelectionScreen() {
  const [selected, setSelected] = useState<UserRole | null>(null);
  const { setAuth } = useAuthStore();

  const mutation = useMutation({
    mutationFn: () => authService.updateRole(selected!),
    onSuccess: async (res) => {
      const { token, user } = res.data.data;
      await setAuth(token, user);
      if (user.role === 'client') router.replace('/(client)/(tabs)');
      else router.replace('/(barber)/(tabs)');
    },
    onError: (err) => {
      Alert.alert('Error', getApiErrorMessage(err));
    },
  });

  return (
    <View className="flex-1 bg-white px-6 pt-16">
      {/* Header */}
      <View className="items-center mb-10">
        <Text className="text-3xl font-bold text-primary-lighter tracking-widest">TRIMOVA</Text>
        <Text className="text-xl font-semibold text-neutral-800 mt-6 text-center">
          How will you use Trimova?
        </Text>
        <Text className="text-sm text-neutral-500 mt-2 text-center">
          Choose your role. You can only have one per account.
        </Text>
      </View>

      {/* Role Cards */}
      <View className="gap-4">
        {ROLE_OPTIONS.map((option) => {
          const isSelected = selected === option.role;
          return (
            <Pressable
              key={option.role}
              onPress={() => setSelected(option.role)}
              className={`rounded-2xl border-2 p-5 active:opacity-90 ${
                isSelected ? 'border-primary bg-orange-50' : 'border-neutral-200 bg-white'
              }`}
            >
              <View className="flex-row items-center gap-4">
                <View className={`w-14 h-14 rounded-2xl items-center justify-center ${isSelected ? 'bg-primary' : 'bg-neutral-100'}`}>
                  <Text className="text-3xl">{option.emoji}</Text>
                </View>
                <View className="flex-1">
                  <Text className={`text-base font-bold ${isSelected ? 'text-primary-lighter' : 'text-neutral-800'}`}>
                    {option.label}
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">{option.subtitle}</Text>
                </View>
                <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-neutral-300'}`}>
                  {isSelected && <View className="w-2.5 h-2.5 rounded-full bg-white" />}
                </View>
              </View>
              <Text className="text-xs text-neutral-500 mt-3 ml-1">{option.description}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Continue Button */}
      <Pressable
        onPress={() => mutation.mutate()}
        disabled={!selected || mutation.isPending}
        className={`rounded-full py-4 items-center mt-8 ${selected ? 'bg-primary' : 'bg-neutral-200'} ${mutation.isPending ? 'opacity-60' : 'active:opacity-80'}`}
      >
        {mutation.isPending ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className={`font-bold text-base ${selected ? 'text-white' : 'text-neutral-400'}`}>
            Continue
          </Text>
        )}
      </Pressable>
    </View>
  );
}
