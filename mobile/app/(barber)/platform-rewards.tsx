import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft, Trophy, Star, Check, TrendingUp, AlertTriangle, ShieldCheck,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import type { BarberProfile } from '@/types/user';

// ─── Design tokens (fixed light — this dashboard has a set brand look) ─────────
const T = {
  canvas:                '#f9f9ff',
  primary:               '#221ea2',
  primaryContainer:      '#3c3cb9',
  onPrimary:             '#ffffff',
  secondary:             '#006d40',
  secondaryContainer:    '#8ef5b5',
  onSecondaryContainer:  '#007243',
  error:                 '#ba1a1a',
  errorContainer:        '#ffdad6',
  tertiary:              '#694900',
  tertiaryContainer:     '#ffddb0',
  surfaceLowest:         '#ffffff',
  onSurface:             '#161c27',
  onSurfaceVariant:      '#464554',
  outlineVariant:        '#c7c5d6',
  track:                 '#e3e8f9',
  textFaint:             '#8a89a3',
};

const S = { sm: 8, md: 16, lg: 24 }; // 8px rhythm

// ─── Mock performance data (TODO: wire to real platform analytics) ─────────────
const DATA = {
  monthlyCuts:        175,   // completed bookings this calendar month
  completionRate:     94,    // % over rolling 30 days
  reviewRating:       4.8,   // rolling average
  history: [
    { month: 'June 2026',  appointments: 268, rate: '7% Applied' },
    { month: 'May 2026',   appointments: 312, rate: '5% Applied' },
    { month: 'April 2026', appointments: 141, rate: '10% Applied' },
  ],
};

const TIERS = [
  { name: 'Bronze', min: 0,   max: 150,      fee: '10%' },
  { name: 'Silver', min: 151, max: 300,      fee: '7%'  },
  { name: 'Gold',   min: 301, max: Infinity, fee: '5%'  },
];

const COMPLETION_TARGET = 90;
const RATING_TARGET = 4.7;

function currentTierIndex(cuts: number) {
  if (cuts >= 301) return 2;
  if (cuts >= 151) return 1;
  return 0;
}

// ─── Card shell ────────────────────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: T.surfaceLowest, borderRadius: 20, borderWidth: 1, borderColor: T.outlineVariant, padding: S.md, marginBottom: S.md }}>
      {children}
    </View>
  );
}

