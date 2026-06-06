import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('[Error]', err.message);

  if (res.headersSent) return;

  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred. Please try again.',
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ success: false, message: 'Route not found.' });
}
