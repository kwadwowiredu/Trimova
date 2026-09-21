import { Router } from 'express';
import { staffController } from '../controllers/staffController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// ── Public (used before the staff member has an account) ────────────────────
// The landing page an invite email points at — see openInvite for why the
// email can't link straight to a deep link.
router.get('/invites/open', staffController.openInvite);
router.get('/invites/lookup', staffController.lookupInvite);
router.post('/invites/accept', staffController.acceptInvite);

// ── Shop owner only ─────────────────────────────────────────────────────────
router.get('/roster', authenticate, requireRole('barber'), staffController.roster);
router.post('/invites', authenticate, requireRole('barber'), staffController.createInvite);
router.get('/invites', authenticate, requireRole('barber'), staffController.listInvites);
router.post('/invites/:id/resend', authenticate, requireRole('barber'), staffController.resendInvite);
router.delete('/invites/:id', authenticate, requireRole('barber'), staffController.revokeInvite);

export default router;
