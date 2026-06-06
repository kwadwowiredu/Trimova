import { Pressable, View, Text } from 'react-native';
import { router } from 'expo-router';
import { Star, MapPin, BadgeCheck } from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { formatDistanceShort } from '@/utils/formatDistance';
import type { BarberListItem } from '@/types/user';

interface BarberScrollCardProps {
  barber: BarberListItem;
}

export function BarberScrollCard({ barber }: BarberScrollCardProps) {
  const displayName = barber.businessName || barber.fullName;

  return (
    <Pressable
      onPress={() => router.push(`/(client)/barber/${barber.id}` as never)}
      className="bg-white rounded-xl p-3 mr-3 w-40 shadow-sm active:opacity-80 border border-neutral-100"
    >
      {/* Avatar + verified badge */}
      <View className="items-center mb-2">
        <View>
          <Avatar uri={barber.avatarUrl} name={barber.fullName} size={56} />
          {barber.isVerified && (
            <View className="absolute -bottom-1 -right-1">
              <BadgeCheck size={18} color="#3c3cb9" fill="#ffffff" />
            </View>
          )}
        </View>
      </View>

      {/* Name */}
      <Text
        className="text-sm font-semibold text-neutral-800 text-center"
        numberOfLines={1}
      >
        {displayName}
      </Text>

      {/* Type */}
      <Text className="text-xs text-neutral-400 text-center mt-0.5">
        {barber.barberType === 'barbershop' ? 'Barbershop' : 'Mobile'}
      </Text>

      {/* Rating */}
      <View className="flex-row items-center justify-center gap-1 mt-1.5">
        <Star size={11} color="#fdb276" fill="#fdb276" />
        <Text className="text-xs font-semibold text-neutral-700">
          {barber.rating.toFixed(1)}
        </Text>
        <Text className="text-xs text-neutral-400">({barber.reviewCount})</Text>
      </View>

      {/* Distance */}
      {barber.distance != null && (
        <View className="flex-row items-center justify-center gap-1 mt-1">
          <MapPin size={10} color="#A0AEC0" />
          <Text className="text-xs text-neutral-400">
            {formatDistanceShort(barber.distance)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
