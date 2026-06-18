import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Zap,
  CheckSquare,
  Square,
  Info,
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

type DiscountType = 'percent' | 'flat';

// ─── Shared primitives ────────────────────────────────────────────────────────

function Label({ children }: { children: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400e', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
      {children}
    </Text>
  );
}

function AmberInput({
  value, onChangeText, placeholder, keyboardType = 'default', suffix,
}: {
  value: string; onChangeText: (t: string) => void; placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad'; suffix?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1.5, borderColor: '#fcd34d' }}>
      <TextInput
        value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor="#d97706" keyboardType={keyboardType}
        style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#1A202C', paddingVertical: 0 }}
      />
      {suffix && <Text style={{ fontSize: 14, fontWeight: '700', color: '#d97706', marginLeft: 4 }}>{suffix}</Text>}
    </View>
  );
}

function SegmentedControl({
  options, labels, value, onChange,
}: { options: DiscountType[]; labels: string[]; value: DiscountType; onChange: (v: DiscountType) => void; }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {options.map((opt, i) => (
        <Pressable
          key={opt}
          onPress={() => onChange(opt)}
          style={{
            flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center',
            backgroundColor: value === opt ? '#F59E0B' : '#fef3c7',
            borderWidth: 1.5, borderColor: value === opt ? '#F59E0B' : '#fde68a',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: value === opt ? '#ffffff' : '#92400e' }}>
            {labels[i]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FlashPromosScreen() {
  const insets = useSafeAreaInsets();

  const [isActive,       setIsActive]       = useState(false);
  const [promoName,      setPromoName]      = useState('');
  const [discountType,   setDiscountType]   = useState<DiscountType>('percent');
  const [discountAmount, setDiscountAmount] = useState('');
  const [promoServices,  setPromoServices]  = useState<string[]>([]);
  const [promoEndDate,   setPromoEndDate]   = useState('');

  const allSelected = promoServices.length === ALL_SERVICES.length;

  function toggleService(service: string) {
    setPromoServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service],
    );
  }

  function toggleSelectAll() {
    setPromoServices(allSelected ? [] : [...ALL_SERVICES]);
  }

  function handleLaunch() {
    setIsActive(true);
    // TODO: POST /api/barbers/me/promos
  }

  function handleDeactivate() {
    setIsActive(false);
    // TODO: DELETE /api/barbers/me/promos/active
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fffbeb', paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: '#F59E0B', paddingBottom: 18, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.1)', top: -60, right: -40 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={20} color="#ffffff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#ffffff' }}>Flash Promos</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 }}>Time-limited discount campaigns</Text>
          </View>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} color="#ffffff" fill="#ffffff" />
          </View>
        </View>

        {/* Active / Inactive status button */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Pressable
            onPress={isActive ? handleDeactivate : () => {}}
            style={{
              backgroundColor: isActive ? '#38A169' : 'rgba(255,255,255,0.3)',
              borderRadius: 24,
              paddingVertical: 10,
              paddingHorizontal: 20,
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)' }} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: isActive ? '#ffffff' : 'rgba(255,255,255,0.6)' }}>
              {isActive ? 'Active — Tap to Deactivate' : 'Inactive'}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      >

        {/* Config card */}
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          borderWidth: 1.5,
          borderColor: '#fde68a',
          shadowColor: '#92400e',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07,
          shadowRadius: 8,
          elevation: 3,
          padding: 20,
          gap: 20,
        }}>

          {/* Promo name */}
          <View>
            <Label>Promo Name</Label>
            <AmberInput value={promoName} onChangeText={setPromoName} placeholder="e.g. Christmas Special" />
          </View>

          {/* Discount type + amount */}
          <View>
            <Label>Discount Type</Label>
            <SegmentedControl
              options={['percent', 'flat']}
              labels={['% Off', 'GHS Off']}
              value={discountType}
              onChange={setDiscountType}
            />
            <View style={{ marginTop: 10 }}>
              <AmberInput
                value={discountAmount}
                onChangeText={setDiscountAmount}
                placeholder={discountType === 'percent' ? 'e.g. 20' : 'e.g. 10.00'}
                keyboardType="decimal-pad"
                suffix={discountType === 'percent' ? '%' : 'GHS'}
              />
            </View>
          </View>

          {/* Services */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Label>Applies To</Label>
              <Pressable onPress={toggleSelectAll} hitSlop={8}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#F59E0B' }}>
                  {allSelected ? 'Deselect All' : 'Select All'}
                </Text>
              </Pressable>
            </View>
            <View style={{ backgroundColor: '#fffbeb', borderRadius: 14, borderWidth: 1.5, borderColor: '#fde68a', overflow: 'hidden' }}>
              {ALL_SERVICES.map((service, i) => {
                const selected = promoServices.includes(service);
                return (
                  <View key={service}>
                    {i > 0 && <View style={{ height: 1, backgroundColor: '#fef3c7', marginHorizontal: 14 }} />}
                    <Pressable
                      onPress={() => toggleService(service)}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12 }}
                      className="active:opacity-70"
                    >
                      {selected
                        ? <CheckSquare size={18} color="#F59E0B" />
                        : <Square size={18} color="#fcd34d" />}
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: selected ? '600' : '400', color: selected ? '#1A202C' : '#92400e' }}>
                        {service}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>

          {/* End date */}
          <View>
            <Label>Promo Ends</Label>
            <AmberInput value={promoEndDate} onChangeText={setPromoEndDate} placeholder="e.g. 31 Dec 2026" />
          </View>

          {/* Info */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#fef3c7', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#fde68a' }}>
            <Info size={15} color="#d97706" style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 12, color: '#92400e', lineHeight: 18 }}>
              This promo will be visible to clients browsing your profile. It auto-deactivates on the end date.
            </Text>
          </View>

          {/* Launch button */}
          <Pressable
            onPress={handleLaunch}
            disabled={isActive}
            style={{
              backgroundColor: isActive ? '#CBD5E0' : '#F59E0B',
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              shadowColor: isActive ? 'transparent' : '#d97706',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: isActive ? 0 : 4,
            }}
            className="active:opacity-80"
          >
            <Text style={{ fontSize: 15, fontWeight: '800', color: isActive ? '#A0AEC0' : '#ffffff' }}>
              {isActive ? 'Promo Active' : 'Launch Promo Now'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
