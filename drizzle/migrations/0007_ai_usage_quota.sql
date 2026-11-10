CREATE TABLE public.ai_usage (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_user_time_idx ON public.ai_usage (user_id, created_at DESC);
REVOKE ALL ON public.ai_usage FROM anon, authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Atomically checks and records one AI request for the caller.
-- Returns 'ok', 'minute' (3/min exceeded) or 'day' (20/day exceeded).
CREATE OR REPLACE FUNCTION public.consume_ai_quota() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('ai_quota:' || uid::text, 0));
  IF (SELECT count(*) FROM public.ai_usage WHERE user_id = uid AND created_at > now() - interval '1 minute') >= 3 THEN RETURN 'minute'; END IF;
  IF (SELECT count(*) FROM public.ai_usage WHERE user_id = uid AND created_at > now() - interval '1 day') >= 20 THEN RETURN 'day'; END IF;
  INSERT INTO public.ai_usage (user_id) VALUES (uid);
  RETURN 'ok';
END $$;
REVOKE EXECUTE ON FUNCTION public.consume_ai_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota() TO authenticated;