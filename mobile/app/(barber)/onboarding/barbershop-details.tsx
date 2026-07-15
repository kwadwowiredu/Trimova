import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Building2, Phone, MapPin, ChevronLeft } from 'lucide-react-native';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { barbersService } from '@/services/barbers';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';
import { getApiErrorMessage } from '@/services/api';

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View className="flex-row gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={`h-1 flex-1 rounded-full ${
            i < step ? 'bg-accent' : 'bg-neutral-200'
          }`}
        />
      ))}
    </View>
  );
}

export default function BarbershopDetailsScreen() {
  const { barberType, shopName, shopPhone, location, setShopName, setShopPhone } =
    useOnboardingStore();

  const { setAuth } = useAuthStore();

  const [localName, setLocalName] = useState(shopName);
  const [localPhone, setLocalPhone] = useState(shopPhone);
  const [nameError, setNameError] = useState('');

  // Sync local state with store when returning from location picker
  useEffect(() => {
    setLocalName(shopName);
    setLocalPhone(shopPhone);
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      // 1. Save business details (creates barber profile with onboarding_complete=true)
      await barbersService.updateBusinessDetails({
        barberType: barberType!,
        businessName: localName.trim(),
        phone: localPhone.trim() || undefined,
      } as any);

      // 2. Save location if provided (freelancers also persist their travel radius)
      if (location) {
        await barbersService.updateLocation({
          lat: location.lat,
          lng: location.lng,
          address: location.address,
          ...(barberType === 'mobile' ? { serviceRadius: useOnboardingStore.getState().serviceRadius } : {}),
        });
      }

      // 3. Refresh user from API so auth store has latest data
      const meRes = await authService.getMe();
      return meRes.data.data;
    },
    onSuccess: async (updatedUser) => {
      const token = useAuthStore.getState().token!;
      await setAuth(token, updatedUser);
      // Business details saved. Land on the "Complete Your Profile" welcome,
      // then run the rest of the profile wizard.
      router.replace('/(barber)/onboarding/welcome');
    },
    onError: (err) => {
      Alert.alert('Setup Failed', getApiErrorMessage(err));
    },
  });

  function handleFinish() {
    if (!localName.trim()) {
      setNameError('Shop name is required.');
      return;
    }
    setNameError('');
    setShopName(localName.trim());
    setShopPhone(localPhone.trim());

    if (!location) {
      Alert.alert(
        'No Location Set',
        'You can add your shop location now or set it later in your profile.',
        [
          { text: 'Set Later', onPress: () => mutation.mutate() },
          { text: 'Add Location', style: 'cancel' },
        ],
      );
      return;
    }

    mutation.mutate();
  }

  const isBarberShop = barberType === 'barbershop';

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-14">
          {/* Top row: progress + back */}
          <View className="flex-row items-center justify-between mb-6">
            <ProgressBar step={2} total={2} />
            <Pressable
              onPress={() => router.back()}
              className="flex-row items-center gap-1 ml-4 pb-8"
            >
              <ChevronLeft size={16} color="#4A5568" />
              <Text className="text-sm text-neutral-600 font-medium">Back</Text>
            </Pressable>
          </View>

          {/* Title */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-neutral-800">
              {isBarberShop ? 'Your shop' : 'Your details'}
            </Text>
            <Text className="text-sm text-neutral-500 mt-2">
              {isBarberShop
                ? 'Enter your barbershop details.'
                : 'Tell us about your mobile barber service.'}
            </Text>
          </View>

          {/* SHOP NAME */}
          <View className="mb-5">
            <Text className="text-xs font-semibold text-neutral-500 tracking-widest mb-2">
              {isBarberShop ? 'SHOP NAME' : 'BUSINESS NAME'}
            </Text>
            <View
              className={`flex-row items-center bg-neutral-100 rounded-2xl px-4 h-14 border ${
                nameError ? 'border-danger' : 'border-transparent'
              }`}
            >
              <Building2 size={18} color="#A0AEC0" />
              <TextInput
                value={localName}
                onChangeText={(t) => {
                  setLocalName(t);
                  if (nameError) setNameError('');
                }}
                placeholder={isBarberShop ? 'A4N Cutz' : 'Your business name'}
                placeholderTextColor="#A0AEC0"
                className="flex-1 ml-3 text-sm text-neutral-800"
                returnKeyType="next"
                maxLength={60}
              />
            </View>
            {nameError ? (
              <Text className="text-xs text-danger mt-1 ml-1">{nameError}</Text>
            ) : null}
          </View>

          {/* SHOP PHONE */}
          <View className="mb-5">
            <Text className="text-xs font-semibold text-neutral-500 tracking-widest mb-2">
              {isBarberShop ? 'SHOP PHONE (OPTIONAL)' : 'CONTACT PHONE (OPTIONAL)'}
            </Text>
            <View className="flex-row items-center bg-neutral-100 rounded-2xl px-4 h-14 border border-transparent">
              <Phone size={18} color="#A0AEC0" />
              <TextInput
                value={localPhone}
                onChangeText={setLocalPhone}
                placeholder="+233(0) 000-0000"
                placeholderTextColor="#A0AEC0"
                keyboardType="phone-pad"
                className="flex-1 ml-3 text-sm text-neutral-800"
                returnKeyType="done"
                maxLength={20}
              />
            </View>
          </View>

          {/* LOCATION */}
          <View className="mb-8">
            <Text className="text-xs font-semibold text-neutral-500 tracking-widest mb-2">
              {isBarberShop ? 'SHOP LOCATION' : 'BASE LOCATION'}
            </Text>
            <Pressable
              onPress={() => router.push('/(barber)/onboarding/location-picker')}
              className="flex-row items-center bg-neutral-100 rounded-2xl px-4 h-14 active:opacity-70"
            >
              <MapPin size={18} color="#A0AEC0" />
              <Text
                className={`flex-1 ml-3 text-sm ${
                  location ? 'text-neutral-800' : 'text-neutral-400'
                }`}
                numberOfLines={1}
              >
                {location ? location.address : 'Tap to search or pick on map'}
              </Text>
              <MapPin size={18} color={location ? '#3c3cb9' : '#A0AEC0'} />
            </Pressable>
          </View>

          {/* Finish Setup */}
          <Pressable
            onPress={handleFinish}
            disabled={mutation.isPending}
            className={`bg-accent rounded-full py-4 items-center ${
              mutation.isPending ? 'opacity-60' : 'active:opacity-80'
            }`}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Finish Setup</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
