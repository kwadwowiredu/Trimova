import { Router } from 'express';
import { workingHoursController } from '../controllers/workingHoursController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/me', authenticate, requireRole('barber'), workingHoursController.getMine);
router.put('/me', authenticate, requireRole('barber'), workingHoursController.saveMine);

export default router;
