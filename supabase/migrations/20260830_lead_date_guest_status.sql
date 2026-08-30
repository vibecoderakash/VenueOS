-- Run this once in the Supabase SQL Editor for databases created before
-- event-date and guest-count TBD support was added.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS event_date_status TEXT NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS guest_count_status TEXT NOT NULL DEFAULT 'fixed';

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS chk_leads_event_date_consistency,
  DROP CONSTRAINT IF EXISTS chk_leads_guest_count_consistency;

ALTER TABLE public.leads
  ADD CONSTRAINT chk_leads_event_date_consistency CHECK (
    (event_date_status = 'fixed' AND event_date IS NOT NULL) OR
    (event_date_status = 'not_fixed' AND event_date IS NULL)
  ),
  ADD CONSTRAINT chk_leads_guest_count_consistency CHECK (
    (guest_count_status = 'fixed' AND guest_count IS NOT NULL AND guest_count > 0) OR
    (guest_count_status = 'not_fixed' AND guest_count IS NULL)
  );
