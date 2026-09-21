import {
  CalendarPlus, CalendarClock, CheckCircle2, XCircle, Wallet, CreditCard,
  UserPlus, Bell,
} from 'lucide-react-native';
import type { NotificationIcon as IconName } from '@/utils/notificationDisplay';

const ICONS = {
  'calendar-plus': CalendarPlus,
  'calendar-clock': CalendarClock,
  'check-circle': CheckCircle2,
  'x-circle': XCircle,
  wallet: Wallet,
  'credit-card': CreditCard,
  'user-plus': UserPlus,
  bell: Bell,
} as const;

/**
 * Renders the icon a notification's type maps to. Kept separate from the
 * type→icon decision so both apps can share the mapping while styling the
 * result with their own colours.
 */
export function NotificationIcon({
  name,
  size = 18,
  color,
}: {
  name: IconName;
  size?: number;
  color: string;
}) {
  const Icon = ICONS[name];
  return <Icon size={size} color={color} />;
}
