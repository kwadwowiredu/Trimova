import { Router } from 'express';
import { servicesController } from '../controllers/servicesController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/me', authenticate, requireRole('barber'), servicesController.getMine);
router.get('/earnings', authenticate, requireRole('barber'), servicesController.earnings);
router.post('/', authenticate, requireRole('barber'), servicesController.create);
router.put('/:id', authenticate, requireRole('barber'), servicesController.update);
router.delete('/:id', authenticate, requireRole('barber'), servicesController.remove);

export default router;
