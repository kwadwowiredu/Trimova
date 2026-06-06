export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidGhanaPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s+/g, '');
  return /^(\+233|0)(2[0-9]|5[0-9]|3[0-9])\d{7}$/.test(cleaned);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (password.length < 8) return 'weak';
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  if (score <= 2) return 'weak';
  if (score === 3) return 'medium';
  return 'strong';
}

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.startsWith('0')) {
    return '+233' + cleaned.slice(1);
  }
  return cleaned;
}
