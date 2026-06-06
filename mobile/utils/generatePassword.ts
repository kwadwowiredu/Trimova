const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';

export function generateStaffPassword(length = 12): string {
  let password = '';
  for (let i = 0; i < length; i++) {
    password += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return password;
}
