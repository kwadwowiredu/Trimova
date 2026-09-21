import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { adminModulesController } from '../controllers/adminModulesController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Every admin route is gated the same way — there is no public surface here.
router.use(authenticate, requireRole('admin'));

router.get('/dashboard', adminController.dashboard);
router.get('/dashboard/trend', adminController.trend);
router.get('/activity', adminController.activity);

router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUser);
router.get('/users/:id/payouts', adminController.userPayouts);
router.patch('/users/:id', adminController.updateUser);

router.get('/finance/pipeline', adminController.financePipeline);
router.get('/finance/transactions', adminController.listTransactions);
router.post('/finance/transactions/:id/refund', adminController.refund);

router.get('/bookings', adminController.listBookings);
router.get('/bookings/:id', adminController.getBooking);

// ── Security: automated suspicious-activity queue ──────────────────────────
router.get('/flags', adminModulesController.listFlags);
router.post('/flags/scan', adminModulesController.scanForFlags);
router.patch('/flags/:id', adminModulesController.resolveFlag);

// ── Moderation: reported reviews ───────────────────────────────────────────
router.get('/reviews', adminModulesController.listReviews);
router.patch('/reviews/:id', adminModulesController.moderateReview);

// ── Settings ───────────────────────────────────────────────────────────────
router.get('/settings', adminModulesController.getSettings);
router.put('/settings', adminModulesController.updateSettings);

// ── Notifications ──────────────────────────────────────────────────────────
router.get('/notifications', adminModulesController.listNotifications);
router.post('/notifications/announce', adminModulesController.announce);

export default router;
