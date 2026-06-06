import { Pressable, Text, ActivityIndicator } from 'react-native';

type Variant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  isDisabled?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, { container: string; text: string }> = {
  primary: { container: 'bg-primary', text: 'text-white' },
  secondary: { container: 'bg-primary-light', text: 'text-white' },
  outline: { container: 'border border-primary bg-transparent', text: 'text-primary-light' },
  danger: { container: 'bg-danger', text: 'text-white' },
  ghost: { container: 'bg-transparent', text: 'text-accent' },
};

const sizeStyles: Record<Size, { container: string; text: string }> = {
  sm: { container: 'px-4 py-2', text: 'text-sm' },
  md: { container: 'px-6 py-3', text: 'text-base' },
  lg: { container: 'px-8 py-4', text: 'text-lg' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isDisabled = false,
  fullWidth = false,
}: ButtonProps) {
  const { container, text } = variantStyles[variant];
  const { container: sizeContainer, text: sizeText } = sizeStyles[size];
  const isInactive = isLoading || isDisabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      className={`rounded-lg items-center justify-center flex-row gap-2 ${container} ${sizeContainer} ${fullWidth ? 'w-full' : ''} ${isInactive ? 'opacity-50' : 'active:opacity-80'}`}
    >
      {isLoading && <ActivityIndicator size="small" color="white" />}
      <Text className={`font-semibold ${text} ${sizeText}`}>{label}</Text>
    </Pressable>
  );
}
