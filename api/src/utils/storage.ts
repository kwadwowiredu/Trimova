import { getSupabase } from './supabase';

/**
 * Every bucket the app uploads user content into. Files are stored under a
 * `<userId>/` prefix (see uploadController), so a user's assets are always the
 * whole folder named after their id.
 */
export const USER_BUCKETS = ['avatars', 'covers', 'portfolio'] as const;

/**
 * Remove every file a user owns across all buckets.
 *
 * Supabase Storage lives outside Postgres, so it has NO foreign keys and no
 * cascade — deleting the users row leaves the files behind forever. This has
 * to be called explicitly whenever an account is removed, or the buckets grow
 * without bound.
 *
 * Returns how many files were removed per bucket. Failures are logged and
 * swallowed: losing storage cleanup must never block account deletion.
 */
export async function deleteUserStorage(userId: string): Promise<Record<string, number>> {
  const supabase = getSupabase();
  const removed: Record<string, number> = {};

  for (const bucket of USER_BUCKETS) {
    try {
      // `list` is not recursive — it returns the entries directly under the
      // prefix, which is exactly how uploads are laid out.
      const { data: files, error } = await supabase.storage.from(bucket).list(userId, { limit: 1000 });
      if (error) {
        console.error(`[storage] could not list ${bucket}/${userId}:`, error.message);
        removed[bucket] = 0;
        continue;
      }
      if (!files || files.length === 0) {
        removed[bucket] = 0;
        continue;
      }

      const paths = files.map((f) => `${userId}/${f.name}`);
      const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
      if (removeError) {
        console.error(`[storage] could not remove files in ${bucket}/${userId}:`, removeError.message);
        removed[bucket] = 0;
        continue;
      }
      removed[bucket] = paths.length;
    } catch (err) {
      console.error(`[storage] unexpected failure cleaning ${bucket}/${userId}:`, err);
      removed[bucket] = 0;
    }
  }

  return removed;
}
