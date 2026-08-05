import { Router } from 'express';
import { staffController } from '../controllers/staffController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// ── Public (used before the staff member has an account) ────────────────────
router.get('/invites/lookup', staffController.lookupInvite);
router.post('/invites/accept', staffController.acceptInvite);

// ── Shop owner only ─────────────────────────────────────────────────────────
router.post('/invites', authenticate, requireRole('barber'), staffController.createInvite);
router.get('/invites', authenticate, requireRole('barber'), staffController.listInvites);
router.post('/invites/:id/resend', authenticate, requireRole('barber'), staffController.resendInvite);
router.delete('/invites/:id', authenticate, requireRole('barber'), staffController.revokeInvite);

export default router;
