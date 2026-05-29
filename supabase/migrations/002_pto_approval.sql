-- ============================================================
-- PTO Approval Workflow
-- Adds a manager (admin) approval step to PTO requests.
-- ============================================================

-- 1. Add review columns to pto_entries.
--    NOTE: existing rows were already deducted from balance under the
--    old "deduct immediately" model, so they are backfilled as 'approved'.
--    The default for NEW rows is then switched to 'pending'.
ALTER TABLE public.pto_entries
  ADD COLUMN status      public.correction_status NOT NULL DEFAULT 'approved',
  ADD COLUMN reviewed_by UUID REFERENCES public.users(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN admin_notes TEXT;

-- New employee requests should default to pending and await review.
ALTER TABLE public.pto_entries ALTER COLUMN status SET DEFAULT 'pending';

-- Fast lookup of the manager review queue.
CREATE INDEX idx_pto_status_pending ON public.pto_entries(status) WHERE status = 'pending';

-- 2. Tighten RLS so employees may only create PENDING requests for themselves
--    (they cannot self-approve by inserting an 'approved' row).
DROP POLICY IF EXISTS "pto: own insert" ON public.pto_entries;

CREATE POLICY "pto: own insert pending"
  ON public.pto_entries FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND logged_by_user_id = auth.uid()
    AND status = 'pending'
  );

-- Admin insert / update / delete / select policies from 001 remain in force.
-- Admins approve or deny via the existing "pto: admin update" policy.
