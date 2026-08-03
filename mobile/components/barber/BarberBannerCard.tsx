import { View, Text, Pressable, Image, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Star, MapPin, Scissors, BadgeCheck } from 'lucide-react-native';
import { tapLight } from '@/utils/haptics';
import { T, HAIRLINE, softShadow, chip } from '@/constants/clientTheme';
import { StarIcon } from '@/components/ui/Icons';
import type { BarberListItem } from '@/types/user';

/**
 * Banner card for the client home peek carousels. Layer 1 white surface on the
 * canvas, hairline border, and a dual-tone chip for the mobile-barber tag.
 */
export function BarberBannerCard({ barber }: { barber: BarberListItem }) {
  const { width } = useWindowDimensions();
  const CARD_W = Math.round(width * 0.72);
  const BANNER_H = Math.round(CARD_W * 0.62);

  const bannerUri = barber.coverPhotoUrl || barber.portfolioImages?.[0] || null;
  const title = barber.businessName || barber.fullName;
  const mobileChip = chip('success');

  return (
    <Pressable
      onPress={() => { tapLight(); router.push(`/(client)/barber/${barber.id}` as never); }}
      style={{
        width: CARD_W,
        marginRight: 14,
        borderRadius: 18,
        backgroundColor: T.card,
        borderWidth: HAIRLINE,
        borderColor: T.border,
        overflow: 'hidden',
        ...softShadow,
      }}
      className="active:opacity-90"
    >
      {/* ── Cover banner ─────────────────────────────────────── */}
      <View style={{ width: '100%', height: BANNER_H, backgroundColor: T.inputDeep }}>
        {bannerUri ? (
          <Image source={{ uri: bannerUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={['#eef0ff', '#e8eeff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Scissors size={34} color={T.textDisabled} />
          </LinearGradient>
        )}

        {/* Frosted rating badge */}
        <BlurView
          intensity={35}
          tint="light"
          style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.55)' }}
        >
          <StarIcon size={11} />
          <Text style={{ color: T.text, fontSize: 12, fontWeight: '700' }}>
            {barber.rating > 0 ? barber.rating.toFixed(1) : '–'}
          </Text>
          {barber.reviewCount > 0 && (
            <Text style={{ color: T.textMuted, fontSize: 10.5 }}>({barber.reviewCount})</Text>
          )}
        </BlurView>

        {/* Avatar overlapping the banner edge */}
        <View style={{ position: 'absolute', left: 12, bottom: -0.5 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, borderColor: T.card, overflow: 'hidden', backgroundColor: T.accentWash, alignItems: 'center', justifyContent: 'center' }}>
            {barber.avatarUrl ? (
              <Image source={{ uri: barber.avatarUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Text style={{ color: T.accent, fontSize: 16, fontWeight: '800' }}>
                {(title ?? 'B').slice(0, 1).toUpperCase()}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* ── Info block ───────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text style={{ fontSize: 15.5, fontWeight: '700', color: T.text, flexShrink: 1 }} numberOfLines={1}>
            {title}
          </Text>
          {barber.isVerified && <BadgeCheck size={15} color={T.accent} />}
        </View>

        {/* Freelancers: barber's own name + soft-tint mobile chip */}
        {barber.barberType === 'mobile' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <Text style={{ fontSize: 12.5, color: T.textMuted, fontWeight: '500', flexShrink: 1 }} numberOfLines={1}>
              {barber.fullName}
            </Text>
            <View style={{ backgroundColor: mobileChip.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 9.5, fontWeight: '700', color: mobileChip.fg }}>MOBILE</Text>
            </View>
          </View>
        )}

        {/* Rating · reviews — quiet gray */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
          <StarIcon size={11} />
          <Text style={{ fontSize: 11.5, color: T.textFaint }}>
            {barber.rating > 0 ? barber.rating.toFixed(1) : '–'}
            {`  (${barber.reviewCount} review${barber.reviewCount === 1 ? '' : 's'})`}
          </Text>
        </View>

        {/* Location */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
          <MapPin size={12} color={T.textFaint} />
          <Text style={{ flex: 1, fontSize: 12, color: T.textMuted }} numberOfLines={1}>
            {barber.locationAddress ?? 'Location not set'}
          </Text>
          {barber.distance != null && (
            <Text style={{ fontSize: 12, fontWeight: '700', color: T.textMuted }}>{barber.distance.toFixed(1)} km</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
