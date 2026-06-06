import { useQuery } from '@tanstack/react-query';
import { barbersService } from '@/services/barbers';
import { useAuth } from './useAuth';

export function useOnboarding() {
  const { role } = useAuth();
  const isBarber = role === 'barber';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: () => barbersService.getOnboardingStatus(),
    enabled: isBarber,
    select: (res) => res.data.data,
  });

  return {
    status: data ?? null,
    isLoading,
    isComplete: data?.isComplete ?? false,
    refetch,
  };
}
