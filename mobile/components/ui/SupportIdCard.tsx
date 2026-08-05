import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Check, Copy, LifeBuoy } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { tapLight } from '@/utils/haptics';

/**
 * Shows the account's Support ID so a user can quote it when contacting help.
 *
 * The full value is the user's UUID — too long to read out, so it's displayed
 * shortened and the copy button puts the complete id on the clipboard.
 *
 * Colours are passed in because this is used by both the client system (which
 * uses the fixed clientTheme tokens) and the barber/staff systems (which use
 * the theme-aware useThemeColors hook).
 */
export function SupportIdCard({
  surface, border, text, muted, accent, wash,
}: {
  surface: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  wash: string;
}) {
  const userId = useAuthStore((s) => s.user?.id);
  const [copied, setCopied] = useState(false);

  if (!userId) return null;

  // e.g. "8f42c1a9…b7e3" — recognisable without being unreadable.
  const short = `${userId.slice(0, 8)}…${userId.slice(-4)}`;

  async function copy() {
    tapLight();
    await Clipboard.setStringAsync(userId!);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View style={{ backgroundColor: surface, borderRadius: 18, borderWidth: 1, borderColor: border, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: wash, alignItems: 'center', justifyContent: 'center' }}>
          <LifeBuoy size={17} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14.5, fontWeight: '700', color: text }}>Support ID</Text>
          <Text style={{ fontSize: 12, color: muted, marginTop: 1 }}>Quote this when you contact support</Text>
        </View>
      </View>

      <Pressable
        onPress={copy}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: wash, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
        }}
      >
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: text, letterSpacing: 0.5 }}>
          {short}
        </Text>
        {copied ? (
          <>
            <Check size={15} color={accent} strokeWidth={3} />
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: accent }}>Copied</Text>
          </>
        ) : (
          <>
            <Copy size={15} color={accent} />
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: accent }}>Copy</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
