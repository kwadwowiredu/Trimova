import { useState } from 'react';
import { View, Text, Pressable, Switch, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Bell, Calendar, Star, Megaphone, DollarSign } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

interface NotifSetting {
  id: string;
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  enabled: boolean;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();

  const [settings, setSettings] = useState<NotifSetting[]>([
    { id: 'new_booking',   icon: <Calendar  size={17} color="#3c3cb9" />, label: 'New Bookings',         subtitle: 'When a client books an appointment',         enabled: true  },
    { id: 'cancellation',  icon: <Calendar  size={17} color="#E53E3E" />, label: 'Cancellations',        subtitle: 'When a booking is cancelled',                enabled: true  },
    { id: 'review',        icon: <Star      size={17} color="#D69E2E" />, label: 'New Reviews',          subtitle: 'When a client leaves a rating or review',    enabled: true  },
    { id: 'promo',         icon: <Megaphone size={17} color="#9333EA" />, label: 'Loyalty & Promos',     subtitle: 'Stamp card completions and promo activity',  enabled: false },
    { id: 'payout',        icon: <DollarSign size={17} color="#38A169" />,label: 'Payout Alerts',        subtitle: 'When a payout is processed to your account', enabled: true  },
  ]);

  const allEnabled = settings.every((s) => s.enabled);

  function toggle(id: string, val: boolean) {
    setSettings((prev) => prev.map((s) => s.id === id ? { ...s, enabled: val } : s));
    // TODO: PATCH /api/barber/notification-settings
  }

  function toggleAll(val: boolean) {
    setSettings((prev) => prev.map((s) => ({ ...s, enabled: val })));
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>

      <View style={{ backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Push Notifications</Text>
          <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>Manage notification preferences</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

        {/* Master toggle */}
        <View style={{ backgroundColor: c.accent, borderRadius: 20, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={20} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>All Notifications</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 }}>{allEnabled ? 'All categories enabled' : 'Some categories disabled'}</Text>
          </View>
          <Switch
            value={allEnabled}
            onValueChange={toggleAll}
            trackColor={{ false: 'rgba(255,255,255,0.3)', true: '#38A169' }}
            thumbColor="#ffffff"
            ios_backgroundColor="rgba(255,255,255,0.3)"
          />
        </View>

        {/* Per-category toggles */}
        <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginLeft: 2 }}>
          Categories
        </Text>
        <View style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
          {settings.map((s, i) => (
            <View key={s.id}>
              {i > 0 && <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 16 }} />}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  {s.icon}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{s.label}</Text>
                  <Text style={{ fontSize: 12, color: c.textFaint, marginTop: 1 }}>{s.subtitle}</Text>
                </View>
                <Switch
                  value={s.enabled}
                  onValueChange={(val) => toggle(s.id, val)}
                  trackColor={{ false: c.border, true: c.accent }}
                  thumbColor="#ffffff"
                  ios_backgroundColor={c.border}
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
