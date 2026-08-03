// Mock staff + staff-based reviews shown on the CLIENT side of a shop profile.
// TODO: replace with real /barbers/:id/staff and /barbers/:id/reviews endpoints.

export interface StaffService {
  name: string;
  price: number;           // GHS
  durationMinutes: number;
}

export interface ShopStaff {
  id: string;
  name: string;
  role: string;
  rating: number;
  reviewCount: number;
  appointmentsCompleted: number;
  phone: string;
  email: string;
  services: StaffService[];
  portfolio: string[]; // photo URLs (empty until real data)
}

export interface ShopReview {
  id: string;
  clientName: string;
  rating: number;           // 1–5
  comment: string;
  date: string;             // ISO
  staffId: string;
  staffName: string;
  /** Client's profile photo — most haven't uploaded one, so usually null. */
  avatarUrl?: string | null;
}

// Distinct fallback avatar colors for clients without a profile photo.
const AVATAR_COLORS = ['#3c3cb9', '#0a8a44', '#B7791F', '#C05621', '#6B46C1', '#2B6CB0', '#B83280'];

/** Deterministic color per client name, so the same person always gets the same avatar. */
export function avatarColorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export const MOCK_SHOP_STAFF: ShopStaff[] = [
  {
    id: 's1', name: 'Kwame Mensah', role: 'Master Barber', rating: 4.9, reviewCount: 34,
    appointmentsCompleted: 412, phone: '+233 24 123 4567', email: 'kwame.mensah@example.com',
    services: [
      { name: 'Executive Fade',  price: 60, durationMinutes: 45 },
      { name: 'Haircut & Beard', price: 45, durationMinutes: 60 },
      { name: 'Skin Fade',       price: 40, durationMinutes: 30 },
    ],
    portfolio: [],
  },
  {
    id: 's2', name: 'Kofi Asare', role: 'Staff Barber', rating: 4.7, reviewCount: 21,
    appointmentsCompleted: 268, phone: '+233 20 987 6543', email: 'kofi.asare@example.com',
    services: [
      { name: 'Haircut & Beard', price: 45, durationMinutes: 60 },
      { name: 'Beard Trim',      price: 20, durationMinutes: 20 },
    ],
    portfolio: [],
  },
  {
    id: 's3', name: 'Ama Boateng', role: 'Staff Barber', rating: 4.5, reviewCount: 12,
    appointmentsCompleted: 141, phone: '+233 55 456 7890', email: 'ama.boateng@example.com',
    services: [
      { name: 'Beard Trim',      price: 20, durationMinutes: 20 },
      { name: 'Shampoo & Style', price: 30, durationMinutes: 40 },
    ],
    portfolio: [],
  },
];

export const MOCK_SHOP_REVIEWS: ShopReview[] = [
  { id: 'r1', clientName: 'Daniel Nkrumah', rating: 5, comment: 'Clean fade, zero complaints. Kwame is the guy.', date: '2026-07-12T14:30:00Z', staffId: 's1', staffName: 'Kwame Mensah' },
  { id: 'r2', clientName: 'Ama Osei',       rating: 5, comment: 'Very professional and on time. Loved the result.', date: '2026-07-10T10:05:00Z', staffId: 's2', staffName: 'Kofi Asare' },
  { id: 'r3', clientName: 'Kwesi Poku',     rating: 4, comment: 'Great cut, slight wait but worth it.', date: '2026-07-06T16:45:00Z', staffId: 's1', staffName: 'Kwame Mensah' },
  { id: 'r4', clientName: 'Fiifi Asante',   rating: 5, comment: 'Best beard trim I have had in Kumasi.', date: '2026-06-28T12:20:00Z', staffId: 's3', staffName: 'Ama Boateng' },
  { id: 'r5', clientName: 'Yaw Owusu',      rating: 4, comment: 'Solid skin fade. Will book again.', date: '2026-06-21T09:15:00Z', staffId: 's1', staffName: 'Kwame Mensah' },
  { id: 'r6', clientName: 'Efua Mansa',     rating: 5, comment: 'Friendly staff and a very neat shop.', date: '2026-06-14T15:00:00Z', staffId: 's2', staffName: 'Kofi Asare' },
  { id: 'r7', clientName: 'Kojo Antwi',     rating: 3, comment: 'Decent cut but the wait was long on a Saturday.', date: '2026-06-07T11:40:00Z', staffId: 's3', staffName: 'Ama Boateng' },
];

/** "2026-07-12T…" → "12 Jul 2026" */
export function fmtReviewDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
