-- A scheduled follow-up is valid only when both its date/time and action note exist.
-- Clearing a follow-up remains valid by setting both columns to NULL.
ALTER TABLE public.leads
  ADD CONSTRAINT leads_followup_requires_date_and_note
  CHECK (
    (next_follow_up_at IS NULL AND follow_up_note IS NULL)
    OR (
      next_follow_up_at IS NOT NULL
      AND follow_up_note IS NOT NULL
      AND btrim(follow_up_note) <> ''
    )
  ) NOT VALID;
