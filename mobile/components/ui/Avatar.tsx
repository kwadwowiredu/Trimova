import { View, Text, Image } from 'react-native';

interface AvatarProps {
  uri: string | null;
  name: string;
  size?: number;
}

export function Avatar({ uri, name, size = 44 }: AvatarProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const fontSize = Math.round(size * 0.38);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="bg-primary items-center justify-center"
    >
      <Text style={{ fontSize }} className="text-white font-bold">
        {initials}
      </Text>
    </View>
  );
}
