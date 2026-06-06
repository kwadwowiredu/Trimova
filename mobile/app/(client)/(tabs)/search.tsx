import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SearchX, SlidersHorizontal, X } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocationStore } from '@/stores/locationStore';
import { barbersService } from '@/services/barbers';
import { BarberResultCard } from '@/components/barber/BarberResultCard';
import { useDebounce } from '@/hooks/useDebounce';
import type { BarberListItem } from '@/types/user';
import type { BarberType } from '@/types/user';

type TypeFilter = 'all' | BarberType;
type RatingFilter = 0 | 3 | 4 | 4.5;

const TYPE_OPTIONS: { label: string; value: TypeFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Barbershop', value: 'barbershop' },
  { label: 'Mobile', value: 'mobile' },
];

const RATING_OPTIONS: { label: string; value: RatingFilter }[] = [
  { label: 'Any', value: 0 },
  { label: '3+', value: 3 },
  { label: '4+', value: 4 },
  { label: '4.5+', value: 4.5 },
];

export default function SearchScreen() {
  const { coordinates } = useLocationStore();

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>(0);

  const inputRef = useRef<TextInput>(null);
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      'barbers',
      'search',
      debouncedQuery,
      typeFilter,
      ratingFilter,
      coordinates?.lat,
      coordinates?.lng,
    ],
    queryFn: () =>
      barbersService.search({
        q: debouncedQuery || undefined,
        barberType: typeFilter === 'all' ? undefined : typeFilter,
        minRating: ratingFilter || undefined,
        lat: coordinates?.lat,
        lng: coordinates?.lng,
        radius: 50, // wider radius for search
        page: 1,
        limit: 30,
      }),
  });

  const barbers: BarberListItem[] =
    (data?.data as unknown as { data: BarberListItem[] })?.data ?? [];

  const clearQuery = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  return (
    <View className="flex-1 bg-white">
      {/* ── Search bar ── */}
      <View className="px-4 pt-14 pb-3 bg-white border-b border-neutral-100">
        <View className="flex-row items-center bg-neutral-100 rounded-xl px-4 gap-3">
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search barbers, salons..."
            placeholderTextColor="#A0AEC0"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            className="flex-1 py-3.5 text-sm text-neutral-800"
          />
          {query.length > 0 && (
            <Pressable onPress={clearQuery} hitSlop={8}>
              <X size={16} color="#A0AEC0" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Filters ── */}
      <View className="bg-white border-b border-neutral-100">
        {/* Type chips */}
        <View className="flex-row gap-2 px-4 pt-3 pb-1">
          {TYPE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setTypeFilter(opt.value)}
              className={`px-4 py-1.5 rounded-full border ${
                typeFilter === opt.value
                  ? 'bg-primary border-primary'
                  : 'bg-white border-neutral-200'
              } active:opacity-70`}
            >
              <Text
                className={`text-xs font-medium ${
                  typeFilter === opt.value ? 'text-white' : 'text-neutral-600'
                }`}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}

          {/* Divider */}
          <View className="w-px bg-neutral-200 mx-1" />

          {/* Rating chips */}
          {RATING_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setRatingFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full border ${
                ratingFilter === opt.value
                  ? 'bg-primary border-primary'
                  : 'bg-white border-neutral-200'
              } active:opacity-70`}
            >
              <Text
                className={`text-xs font-medium ${
                  ratingFilter === opt.value ? 'text-white' : 'text-neutral-600'
                }`}
              >
                {opt.label === 'Any' ? 'Any rating' : `${opt.label}`}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Result count */}
        <View className="px-4 py-2">
          {isLoading ? (
            <ActivityIndicator size="small" color="#fdb276" />
          ) : (
            <Text className="text-xs text-neutral-400">
              {barbers.length} result{barbers.length !== 1 ? 's' : ''}
              {debouncedQuery ? ` for "${debouncedQuery}"` : ''}
            </Text>
          )}
        </View>
      </View>

      {/* ── Results ── */}
      {isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <SlidersHorizontal size={40} color="#A0AEC0" />
          <Text className="text-base font-semibold text-neutral-600 mt-4 text-center">
            Something went wrong
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="bg-primary rounded-xl px-6 py-3 mt-4 active:opacity-80"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={barbers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="px-4">
              <BarberResultCard barber={item} />
            </View>
          )}
          ListEmptyComponent={
            !isLoading ? (
              <View className="flex-1 items-center justify-center px-8 py-20">
                <SearchX size={48} color="#CBD5E0" />
                <Text className="text-lg font-semibold text-neutral-600 mt-4 text-center">
                  No barbers found
                </Text>
                <Text className="text-sm text-neutral-400 mt-2 text-center">
                  {debouncedQuery
                    ? `No results for "${debouncedQuery}". Try a different name or location.`
                    : 'No barbers match your filters. Try adjusting your criteria.'}
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}
    </View>
  );
}