// ─── Segmented tier progress bar ───────────────────────────────────────────────
function TierBar({ cuts }: { cuts: number }) {
  return (
    <View style={{ marginTop: S.md }}>
      {/* Milestone labels */}
      <View style={{ flexDirection: 'row', marginBottom: S.sm }}>
        {TIERS.map((tier, i) => {
          const done = cuts >= tier.max;
          const active = currentTierIndex(cuts) === i;
          return (
            <View key={tier.name} style={{ flex: 1, alignItems: i === 0 ? 'flex-start' : i === 1 ? 'center' : 'flex-end' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{
                  width: 18, height: 18, borderRadius: 9,
                  backgroundColor: done ? T.primary : active ? T.primaryContainer : T.track,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: active && !done ? 2 : 0, borderColor: T.primary,
                }}>
                  {done
                    ? <Check size={11} color={T.onPrimary} strokeWidth={3} />
                    : <Text style={{ fontSize: 9, fontWeight: '800', color: active ? T.onPrimary : T.textFaint }}>{i + 1}</Text>}
                </View>
                <Text style={{ fontSize: 12, fontWeight: '800', color: active || done ? T.onSurface : T.textFaint }}>{tier.name}</Text>
              </View>
              <Text style={{ fontSize: 10, color: T.textFaint, marginTop: 2 }}>{tier.fee} fee</Text>
            </View>
          );
        })}
      </View>

      {/* Segmented track */}
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {TIERS.map((tier, i) => {
          const span = tier.max === Infinity ? 150 : tier.max - tier.min + 1;
          const fill = Math.max(0, Math.min(1, (cuts - tier.min) / span));
          return (
            <View key={tier.name} style={{ flex: 1, height: 10, borderRadius: 999, backgroundColor: T.track, overflow: 'hidden' }}>
              <View style={{ width: `${fill * 100}%`, height: '100%', backgroundColor: T.primaryContainer, borderRadius: 999 }} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Metric block ──────────────────────────────────────────────────────────────
function Metric({ label, value, target, ok }: { label: string; value: string; target: string; ok: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: T.canvas, borderRadius: 14, borderWidth: 1, borderColor: T.outlineVariant, padding: S.md }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: T.onSurfaceVariant }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: ok ? T.secondary : T.error }}>{value}</Text>
        {ok
          ? <Check size={16} color={T.secondary} strokeWidth={3} />
          : <AlertTriangle size={15} color={T.error} />}
      </View>
      <Text style={{ fontSize: 11, color: T.textFaint, marginTop: 6, lineHeight: 15 }}>{target}</Text>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function PlatformRewardsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const barber = user as BarberProfile | null;
  const name = barber?.businessName || barber?.fullName || 'Your Shop';

  const tierIdx = currentTierIndex(DATA.monthlyCuts);
  const tier = TIERS[tierIdx];
  const nextTier = TIERS[tierIdx + 1];
  const toNext = nextTier ? nextTier.min - DATA.monthlyCuts : 0;

  const completionOk = DATA.completionRate >= COMPLETION_TARGET;
  const ratingOk = DATA.reviewRating >= RATING_TARGET;
  const certifiedPro = completionOk && ratingOk;

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: S.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.outlineVariant, backgroundColor: T.surfaceLowest }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.canvas, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={T.onSurfaceVariant} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: T.onSurface }}>Platform Rewards</Text>
          <Text style={{ fontSize: 11, color: T.textFaint, marginTop: 1 }}>Commission tiers & search ranking</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: S.md, paddingBottom: 40 }}>

        {/* 1 ─ Active status card */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: S.sm }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: T.primary }} numberOfLines={1}>{name}</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: T.onSurfaceVariant, marginTop: 2 }}>{tier.name} Tier Member</Text>
            </View>
            <View style={{ backgroundColor: T.secondaryContainer, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: T.onSecondaryContainer }}>{tier.fee} Commission Active</Text>
            </View>
          </View>
          <Text style={{ fontSize: 12.5, color: T.onSurfaceVariant, lineHeight: 18, marginTop: S.md }}>
            Your commission rate is automatically recalculated based on your completed booking volume over a rolling 90-day window.
          </Text>
        </Card>

        {/* 2 ─ Tier progress engine */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
            <Trophy size={18} color={T.primary} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: T.onSurface }}>Your Monthly Tier Progress</Text>
          </View>

          <TierBar cuts={DATA.monthlyCuts} />

          <View style={{ backgroundColor: T.canvas, borderRadius: 12, padding: S.md, marginTop: S.md, flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
            <TrendingUp size={16} color={T.primaryContainer} />
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: T.onSurface, lineHeight: 19 }}>
              {nextTier
                ? `Complete ${toNext} more booking${toNext === 1 ? '' : 's'} this month to unlock ${nextTier.name} Tier and drop your fee to ${nextTier.fee}!`
                : 'Max tier achieved! You are saving 50% on platform fees this month.'}
            </Text>
          </View>
        </Card>

        {/* 3 ─ Certified Pro search boost */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
            <Star size={18} color={T.tertiary} fill={T.tertiaryContainer} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: T.onSurface }}>Algorithmic Search Ranking Boost</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: S.sm, marginTop: S.md }}>
            <Metric
              label="Completion Rate"
              value={`${DATA.completionRate}%`}
              target={`Target: ≥ ${COMPLETION_TARGET}% to avoid cancellation penalties.`}
              ok={completionOk}
            />
            <Metric
              label="Review Rating"
              value={`⭐ ${DATA.reviewRating.toFixed(1)}`}
              target={`Target: ≥ ${RATING_TARGET.toFixed(1)} for top-search sorting.`}
              ok={ratingOk}
            />
          </View>

          {certifiedPro ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: T.secondaryContainer, borderRadius: 14, padding: S.md, marginTop: S.md }}>
              <ShieldCheck size={20} color={T.onSecondaryContainer} />
              <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: T.onSecondaryContainer, lineHeight: 18 }}>
                🌟 CERTIFIED PRO ACTIVE: Your profile is pinned to the top of client search feeds.
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: T.errorContainer, borderRadius: 14, padding: S.md, marginTop: S.md }}>
              <AlertTriangle size={20} color={T.error} />
              <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: T.error, lineHeight: 18 }}>
                {!completionOk
                  ? `Raise your completion rate to ≥ ${COMPLETION_TARGET}% to re-unlock Certified Pro search visibility.`
                  : `Lift your review rating to ≥ ${RATING_TARGET.toFixed(1)} to re-unlock Certified Pro search visibility.`}
              </Text>
            </View>
          )}
        </Card>

        {/* 4 ─ Reward timeline history */}
        <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: T.onSurfaceVariant, marginTop: S.sm, marginBottom: S.sm, marginLeft: 2 }}>
          Reward Timeline History
        </Text>
        <Card>
          {DATA.history.map((row, i) => (
            <View
              key={row.month}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: T.outlineVariant }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: T.onSurface }}>{row.month}</Text>
                <Text style={{ fontSize: 12, color: T.textFaint, marginTop: 2 }}>{row.appointments} Appointments</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: T.secondary }}>{row.rate}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}
