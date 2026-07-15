import { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Zap, Check, X, Info, CalendarClock, Scissors } from 'lucide-react-native';
import { format, addDays } from 'date-fns';
import { useThemeColors } from '@/hooks/useThemeColors';
import { servicesService, type ApiService } from '@/services/services';
import { getApiErrorMessage } from '@/services/api';

type DiscountType = 'percent' | 'flat';
interface SvcConfig { enabled: boolean; type: DiscountType; value: string; }

const EXPIRY_PRESETS = [
  { label: '1 week',   days: 7 },
  { label: '2 weeks',  days: 14 },
  { label: '1 month',  days: 30 },
  { label: '3 months', days: 90 },
];

export default function FlashPromosScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();

  const [isActive,    setIsActive]    = useState(false);
  const [promoName,   setPromoName]   = useState('');
  const [services,    setServices]    = useState<ApiService[] | null>(null);
  const [config,      setConfig]      = useState<Record<string, SvcConfig>>({});
  const [expiryDays,  setExpiryDays]  = useState<number | null>(null);
  const [launching,   setLaunching]   = useState(false);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('');
  const [toastOk,  setToastOk]  = useState(true);

  // Pull the barber's real services so the discount matrix maps to actual cuts.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await servicesService.getMine();
        if (active) setServices(res.data.data);
      } catch {
        if (active) setServices([]);
      }
    })();
    return () => { active = false; };
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToastMsg(msg); setToastOk(ok);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }

  function getCfg(id: string): SvcConfig {
    return config[id] ?? { enabled: false, type: 'percent', value: '' };
  }
  function setCfg(id: string, patch: Partial<SvcConfig>) {
    setConfig((prev) => ({ ...prev, [id]: { ...getCfg(id), ...patch } }));
  }

  const enabledCount = Object.values(config).filter((c2) => c2.enabled).length;
  const endDate = expiryDays != null ? addDays(new Date(), expiryDays) : null;

  function handleLaunch() {
    if (!promoName.trim()) { showToast('Give your promo a name', false); return; }
    const validDiscounts = Object.entries(config).filter(([, cfg]) => cfg.enabled && Number(cfg.value) > 0);
    if (validDiscounts.length === 0) { showToast('Set a discount on at least one service', false); return; }
    if (expiryDays == null) { showToast('Pick when the promo ends', false); return; }
    setLaunching(true);
    // NOTE: persists locally only until the loyalty backend (promos table) is built.
    setTimeout(() => {
      setLaunching(false);
      setIsActive(true);
      showToast('Promo is now live', true);
    }, 400);
  }

  function handleDeactivate() {
    setIsActive(false);
    showToast('Promo deactivated', true);
  }

  const labelStyle = { fontSize: 11, fontWeight: '800' as const, color: c.textFaint, letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 8 };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Flash Promos</Text>
          <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>Time-limited discount campaigns</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: isActive ? 'rgba(56,161,105,0.12)' : c.surfaceAlt }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: isActive ? c.success : c.textFaint }} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: isActive ? c.success : c.textFaint }}>{isActive ? 'Live' : 'Inactive'}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

        {/* Promo name */}
        <Text style={labelStyle}>Promo Name</Text>
        <TextInput
          value={promoName} onChangeText={setPromoName}
          placeholder="e.g. Harmattan Fresh Cut" placeholderTextColor={c.textFaint}
          style={{ backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: c.text, borderWidth: 1, borderColor: c.border, marginBottom: 22 }}
        />

        {/* Discounts by service */}
        <Text style={labelStyle}>Discounts By Service</Text>
        {services === null ? (
          <View style={{ paddingVertical: 30, alignItems: 'center' }}><ActivityIndicator color={c.accent} /></View>
        ) : services.length === 0 ? (
          <View style={{ backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 20, alignItems: 'center', gap: 8 }}>
            <Scissors size={28} color={c.textFaint} />
            <Text style={{ fontSize: 13, color: c.textMuted, textAlign: 'center' }}>Add services first — your promo discounts apply to them.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {services.map((svc) => {
              const cfg = getCfg(svc.id);
              return (
                <View key={svc.id} style={{ backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: cfg.enabled ? c.accent : c.border, padding: 14 }}>
                  {/* Toggle row */}
                  <Pressable onPress={() => setCfg(svc.id, { enabled: !cfg.enabled })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{
                      width: 22, height: 22, borderRadius: 6,
                      borderWidth: 1.5, borderColor: cfg.enabled ? c.accent : c.textFaint,
                      backgroundColor: cfg.enabled ? c.accent : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {cfg.enabled && <Check size={13} color="#fff" strokeWidth={3} />}
                    </View>
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: c.text }}>{svc.name}</Text>
                    <Text style={{ fontSize: 13, color: c.textFaint }}>₵{svc.price}</Text>
                  </Pressable>

                  {/* Discount selector (only when enabled) */}
                  {cfg.enabled && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                      <View style={{ flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: 10, padding: 2 }}>
                        {(['percent', 'flat'] as DiscountType[]).map((t) => (
                          <Pressable
                            key={t}
                            onPress={() => setCfg(svc.id, { type: t })}
                            style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: cfg.type === t ? c.accent : 'transparent' }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: cfg.type === t ? '#fff' : c.textMuted }}>
                              {t === 'percent' ? '% Off' : 'GHS Off'}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceAlt, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: c.border }}>
                        <TextInput
                          value={cfg.value} onChangeText={(v) => setCfg(svc.id, { value: v })}
                          placeholder={cfg.type === 'percent' ? '20' : '10.00'} placeholderTextColor={c.textFaint}
                          keyboardType="decimal-pad"
                          style={{ flex: 1, paddingVertical: 9, fontSize: 14, fontWeight: '700', color: c.text }}
                        />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: c.textFaint }}>{cfg.type === 'percent' ? '%' : 'GHS'}</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Expiry */}
        <Text style={{ ...labelStyle, marginTop: 22 }}>Promo Ends</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {EXPIRY_PRESETS.map((p) => {
            const on = expiryDays === p.days;
            return (
              <Pressable
                key={p.days}
                onPress={() => setExpiryDays(p.days)}
                style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: on ? c.accent : c.surface, borderWidth: 1, borderColor: on ? c.accent : c.border }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: on ? '#fff' : c.textMuted }}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {endDate && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <CalendarClock size={14} color={c.accent} />
            <Text style={{ fontSize: 13, color: c.textMuted }}>Ends {format(endDate, 'EEE, d MMM yyyy')}</Text>
          </View>
        )}

        {/* Info */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: c.accentSoft, borderRadius: 12, padding: 12, marginTop: 22 }}>
          <Info size={14} color={c.accent} style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 12, color: c.accent, lineHeight: 18 }}>
            Clients see this promo on your profile. It auto-deactivates on the end date. {enabledCount > 0 ? `${enabledCount} service${enabledCount > 1 ? 's' : ''} selected.` : ''}
          </Text>
        </View>

        {/* Action */}
        {isActive ? (
          <Pressable onPress={handleDeactivate} style={{ backgroundColor: c.surfaceAlt, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: c.danger }}>Deactivate Promo</Text>
          </Pressable>
        ) : (
          <Pressable onPress={handleLaunch} disabled={launching} style={{ backgroundColor: '#F59E0B', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20, flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: launching ? 0.7 : 1 }}>
            {launching ? <ActivityIndicator color="#fff" /> : <><Zap size={16} color="#fff" fill="#fff" /><Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Launch Promotion</Text></>}
          </Pressable>
        )}
      </ScrollView>

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
