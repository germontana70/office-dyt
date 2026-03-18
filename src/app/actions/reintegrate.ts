'use server';

/**
 * @module reintegrate
 * @description Server Actions for student reintegration from history (Truth Table) to active semester.
 */

import { createClient } from '@/infra/services/server';
import { 
  cleanDocumentNumber, 
  toUpperOrEmpty, 
  cleanPhone, 
  emptyToNull 
} from '@/core/utils/studentMapper';

/**
 * formatToPostgresDate
 * Converts DD/MM/YYYY to YYYY-MM-DD for Postgres compatibility.
 */
function formatToPostgresDate(dateStr: string | null) {
  if (!dateStr || !dateStr.includes('/')) return dateStr;
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export interface HybridSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  name: string; // Added for simplified display
  document_number: string;
  document_type: string | null;
  semester: string | null;
  historical_semester?: string | null; // Added for UI origin display
  source: 'current' | 'historical';
}

/**
 * searchStudentsHybrid
 * Searches for students in the current semester and falls back to the Truth Table (History).
 */
export async function searchStudentsHybrid(
  query: string, 
  semester: string = '2026-1'
): Promise<HybridSearchResult[]> {
  const supabase = await createClient();
  const searchStr = `%${query}%`;

  // 1. Search in current 'students' table
  const { data: currentStudents, error: currentError } = await supabase
    .from('students')
    .select('id, first_name, last_name, document_number, document_type, semester')
    .eq('semester', semester)
    .or(`first_name.ilike.${searchStr},last_name.ilike.${searchStr},document_number.ilike.${searchStr}`)
    .limit(10);

  if (currentError) {
    console.error('[REINTEGRATE] Current search error:', currentError);
  }

  // If we found results in the current semester, return them
  if (currentStudents && currentStudents.length > 0) {
    return currentStudents.map(s => ({
      ...s,
      name: `${s.first_name} ${s.last_name}`,
      source: 'current'
    }));
  }

  // 2. Fallback: Search in 'Tabla_Verdad_Estudiantes' (Historical)
  // Fix columns to Spanish as they exist in Truth Table
  const { data: historicalStudents, error: historicalError } = await supabase
    .from('Tabla_Verdad_Estudiantes')
    .select(`
      id, 
      nombres_del_estudiante, 
      apellidos_del_estudiante, 
      numero_de_identificacion, 
      tipo_de_documento_de_identificacion,
      _origin_sheet
    `)
    .or(`nombres_del_estudiante.ilike.${searchStr},apellidos_del_estudiante.ilike.${searchStr},numero_de_identificacion.ilike.${searchStr}`)
    .limit(10);

  if (historicalError) {
    console.error('[REINTEGRATE] Historical search error:', historicalError);
    return [];
  }

  return (historicalStudents || []).map(row => ({
    ...row,
    id: row.id,
    first_name: row.nombres_del_estudiante || '',
    last_name: row.apellidos_del_estudiante || '',
    name: `${row.nombres_del_estudiante || ''} ${row.apellidos_del_estudiante || ''}`.trim() || 'Nombre Desconocido',
    document_number: row.numero_de_identificacion || 'Sin Documento',
    document_type: row.tipo_de_documento_de_identificacion,
    semester: row._origin_sheet || 'Histórico',
    historical_semester: row._origin_sheet || 'Histórico',
    source: 'historical'
  }));
}

/**
 * reintegrateStudentFromHistory
 * Pulls a student from the Truth Table and upserts them into the current active semester.
 */
export async function reintegrateStudentFromHistory(
  truthTableId: string, 
  targetSemester: string = '2026-1'
): Promise<{ success: boolean; studentId?: string; error?: string }> {
  try {
    const supabase = await createClient();

    // 1. Fetch historical record
    const { data: history, error: fetchError } = await supabase
      .from('Tabla_Verdad_Estudiantes')
      .select('*')
      .eq('id', truthTableId)
      .single();

    if (fetchError || !history) {
      return { success: false, error: 'Estudiante no encontrado en el histórico.' };
    }

    // 2. Sanitize and Map to 'students' table structure (English keys)
    // We rebuild the JSONB objects for family info from the flattened Truth Table columns
    const father_info = history.nombre_completo_del_padre ? {
      full_name: toUpperOrEmpty(history.nombre_completo_del_padre),
      phone: cleanPhone(history.celular_del_papa),
      email: emptyToNull(history.email_del_papa),
      document: cleanDocumentNumber(history.numero_de_documento_del_papa)
    } : {};

    const mother_info = history.nombre_completo_de_la_mama ? {
      full_name: toUpperOrEmpty(history.nombre_completo_de_la_mama),
      phone: cleanPhone(history.celular_de_la_mama),
      email: emptyToNull(history.email_de_la_mama),
      document: cleanDocumentNumber(history.numero_de_documento_de_la_mama)
    } : {};

    const studentRecord = {
      semester: targetSemester, // Forced to active semester
      first_name: toUpperOrEmpty(history.nombres_del_estudiante),
      last_name: toUpperOrEmpty(history.apellidos_del_estudiante),
      document_type: history.tipo_de_documento_de_identificacion,
      document_number: cleanDocumentNumber(history.numero_de_identificacion),
      document_expedition_place: toUpperOrEmpty(history.lugar_de_expedicion_del_documento),
      gender: toUpperOrEmpty(history.genero),
      birth_date: formatToPostgresDate(history.fecha_de_nacimiento),
      age: history.edad,
      phone: cleanPhone(history.telefono_de_contacto),
      address: toUpperOrEmpty(history.direccion_de_su_residencia),
      neighborhood: toUpperOrEmpty(history.barrio),
      email: history.email,
      current_grade: history.grado_escolar_actual,
      current_school: toUpperOrEmpty(history.nombre_de_la_institucion_educativa_actual),
      blood_type: toUpperOrEmpty(history.grupo_sanguineo),
      rh_factor: toUpperOrEmpty(history.factor_rh),
      health_insurance: toUpperOrEmpty(history.nombre_de_la_eps_o_medicina_prepagada),
      // Detailed JSONB
      father_info,
      mother_info,
      is_active: true,
      updated_at: new Date().toISOString()
    };

    // 3. Upsert to students
    const { data: upserted, error: upsertError } = await supabase
      .from('students')
      .upsert(studentRecord, {
        onConflict: 'semester,document_number'
      })
      .select('id')
      .single();

    if (upsertError) {
      return { success: false, error: `Error en reintegración: ${upsertError.message}` };
    }

    // 4. Also create/ensure the enrollment slot exists
    if (upserted) {
      await supabase
        .from('dyt_enrollments')
        .upsert({
          student_id: upserted.id,
          semester: targetSemester,
          status: 'Activa',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'student_id,semester'
        });
    }

    return { success: true, studentId: upserted?.id };
  } catch (err) {
    console.error('[REINTEGRATE] Unhandled error:', err);
    return { success: false, error: (err as Error).message };
  }
}
