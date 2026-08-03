import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, ArrowRight } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import type { BarberProfile } from '@/types/user';

/**
 * A barber's public profile is "search-ready" once it has a photo, at least one
 * portfolio image, and a business name. Until then they won't show in client
 * search — hence the persistent nudge banner.
 *
 * Mobile/freelance barbers additionally need a base location and a travel
 * radius: without them the distance search can't place them at all, so their
 * profile is just as unusable as one missing a photo.
 */
export function isProfileIncomplete(user: unknown): boolean {
  const b = user as (BarberProfile & {
    avatarUrl?: string | null;
    onboardingComplete?: boolean;
    serviceRadius?: number | null;
    location?: unknown;
  }) | null;
  if (!b) return false;

  const missingBasics = !b.avatarUrl || !(b.portfolioImages?.length) || !b.businessName;
  if (missingBasics) return true;

  if (b.barberType === 'mobile') {
    return !b.location || !b.serviceRadius;
  }
  return false;
}

/**
 * A long, full-width static strip pinned to the very top of the Home, Bookings
 * and Staff screens. Shares the brand-purple background so it reads as one
 * continuous top region with each screen's header. Renders nothing once the
 * profile is complete.
 */
export function CompleteProfileBanner({ insetTop }: { insetTop: number }) {
  const { user } = useAuthStore();
  if (!isProfileIncomplete(user)) return null;

  return (
    <LinearGradient
      colors={['#adb5bd', '#f3f4f6', '#f3f4f6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ paddingTop: insetTop }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 }}>
        {/* Green checkmark */}
        <View style={{ width: 22, height: 20, borderRadius: 15, backgroundColor: '#8ef5b5', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={17} color="#386641" strokeWidth={3} />
        </View>

        <Text style={{ flex: 1, color: '#000000', fontSize: 9.5, fontWeight: '400', lineHeight: 17 }}>
          Finish setting up your profile to get booked
        </Text>

        <Pressable
          onPress={() => router.push('/(barber)/onboarding/welcome')}
          style={{ backgroundColor: '#111827', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '600' }}>Get Started</Text>
          <ArrowRight size={13} color="#ffffff" />
        </Pressable>
      </View>
    </LinearGradient>
  );
}
