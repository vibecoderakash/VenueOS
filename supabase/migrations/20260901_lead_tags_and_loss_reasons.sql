-- Migration: 20260901_lead_tags_and_loss_reasons.sql
-- Description: Add tags, lost_reason, and lost_reason_details columns to public.leads

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS lost_reason text,
  ADD COLUMN IF NOT EXISTS lost_reason_details text;

-- Create GIN index on tags for high-performance containment queries
CREATE INDEX IF NOT EXISTS idx_leads_tags ON public.leads USING GIN (tags);

-- Create index on lost_reason for reports and analytics
CREATE INDEX IF NOT EXISTS idx_leads_lost_reason ON public.leads (lost_reason) WHERE lost_reason IS NOT NULL;
