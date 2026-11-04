-- PayProof AI: payment state must only be written by authenticated server routes.
-- The browser may read the current user's orders through the owner-scoped SELECT policy.
REVOKE ALL PRIVILEGES ON TABLE public.orders FROM anon, authenticated;
GRANT SELECT ON TABLE public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.orders TO service_role;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
