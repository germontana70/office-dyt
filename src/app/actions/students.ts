'use server';

import { createClient } from '@/infra/services/server';

export interface HybridSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  document_number?: string;
  email?: string | null;
  source: 'current' | 'historical';
  // Historical-only extras
  truth_table_id?: string;
}

/**
 * Búsqueda Híbrida de Estudiantes.
 * Paso 1: Buscar en `students` (semestre activo, fuente de verdad inmediata).
 * Paso 2 (fallback): Si no hay match, buscar en `Tabla_Verdad_Estudiantes` (histórico).
 * Retorna un array con la bandera `source` por resultado.
 */
export async function searchStudentsHybrid(query: string): Promise<HybridSearchResult[]> {
  if (!query || query.length < 2) return [];

  const supabase = await createClient();

  // ─── Paso 1: Semestre Activo ───
  const { data: currentData, error: currentError } = await supabase
    .from('students')
    .select('id, first_name, last_name, document_number, email')
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,document_number.ilike.%${query}%`)
    .eq('is_active', true)
    .limit(10);

  if (!currentError && currentData && currentData.length > 0) {
    return currentData.map(s => ({ ...s, source: 'current' as const }));
  }

  // ─── Paso 2: Histórico (Tabla_Verdad_Estudiantes) ───
  const { data: historicalData, error: historicalError } = await supabase
    .from('Tabla_Verdad_Estudiantes')
    .select('id, nombres_del_estudiante, apellidos_del_estudiante, numero_de_identificacion, email')
    .or(
      `nombres_del_estudiante.ilike.%${query}%,apellidos_del_estudiante.ilike.%${query}%,numero_de_identificacion.ilike.%${query}%`
    )
    .limit(10);

  if (historicalError) {
    console.error('[HybridSearch] Error buscando en Tabla_Verdad_Estudiantes:', historicalError);
    return [];
  }

  return (historicalData || []).map(row => ({
    id: row.id || row.numero_de_identificacion || String(Math.random()),
    first_name: row.nombres_del_estudiante || 'Sin nombre',
    last_name: row.apellidos_del_estudiante || '',
    document_number: row.numero_de_identificacion || undefined,
    email: row.email,
    source: 'historical' as const,
    truth_table_id: row.id,
  }));
}

/** Legacy alias — kept for backward compatibility with StudentPicker */
export async function searchStudents(query: string): Promise<HybridSearchResult[]> {
  return searchStudentsHybrid(query);
}
