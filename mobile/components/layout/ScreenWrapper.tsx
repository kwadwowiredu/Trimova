import { ScrollView, View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native';

interface ScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  withKeyboardAvoid?: boolean;
  backgroundColor?: string;
}

export function ScreenWrapper({
  children,
  scrollable = true,
  withKeyboardAvoid = false,
  backgroundColor = 'bg-white',
}: ScreenWrapperProps) {
  const content = scrollable ? (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1">{children}</View>
  );

  if (withKeyboardAvoid) {
    return (
      <SafeAreaView className={`flex-1 ${backgroundColor}`}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {content}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${backgroundColor}`}>
      {content}
    </SafeAreaView>
  );
}
