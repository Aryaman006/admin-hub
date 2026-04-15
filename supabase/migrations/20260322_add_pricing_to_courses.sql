ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS price_inr numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_usd numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_eur numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_gbp numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS enable_payment boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_title text DEFAULT NULL;
