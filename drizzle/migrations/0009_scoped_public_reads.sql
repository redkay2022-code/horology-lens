-- Replace open SELECT policies with owner-scoped ones; public views go through narrow functions.
DROP POLICY IF EXISTS "Posts are publicly readable" ON public.posts;
CREATE POLICY "Authors read own posts" ON public.posts FOR SELECT TO authenticated USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Likes are publicly readable" ON public.post_likes;
CREATE POLICY "Users read own likes" ON public.post_likes FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Comments are publicly readable" ON public.post_comments;
CREATE POLICY "Users read own comments" ON public.post_comments FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Follows are publicly readable" ON public.collector_follows;
CREATE POLICY "Users read own follows" ON public.collector_follows FOR SELECT TO authenticated USING (auth.uid() = follower_id OR auth.uid() = followee_id);

DROP POLICY IF EXISTS "Published post media is readable" ON storage.objects;

CREATE OR REPLACE FUNCTION public.get_feed(
  _author_ids uuid[] DEFAULT NULL, _catalog_ids uuid[] DEFAULT NULL, _ids uuid[] DEFAULT NULL,
  _brand text DEFAULT NULL, _tag text DEFAULT NULL, _search text DEFAULT NULL,
  _since timestamptz DEFAULT NULL, _limit int DEFAULT 60)
RETURNS TABLE(id uuid, author_id uuid, catalog_id uuid, brand text, model text, reference text, case_size_mm numeric, caption text, video_path text, mime_type text, size_bytes bigint, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.author_id, p.catalog_id, p.brand, p.model, p.reference, p.case_size_mm, p.caption, p.video_path, p.mime_type, p.size_bytes, p.created_at
  FROM public.posts p
  WHERE (_author_ids IS NULL OR p.author_id = ANY(_author_ids))
    AND (_catalog_ids IS NULL OR p.catalog_id = ANY(_catalog_ids))
    AND (_ids IS NULL OR p.id = ANY(_ids))
    AND (_brand IS NULL OR p.brand ILIKE _brand)
    AND (_tag IS NULL OR p.caption ILIKE '%#' || _tag || '%')
    AND (_search IS NULL OR p.brand ILIKE '%'||_search||'%' OR p.model ILIKE '%'||_search||'%' OR coalesce(p.reference,'') ILIKE '%'||_search||'%' OR p.caption ILIKE '%'||_search||'%')
    AND (_since IS NULL OR p.created_at >= _since)
  ORDER BY p.created_at DESC
  LIMIT least(greatest(coalesce(_limit, 60), 1), 200)
$$;

CREATE OR REPLACE FUNCTION public.get_like_summary(_post_ids uuid[])
RETURNS TABLE(post_id uuid, likes bigint, liked_by_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.post_id, count(*), bool_or(l.user_id = auth.uid())
  FROM public.post_likes l WHERE l.post_id = ANY(_post_ids[1:200]) GROUP BY l.post_id
$$;

CREATE OR REPLACE FUNCTION public.get_post_comments(_post_id uuid)
RETURNS TABLE(id uuid, body text, created_at timestamptz, user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.body, c.created_at, c.user_id FROM public.post_comments c
  WHERE c.post_id = _post_id ORDER BY c.created_at LIMIT 500
$$;

CREATE OR REPLACE FUNCTION public.get_follow_counts(_profile_id uuid)
RETURNS TABLE(followers bigint, following bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT count(*) FROM public.collector_follows WHERE followee_id = _profile_id),
         (SELECT count(*) FROM public.collector_follows WHERE follower_id = _profile_id)
$$;

REVOKE ALL ON FUNCTION public.get_feed(uuid[],uuid[],uuid[],text,text,text,timestamptz,int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_like_summary(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_post_comments(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_follow_counts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_feed(uuid[],uuid[],uuid[],text,text,text,timestamptz,int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_like_summary(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_comments(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_follow_counts(uuid) TO anon, authenticated;