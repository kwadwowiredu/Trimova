import { Router } from 'express';
import { barberController } from '../controllers/barberController';

const router = Router();

// GET /api/barbers/search?lat=&lng=&radius=&type=&minRating=&q=&page=&limit=
router.get('/search', barberController.search);

// GET /api/barbers/:id
router.get('/:id', barberController.getById);

export default router;
