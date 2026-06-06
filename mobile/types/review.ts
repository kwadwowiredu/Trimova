export interface Review {
  id: string;
  bookingId: string;
  clientId: string;
  barberId: string;
  staffBarberId: string | null;
  rating: number;
  comment: string | null;
  barberReply: string | null;
  barberRepliedAt: string | null;
  isReported: boolean;
  clientName: string;
  clientAvatarUrl: string | null;
  createdAt: string;
}

export interface CreateReviewPayload {
  bookingId: string;
  rating: number;
  comment?: string;
}

export interface UpdateReviewPayload {
  rating?: number;
  comment?: string;
}
