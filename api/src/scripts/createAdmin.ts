/**
 * Creates (or promotes) a platform admin.
 *
 *   npm run create-admin -- "Ama Boateng" admin@trimova.website "a-strong-password"
 *
 * Admins can't sign themselves up — there's no admin registration screen
 * anywhere, by design. This is the only way an admin account comes into
 * existence, and it hashes the password exactly the way /auth/login expects.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { getSupabase } from '../utils/supabase';

/** Print every admin account, for when you've forgotten which email you used. */
async function listAdmins() {
  const { data, error } = await getSupabase()
    .from('users')
    .select('full_name, email, is_active, created_at')
    .eq('role', 'admin')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Could not read the users table:', error.message);
    process.exit(1);
    return;
  }
  if (!data || data.length === 0) {
    console.log('No admin accounts yet. Create one with:');
    console.log('  npm run create-admin -- "<full name>" <email> <password>');
    return;
  }

  console.log(`${data.length} admin account${data.length === 1 ? '' : 's'}:`);
  for (const admin of data) {
    console.log(
      `  ${admin.email}  (${admin.full_name})${admin.is_active === false ? '  [suspended]' : ''}`,
    );
  }
  console.log('\nTo reset a password, run create-admin again with that email.');
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--list') {
    await listAdmins();
    return;
  }

  const [fullName, email, password] = args;

  if (!fullName || !email || !password) {
    console.error('Usage: npm run create-admin -- "<full name>" <email> <password>');
    console.error('       npm run create-admin -- --list');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const supabase = getSupabase();
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
  const passwordHash = await bcrypt.hash(password, rounds);
  const normalisedEmail = email.toLowerCase().trim();

  const { data: existing } = await supabase
    .from('users')
    .select('id, role')
    .eq('email', normalisedEmail)
    .maybeSingle();

  if (existing) {
    // Re-running against an existing account overwrites the password hash,
    // which makes this the password-reset path too — there's no "forgot
    // password" flow for admins, and deliberately so: the only way to reset
    // one is to already have access to the server.
    const { error } = await supabase
      .from('users')
      .update({ role: 'admin', password_hash: passwordHash, is_active: true })
      .eq('id', existing.id);

    if (error) {
      console.error('Could not update that account:', error.message);
      process.exit(1);
    }

    console.log(
      existing.role === 'admin'
        ? `Password reset for admin ${normalisedEmail}.`
        : `Promoted ${normalisedEmail} to admin (was "${existing.role}") and set a new password.`,
    );
    return;
  }

  const { data, error } = await supabase
    .from('users')
    .insert({
      full_name: fullName,
      email: normalisedEmail,
      password_hash: passwordHash,
      role: 'admin',
      role_selected: true,
      is_active: true,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('Could not create the admin:', error?.message);
    process.exit(1);
    // process.exit is typed `never`, so this is unreachable — but only once
    // node's types are loaded. Returning keeps the narrowing explicit rather
    // than dependent on that.
    return;
  }
  console.log(`Admin created: ${normalisedEmail} (${data.id})`);
}

main();
