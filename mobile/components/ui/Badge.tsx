import { View, Text } from 'react-native';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { container: string; text: string }> = {
  success: { container: 'bg-green-100', text: 'text-success' },
  warning: { container: 'bg-yellow-100', text: 'text-warning' },
  danger: { container: 'bg-red-100', text: 'text-danger' },
  info: { container: 'bg-accent-light', text: 'text-accent' },
  neutral: { container: 'bg-neutral-100', text: 'text-neutral-600' },
};

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const { container, text } = variantStyles[variant];
  return (
    <View className={`rounded-full px-3 py-1 self-start ${container}`}>
      <Text className={`text-xs font-medium ${text}`}>{label}</Text>
    </View>
  );
}
