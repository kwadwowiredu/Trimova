import type { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, message?: string, status = 200) {
  return res.status(status).json({ success: true, data, message });
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number }
) {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  });
}

export function sendError(res: Response, message: string, status = 400) {
  return res.status(status).json({ success: false, message });
}
