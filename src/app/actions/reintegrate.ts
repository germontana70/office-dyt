'use server';

import { createClient } from '@/infra/services/server';
import { SemesterRepository } from '@/modules/configuracion/repository/semester-repo';
import {
  cleanDocumentNumber,
  toUpperOrEmpty,
  convertBirthDate,
  buildFamilyMember,
  cleanPhone,
  emptyToNull,
} from './syncActions';

export interface ReintegrateResult {
  success: boolean;
  error?: string;
  studentId?: string;
}

/**
 * Clona un estudiante histórico (Tabla_Verdad_Estudiantes) al semestre activo (students).
 * Aplica las mismas sanitizaciones SIA 2.0 en cada campo para garantizar limpieza.
 * REGLA DE ORO: El campo `semester` es estrictamente el semestre activo al momento del reintegro.
 */
export async function reintegrateStudentFromHistory(
  truthTableId: string
): Promise<ReintegrateResult> {
  try {
    const supabase = await createClient();

    // 1. Determinar semestre activo
    const activeSemester = await SemesterRepository.getActive();
    const semester = activeSemester?.name || '2026-1';

    // 2. Obtener el registro histórico
    const { data: historical, error: histError } = await supabase
      .from('Tabla_Verdad_Estudiantes')
      .select('*')
      .eq('id', truthTableId)
      .single();

    if (histError || !historical) {
      console.error('[REINTEGRATE] No encontrado en histórico:', histError);
      return { success: false, error: 'El estudiante histórico no fue encontrado.' };
    }

    // 3. Construir mapped para reutilizar los sanitizadores SIA 2.0
    const mapped: Record<string, any> = {
      document_number: historical.numero_de_identificacion,
      document_type: historical.tipo_de_documento_de_identificacion,
      first_name: historical.nombres_del_estudiante,
      last_name: historical.apellidos_del_estudiante,
      gender: historical.genero,
      birth_date: historical.fecha_de_nacimiento,
      age: historical.edad,
      document_expedition_place: historical.lugar_de_expedicion_del_documento,
      email: historical.email,
      phone: historical.telefono_de_contacto,
      address: historical.direccion_de_su_residencia,
      neighborhood: historical.barrio,
      current_grade: historical.grado_escolar_actual,
      current_school: historical.nombre_de_la_institucion_educativa_actual,
      blood_type: historical.grupo_sanguineo,
      rh_factor: historical.factor_rh,
      health_insurance: historical.nombre_de_la_eps_o_medicina_prepagada,
      // Family fields flattened
      father_full_name: historical.nombre_completo_del_padre,
      father_mobile: historical.celular_del_papa,
      father_landline: historical.telefono_fijo_del_papa,
      father_email: historical.email_del_papa,
      father_document_number: historical.numero_de_documento_del_papa,
      father_document_type: 'Cédula de Ciudadanía',
      mother_full_name: historical.nombre_completo_de_la_mama,
      mother_mobile: historical.celular_de_la_mama,
      mother_landline: historical.telefono_fijo_de_la_mama,
      mother_email: historical.email_de_la_mama,
      mother_document_number: historical.numero_de_documento_de_la_mama,
      mother_document_type: 'Cédula de Ciudadanía',
      guardian_full_name: historical.nombre_completo_del_acudiente,
      guardian_phone: historical.telefono_del_acudiente,
      guardian_address: historical.direccion_del_acudiente,
      guardian_email: historical.email_del_acudiente,
      guardian_document_number: historical.numero_de_documento_del_acudiente,
      guardian_document_type: 'Cédula de Ciudadanía',
    };

    // 4. Sanitizar campos SIA 2.0
    const docNumber = cleanDocumentNumber(mapped.document_number);
    if (!docNumber) {
      return { success: false, error: 'El estudiante histórico no tiene documento de identidad válido.' };
    }

    const fatherInfo = buildFamilyMember(
      mapped, 'father_full_name', 'father_mobile', 'father_email',
      'father_document_number', 'father_document_type', 'father_landline'
    );
    const motherInfo = buildFamilyMember(
      mapped, 'mother_full_name', 'mother_mobile', 'mother_email',
      'mother_document_number', 'mother_document_type', 'mother_landline'
    );
    const guardianInfo = buildFamilyMember(
      mapped, 'guardian_full_name', 'guardian_phone', 'guardian_email',
      'guardian_document_number', 'guardian_document_type', undefined, 'guardian_address'
    );

    const studentRecord = {
      semester, // REGLA: Estrictamente el semestre activo
      first_name: toUpperOrEmpty(mapped.first_name),
      last_name: toUpperOrEmpty(mapped.last_name),
      document_type: mapped.document_type || null,
      document_number: docNumber,
      document_expedition_place: toUpperOrEmpty(mapped.document_expedition_place),
      gender: toUpperOrEmpty(mapped.gender),
      birth_date: convertBirthDate(mapped.birth_date),
      age: mapped.age ? Number(mapped.age) : null,
      phone: cleanPhone(mapped.phone),
      address: toUpperOrEmpty(mapped.address),
      neighborhood: toUpperOrEmpty(mapped.neighborhood),
      email: emptyToNull(mapped.email),
      current_grade: mapped.current_grade || null,
      current_school: toUpperOrEmpty(mapped.current_school),
      blood_type: toUpperOrEmpty(mapped.blood_type),
      rh_factor: toUpperOrEmpty(mapped.rh_factor),
      health_insurance: toUpperOrEmpty(mapped.health_insurance),
      // Family strings (legacy compat)
      parent_names: `Padre: ${toUpperOrEmpty(mapped.father_full_name)} | Madre: ${toUpperOrEmpty(mapped.mother_full_name)}`,
      parent_phones: `Padre: ${cleanPhone(mapped.father_mobile)} | Madre: ${cleanPhone(mapped.mother_mobile)}`,
      parent_emails: `Padre: ${mapped.father_email || ''} | Madre: ${mapped.mother_email || ''}`,
      guardian_info: `${toUpperOrEmpty(mapped.guardian_full_name)} - ${cleanPhone(mapped.guardian_phone)}`,
      // Family JSONB
      father_info: Object.keys(fatherInfo).length > 0 ? fatherInfo : {},
      mother_info: Object.keys(motherInfo).length > 0 ? motherInfo : {},
      guardian_info_detailed: Object.keys(guardianInfo).length > 0 ? guardianInfo : {},
      programs: [],
      payments: [],
      installments: [],
      is_active: true,
    };

    // 5. Upsert al semestre activo
    const { data: upserted, error: upsertError } = await supabase
      .from('students')
      .upsert(studentRecord, { onConflict: 'semester,document_number' })
      .select('id')
      .single();

    if (upsertError || !upserted) {
      console.error('[REINTEGRATE] Error al reinsertar en students:', upsertError);
      return { success: false, error: 'Error al reintegrar el estudiante al semestre activo.' };
    }

    console.log(`[REINTEGRATE] Estudiante ${docNumber} reintegrado al semestre ${semester}. ID: ${upserted.id}`);
    return { success: true, studentId: upserted.id };

  } catch (err: any) {
    console.error('[REINTEGRATE] Excepción inesperada:', err);
    return { success: false, error: err.message || 'Error inesperado en el reintegro.' };
  }
}
