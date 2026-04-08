
DROP POLICY IF EXISTS "Authenticated can insert logs" ON public.activity_log;
CREATE POLICY "Users can insert own logs" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
