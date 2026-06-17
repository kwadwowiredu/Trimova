import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Zap,
  Gift,
  CheckSquare,
  Square,
  Plus,
  Minus,
  Info,
} from 'lucide-react-native';

// ─── Mock services (replace with barber's actual service list from API) ────────

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
type RewardType   = 'free_service' | 'discount';

// ─── Shared field helpers ─────────────────────────────────────────────────────

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="text-[11px] font-bold text-neutral-400 tracking-wider uppercase mb-1.5">
      {children}
    </Text>
  );
}

function StyledInput({
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  suffix,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  suffix?: string;
}) {
  return (
    <View
      className="flex-row items-center bg-neutral-50 rounded-xl px-3 py-3"
      style={{ borderWidth: 1, borderColor: '#E2E8F0' }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A0AEC0"
        keyboardType={keyboardType}
        className="flex-1 text-sm font-semibold text-neutral-800"
        style={{ paddingVertical: 0 }}
      />
      {suffix && (
        <Text className="text-sm font-semibold text-neutral-400 ml-1">{suffix}</Text>
      )}
    </View>
  );
}

function InfoBanner({
  children,
  variant = 'accent',
}: {
  children: string;
  variant?: 'accent' | 'success';
}) {
  const bg     = variant === 'success' ? 'rgba(56,161,105,0.08)' : 'rgba(60,60,185,0.07)';
  const border = variant === 'success' ? 'rgba(56,161,105,0.2)'  : 'transparent';
  const color  = variant === 'success' ? '#276749' : '#3c3cb9';

  return (
    <View
      className="flex-row items-start gap-2.5 rounded-xl p-3.5"
      style={{ backgroundColor: bg, borderWidth: 1, borderColor: border }}
    >
      <Info size={15} color={color} style={{ marginTop: 1 }} />
      <Text
        className="flex-1 text-xs leading-[18px]"
        style={{ color }}
      >
        {children}
      </Text>
    </View>
  );
}

// ─── Segmented control (2-option tab bar) ─────────────────────────────────────

function SegmentedControl<T extends string>({
  options,
  labels,
  value,
  onChange,
}: {
  options: T[];
  labels: string[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row gap-2">
      {options.map((opt, i) => (
        <Pressable
          key={opt}
          onPress={() => onChange(opt)}
          className={`flex-1 py-2.5 rounded-xl items-center ${
            value === opt ? 'bg-accent' : 'bg-neutral-100'
          }`}
        >
          <Text
            className={`text-sm font-bold ${
              value === opt ? 'text-white' : 'text-neutral-500'
            }`}
          >
            {labels[i]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Service checkbox list ─────────────────────────────────────────────────────

function ServiceCheckList({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (service: string) => void;
}) {
  return (
    <View
      className="bg-neutral-50 rounded-xl overflow-hidden"
      style={{ borderWidth: 1, borderColor: '#E2E8F0' }}
    >
      {ALL_SERVICES.map((service, i) => {
        const isSelected = selected.includes(service);
        return (
          <View key={service}>
            {i > 0 && <View className="h-px bg-neutral-100 mx-4" />}
            <Pressable
              onPress={() => onToggle(service)}
              className="flex-row items-center px-4 py-3 gap-3 active:bg-neutral-100"
            >
              {isSelected ? (
                <CheckSquare size={18} color="#3c3cb9" />
              ) : (
                <Square size={18} color="#CBD5E0" />
              )}
              <Text
                className={`flex-1 text-sm ${
                  isSelected ? 'font-semibold text-neutral-800' : 'text-neutral-500'
                }`}
              >
                {service}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

// ─── Radio list (single-select) ────────────────────────────────────────────────

function RadioList({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (service: string) => void;
}) {
  return (
    <View
      className="bg-neutral-50 rounded-xl overflow-hidden"
      style={{ borderWidth: 1, borderColor: '#E2E8F0' }}
    >
      {ALL_SERVICES.map((service, i) => {
        const isSelected = selected === service;
        return (
          <View key={service}>
            {i > 0 && <View className="h-px bg-neutral-100 mx-4" />}
            <Pressable
              onPress={() => onSelect(service)}
              className="flex-row items-center px-4 py-3 gap-3 active:bg-neutral-100"
            >
              {/* Radio indicator */}
              <View
                style={{
                  width:        18,
                  height:       18,
                  borderRadius: 9,
                  borderWidth:  2,
                  borderColor:  isSelected ? '#3c3cb9' : '#CBD5E0',
                  alignItems:   'center',
                  justifyContent: 'center',
                }}
              >
                {isSelected && (
                  <View
                    style={{
                      width:           8,
                      height:          8,
                      borderRadius:    4,
                      backgroundColor: '#3c3cb9',
                    }}
                  />
                )}
              </View>
              <Text
                className={`flex-1 text-sm ${
                  isSelected ? 'font-semibold text-neutral-800' : 'text-neutral-500'
                }`}
              >
                {service}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

// ─── Card shell ────────────────────────────────────────────────────────────────

const CARD_STYLE = {
  backgroundColor: '#ffffff',
  borderRadius:    16,
  borderWidth:     1,
  borderColor:     '#E2E8F0',
  shadowColor:     '#1A202C',
  shadowOffset:    { width: 0, height: 1 } as const,
  shadowOpacity:   0.06,
  shadowRadius:    4,
  elevation:       2,
  overflow:        'hidden' as const,
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LoyaltyProgramsScreen() {
  const insets = useSafeAreaInsets();

  // ── Flash Promos state ─────────────────────────────────────────────────────
  const [flashEnabled,    setFlashEnabled]    = useState(false);
  const [promoName,       setPromoName]       = useState('');
  const [discountType,    setDiscountType]    = useState<DiscountType>('percent');
  const [discountAmount,  setDiscountAmount]  = useState('');
  const [promoServices,   setPromoServices]   = useState<string[]>([]);
  const [promoEndDate,    setPromoEndDate]    = useState('');

  // ── Stamp Cards state ──────────────────────────────────────────────────────
  const [stampEnabled,    setStampEnabled]    = useState(false);
  const [stampsRequired,  setStampsRequired]  = useState(5);
  const [stampServices,   setStampServices]   = useState<string[]>(ALL_SERVICES.slice(0, 3));
  const [rewardType,      setRewardType]      = useState<RewardType>('free_service');
  const [rewardService,   setRewardService]   = useState(ALL_SERVICES[0]);
  const [rewardDiscount,  setRewardDiscount]  = useState('');

  // ── Flash Promos helpers ───────────────────────────────────────────────────
  const allPromoSelected = promoServices.length === ALL_SERVICES.length;

  function togglePromoService(service: string) {
    setPromoServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service],
    );
  }

  function toggleSelectAll() {
    setPromoServices(allPromoSelected ? [] : [...ALL_SERVICES]);
  }

  // ── Stamp Cards helpers ────────────────────────────────────────────────────
  function adjustStamps(delta: number) {
    setStampsRequired((prev) => Math.min(20, Math.max(2, prev + delta)));
  }

  function toggleStampService(service: string) {
    setStampServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service],
    );
  }

  // ── Save handlers (TODO: replace with API mutations) ──────────────────────
  function saveFlashPromo() {
    // TODO: POST /api/barbers/me/promos
    //       { promoName, discountType, discountAmount, promoServices, promoEndDate }
  }

  function saveStampCard() {
    // TODO: POST /api/barbers/me/stamp-cards
    //       { stampsRequired, stampServices, rewardType, rewardService, rewardDiscount }
  }

  return (
    <View className="flex-1 bg-neutral-50" style={{ paddingTop: insets.top }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <View className="flex-row items-center gap-3 px-4 py-3 bg-white border-b border-neutral-100">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-neutral-100 items-center justify-center active:opacity-70"
        >
          <ChevronLeft size={20} color="#4A5568" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-[17px] font-bold text-neutral-800">Loyalty Programs</Text>
          <Text className="text-xs text-neutral-500">Drive retention & fill empty slots</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
      >

        {/* ── Flash Promos ──────────────────────────────────────── */}
        <View className="mb-5">
          <Text className="text-[11px] font-bold text-neutral-400 tracking-widest uppercase mb-2 ml-1">
            Flash Promos
          </Text>

          <View style={CARD_STYLE}>

            {/* Toggle header row */}
            <View className="flex-row items-center px-4 py-4 gap-3">
              <View
                className="w-9 h-9 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: flashEnabled ? 'rgba(60,60,185,0.1)' : '#F7FAFC',
                }}
              >
                <Zap
                  size={18}
                  color={flashEnabled ? '#3c3cb9' : '#A0AEC0'}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-neutral-800">Flash Promos</Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  Time-limited discounts to fill empty slots fast
                </Text>
              </View>
              <Switch
                value={flashEnabled}
                onValueChange={setFlashEnabled}
                trackColor={{ false: '#CBD5E0', true: '#38A169' }}
                thumbColor="#ffffff"
                ios_backgroundColor="#CBD5E0"
              />
            </View>

            {/* Expanded config — visible when enabled */}
            {flashEnabled && (
              <>
                <View className="h-px bg-neutral-100 mx-4" />

                <View className="px-4 pt-4 pb-5 gap-4">

                  {/* Promo name */}
                  <View>
                    <FieldLabel>Promo Name</FieldLabel>
                    <StyledInput
                      value={promoName}
                      onChangeText={setPromoName}
                      placeholder="e.g. Christmas Special"
                    />
                  </View>

                  {/* Discount type + amount */}
                  <View>
                    <FieldLabel>Discount</FieldLabel>
                    <SegmentedControl
                      options={['percent', 'flat'] as DiscountType[]}
                      labels={['% Off', 'GHS Off']}
                      value={discountType}
                      onChange={setDiscountType}
                    />
                    <View className="mt-2">
                      <StyledInput
                        value={discountAmount}
                        onChangeText={setDiscountAmount}
                        placeholder={discountType === 'percent' ? 'e.g. 20' : 'e.g. 10.00'}
                        keyboardType="decimal-pad"
                        suffix={discountType === 'percent' ? '%' : 'GHS'}
                      />
                    </View>
                  </View>

                  {/* Applicable services */}
                  <View>
                    <View className="flex-row items-center justify-between mb-1.5">
                      <FieldLabel>Applies To</FieldLabel>
                      <Pressable onPress={toggleSelectAll} hitSlop={8}>
                        <Text className="text-xs font-bold text-accent">
                          {allPromoSelected ? 'Deselect All' : 'Select All'}
                        </Text>
                      </Pressable>
                    </View>
                    <ServiceCheckList
                      selected={promoServices}
                      onToggle={togglePromoService}
                    />
                  </View>

                  {/* End date */}
                  <View>
                    <FieldLabel>Promo Ends</FieldLabel>
                    <StyledInput
                      value={promoEndDate}
                      onChangeText={setPromoEndDate}
                      placeholder="e.g. 31 Dec 2026"
                    />
                  </View>

                  <InfoBanner>
                    Clients browsing your profile will see this promo. It automatically
                    deactivates on the end date — no action needed.
                  </InfoBanner>

                  {/* Launch button */}
                  <Pressable
                    onPress={saveFlashPromo}
                    className="bg-accent rounded-xl py-4 items-center active:opacity-80"
                  >
                    <Text className="text-white font-bold text-base">Launch Promo</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── Stamp Cards ───────────────────────────────────────── */}
        <View>
          <Text className="text-[11px] font-bold text-neutral-400 tracking-widest uppercase mb-2 ml-1">
            Stamp Cards
          </Text>

          <View style={CARD_STYLE}>

            {/* Toggle header row */}
            <View className="flex-row items-center px-4 py-4 gap-3">
              <View
                className="w-9 h-9 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: stampEnabled ? 'rgba(60,60,185,0.1)' : '#F7FAFC',
                }}
              >
                <Gift size={18} color={stampEnabled ? '#3c3cb9' : '#A0AEC0'} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-neutral-800">Stamp Cards</Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  Reward clients who keep booking through the app
                </Text>
              </View>
              <Switch
                value={stampEnabled}
                onValueChange={setStampEnabled}
                trackColor={{ false: '#CBD5E0', true: '#38A169' }}
                thumbColor="#ffffff"
                ios_backgroundColor="#CBD5E0"
              />
            </View>

            {/* Expanded config */}
            {stampEnabled && (
              <>
                <View className="h-px bg-neutral-100 mx-4" />

                <View className="px-4 pt-4 pb-5 gap-5">

                  {/* Visual stamp card preview */}
                  <View
                    className="rounded-2xl p-4"
                    style={{
                      backgroundColor: 'rgba(60,60,185,0.05)',
                      borderWidth:      1,
                      borderColor:      'rgba(60,60,185,0.12)',
                    }}
                  >
                    <Text className="text-[10px] font-bold text-accent tracking-widest uppercase mb-3">
                      Client Preview
                    </Text>
                    {/* Stamp grid — demo shows half filled */}
                    <View className="flex-row flex-wrap gap-2">
                      {Array.from({ length: stampsRequired }).map((_, i) => {
                        const earned = i < Math.floor(stampsRequired / 2);
                        return (
                          <View
                            key={i}
                            style={{
                              width:           30,
                              height:          30,
                              borderRadius:    15,
                              backgroundColor: earned ? '#3c3cb9' : 'transparent',
                              borderWidth:     2,
                              borderColor:     earned ? '#3c3cb9' : '#C7C7F5',
                              alignItems:      'center',
                              justifyContent:  'center',
                            }}
                          >
                            {earned && (
                              <Text
                                style={{
                                  color:      '#ffffff',
                                  fontSize:   11,
                                  fontWeight: '800',
                                }}
                              >
                                ✓
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                    <Text className="text-xs text-neutral-500 mt-2">
                      Collect {stampsRequired} stamps to unlock the reward
                    </Text>
                  </View>

                  {/* Stamps required stepper */}
                  <View>
                    <FieldLabel>Stamps Required to Unlock Reward</FieldLabel>
                    <View className="flex-row items-center gap-4">
                      <Pressable
                        onPress={() => adjustStamps(-1)}
                        disabled={stampsRequired <= 2}
                        className="w-11 h-11 rounded-xl bg-neutral-100 items-center justify-center active:opacity-70"
                        style={{ opacity: stampsRequired <= 2 ? 0.4 : 1 }}
                      >
                        <Minus size={18} color="#4A5568" />
                      </Pressable>

                      <View className="flex-1 items-center">
                        <Text className="text-3xl font-bold text-neutral-800">
                          {stampsRequired}
                        </Text>
                        <Text className="text-xs text-neutral-400 mt-0.5">stamps</Text>
                      </View>

                      <Pressable
                        onPress={() => adjustStamps(1)}
                        disabled={stampsRequired >= 20}
                        className="w-11 h-11 rounded-xl bg-neutral-100 items-center justify-center active:opacity-70"
                        style={{ opacity: stampsRequired >= 20 ? 0.4 : 1 }}
                      >
                        <Plus size={18} color="#4A5568" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Services that earn stamps */}
                  <View>
                    <FieldLabel>Services That Earn Stamps</FieldLabel>
                    <Text className="text-xs text-neutral-500 mb-2">
                      A client only gets a stamp when they book a checked service.
                    </Text>
                    <ServiceCheckList
                      selected={stampServices}
                      onToggle={toggleStampService}
                    />
                  </View>

                  {/* Reward type */}
                  <View>
                    <FieldLabel>Reward Type</FieldLabel>
                    <SegmentedControl
                      options={['free_service', 'discount'] as RewardType[]}
                      labels={['Free Service', 'Discount %']}
                      value={rewardType}
                      onChange={setRewardType}
                    />

                    <View className="mt-3">
                      {rewardType === 'free_service' ? (
                        <>
                          <Text className="text-xs text-neutral-500 mb-2">
                            Which service is the free reward? Clients won't be able to
                            redeem for any service not listed here.
                          </Text>
                          <RadioList
                            selected={rewardService}
                            onSelect={setRewardService}
                          />
                        </>
                      ) : (
                        <>
                          <Text className="text-xs text-neutral-500 mb-2">
                            What % discount does the client receive on their reward
                            appointment?
                          </Text>
                          <StyledInput
                            value={rewardDiscount}
                            onChangeText={setRewardDiscount}
                            placeholder="e.g. 50"
                            keyboardType="decimal-pad"
                            suffix="%"
                          />
                        </>
                      )}
                    </View>
                  </View>

                  {/* No-commission notice */}
                  <InfoBanner variant="success">
                    No commission is deducted on the appointment where a client redeems
                    their stamp reward. This is your gift to your loyal clients — Trimova
                    won't take a cut.
                  </InfoBanner>

                  {/* Activate button */}
                  <Pressable
                    onPress={saveStampCard}
                    className="rounded-xl py-4 items-center active:opacity-80"
                    style={{ backgroundColor: '#38A169' }}
                  >
                    <Text className="text-white font-bold text-base">
                      Activate Stamp Card
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
