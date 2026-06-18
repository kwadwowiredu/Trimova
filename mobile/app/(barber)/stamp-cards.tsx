import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Gift,
  CheckSquare,
  Square,
  Plus,
  Minus,
  Info,
  Check,
} from 'lucide-react-native';

const ALL_SERVICES = [
  'Haircut & Beard',
  'Executive Fade',
  'Beard Trim',
  'Skin Fade',
  'Shampoo & Style',
  'Head Shave',
  'Kids Haircut',
];

type RewardType = 'free_service' | 'discount';

function Label({ children }: { children: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '800', color: '#312e81', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
      {children}
    </Text>
  );
}

function PurpleInput({
  value, onChangeText, placeholder, keyboardType = 'default', suffix,
}: {
  value: string; onChangeText: (t: string) => void; placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad'; suffix?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1.5, borderColor: '#c7c7f5' }}>
      <TextInput
        value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor="#9999dd" keyboardType={keyboardType}
        style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#1A202C', paddingVertical: 0 }}
      />
      {suffix && <Text style={{ fontSize: 14, fontWeight: '700', color: '#3c3cb9', marginLeft: 4 }}>{suffix}</Text>}
    </View>
  );
}

export default function StampCardsScreen() {
  const insets = useSafeAreaInsets();

  const [isActive,       setIsActive]       = useState(false);
  const [stampsRequired, setStampsRequired] = useState(5);
  const [stampServices,  setStampServices]  = useState<string[]>(ALL_SERVICES.slice(0, 3));
  const [rewardType,     setRewardType]     = useState<RewardType>('free_service');
  const [rewardService,  setRewardService]  = useState(ALL_SERVICES[0]);
  const [rewardDiscount, setRewardDiscount] = useState('');

  function adjustStamps(delta: number) {
    setStampsRequired((prev) => Math.min(20, Math.max(2, prev + delta)));
  }

  function toggleStampService(service: string) {
    setStampServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service],
    );
  }

  function handleActivate() {
    setIsActive(true);
    // TODO: POST /api/barbers/me/stamp-cards
  }

  function handleDeactivate() {
    setIsActive(false);
    // TODO: DELETE /api/barbers/me/stamp-cards/active
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f0ff', paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: '#3c3cb9', paddingBottom: 18, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.08)', top: -70, right: -50 }} />
        <View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(124,92,196,0.4)', bottom: -40, left: -20 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={20} color="#ffffff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#ffffff' }}>Stamp Cards</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>Reward loyal clients</Text>
          </View>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Gift size={20} color="#ffffff" />
          </View>
        </View>

        {/* Status button */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Pressable
            onPress={isActive ? handleDeactivate : () => {}}
            style={{
              backgroundColor: isActive ? '#38A169' : 'rgba(255,255,255,0.2)',
              borderRadius: 24,
              paddingVertical: 10,
              paddingHorizontal: 20,
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isActive ? '#fff' : 'rgba(255,255,255,0.4)' }} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: isActive ? '#ffffff' : 'rgba(255,255,255,0.55)' }}>
              {isActive ? 'Active — Tap to Deactivate' : 'Inactive'}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 16 }}
      >

        {/* Stamp preview card */}
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          borderWidth: 1.5,
          borderColor: '#c7c7f5',
          padding: 18,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#3c3cb9', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
            Client Preview
          </Text>

          {/* Stamp grid preview */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {Array.from({ length: stampsRequired }).map((_, i) => {
              const earned = i < Math.floor(stampsRequired / 2);
              return (
                <View
                  key={i}
                  style={{
                    width: 34, height: 34, borderRadius: 17,
                    backgroundColor: earned ? '#3c3cb9' : 'transparent',
                    borderWidth: 2,
                    borderColor: earned ? '#3c3cb9' : '#c7c7f5',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {earned && <Check size={14} color="#ffffff" strokeWidth={3} />}
                </View>
              );
            })}
          </View>

          <Text style={{ fontSize: 12, color: '#718096' }}>
            Collect {stampsRequired} stamps → unlock reward
          </Text>
        </View>

        {/* Config card */}
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          borderWidth: 1.5,
          borderColor: '#c7c7f5',
          shadowColor: '#1e1b4b',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07,
          shadowRadius: 8,
          elevation: 3,
          padding: 20,
          gap: 20,
        }}>

          {/* Stamps stepper */}
          <View>
            <Label>Stamps Required to Unlock</Label>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable
                onPress={() => adjustStamps(-1)}
                disabled={stampsRequired <= 2}
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: stampsRequired <= 2 ? '#f1f2f3' : '#e0e0ff',
                  alignItems: 'center', justifyContent: 'center',
                  opacity: stampsRequired <= 2 ? 0.5 : 1,
                }}
              >
                <Minus size={18} color="#3c3cb9" />
              </Pressable>

              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, fontWeight: '800', color: '#1A202C' }}>{stampsRequired}</Text>
                <Text style={{ fontSize: 12, color: '#A0AEC0', marginTop: 2 }}>stamps</Text>
              </View>

              <Pressable
                onPress={() => adjustStamps(1)}
                disabled={stampsRequired >= 20}
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: stampsRequired >= 20 ? '#f1f2f3' : '#e0e0ff',
                  alignItems: 'center', justifyContent: 'center',
                  opacity: stampsRequired >= 20 ? 0.5 : 1,
                }}
              >
                <Plus size={18} color="#3c3cb9" />
              </Pressable>
            </View>
          </View>

          {/* Services that earn stamps */}
          <View>
            <Label>Services That Earn Stamps</Label>
            <Text style={{ fontSize: 12, color: '#718096', marginBottom: 8, lineHeight: 17 }}>
              Clients only get a stamp when they book a checked service.
            </Text>
            <View style={{ backgroundColor: '#f0f0ff', borderRadius: 14, borderWidth: 1.5, borderColor: '#c7c7f5', overflow: 'hidden' }}>
              {ALL_SERVICES.map((service, i) => {
                const selected = stampServices.includes(service);
                return (
                  <View key={service}>
                    {i > 0 && <View style={{ height: 1, backgroundColor: '#e0e0ff', marginHorizontal: 14 }} />}
                    <Pressable
                      onPress={() => toggleStampService(service)}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12 }}
                    >
                      {selected
                        ? <CheckSquare size={18} color="#3c3cb9" />
                        : <Square size={18} color="#c7c7f5" />}
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: selected ? '600' : '400', color: selected ? '#1A202C' : '#718096' }}>
                        {service}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Reward type */}
          <View>
            <Label>Reward Type</Label>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['free_service', 'discount'] as RewardType[]).map((opt, i) => (
                <Pressable
                  key={opt}
                  onPress={() => setRewardType(opt)}
                  style={{
                    flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center',
                    backgroundColor: rewardType === opt ? '#3c3cb9' : '#e0e0ff',
                    borderWidth: 1.5, borderColor: rewardType === opt ? '#3c3cb9' : '#c7c7f5',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: rewardType === opt ? '#ffffff' : '#3c3cb9' }}>
                    {['Free Service', 'Discount %'][i]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ marginTop: 12 }}>
              {rewardType === 'free_service' ? (
                <View>
                  <Text style={{ fontSize: 12, color: '#718096', marginBottom: 8, lineHeight: 17 }}>
                    Which service does the client receive as their free reward?
                  </Text>
                  <View style={{ backgroundColor: '#f0f0ff', borderRadius: 14, borderWidth: 1.5, borderColor: '#c7c7f5', overflow: 'hidden' }}>
                    {ALL_SERVICES.map((service, i) => (
                      <View key={service}>
                        {i > 0 && <View style={{ height: 1, backgroundColor: '#e0e0ff', marginHorizontal: 14 }} />}
                        <Pressable
                          onPress={() => setRewardService(service)}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12 }}
                        >
                          <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: rewardService === service ? '#3c3cb9' : '#c7c7f5', alignItems: 'center', justifyContent: 'center' }}>
                            {rewardService === service && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3c3cb9' }} />}
                          </View>
                          <Text style={{ flex: 1, fontSize: 14, fontWeight: rewardService === service ? '600' : '400', color: rewardService === service ? '#1A202C' : '#718096' }}>
                            {service}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={{ fontSize: 12, color: '#718096', marginBottom: 8 }}>
                    What % discount does the client receive as their reward?
                  </Text>
                  <PurpleInput
                    value={rewardDiscount}
                    onChangeText={setRewardDiscount}
                    placeholder="e.g. 50"
                    keyboardType="decimal-pad"
                    suffix="%"
                  />
                </View>
              )}
            </View>
          </View>

          {/* No-commission notice */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(56,161,105,0.08)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(56,161,105,0.2)' }}>
            <Info size={15} color="#276749" style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 12, color: '#276749', lineHeight: 18 }}>
              No commission is deducted on the appointment where a client redeems their stamp reward. You keep 100% of the loyalty.
            </Text>
          </View>

          {/* Activate button */}
          <Pressable
            onPress={handleActivate}
            disabled={isActive}
            style={{
              backgroundColor: isActive ? '#CBD5E0' : '#3c3cb9',
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              shadowColor: isActive ? 'transparent' : '#3c3cb9',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: isActive ? 0 : 4,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '800', color: isActive ? '#A0AEC0' : '#ffffff' }}>
              {isActive ? 'Stamp Card Active' : 'Activate Stamp Card'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
