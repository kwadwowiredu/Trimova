import { View, Text, Pressable, Image, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, MapPin, Scissors, BadgeCheck } from 'lucide-react-native';
import type { BarberListItem } from '@/types/user';

/**
 * Booksy-style banner card for the client home peek carousels.
 * The card is ~72% of the screen width so the next card "peeks" in from the
 * right, cueing the user that the row scrolls. The top banner shows the
 * barber's cover photo (falling back to their first portfolio shot, then a
 * brand gradient), and tapping opens the barber's detail screen for booking.
 */
export function BarberBannerCard({ barber }: { barber: BarberListItem }) {
  const { width } = useWindowDimensions();
  const CARD_W = Math.round(width * 0.72);
  const BANNER_H = Math.round(CARD_W * 0.62);

  const bannerUri = barber.coverPhotoUrl || barber.portfolioImages?.[0] || null;
  const title = barber.businessName || barber.fullName;

  return (
    <Pressable
      onPress={() => router.push(`/(client)/barber/${barber.id}` as never)}
      style={{
        width: CARD_W,
        marginRight: 14,
        borderRadius: 18,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#EDF0F7',
        overflow: 'hidden',
        shadowColor: '#1A202C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
      }}
      className="active:opacity-90"
    >
      {/* ── Cover banner ─────────────────────────────────────── */}
      <View style={{ width: '100%', height: BANNER_H, backgroundColor: '#E7E9F5' }}>
        {bannerUri ? (
          <Image source={{ uri: bannerUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          // No photos yet — brand gradient placeholder
          <LinearGradient
            colors={['#3c3cb9', '#6d5bd0', '#9d7fe8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Scissors size={38} color="rgba(255,255,255,0.85)" />
          </LinearGradient>
        )}

        {/* Bottom scrim so the avatar + badges read on any photo */}
        <LinearGradient
          colors={['transparent', 'rgba(10,12,30,0.55)']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BANNER_H * 0.55 }}
        />

        {/* Rating badge */}
        <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(15,17,35,0.72)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }}>
          <Star size={11} color="#FFC94D" fill="#FFC94D" />
          <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800' }}>
            {barber.rating > 0 ? barber.rating.toFixed(1) : 'New'}
          </Text>
          {barber.reviewCount > 0 && (
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10.5 }}>({barber.reviewCount})</Text>
          )}
        </View>

        {/* Mobile-barber tag */}
        {barber.barberType === 'mobile' && (
          <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(142,245,181,0.92)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }}>
            <Text style={{ color: '#006d40', fontSize: 10.5, fontWeight: '800' }}>COMES TO YOU</Text>
          </View>
        )}

        {/* Avatar overlapping the banner edge */}
        <View style={{ position: 'absolute', left: 12, bottom: -0.5, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, borderColor: '#ffffff', overflow: 'hidden', backgroundColor: '#3c3cb9', alignItems: 'center', justifyContent: 'center' }}>
            {barber.avatarUrl ? (
              <Image source={{ uri: barber.avatarUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                {(title ?? 'B').slice(0, 1).toUpperCase()}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* ── Info block ───────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text style={{ fontSize: 15.5, fontWeight: '800', color: '#161c27', flexShrink: 1 }} numberOfLines={1}>
            {title}
          </Text>
          {barber.isVerified && <BadgeCheck size={15} color="#3c3cb9" />}
        </View>
        {barber.businessName ? (
          <Text style={{ fontSize: 12, color: '#8a89a3', marginTop: 1 }} numberOfLines={1}>
            {barber.fullName}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <MapPin size={12} color="#fdb276" />
          <Text style={{ flex: 1, fontSize: 12, color: '#464554' }} numberOfLines={1}>
            {barber.locationAddress ?? 'Location not set'}
          </Text>
          {barber.distance != null && (
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#3c3cb9' }}>{barber.distance.toFixed(1)} km</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
