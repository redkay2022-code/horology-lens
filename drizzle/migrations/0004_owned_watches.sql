CREATE TYPE public.collection_visibility AS ENUM ('private','public');

CREATE TABLE public.owned_watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  catalog_id uuid REFERENCES public.watch_catalog(id) ON DELETE RESTRICT,
  unconfirmed_fields jsonb,
  purchase_price numeric(12,2),
  purchase_currency char(3),
  purchased_on date,
  visibility public.collection_visibility NOT NULL DEFAULT 'private',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT owned_watches_identity CHECK (catalog_id IS NOT NULL OR (unconfirmed_fields IS NOT NULL AND jsonb_typeof(unconfirmed_fields) = 'object')),
  CONSTRAINT owned_watches_price CHECK ((purchase_price IS NULL) = (purchase_currency IS NULL) AND (purchase_price IS NULL OR purchase_price >= 0) AND (purchase_currency IS NULL OR purchase_currency ~ '^[A-Z]{3}$'))
);
CREATE INDEX owned_watches_owner_idx ON public.owned_watches(owner_id);

REVOKE ALL ON public.owned_watches FROM anon, authenticated;
GRANT SELECT, DELETE ON public.owned_watches TO authenticated;
GRANT INSERT (catalog_id, unconfirmed_fields, purchase_price, purchase_currency, purchased_on, visibility) ON public.owned_watches TO authenticated;
GRANT UPDATE (catalog_id, unconfirmed_fields, purchase_price, purchase_currency, purchased_on, visibility) ON public.owned_watches TO authenticated;
GRANT ALL ON public.owned_watches TO service_role;

ALTER TABLE public.owned_watches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own watches" ON public.owned_watches FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners add own watches" ON public.owned_watches FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update own watches" ON public.owned_watches FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners delete own watches" ON public.owned_watches FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.owned_watches_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND auth.uid() IS NOT NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'Ownership cannot be reassigned' USING ERRCODE = '42501';
  END IF;
  IF NEW.catalog_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.watch_catalog WHERE id = NEW.catalog_id AND status = 'confirmed'
  ) THEN
    RAISE EXCEPTION 'catalog_id must reference a confirmed catalog record' USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.owned_watches_guard() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER owned_watches_guard BEFORE INSERT OR UPDATE ON public.owned_watches
  FOR EACH ROW EXECUTE FUNCTION public.owned_watches_guard();
CREATE TRIGGER owned_watches_touch_updated_at BEFORE UPDATE ON public.owned_watches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();