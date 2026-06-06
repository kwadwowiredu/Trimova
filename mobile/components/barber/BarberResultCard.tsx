import { Pressable, View, Text } from 'react-native';
import { router } from 'expo-router';
import { Star, MapPin, BadgeCheck, Scissors } from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { formatDistanceShort } from '@/utils/formatDistance';
import type { BarberListItem } from '@/types/user';

interface BarberResultCardProps {
  barber: BarberListItem;
}

export function BarberResultCard({ barber }: BarberResultCardProps) {
  const displayName = barber.businessName || barber.fullName;

  return (
    <Pressable
      onPress={() => router.push(`/(client)/barber/${barber.id}` as never)}
      className="bg-white rounded-xl p-4 mb-3 flex-row gap-3 shadow-sm active:opacity-80 border border-neutral-100"
    >
      {/* Avatar */}
      <Avatar uri={barber.avatarUrl} name={barber.fullName} size={60} />

      {/* Details */}
      <View className="flex-1">
        {/* Name + verified */}
        <View className="flex-row items-center gap-1">
          <Text
            className="text-base font-semibold text-neutral-800 flex-1"
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {barber.isVerified && (
            <BadgeCheck size={16} color="#3c3cb9" fill="#EBF4FF" />
          )}
        </View>

        {/* Type + distance row */}
        <View className="flex-row items-center gap-3 mt-1">
          <View className="flex-row items-center gap-1">
            <Scissors size={12} color="#A0AEC0" />
            <Text className="text-xs text-neutral-500">
              {barber.barberType === 'barbershop' ? 'Barbershop' : 'Mobile'}
            </Text>
          </View>
          {barber.distance != null && (
            <View className="flex-row items-center gap-1">
              <MapPin size={12} color="#A0AEC0" />
              <Text className="text-xs text-neutral-500">
                {formatDistanceShort(barber.distance)}
              </Text>
            </View>
          )}
        </View>

        {/* Address */}
        {barber.locationAddress ? (
          <Text className="text-xs text-neutral-400 mt-0.5" numberOfLines={1}>
            {barber.locationAddress}
          </Text>
        ) : null}

        {/* Rating */}
        <View className="flex-row items-center gap-1 mt-1.5">
          <Star size={12} color="#fdb276" fill="#fdb276" />
          <Text className="text-xs font-semibold text-neutral-700">
            {barber.rating.toFixed(1)}
          </Text>
          <Text className="text-xs text-neutral-400">
            ({barber.reviewCount}{barber.reviewCount === 1 ? ' review' : ' reviews'})
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
