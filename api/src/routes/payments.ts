import { Router } from 'express';
import { paymentController } from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';
import { verifyPaystackSignature } from '../middleware/paystackWebhook';

const router = Router();

/**
 * Paystack calls this itself, so there's no bearer token — the signature
 * check stands in for one.
 */
router.post('/webhook', verifyPaystackSignature, paymentController.webhook);

router.get('/transactions', authenticate, paymentController.myTransactions);

export default router;
