-- ==============================================================================
-- FASE 1: INDEPENDENCIA DE TABLA DE PRECIOS (dyt_program_prices)
-- Misión 1: Estructurar y Volcar la Bóveda de Precios
-- ==============================================================================

-- 1. Crear la Bóveda Moderna de Precios
CREATE TABLE IF NOT EXISTS public.dyt_program_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_name TEXT NOT NULL,
    semester TEXT NOT NULL,
    cash_price NUMERIC NOT NULL,
    increment_percentage NUMERIC DEFAULT 0,
    installments JSONB DEFAULT '{"count": 1, "amount": 0}'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Habilitar RLS (Row Level Security) básico
ALTER TABLE public.dyt_program_prices ENABLE ROW LEVEL SECURITY;

-- 3. Volcar datos semilla desde el legacy SIA 2.0 (Dual-Source Migration)
-- Aseguramos que solo se extraigan los precios del semestre activo (2026-1)
INSERT INTO public.dyt_program_prices (program_name, semester, cash_price, increment_percentage)
SELECT 
    program_name, 
    semester, 
    COALESCE(valor_contado, cash_price, 0) AS cash_price, 
    COALESCE(increment_percentage, 0) AS increment_percentage
FROM public.program_prices
WHERE semester = '2026-1'
ON CONFLICT DO NOTHING;

-- 4. Notificar a Supabase/PostgREST para refrescar el schema cache
NOTIFY pgrst, reload_schema;
