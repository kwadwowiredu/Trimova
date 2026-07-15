import { Router } from 'express';
import multer from 'multer';
import { uploadController } from '../controllers/uploadController';
import { authenticate } from '../middleware/auth';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// POST /api/uploads/image  (multipart/form-data: file, folder)
router.post('/image', authenticate, upload.single('file'), uploadController.uploadImage);

export default router;
