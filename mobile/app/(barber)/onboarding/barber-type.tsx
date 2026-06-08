import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Store, Navigation, ChevronRight } from 'lucide-react-native';
import { useOnboardingStore, type BarberTypeOption } from '@/stores/onboardingStore';
import { useAuthStore } from '@/stores/authStore';

interface TypeCard {
  type: BarberTypeOption;
  label: string;
  subtitle: string;
  description: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
}

const TYPE_OPTIONS: TypeCard[] = [
  {
    type: 'barbershop',
    label: 'Barbershop',
    subtitle: 'I have a fixed location',
    description:
      'You operate from a physical shop. Clients book appointments and come to you.',
    Icon: Store,
  },
  {
    type: 'mobile',
    label: 'Mobile Barber',
    subtitle: 'I travel to my clients',
    description:
      'You visit clients at their homes, offices, or events within a set radius.',
    Icon: Navigation,
  },
];

export default function BarberTypeScreen() {
  const [selected, setSelected] = useState<BarberTypeOption | null>(null);
  const { setBarberType } = useOnboardingStore();
  const { logout } = useAuthStore();

  function handleSignOut() {
    logout();
    router.replace('/(auth)/login');
  }

  function handleContinue() {
    if (!selected) return;
    setBarberType(selected);
    if (selected === 'barbershop') {
      router.push('/(barber)/onboarding/barbershop-details');
    } else {
      // Mobile barber uses the same details form for now
      router.push('/(barber)/onboarding/barbershop-details');
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-1 px-6 pt-16 pb-10">
        {/* Header */}
        <View className="mb-10">
          <Text className="text-3xl font-bold text-neutral-800">
            What best describes you?
          </Text>
          <Text className="text-sm text-neutral-500 mt-2">
            Choose your barber type. This helps us customise your experience.
          </Text>
        </View>

        {/* Type cards */}
        <View className="gap-4 flex-1">
          {TYPE_OPTIONS.map((option) => {
            const isSelected = selected === option.type;
            return (
              <Pressable
                key={option.type}
                onPress={() => setSelected(option.type)}
                className={`rounded-2xl border-2 p-5 active:opacity-90 ${
                  isSelected
                    ? 'border-accent bg-accent-light'
                    : 'border-neutral-200 bg-white'
                }`}
              >
                <View className="flex-row items-center gap-4">
                  <View
                    className={`w-14 h-14 rounded-2xl items-center justify-center ${
                      isSelected ? 'bg-accent' : 'bg-neutral-100'
                    }`}
                  >
                    <option.Icon
                      size={26}
                      color={isSelected ? '#ffffff' : '#4A5568'}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-base font-bold ${
                        isSelected ? 'text-accent' : 'text-neutral-800'
                      }`}
                    >
                      {option.label}
                    </Text>
                    <Text className="text-xs text-neutral-500 mt-0.5">
                      {option.subtitle}
                    </Text>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                      isSelected ? 'border-accent bg-accent' : 'border-neutral-300'
                    }`}
                  >
                    {isSelected && (
                      <View className="w-2.5 h-2.5 rounded-full bg-white" />
                    )}
                  </View>
                </View>
                <Text className="text-xs text-neutral-500 mt-3 ml-1 leading-5">
                  {option.description}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Continue button */}
        <Pressable
          onPress={handleContinue}
          disabled={!selected}
          className={`rounded-full py-4 items-center mt-8 flex-row justify-center gap-2 ${
            selected ? 'bg-primary active:opacity-80' : 'bg-neutral-200'
          }`}
        >
          <Text
            className={`font-bold text-base ${
              selected ? 'text-white' : 'text-neutral-400'
            }`}
          >
            Continue
          </Text>
          {selected && <ChevronRight size={18} color="#ffffff" />}
        </Pressable>

        {/* Sign out escape — for users who ended up here from a stored session */}
        <Pressable onPress={handleSignOut} className="mt-6 items-center py-2">
          <Text className="text-sm text-neutral-400">Sign out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
