REVOKE ALL ON public.profiles FROM anon, authenticated;
REVOKE ALL ON public.user_roles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE (handle, display_name, bio, avatar_url) ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;