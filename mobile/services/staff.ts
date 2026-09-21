import { api } from './api';
import type { ApiResponse, AuthResponse } from '@/types/api';

export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface StaffInvite {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: InviteStatus;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface InviteLookup {
  fullName: string;
  email: string;
  shopName: string;
  expiresAt: string;
}

/**
 * A team member as their shop owner sees them — contact details and this
 * month's numbers, all derived from real appointments.
 */
export interface StaffMember {
  id: string;
  name: string;
  role: string;
  rating: number;
  reviewCount: number;
  avatarUrl: string | null;
  isActive: boolean;
  /** Completed appointments, all time. */
  totalAppointments: number;
  /** GHS taken this calendar month. */
  revenueThisMonth: number;
  phoneNumber: string;
  email: string;
  joinedDate: string;
}

export const staffService = {
  /** The shop's own team. */
  getRoster: () => api.get<ApiResponse<StaffMember[]>>('/staff/roster'),

  // ── Shop owner ───────────────────────────────────────────────
  invite: (payload: { fullName: string; email: string; phone?: string }) =>
    api.post<ApiResponse<{ invite: StaffInvite; emailSent: boolean; emailSimulated: boolean }>>(
      '/staff/invites', payload,
    ),

  listInvites: () => api.get<ApiResponse<StaffInvite[]>>('/staff/invites'),

  revokeInvite: (id: string) => api.delete<ApiResponse<null>>(`/staff/invites/${id}`),

  resendInvite: (id: string) =>
    api.post<ApiResponse<{ emailSent: boolean; emailSimulated: boolean }>>(`/staff/invites/${id}/resend`),

  // ── Invitee (public — reached from the emailed link) ─────────
  lookupInvite: (params: { token: string }) =>
    api.get<ApiResponse<InviteLookup>>('/staff/invites/lookup', { params }),

  acceptInvite: (payload: { token: string; email: string; password: string }) =>
    api.post<ApiResponse<AuthResponse>>('/staff/invites/accept', payload),
};
