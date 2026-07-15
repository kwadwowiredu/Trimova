import type { Request, Response } from 'express';
import { getSupabase } from '../utils/supabase';
import { sendSuccess, sendError } from '../utils/response';

const ALLOWED_BUCKETS = ['avatars', 'covers', 'portfolio'] as const;
type Bucket = (typeof ALLOWED_BUCKETS)[number];

function extFromMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('heic')) return 'heic';
  return 'jpg';
}

export const uploadController = {
  /** POST /uploads/image  (multipart: field "file", body "folder") */
  async uploadImage(req: Request, res: Response) {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) {
      sendError(res, 'No image file provided.');
      return;
    }

    const folder = (req.body?.folder ?? 'avatars') as Bucket;
    if (!ALLOWED_BUCKETS.includes(folder)) {
      sendError(res, 'Invalid upload folder.');
      return;
    }

    const supabase = getSupabase();
    const path = `${req.user!.sub}/${Date.now()}.${extFromMime(file.mimetype)}`;

    const { error } = await supabase.storage
      .from(folder)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });

    if (error) {
      console.error('[Upload Error]', error);
      sendError(res, 'Failed to upload image.', 500);
      return;
    }

    const { data } = supabase.storage.from(folder).getPublicUrl(path);
    sendSuccess(res, { url: data.publicUrl }, 'Image uploaded.');
  },
};
