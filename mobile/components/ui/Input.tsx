import { View, Text, TextInput, Pressable } from 'react-native';
import type { TextInputProps } from 'react-native';
import { useState } from 'react';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  isRequired?: boolean;
  rightElement?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  isRequired = false,
  rightElement,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="gap-1">
      {label && (
        <Text className="text-sm font-medium text-neutral-700">
          {label}
          {isRequired && <Text className="text-danger"> *</Text>}
        </Text>
      )}
      <View
        className={`flex-row items-center rounded-lg border bg-white px-4 py-3 ${
          error
            ? 'border-danger'
            : isFocused
            ? 'border-accent'
            : 'border-neutral-200'
        }`}
      >
        <TextInput
          className="flex-1 text-sm text-neutral-800"
          placeholderTextColor="#A0AEC0"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {rightElement}
      </View>
      {error && <Text className="text-xs text-danger">{error}</Text>}
      {hint && !error && <Text className="text-xs text-neutral-500">{hint}</Text>}
    </View>
  );
}
