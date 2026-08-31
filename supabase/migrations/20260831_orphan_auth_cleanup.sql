-- Prevent direct client-side organization deletion. Organization deletion must
-- go through the owner-only application Danger Zone RPC.
REVOKE DELETE ON TABLE public.organizations FROM anon, authenticated;

-- Remove Auth users that have no application profile. A 15-minute grace period
-- avoids deleting an account while setup/profile creation is still in progress.
CREATE OR REPLACE FUNCTION public.cleanup_orphan_auth_users()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  removed_count INTEGER;
BEGIN
  DELETE FROM auth.users AS u
  WHERE u.created_at < timezone('utc'::TEXT, now()) - INTERVAL '15 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles AS p WHERE p.id = u.id
    );
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  RETURN removed_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_orphan_auth_users() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_orphan_auth_users() TO service_role;

-- Schedule one daily cleanup when Supabase's pg_cron extension is available.
-- The block is skipped safely on projects where pg_cron is not enabled.
DO $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    SELECT jobid INTO existing_job_id FROM cron.job WHERE jobname = 'venueos-orphan-auth-cleanup' LIMIT 1;
    IF existing_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(existing_job_id);
    END IF;
    PERFORM cron.schedule(
      'venueos-orphan-auth-cleanup',
      '15 3 * * *',
      $job$SELECT public.cleanup_orphan_auth_users();$job$
    );
  END IF;
END
$$;
