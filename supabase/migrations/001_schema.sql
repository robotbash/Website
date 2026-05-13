-- ============================================================
-- Time Tracking & PTO System -- Initial Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Custom Types
-- ============================================================

CREATE TYPE public.user_role AS ENUM ('employee', 'admin');
CREATE TYPE public.employment_status AS ENUM ('active', 'inactive');
CREATE TYPE public.correction_status AS ENUM ('pending', 'approved', 'denied');
CREATE TYPE public.sick_day_type AS ENUM ('sick', 'call_off');

-- ============================================================
-- Tables
-- ============================================================

-- Users (extends auth.users)
CREATE TABLE public.users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  email               TEXT NOT NULL,
  role                public.user_role NOT NULL DEFAULT 'employee',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  hire_date           DATE,
  annual_pto_hours    NUMERIC(7,2) NOT NULL DEFAULT 40.00,
  pto_balance         NUMERIC(7,2) NOT NULL DEFAULT 40.00,
  force_password_reset BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- App-wide settings (key/value store)
CREATE TABLE public.settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_by  UUID REFERENCES public.users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Time entries
CREATE TABLE public.time_entries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id),
  clock_in_at   TIMESTAMPTZ NOT NULL,
  clock_out_at  TIMESTAMPTZ,
  notes         TEXT,
  was_corrected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Breaks (attached to time entries)
CREATE TABLE public.breaks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  time_entry_id UUID NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  start_at      TIMESTAMPTZ NOT NULL,
  end_at        TIMESTAMPTZ,
  is_paid       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PTO entries
CREATE TABLE public.pto_entries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.users(id),
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  hours            NUMERIC(7,2) NOT NULL,
  note             TEXT,
  logged_by_user_id UUID NOT NULL REFERENCES public.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sick days / call-offs
