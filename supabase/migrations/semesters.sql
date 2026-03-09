-- Safe Migration for Semesters Table
-- Compatible with SIA 2.0 (Zero Downtime)

-- 1. Create the new independent table
CREATE TABLE IF NOT EXISTS public.semesters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    sheet_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Insert initial active semester safely
-- Ensures we don't duplicate if it already exists
INSERT INTO public.semesters (name, start_date, sheet_url, is_active)
SELECT '2026-1', '2026-02-09', 'https://docs.google.com/spreadsheets/d/EXAMPLE_ID_PREVIO', true
WHERE NOT EXISTS (
    SELECT 1 FROM public.semesters WHERE name = '2026-1'
);

-- 3. Security (RLS)
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;

-- Base policy (Allow all for authenticated users, adjust as needed)
CREATE POLICY "Enable read access for all users" ON public.semesters AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Enable write access for authenticated users" ON public.semesters AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
