-- ==============================================================================
-- FASE 1: HOTFIX DE SEGURIDAD (RLS) PARA dyt_program_prices
-- Misión A: Desbloquear Operaciones de Escritura
-- ==============================================================================

-- 0. Garantizar que Row Level Security esté activo
ALTER TABLE public.dyt_program_prices ENABLE ROW LEVEL SECURITY;

-- 1. Política de Lectura (SELECT)
CREATE POLICY "Permitir lectura a usuarios autenticados" 
ON public.dyt_program_prices FOR SELECT
TO authenticated USING (true);

-- 2. Política de Inserción (INSERT)
CREATE POLICY "Permitir creación a usuarios autenticados" 
ON public.dyt_program_prices FOR INSERT
TO authenticated WITH CHECK (true);

-- 3. Política de Actualización (UPDATE)
CREATE POLICY "Permitir edición a usuarios autenticados" 
ON public.dyt_program_prices FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

-- 4. Política de Eliminación (DELETE)
CREATE POLICY "Permitir borrado a usuarios autenticados" 
ON public.dyt_program_prices FOR DELETE
TO authenticated USING (true);

-- MODO RECOVERY: Si experimentan bloqueos desde componentes Server.js sin sesión
-- activa estricta, usar (true) para todos los roles como contingencia
-- CREATE POLICY "Bypass RLS Contingency" ON public.dyt_program_prices USING (true);