CREATE TABLE public.sick_days (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.users(id),
  date             DATE NOT NULL,
  type             public.sick_day_type NOT NULL,
  note             TEXT,
  logged_by_user_id UUID NOT NULL REFERENCES public.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Punch correction requests
CREATE TABLE public.punch_corrections (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES public.users(id),
  requested_clock_in   TIMESTAMPTZ NOT NULL,
  requested_clock_out  TIMESTAMPTZ,
  reason               TEXT NOT NULL,
  status               public.correction_status NOT NULL DEFAULT 'pending',
  reviewed_by          UUID REFERENCES public.users(id),
  reviewed_at          TIMESTAMPTZ,
  original_entry_id    UUID REFERENCES public.time_entries(id),
  admin_notes          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log (append-only)
CREATE TABLE public.audit_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES public.users(id),
  action          TEXT NOT NULL,
  target_user_id  UUID REFERENCES public.users(id),
  target_record_id UUID,
  table_name      TEXT,
  old_value       JSONB,
  new_value       JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Login attempts (for rate limiting)
CREATE TABLE public.login_attempts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        TEXT NOT NULL,
  ip_address   INET,
  success      BOOLEAN NOT NULL DEFAULT FALSE,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Company holidays
CREATE TABLE public.holidays (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date       DATE NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  is_paid    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Announcements
CREATE TABLE public.announcements (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Tracks which employees dismissed which announcements
CREATE TABLE public.announcement_dismissals (
  user_id         UUID NOT NULL REFERENCES public.users(id),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  dismissed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, announcement_id)
);

-- Saved export configurations
CREATE TABLE public.export_presets (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  config     JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One-time invite tokens for new account setup
CREATE TABLE public.invite_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT NOT NULL,
  token      TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by UUID NOT NULL REFERENCES public.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '48 hours',
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_clock_in ON public.time_entries(clock_in_at DESC);
CREATE INDEX idx_time_entries_active ON public.time_entries(user_id) WHERE clock_out_at IS NULL;
CREATE INDEX idx_breaks_time_entry ON public.breaks(time_entry_id);
CREATE INDEX idx_breaks_active ON public.breaks(time_entry_id) WHERE end_at IS NULL;
CREATE INDEX idx_pto_user ON public.pto_entries(user_id);
CREATE INDEX idx_pto_dates ON public.pto_entries(start_date, end_date);
CREATE INDEX idx_sick_user ON public.sick_days(user_id);
CREATE INDEX idx_sick_date ON public.sick_days(date);
CREATE INDEX idx_corrections_user ON public.punch_corrections(user_id);
CREATE INDEX idx_corrections_status ON public.punch_corrections(status) WHERE status = 'pending';
CREATE INDEX idx_audit_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_login_attempts_email_time ON public.login_attempts(email, attempted_at DESC);
CREATE INDEX idx_login_attempts_ip_time ON public.login_attempts(ip_address, attempted_at DESC);

-- ============================================================
-- Helper Functions
-- ============================================================

-- Returns the role of the currently authenticated user
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() AND is_active = TRUE;
$$;

-- Returns true if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
  );
$$;

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Prevent updates/deletes on audit_log (enforce append-only)
CREATE OR REPLACE FUNCTION public.audit_log_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log rows are immutable';
END;
$$;

CREATE TRIGGER trg_audit_no_update
  BEFORE UPDATE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutable();

CREATE TRIGGER trg_audit_no_delete
  BEFORE DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutable();

-- Check failed login attempts for rate limiting
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(p_email TEXT, p_ip INET)
RETURNS TABLE (is_locked boolean, lockout_reason TEXT)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_recent_failures  INT;
  v_daily_failures   INT;
BEGIN
  -- Count failures in last 15 minutes for this email
  SELECT COUNT(*) INTO v_recent_failures
  FROM public.login_attempts
  WHERE email = LOWER(p_email)
    AND success = FALSE
    AND attempted_at > NOW() - INTERVAL '15 minutes';

  -- Count failures in last 24 hours for this email
  SELECT COUNT(*) INTO v_daily_failures
  FROM public.login_attempts
  WHERE email = LOWER(p_email)
    AND success = FALSE
    AND attempted_at > NOW() - INTERVAL '24 hours';

  IF v_daily_failures >= 10 THEN
    RETURN QUERY SELECT TRUE, 'account_locked'::TEXT;
  ELSIF v_recent_failures >= 5 THEN
    RETURN QUERY SELECT TRUE, 'rate_limited'::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, NULL::TEXT;
  END IF;
END;
$$;

-- Record a login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_email     TEXT,
  p_ip        INET,
  p_success   BOOLEAN
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, ip_address, success)
  VALUES (LOWER(p_email), p_ip, p_success);
END;
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pto_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sick_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.punch_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- ---- users ----
CREATE POLICY "users: own row select"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users: admin select all"
  ON public.users FOR SELECT
  USING (public.is_admin());

CREATE POLICY "users: admin insert"
  ON public.users FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "users: admin update"
  ON public.users FOR UPDATE
  USING (public.is_admin());

-- Employees may update their own row but cannot escalate their role
CREATE POLICY "users: own row update (no role change)"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.users WHERE id = auth.uid())
    AND is_active = TRUE
  );

-- ---- settings ----
CREATE POLICY "settings: any authenticated can read"
  ON public.settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "settings: admin write"
  ON public.settings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---- time_entries ----
CREATE POLICY "time_entries: own select"
  ON public.time_entries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "time_entries: admin select all"
  ON public.time_entries FOR SELECT
  USING (public.is_admin());

CREATE POLICY "time_entries: own insert"
  ON public.time_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "time_entries: admin insert any"
  ON public.time_entries FOR INSERT
  WITH CHECK (public.is_admin());

-- Employees can update only their open entry (no clock_out yet)
CREATE POLICY "time_entries: own update open entry"
  ON public.time_entries FOR UPDATE
  USING (user_id = auth.uid() AND clock_out_at IS NULL);

CREATE POLICY "time_entries: admin update any"
  ON public.time_entries FOR UPDATE
  USING (public.is_admin());

-- ---- breaks ----
CREATE POLICY "breaks: own select via time_entry"
  ON public.breaks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.time_entries te
      WHERE te.id = time_entry_id AND te.user_id = auth.uid()
    )
  );

CREATE POLICY "breaks: admin select all"
  ON public.breaks FOR SELECT
  USING (public.is_admin());

