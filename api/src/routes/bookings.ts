import { Router } from 'express';
import { bookingController } from '../controllers/bookingController';
import { paymentController } from '../controllers/paymentController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Public — a client browses open slots before committing to anything.
// The month route is declared first so "availability" isn't read as an :id.
router.get('/availability/month', bookingController.availabilityMonth);
router.get('/availability', bookingController.availability);

// Client side
router.post('/', authenticate, requireRole('client'), bookingController.create);
router.get('/client', authenticate, requireRole('client'), bookingController.listForClient);

// Barber side. A shop owner sees the whole shop's calendar; a staff barber
// sees only their own — the controller narrows the query by role.
router.get(
  '/barber',
  authenticate,
  requireRole('barber', 'staff_barber'),
  bookingController.listForBarber,
);

// Either party
router.get('/:id', authenticate, bookingController.getById);
router.patch('/:id/cancel', authenticate, bookingController.cancel);

// Barber-only transitions
router.patch(
  '/:id/confirm',
  authenticate,
  requireRole('barber', 'staff_barber'),
  bookingController.confirm,
);
router.patch(
  '/:id/decline',
  authenticate,
  requireRole('barber', 'staff_barber'),
  bookingController.decline,
);
router.patch(
  '/:id/start',
  authenticate,
  requireRole('barber', 'staff_barber'),
  bookingController.start,
);
router.patch(
  '/:id/complete',
  authenticate,
  requireRole('barber', 'staff_barber'),
  bookingController.complete,
);

// Payment, scoped to the booking it belongs to.
router.post(
  '/:id/payment/initialize',
  authenticate,
  requireRole('client'),
  paymentController.initialize,
);
router.post(
  '/:id/payment/verify',
  authenticate,
  requireRole('client'),
  paymentController.verify,
);

export default router;
