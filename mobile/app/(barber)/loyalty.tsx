import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Zap, Gift, ChevronRight } from 'lucide-react-native';

export default function LoyaltyProgramsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-neutral-100" style={{ paddingTop: insets.top }}>

      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3 bg-white border-b border-neutral-200">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-neutral-100 items-center justify-center active:opacity-70"
        >
          <ChevronLeft size={20} color="#4A5568" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-[17px] font-bold text-neutral-800">Loyalty Programs</Text>
          <Text className="text-xs text-neutral-500">Drive retention & keep clients coming back</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16 }}>

        {/* Intro banner */}
        <View
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'rgba(60,60,185,0.07)', borderWidth: 1, borderColor: 'rgba(60,60,185,0.1)' }}
        >
          <Text className="text-sm text-accent leading-5 font-medium">
            Set up loyalty programs to reward your regular clients and fill empty appointment slots with smart promotions.
          </Text>
        </View>

        {/* Flash Promos card */}
        <Pressable
          onPress={() => router.push('/flash-promos' as any)}
          style={{
            backgroundColor: '#fff8ed',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#fde68a',
            shadowColor: '#92400e',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
            overflow: 'hidden',
          }}
          className="active:opacity-90"
        >
          {/* Coloured top band */}
          <View style={{ backgroundColor: '#F59E0B', paddingHorizontal: 20, paddingVertical: 18 }}>
            <View className="flex-row items-center gap-3">
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={22} color="#ffffff" fill="#ffffff" />
              </View>
              <View className="flex-1">
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#ffffff' }}>Flash Promos</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>Time-limited discounts</Text>
              </View>
              <ChevronRight size={20} color="rgba(255,255,255,0.8)" />
            </View>
          </View>

          {/* Body */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
            <Text style={{ fontSize: 13, color: '#92400e', lineHeight: 20 }}>
              Create quick, time-limited discounts to fill empty slots. Clients browsing your profile will see active promos and book immediately.
            </Text>
            <View className="flex-row gap-2 mt-3 flex-wrap">
              {['% Off', 'GHS Off', 'Multi-Service'].map((tag) => (
                <View key={tag} style={{ backgroundColor: '#fef3c7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400e' }}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </Pressable>

        {/* Stamp Cards card */}
        <Pressable
          onPress={() => router.push('/stamp-cards' as any)}
          style={{
            backgroundColor: '#f0f0ff',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#c7c7f5',
            shadowColor: '#1e1b4b',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
            overflow: 'hidden',
          }}
          className="active:opacity-90"
        >
          {/* Coloured top band */}
          <View style={{ backgroundColor: '#3c3cb9', paddingHorizontal: 20, paddingVertical: 18 }}>
            <View className="flex-row items-center gap-3">
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <Gift size={22} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#ffffff' }}>Stamp Cards</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>Reward loyal clients</Text>
              </View>
              <ChevronRight size={20} color="rgba(255,255,255,0.8)" />
            </View>
          </View>

          {/* Body */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
            <Text style={{ fontSize: 13, color: '#312e81', lineHeight: 20 }}>
              Digital punch cards where clients earn stamps per visit. When they hit your target, they unlock a free service or discount — your choice, your rules.
            </Text>
            <View className="flex-row gap-2 mt-3 flex-wrap">
              {['Free Service', 'Discount Reward', 'No Commission'].map((tag) => (
                <View key={tag} style={{ backgroundColor: '#e0e0ff', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#3c3cb9' }}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </Pressable>

        {/* How it works blurb */}
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            padding: 16,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#A0AEC0', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            How it works
          </Text>
          {[
            { step: '1', text: 'Choose a loyalty type and configure your rules.' },
            { step: '2', text: 'Activate it — clients see your programs when browsing your profile.' },
            { step: '3', text: 'Trimova tracks stamps & applies promos automatically at checkout.' },
          ].map(({ step, text }) => (
            <View key={step} className="flex-row gap-3 mb-3 items-start">
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#3c3cb9', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{step}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: '#4A5568', lineHeight: 19 }}>{text}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}
