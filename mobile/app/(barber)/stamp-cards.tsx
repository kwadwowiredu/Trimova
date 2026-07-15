import { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Gift, Check, X, Info, ChevronRight, ShieldCheck } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';

const MILESTONES = [5, 8, 10, 12];

type Restriction = 'all' | 'haircuts' | 'premium';
const RESTRICTIONS: { value: Restriction; label: string; desc: string }[] = [
  { value: 'all',      label: 'All Services',            desc: 'Every booking earns the client a stamp.' },
  { value: 'haircuts', label: 'Haircuts Only',           desc: 'Only haircut services count toward a stamp.' },
  { value: 'premium',  label: 'Premium Treatments Only', desc: 'Only your premium services earn a stamp.' },
];

type RewardType = 'percent' | 'flat' | 'custom';
const DEADLINES = ['Never', '3 Months', '6 Months', '1 Year'];

// Deterministic 4-digit validation code from the barber's id (stable per workspace).
function codeFromId(id?: string) {
  if (!id) return '0000';
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return String(h % 10000).padStart(4, '0');
}

export default function StampCardsScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { user } = useAuthStore();
  const validationCode = codeFromId(user?.id);

  const [isActive,    setIsActive]    = useState(false);
  const [milestone,   setMilestone]   = useState(10);
  const [restriction, setRestriction] = useState<Restriction>('all');
  const [rewardType,  setRewardType]  = useState<RewardType>('percent');
  const [rewardValue, setRewardValue] = useState('');
  const [rewardText,  setRewardText]  = useState('');
  const [deadline,    setDeadline]    = useState('Never');
  const [showDeadline, setShowDeadline] = useState(false);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('');
  const [toastOk,  setToastOk]  = useState(true);

  function showToast(msg: string, ok: boolean) {
    setToastMsg(msg); setToastOk(ok);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }

  function handleActivate() {
    if (rewardType === 'custom' ? !rewardText.trim() : !(Number(rewardValue) > 0)) {
      showToast('Set the reward clients will earn', false);
      return;
    }
    // NOTE: persists locally only until the loyalty backend (stamp_card_configs) is built.
    setIsActive(true);
    showToast('Stamp card is now active', true);
  }

  const label = { fontSize: 11, fontWeight: '800' as const, color: c.textFaint, letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 10 };
  const earned = Math.floor(milestone / 2);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Stamp Cards</Text>
          <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>Reward your loyal clients</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: isActive ? 'rgba(56,161,105,0.12)' : c.surfaceAlt }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: isActive ? c.success : c.textFaint }} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: isActive ? c.success : c.textFaint }}>{isActive ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 22 }}>

        {/* Preview */}
        <View style={{ backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 16 }}>
          <Text style={{ ...label, marginBottom: 12 }}>Client Preview</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
            {Array.from({ length: milestone }).map((_, i) => (
              <View key={i} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: i < earned ? c.accent : 'transparent', borderWidth: 2, borderColor: i < earned ? c.accent : c.border, alignItems: 'center', justifyContent: 'center' }}>
                {i < earned && <Check size={11} color="#fff" strokeWidth={3} />}
              </View>
            ))}
          </View>
        </View>

        {/* Milestone target */}
        <View>
          <Text style={label}>Stamps To Unlock Reward</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {MILESTONES.map((m) => {
              const on = milestone === m;
              return (
                <Pressable key={m} onPress={() => setMilestone(m)} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: on ? c.accent : c.surface, borderWidth: 1, borderColor: on ? c.accent : c.border }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: on ? '#fff' : c.text }}>{m}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Earning restrictions (radio cards — matches the inspo) */}
        <View>
          <Text style={label}>Which Services Earn Stamps</Text>
          <View style={{ gap: 10 }}>
            {RESTRICTIONS.map((r) => {
              const on = restriction === r.value;
              return (
                <Pressable
                  key={r.value}
                  onPress={() => setRestriction(r.value)}
                  style={{ flexDirection: 'row', gap: 12, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1.5, borderColor: on ? c.accent : c.border, padding: 16 }}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? c.accent : c.textFaint, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                    {on && <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: c.accent }} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>{r.label}</Text>
                    <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 3, lineHeight: 17 }}>{r.desc}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Reward matrix */}
        <View>
          <Text style={label}>Reward</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {([['percent', '% Off'], ['flat', 'GHS Off'], ['custom', 'Custom']] as [RewardType, string][]).map(([t, lbl]) => (
              <Pressable key={t} onPress={() => setRewardType(t)} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: rewardType === t ? c.accent : c.surface, borderWidth: 1, borderColor: rewardType === t ? c.accent : c.border }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: rewardType === t ? '#fff' : c.textMuted }}>{lbl}</Text>
              </Pressable>
            ))}
          </View>
          {rewardType === 'custom' ? (
            <TextInput
              value={rewardText} onChangeText={setRewardText}
              placeholder="e.g. Free drink & a fresh towel hot-shave" placeholderTextColor={c.textFaint}
              style={{ backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: c.text, borderWidth: 1, borderColor: c.border }}
            />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: c.border }}>
              <TextInput
                value={rewardValue} onChangeText={setRewardValue}
                placeholder={rewardType === 'percent' ? '50' : '20.00'} placeholderTextColor={c.textFaint}
                keyboardType="decimal-pad"
                style={{ flex: 1, paddingVertical: 13, fontSize: 14, fontWeight: '700', color: c.text }}
              />
              <Text style={{ fontSize: 14, fontWeight: '700', color: c.textFaint }}>{rewardType === 'percent' ? '%' : 'GHS'}</Text>
            </View>
          )}
        </View>

        {/* Stamp deadline */}
        <View>
          <Text style={label}>Stamp Deadline</Text>
          <Pressable onPress={() => setShowDeadline(true)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 15 }}>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: c.text }}>{deadline}</Text>
            <ChevronRight size={18} color={c.textFaint} />
          </Pressable>
        </View>

        {/* Validation code (anti-cheat) */}
        <View style={{ backgroundColor: c.accentSoft, borderRadius: 16, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ShieldCheck size={16} color={c.accent} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: c.accent }}>Your Validation Code</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
            {validationCode.split('').map((d, i) => (
              <View key={i} style={{ width: 46, height: 56, borderRadius: 12, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border }}>
                <Text style={{ fontSize: 26, fontWeight: '800', color: c.text }}>{d}</Text>
              </View>
            ))}
          </View>
          <Text style={{ fontSize: 12, color: c.accent, lineHeight: 18 }}>
            After an appointment, read this 4-digit code to your client. They enter it in their app to unlock the stamp — proving the visit really happened.
          </Text>
        </View>

        {/* Note */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Info size={14} color={c.textFaint} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, fontSize: 12, color: c.textMuted, lineHeight: 18 }}>
            No commission is deducted when a client redeems their stamp reward — you keep 100%.
          </Text>
        </View>

        {/* Action */}
        {isActive ? (
          <Pressable onPress={() => { setIsActive(false); showToast('Stamp card deactivated', true); }} style={{ backgroundColor: c.surfaceAlt, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: c.danger }}>Deactivate Stamp Card</Text>
          </Pressable>
        ) : (
          <Pressable onPress={handleActivate} style={{ backgroundColor: c.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            <Gift size={16} color="#fff" />
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Activate Stamp Card</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Deadline picker */}
      <Modal visible={showDeadline} transparent animationType="slide" onRequestClose={() => setShowDeadline(false)}>
        <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={() => setShowDeadline(false)} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 8 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginTop: 10, marginBottom: 4 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Stamp Deadline</Text>
            <Pressable onPress={() => setShowDeadline(false)} hitSlop={10}><X size={22} color={c.textMuted} /></Pressable>
          </View>
          {DEADLINES.map((d, i) => {
            const on = deadline === d;
            return (
              <Pressable key={d} onPress={() => { setDeadline(d); setShowDeadline(false); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: c.border, backgroundColor: on ? c.accentSoft : 'transparent' }}>
                <Text style={{ fontSize: 15, fontWeight: on ? '700' : '500', color: on ? c.accent : c.text }}>{d}</Text>
                {on && <Check size={18} color={c.accent} />}
              </Pressable>
            );
          })}
        </View>
      </Modal>

      {/* Toast */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', top: insets.top + 70, left: 20, right: 20,
          backgroundColor: toastOk ? c.success : c.danger, borderRadius: 14,
          paddingVertical: 14, paddingHorizontal: 18,
          flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 999,
          opacity: toastAnim,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
        }}
      >
        {toastOk ? <Check size={18} color="#fff" /> : <X size={18} color="#fff" />}
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, flex: 1 }}>{toastMsg}</Text>
      </Animated.View>
    </View>
  );
}
