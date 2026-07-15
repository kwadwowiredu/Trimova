import { useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Sun, Moon, Smartphone, Check } from 'lucide-react-native';
import { useThemeStore, type ThemeMode } from '@/stores/themeStore';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function AppearanceScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { mode, setMode } = useThemeStore();
  const toastAnim = useRef(new Animated.Value(0)).current;

  function handleSelect(id: ThemeMode) {
    setMode(id);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Appearance</Text>
          <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>Choose your display theme</Text>
        </View>
      </View>

      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginLeft: 2 }}>
          Theme
        </Text>

        <View style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
          {([
            { id: 'light',  label: 'Light',  subtitle: 'Classic bright interface',   icon: <Sun  size={18} color="#D69E2E" /> },
            { id: 'dark',   label: 'Dark',   subtitle: 'Easy on the eyes at night',  icon: <Moon size={18} color={c.accent} /> },
            { id: 'system', label: 'System', subtitle: 'Match your device settings', icon: <Smartphone size={18} color={c.textMuted} /> },
          ] as { id: ThemeMode; label: string; subtitle: string; icon: React.ReactNode }[]).map(({ id, label, subtitle, icon }, i) => (
            <View key={id}>
              {i > 0 && <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 16 }} />}
              <Pressable
                onPress={() => handleSelect(id)}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 14 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  {icon}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>{label}</Text>
                  <Text style={{ fontSize: 12, color: c.textFaint, marginTop: 1 }}>{subtitle}</Text>
                </View>
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  borderWidth: 2,
                  borderColor: mode === id ? c.accent : c.border,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {mode === id && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent }} />}
                </View>
              </Pressable>
            </View>
          ))}
        </View>

        <Text style={{ fontSize: 12, color: c.textFaint, textAlign: 'center', marginTop: 16, lineHeight: 18 }}>
          Your theme preference is saved automatically.
        </Text>
      </View>

      {/* Toast */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', top: insets.top + 70, left: 20, right: 20,
          backgroundColor: c.success, borderRadius: 14,
          paddingVertical: 14, paddingHorizontal: 18,
          flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 999,
          opacity: toastAnim,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
        }}
      >
        <Check size={18} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Theme updated</Text>
      </Animated.View>
    </View>
  );
}
