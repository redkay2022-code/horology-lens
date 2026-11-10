CREATE OR REPLACE FUNCTION public.get_public_profiles(_ids uuid[])
RETURNS TABLE (id uuid, handle text, display_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.handle, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY (_ids[1:200])
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile_by_handle(_handle text)
RETURNS TABLE (id uuid, handle text, display_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.handle, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE p.handle = lower(_handle)
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_profile_by_handle(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_handle(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);