-- ============================================================
-- Seed: creates one admin user for initial setup
-- ============================================================
-- Run AFTER running migrations and creating the auth user manually
-- in the Supabase dashboard (or via the Auth API).
--
-- Replace the placeholder UUID and email with the values from
-- the auth.users row you created.
--
-- Example (run in Supabase SQL editor):
--   SELECT id FROM auth.users WHERE email = 'admin@example.com';
--   Then substitute that UUID below.

-- INSERT INTO public.users (id, full_name, email, role, is_active, annual_pto_hours, pto_balance, force_password_reset)
-- VALUES (
--   'YOUR-AUTH-USER-UUID-HERE',
--   'Admin User',
--   'admin@example.com',
--   'admin',
--   TRUE,
--   0,
--   0,
--   FALSE   -- admin doesn't need to reset since you set it directly
-- );

-- See README.md for full setup steps.
SELECT 'Seed file loaded. Follow README setup steps to create your admin account.' AS status;
