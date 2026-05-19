ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read ventas" ON public.ventas FOR SELECT TO anon, authenticated USING (true);