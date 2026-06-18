import { useState } from 'react';
import { View, Text, Pressable, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Sun, Moon, Smartphone } from 'lucide-react-native';

type ThemeMode = 'light' | 'dark' | 'system';

export default function AppearanceScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<ThemeMode>('light');

  // TODO: wire to global ThemeContext / zustand store and persist via AsyncStorage

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F6F8', paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f2f3' }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color="#4A5568" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#1A202C' }}>Appearance</Text>
      </View>

      <View style={{ padding: 16 }}>

        <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginLeft: 2 }}>
          Theme
        </Text>

        <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', shadowColor: '#1A202C', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
          {([
            { id: 'light',  label: 'Light',  subtitle: 'Classic bright interface',    icon: <Sun  size={18} color="#D69E2E" /> },
            { id: 'dark',   label: 'Dark',   subtitle: 'Easy on the eyes at night',   icon: <Moon size={18} color="#3c3cb9" /> },
            { id: 'system', label: 'System', subtitle: 'Match your device settings',  icon: <Smartphone size={18} color="#4A5568" /> },
          ] as { id: ThemeMode; label: string; subtitle: string; icon: React.ReactNode }[]).map(({ id, label, subtitle, icon }, i, arr) => (
            <View key={id}>
              {i > 0 && <View style={{ height: 1, backgroundColor: '#f1f2f3', marginHorizontal: 16 }} />}
              <Pressable
                onPress={() => setMode(id)}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 14 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
                  {icon}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#1A202C' }}>{label}</Text>
                  <Text style={{ fontSize: 12, color: '#A0AEC0', marginTop: 1 }}>{subtitle}</Text>
                </View>
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  borderWidth: 2,
                  borderColor: mode === id ? '#3c3cb9' : '#CBD5E0',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {mode === id && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#3c3cb9' }} />}
                </View>
              </Pressable>
            </View>
          ))}
        </View>

        <Text style={{ fontSize: 12, color: '#A0AEC0', textAlign: 'center', marginTop: 16, lineHeight: 18 }}>
          Dark mode coming soon — Trimova will automatically apply the theme to all screens.
        </Text>
      </View>
    </View>
  );
}
