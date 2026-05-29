-- ============================================================
-- Security Hardening
-- ============================================================

-- invite_tokens: the original "public read by token" policy used USING (TRUE),
-- which let any anonymous user run SELECT * and enumerate every pending invite
-- token along with the invitee email address.
--
-- The invite_tokens table is not currently used by the application (employee
-- invites go through Supabase's built-in auth.admin.inviteUserByEmail). This
-- policy tightening is defensive: if the table is ever populated, anon users
-- can only see active (unused, non-expired) rows, and the app should always
-- validate tokens server-side via the service-role client, not the anon client.
DROP POLICY IF EXISTS "invite_tokens: public read by token" ON public.invite_tokens;

CREATE POLICY "invite_tokens: public read active only"
  ON public.invite_tokens FOR SELECT
  USING (used_at IS NULL AND expires_at > NOW());
