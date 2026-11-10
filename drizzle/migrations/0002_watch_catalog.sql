CREATE TYPE public.catalog_status AS ENUM ('draft','confirmed');

CREATE TABLE public.watch_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  reference text,
  case_size_mm numeric(4,1),
  dial text,
  bezel text,
  case_material text,
  bracelet text,
  msrp_amount numeric(12,2),
  msrp_currency char(3),
  status public.catalog_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT watch_catalog_confirmed_identity CHECK (
    status <> 'confirmed' OR (
      length(btrim(brand)) > 0
      AND reference IS NOT NULL AND length(btrim(reference)) > 0
      AND case_size_mm IS NOT NULL AND case_size_mm BETWEEN 20 AND 60
    )
  ),
  CONSTRAINT watch_catalog_msrp_valid CHECK (
    (msrp_amount IS NULL OR msrp_amount >= 0)
    AND (msrp_amount IS NULL) = (msrp_currency IS NULL)
  )
);

CREATE UNIQUE INDEX watch_catalog_confirmed_identity_uniq
  ON public.watch_catalog (
    lower(btrim(brand)),
    upper(regexp_replace(reference, '\s+', '', 'g')),
    case_size_mm
  ) WHERE status = 'confirmed';

GRANT SELECT ON public.watch_catalog TO anon, authenticated;
GRANT ALL ON public.watch_catalog TO service_role;

ALTER TABLE public.watch_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Confirmed catalog is publicly readable"
  ON public.watch_catalog FOR SELECT TO anon, authenticated
  USING (status = 'confirmed');

CREATE TRIGGER watch_catalog_touch_updated_at
  BEFORE UPDATE ON public.watch_catalog
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.watch_catalog (brand, model, reference, case_size_mm, dial, bezel, case_material, bracelet, status) VALUES
 ('Rolex','Submariner Date','126610LN',41,'Black','Black Cerachrom ceramic','Oystersteel','Oyster','confirmed'),
 ('Audemars Piguet','Royal Oak','15450ST',37,'Blue','Stainless steel','Stainless steel','Integrated steel','confirmed'),
 ('Audemars Piguet','Royal Oak','15510ST',41,'Blue','Stainless steel','Stainless steel','Integrated steel','confirmed'),
 ('Patek Philippe','Nautilus','5711/1A-014',40,'Olive green','Stainless steel','Stainless steel','Integrated steel','confirmed'),
 ('Omega','Speedmaster Professional','310.30.42.50.01.001',42,'Black','Aluminium tachymeter','Stainless steel','Steel','confirmed'),
 ('Omega','Speedmaster Professional','310.30.42.50.01.002',42,'Black','Aluminium tachymeter','Stainless steel','Steel','confirmed');