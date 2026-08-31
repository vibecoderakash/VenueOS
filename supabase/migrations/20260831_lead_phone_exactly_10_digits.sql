-- Enforce the same phone rule in Supabase as in the lead form.
-- Normalize legacy Indian +91-formatted values before adding the constraint.
UPDATE public.leads
SET phone = right(regexp_replace(phone, '\\D', '', 'g'), 10)
WHERE phone IS NOT NULL
  AND phone ~ '^\\s*\\+?91[\\s\\-\\(\\)]*[0-9][0-9\\s\\-\\(\\)]{9,}\\s*$';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leads_phone_exactly_10_digits'
      AND conrelid = 'public.leads'::regclass
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_phone_exactly_10_digits
      CHECK (phone ~ '^[0-9]{10}$');
  END IF;
END $$;
