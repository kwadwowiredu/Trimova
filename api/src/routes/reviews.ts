import { Router } from 'express';
import { reviewController } from '../controllers/reviewController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/me', authenticate, requireRole('client'), reviewController.listMine);
router.post('/', authenticate, requireRole('client'), reviewController.create);
router.post('/:id/report', authenticate, reviewController.report);
router.delete('/:id', authenticate, requireRole('client'), reviewController.remove);

export default router;
