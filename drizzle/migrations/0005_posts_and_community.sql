CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  catalog_id uuid REFERENCES public.watch_catalog(id),
  brand text NOT NULL DEFAULT '' CHECK (char_length(brand) <= 60),
  model text NOT NULL DEFAULT '' CHECK (char_length(model) <= 80),
  reference text CHECK (reference IS NULL OR char_length(reference) <= 40),
  case_size_mm numeric CHECK (case_size_mm IS NULL OR case_size_mm BETWEEN 20 AND 60),
  caption text NOT NULL DEFAULT '' CHECK (char_length(caption) <= 1000),
  video_path text NOT NULL CHECK (char_length(video_path) <= 300),
  mime_type text NOT NULL CHECK (mime_type IN ('video/mp4','video/webm','video/quicktime')),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 104857600),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_created_idx ON public.posts (created_at DESC);
CREATE INDEX posts_author_idx ON public.posts (author_id);
REVOKE ALL ON public.posts FROM anon, authenticated;
GRANT SELECT ON public.posts TO anon, authenticated;
GRANT INSERT (catalog_id, brand, model, reference, case_size_mm, caption, video_path, mime_type, size_bytes) ON public.posts TO authenticated;
GRANT UPDATE (caption) ON public.posts TO authenticated;
GRANT DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are publicly readable" ON public.posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authors create own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors update own posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors delete own posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE OR REPLACE FUNCTION public.posts_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.author_id := auth.uid();
    IF NEW.author_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
    IF split_part(NEW.video_path, '/', 1) <> NEW.author_id::text THEN
      RAISE EXCEPTION 'Video must be in the author folder' USING ERRCODE = '42501';
    END IF;
    IF (SELECT count(*) FROM public.posts WHERE author_id = NEW.author_id AND created_at > now() - interval '1 hour') >= 20 THEN
      RAISE EXCEPTION 'Post rate limit reached' USING ERRCODE = 'P0001';
    END IF;
  ELSIF NEW.author_id <> OLD.author_id OR NEW.video_path <> OLD.video_path THEN
    RAISE EXCEPTION 'Immutable post fields' USING ERRCODE = '42501';
  END IF;
  IF NEW.catalog_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.watch_catalog WHERE id = NEW.catalog_id AND status = 'confirmed') THEN
    RAISE EXCEPTION 'Catalog model must be confirmed' USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.posts_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER posts_guard BEFORE INSERT OR UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.posts_guard();
CREATE TRIGGER posts_touch BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.post_likes (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
REVOKE ALL ON public.post_likes FROM anon, authenticated;
GRANT SELECT ON public.post_likes TO anon, authenticated;
GRANT INSERT (post_id), DELETE ON public.post_likes TO authenticated;
GRANT ALL ON public.post_likes TO service_role;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes are publicly readable" ON public.post_likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users like as themselves" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unlike own" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.post_saves (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
REVOKE ALL ON public.post_saves FROM anon, authenticated;
GRANT SELECT, DELETE ON public.post_saves TO authenticated;
GRANT INSERT (post_id) ON public.post_saves TO authenticated;
GRANT ALL ON public.post_saves TO service_role;
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own saves" ON public.post_saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users save as themselves" ON public.post_saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unsave own" ON public.post_saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX post_comments_post_idx ON public.post_comments (post_id, created_at);
REVOKE ALL ON public.post_comments FROM anon, authenticated;
GRANT SELECT ON public.post_comments TO anon, authenticated;
GRANT INSERT (post_id, body), DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are publicly readable" ON public.post_comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users comment as themselves" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.comment_rate_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.post_comments WHERE user_id = NEW.user_id AND created_at > now() - interval '1 minute') >= 10 THEN
    RAISE EXCEPTION 'Comment rate limit reached' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.comment_rate_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER comment_rate_guard BEFORE INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.comment_rate_guard();

CREATE TABLE public.collector_follows (
  follower_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
CREATE INDEX collector_follows_followee_idx ON public.collector_follows (followee_id);
REVOKE ALL ON public.collector_follows FROM anon, authenticated;
GRANT SELECT ON public.collector_follows TO anon, authenticated;
GRANT INSERT (followee_id), DELETE ON public.collector_follows TO authenticated;
GRANT ALL ON public.collector_follows TO service_role;
ALTER TABLE public.collector_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows are publicly readable" ON public.collector_follows FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users follow as themselves" ON public.collector_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users unfollow own" ON public.collector_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

CREATE TABLE public.watch_follows (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  catalog_id uuid NOT NULL REFERENCES public.watch_catalog(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, catalog_id)
);
REVOKE ALL ON public.watch_follows FROM anon, authenticated;
GRANT SELECT, DELETE ON public.watch_follows TO authenticated;
GRANT INSERT (catalog_id) ON public.watch_follows TO authenticated;
GRANT ALL ON public.watch_follows TO service_role;
ALTER TABLE public.watch_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own watch follows" ON public.watch_follows FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users follow confirmed watches" ON public.watch_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.watch_catalog c WHERE c.id = catalog_id AND c.status = 'confirmed'));
CREATE POLICY "Users unfollow own watches" ON public.watch_follows FOR DELETE TO authenticated USING (auth.uid() = user_id);