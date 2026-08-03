import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import {
  useSearchFilterStore, activeFilterCount, PRICE_MIN, PRICE_MAX,
} from '@/stores/searchFilterStore';
import { PriceRangeSlider } from '@/components/ui/PriceRangeSlider';
import { tapSelect, tapMedium, tapLight } from '@/utils/haptics';
import { T, HAIRLINE } from '@/constants/clientTheme';

const VENUE_OPTIONS = [
  { label: 'Barbershops', value: 'barbershop' as const },
  { label: 'Mobile barbers', value: 'mobile' as const },
];

const SORT_OPTIONS = [
  { label: 'Top rated', value: 'rating' as const },
  { label: 'Nearest', value: 'distance' as const },
];

const RATING_OPTIONS = [
  { label: '4.0 or More', value: 4 },
  { label: '4.5 or More', value: 4.5 },
];

const DISCOUNT_OPTIONS = [
  { label: '50% or More', value: 50 },
  { label: '40% or More', value: 40 },
  { label: '30% or More', value: 30 },
  { label: '20% or More', value: 20 },
  { label: '10% or More', value: 10 },
  { label: 'Less than 10%', value: 5 },
];

/** Quiet section heading — hierarchy comes from type, not colour. */
function Heading({ children }: { children: string }) {
  return (
    <Text style={{ fontSize: 12, fontWeight: '700', color: T.textFaint, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
      {children}
    </Text>
  );
}

function Divider() {
  return <View style={{ height: HAIRLINE, backgroundColor: T.border, marginVertical: 20 }} />;
}

/** Neutral chip; the accent appears only once selected, plus an ✕ to clear. */
function Chip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={() => { tapSelect(); onToggle(); }}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 7,
        backgroundColor: selected ? T.accentWash : T.card,
        borderWidth: selected ? 1.5 : HAIRLINE,
        borderColor: selected ? T.accent : T.border,
        borderRadius: 999, paddingHorizontal: 15, paddingVertical: 9,
      }}
    >
      <Text style={{ fontSize: 13.5, fontWeight: '600', color: selected ? T.accent : T.textMuted }}>{label}</Text>
      {selected && (
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' }}>
          <X size={9} color={T.onAccent} strokeWidth={3} />
        </View>
      )}
    </Pressable>
  );
}

/** Sort pair — active state carries the accent, inactive stays neutral. */
function SortPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tapSelect(); onPress(); }} style={{ flex: 1 }}>
      <View style={{
        borderRadius: 999, paddingVertical: 12, alignItems: 'center',
        backgroundColor: active ? T.accent : T.card,
        borderWidth: active ? 0 : HAIRLINE, borderColor: T.border,
      }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: active ? T.onAccent : T.textMuted }}>{label}</Text>
      </View>
    </Pressable>
  );
}

export default function SearchFiltersScreen() {
  const insets = useSafeAreaInsets();
  const filters = useSearchFilterStore();
  const count = activeFilterCount(filters);

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas, paddingTop: insets.top }}>
      {/* Header — centered FILTER title */}
      <View style={{ paddingVertical: 14, alignItems: 'center', borderBottomWidth: HAIRLINE, borderBottomColor: T.border }}>
        <Text style={{ fontSize: 16.5, fontWeight: '800', letterSpacing: 2, color: T.text }}>FILTER</Text>
        <Text style={{ fontSize: 12, color: T.textFaint, marginTop: 3, paddingHorizontal: 40, textAlign: 'center' }}>
          Narrow your search to find the perfect barber.
        </Text>
        <Pressable onPress={() => { tapLight(); router.back(); }} hitSlop={10} style={{ position: 'absolute', left: 16, top: 16 }}>
          <ChevronLeft size={24} color={T.text} />
        </Pressable>
        <Pressable onPress={() => { tapLight(); filters.reset(); }} hitSlop={8} style={{ position: 'absolute', right: 16, top: 18 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: count > 0 ? T.accent : T.textDisabled }}>Reset</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        {/* Pricing */}
        <Heading>Pricing</Heading>
        <PriceRangeSlider
          min={PRICE_MIN}
          max={PRICE_MAX}
          valueMin={filters.priceMin}
          valueMax={filters.priceMax}
          onChange={(lo, hi) => filters.setFilters({ priceMin: lo, priceMax: hi })}
        />

        <Divider />

        {/* Sort By */}
        <Heading>Sort By</Heading>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {SORT_OPTIONS.map((o) => (
            <SortPill
              key={o.label}
              label={o.label}
              active={filters.sort === o.value}
              onPress={() => filters.setFilters({ sort: filters.sort === o.value ? undefined : o.value })}
            />
          ))}
        </View>

        <Divider />

        {/* Venue type */}
        <Heading>Venue Type</Heading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {VENUE_OPTIONS.map((o) => (
            <Chip
              key={o.label}
              label={o.label}
              selected={filters.venue === o.value}
              onToggle={() => filters.setFilters({ venue: filters.venue === o.value ? undefined : o.value })}
            />
          ))}
        </View>

        <Divider />

        {/* Rating */}
        <Heading>Rating</Heading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {RATING_OPTIONS.map((o) => (
            <Chip
              key={o.label}
              label={o.label}
              selected={filters.minRating === o.value}
              onToggle={() => filters.setFilters({ minRating: filters.minRating === o.value ? 0 : o.value })}
            />
          ))}
        </View>

        <Divider />

        {/* Discounts */}
        <Heading>Discounts</Heading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {DISCOUNT_OPTIONS.map((o) => (
            <Chip
              key={o.label}
              label={o.label}
              selected={filters.discount === o.value}
              onToggle={() => filters.setFilters({ discount: filters.discount === o.value ? 0 : o.value })}
            />
          ))}
        </View>
        <Text style={{ fontSize: 11.5, color: T.textFaint, marginTop: 10, lineHeight: 16 }}>
          Discount filtering applies once shops start running Flash Promos.
        </Text>
      </ScrollView>

      {/* Submit — the single accent target on this screen */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 14, borderTopWidth: HAIRLINE, borderTopColor: T.border, backgroundColor: T.card }}>
        <Pressable
          onPress={() => { tapMedium(); router.back(); }}
          style={{ backgroundColor: T.accent, borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
        >
          <Text style={{ color: T.onAccent, fontSize: 15, fontWeight: '700' }}>
            {count > 0 ? `Show results (${count})` : 'Show all results'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
