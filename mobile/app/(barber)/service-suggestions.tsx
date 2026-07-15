import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Plus, Sparkles } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSuggestionStore } from '@/stores/suggestionStore';
import { SUGGESTED_TOP_PICKS, SUGGESTED_POPULAR } from '@/utils/serviceSuggestions';

export default function ServiceSuggestionsScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const setPicked = useSuggestionStore((s) => s.setPicked);

  function pick(name: string) {
    setPicked(name);
    router.back();
  }

  const Chip = ({ name }: { name: string }) => (
    <Pressable
      onPress={() => pick(name)}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
        borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10,
      }}
    >
      <Plus size={15} color={c.accent} />
      <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{name}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Select a service</Text>
          <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>Tap a cut to fill it in, then set your price</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Top picks */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Sparkles size={16} color={c.accent} />
          <Text style={{ fontSize: 15, fontWeight: '800', color: c.text }}>Top picks</Text>
        </View>
        <Text style={{ fontSize: 12, color: c.textFaint, marginBottom: 14 }}>
          Popular services offered by barbers in your area.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {SUGGESTED_TOP_PICKS.map((n) => <Chip key={n} name={n} />)}
        </View>

        {/* Other popular */}
        <Text style={{ fontSize: 12, fontWeight: '800', color: c.textFaint, letterSpacing: 1, textTransform: 'uppercase', marginTop: 28, marginBottom: 14 }}>
          Other popular services
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {SUGGESTED_POPULAR.map((n) => <Chip key={n} name={n} />)}
        </View>
      </ScrollView>
    </View>
  );
}