CREATE POLICY "breaks: own insert"
  ON public.breaks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.time_entries te
      WHERE te.id = time_entry_id AND te.user_id = auth.uid() AND te.clock_out_at IS NULL
    )
  );

CREATE POLICY "breaks: admin insert"
  ON public.breaks FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "breaks: own update open break"
  ON public.breaks FOR UPDATE
  USING (
    end_at IS NULL AND
    EXISTS (
      SELECT 1 FROM public.time_entries te
      WHERE te.id = time_entry_id AND te.user_id = auth.uid()
    )
  );

CREATE POLICY "breaks: admin update"
  ON public.breaks FOR UPDATE
  USING (public.is_admin());

-- ---- pto_entries ----
CREATE POLICY "pto: own select"
  ON public.pto_entries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "pto: admin select all"
  ON public.pto_entries FOR SELECT
  USING (public.is_admin());

CREATE POLICY "pto: own insert"
  ON public.pto_entries FOR INSERT
  WITH CHECK (user_id = auth.uid() AND logged_by_user_id = auth.uid());

CREATE POLICY "pto: admin insert any"
  ON public.pto_entries FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "pto: admin update"
  ON public.pto_entries FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "pto: admin delete"
  ON public.pto_entries FOR DELETE
  USING (public.is_admin());

-- ---- sick_days ----
CREATE POLICY "sick: own select"
  ON public.sick_days FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "sick: admin select all"
  ON public.sick_days FOR SELECT
  USING (public.is_admin());

CREATE POLICY "sick: own insert"
  ON public.sick_days FOR INSERT
  WITH CHECK (user_id = auth.uid() AND logged_by_user_id = auth.uid());

CREATE POLICY "sick: admin insert any"
  ON public.sick_days FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "sick: admin delete"
  ON public.sick_days FOR DELETE
  USING (public.is_admin());

-- ---- punch_corrections ----
CREATE POLICY "corrections: own select"
  ON public.punch_corrections FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "corrections: admin select all"
  ON public.punch_corrections FOR SELECT
  USING (public.is_admin());

CREATE POLICY "corrections: own insert pending"
  ON public.punch_corrections FOR INSERT
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "corrections: admin update"
  ON public.punch_corrections FOR UPDATE
  USING (public.is_admin());

-- ---- audit_log (append-only; service role writes) ----
CREATE POLICY "audit: admin read"
  ON public.audit_log FOR SELECT
  USING (public.is_admin());

-- Updates and deletes are blocked by the trigger; allow inserts via service role
-- (no INSERT policy needed for anon/authenticated — service role bypasses RLS)

-- ---- login_attempts ----
CREATE POLICY "login_attempts: admin read"
  ON public.login_attempts FOR SELECT
  USING (public.is_admin());

-- ---- holidays ----
CREATE POLICY "holidays: authenticated read"
  ON public.holidays FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "holidays: admin write"
  ON public.holidays FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---- announcements ----
CREATE POLICY "announcements: authenticated read active"
  ON public.announcements FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (expires_at IS NULL OR expires_at > NOW())
  );

CREATE POLICY "announcements: admin write"
  ON public.announcements FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---- announcement_dismissals ----
CREATE POLICY "dismissals: own select"
  ON public.announcement_dismissals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "dismissals: own insert"
  ON public.announcement_dismissals FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ---- export_presets ----
CREATE POLICY "export_presets: admin only"
  ON public.export_presets FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---- invite_tokens ----
CREATE POLICY "invite_tokens: admin all"
  ON public.invite_tokens FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Public read so setup page can validate a token without being logged in
CREATE POLICY "invite_tokens: public read by token"
  ON public.invite_tokens FOR SELECT
  USING (TRUE);

-- ============================================================
-- Default Settings
-- ============================================================

INSERT INTO public.settings (key, value) VALUES
  ('breaks_paid_default',    'false'),
  ('pto_rollover_policy',    '"reset"'),
  ('pto_rollover_cap_hours', '40'),
  ('pay_period_type',        '"biweekly"'),
  ('overtime_threshold',     '40'),
  ('overtime_warning',       '35');
