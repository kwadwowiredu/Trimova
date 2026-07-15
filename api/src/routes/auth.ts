import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleAuth);
router.post('/apple', authController.appleAuth);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

router.get('/me', authenticate, authController.getMe);
router.patch('/me', authenticate, authController.updateProfile);
router.patch('/role', authenticate, authController.updateRole);
router.post('/change-password', authenticate, authController.changePassword);
router.post('/verify-password', authenticate, authController.verifyPassword);
router.post('/logout', authenticate, authController.logout);
router.delete('/me', authenticate, authController.deleteAccount);

export default router;
