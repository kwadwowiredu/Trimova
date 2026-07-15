import { api } from './api';
import type { ApiResponse } from '@/types/api';

export type UploadFolder = 'avatars' | 'covers' | 'portfolio';

/** True if the URI is a local device file that still needs uploading. */
export function isLocalUri(uri: string | null | undefined): boolean {
  if (!uri) return false;
  return !/^https?:\/\//.test(uri);
}

/**
 * Upload a local image URI to the backend (which stores it in Supabase Storage)
 * and return the public URL. If the URI is already a remote URL it's returned
 * unchanged.
 */
export async function uploadImage(uri: string, folder: UploadFolder): Promise<string> {
  if (!isLocalUri(uri)) return uri;

  const name = uri.split('/').pop() || `${folder}.jpg`;
  const extMatch = /\.(\w+)$/.exec(name);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
  const type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  const form = new FormData();
  form.append('folder', folder);
  // React Native's FormData accepts this { uri, name, type } shape for files.
  form.append('file', { uri, name, type } as unknown as Blob);

  const res = await api.post<ApiResponse<{ url: string }>>('/uploads/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
  return res.data.data.url;
}
