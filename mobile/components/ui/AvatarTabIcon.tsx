import { View, Image } from 'react-native';
import { User } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';

/**
 * Profile tab icon: the user's own photo (with an active-tint ring when
 * focused), falling back to the generic person icon when no photo is set.
 */
export function AvatarTabIcon({ color, size, focused }: { color: string; size: number; focused?: boolean }) {
  const avatarUrl = useAuthStore((s) => s.user?.avatarUrl);
  if (!avatarUrl) return <User size={size} color={color} />;

  const d = size + 4;
  return (
    <View
      style={{
        width: d, height: d, borderRadius: d / 2,
        borderWidth: 2, borderColor: focused ? color : 'transparent',
        overflow: 'hidden',
      }}
    >
      <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
    </View>
  );
}
