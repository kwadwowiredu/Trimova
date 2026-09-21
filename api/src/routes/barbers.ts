import { Router } from 'express';
import { barberController } from '../controllers/barberController';
import { reviewController } from '../controllers/reviewController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// ── Public routes ──────────────────────────────────────────────────────────
// GET /api/barbers/search?lat=&lng=&radius=&type=&minRating=&q=&page=&limit=
router.get('/search', barberController.search);

// ── Authenticated barber routes ────────────────────────────────────────────
// PUT /api/barbers/me/business
router.put(
  '/me/business',
  authenticate,
  requireRole('barber'),
  barberController.updateBusinessDetails,
);

// PUT /api/barbers/me/location
router.put(
  '/me/location',
  authenticate,
  requireRole('barber'),
  barberController.updateLocation,
);

// ── Public: must be last (catches /:id) ────────────────────────────────────
// The nested routes come first so "staff"/"reviews" aren't read as an :id.
// GET /api/barbers/:id/staff
router.get('/:id/staff', reviewController.listStaff);
// GET /api/barbers/:id/reviews?staffId=
router.get('/:id/reviews', reviewController.listForBarber);
// GET /api/barbers/:id
router.get('/:id', barberController.getById);

export default router;
