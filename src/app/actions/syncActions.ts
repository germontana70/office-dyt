'use server';

/**
 * @module syncActions
 * @description Server Action: Google Sheets → Supabase Sync Engine
 * @layer SERVER ACTION (Business Logic)
 * @version 2.0.0 — Refactored: pure helpers extracted to @/core/utils/studentMapper
 *
 * PARITY NOTE: This is a 1:1 translation of SIA 2.0's sync pipeline.
 * Source files audited:
 *   - SIA 2.0/services/sync_service.py (field_mapping, map_sheets_row_to_form_response)
 *   - SIA 2.0/data/repositories/supabase_student_repo.py (create_from_form_response, sanitizers)
 *   - SIA 2.0/skills/sheets_fetch_skill.py (compute_row_hash)
 *
 * DO NOT modify sanitization rules without cross-referencing SIA 2.0 source.
 */

import { createClient } from '@/infra/services/server';
import {
  RawSheetRow,
  MappedFormResponse,
  cleanDocumentNumber,
  cleanPhone,
  toUpperOrEmpty,
  convertBirthDate,
  computeRowHash,
  buildFamilyMember,
  extractSheetIdFromUrl,
  buildCsvExportUrl,
  parseCsvToRows,
  mapSheetRowToFormResponse,
  buildStudentRecord,
  buildTruthTableRecord,
  emptyToNull,
} from '@/core/utils/studentMapper';

// Re-export sanitizers for use in reintegration actions
export {
  cleanDocumentNumber,
  toUpperOrEmpty,
  convertBirthDate,
  buildFamilyMember,
  cleanPhone,
  emptyToNull,
  buildStudentRecord,
  mapSheetRowToFormResponse,
};

export interface SyncResult {
  success: boolean;
  fetched: number;
  upserted: number;
  skipped: number;
  errors: string[];
  semester: string;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════
// MAIN SERVER ACTION
// ═══════════════════════════════════════════════════════════

export async function syncGoogleSheetToStudents(): Promise<SyncResult> {
  const startTime = new Date().toISOString();
  const errors: string[] = [];

  try {
    const supabase = await createClient();

    // ─── STEP 1: Discover Active Semester & Its Sheet URL ───
    const { data: semesters, error: semError } = await supabase
      .from('semesters')
      .select('name, sheet_url, sheet_id')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (semError || !semesters) {
      return {
        success: false,
        fetched: 0,
        upserted: 0,
        skipped: 0,
        errors: ['No se encontró un semestre activo en la tabla semesters.'],
        semester: 'N/A',
        timestamp: startTime,
      };
    }

    const semester = semesters.name as string;
    const sheetUrl = semesters.sheet_url as string | null;

    // Extract Sheet ID from URL
    let sheetId: string | null = null;
    if (sheetUrl) {
      sheetId = extractSheetIdFromUrl(sheetUrl);
    }

    if (!sheetId) {
      return {
        success: false,
        fetched: 0,
        upserted: 0,
        skipped: 0,
        errors: [
          `El semestre activo "${semester}" no tiene una sheet_url válida configurada. ` +
          `Valor actual: "${sheetUrl || 'null'}". ` +
          `Actualice la columna sheet_url en la tabla semesters con la URL completa de Google Sheets.`
        ],
        semester,
        timestamp: startTime,
      };
    }

    // ─── STEP 2: Fetch CSV from Google Sheets ───
    const csvUrl = buildCsvExportUrl(sheetId);

    let csvText: string;
    try {
      const response = await fetch(csvUrl, {
        headers: { 'Accept': 'text/csv' },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      csvText = await response.text();
    } catch (fetchError) {
      return {
        success: false,
        fetched: 0,
        upserted: 0,
        skipped: 0,
        errors: [
          `Error descargando Google Sheet: ${(fetchError as Error).message}. ` +
          `Asegúrese de que la hoja sea pública o compartida con "Cualquier persona con el enlace".`
        ],
        semester,
        timestamp: startTime,
      };
    }

    // ─── STEP 3: Parse CSV → Raw Rows ───
    const rawRows = parseCsvToRows(csvText);

    if (rawRows.length === 0) {
      return {
        success: true,
        fetched: 0,
        upserted: 0,
        skipped: 0,
        errors: ['La hoja de cálculo está vacía o no contiene filas de datos.'],
        semester,
        timestamp: startTime,
      };
    }

    // ─── STEP 4: Map, Sanitize, and Build Student Records ───
    const studentRecords: any[] = [];
    let skipped = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];

      // Phase 1: Map Spanish headers → English fields
      const mapped = mapSheetRowToFormResponse(row);

      // Skip rows without document_number (required for upsert key)
      const docNumber = cleanDocumentNumber(mapped.document_number as string | null);
      if (!docNumber) {
        skipped++;
        errors.push(`Fila ${i + 2}: Sin número de documento — omitida.`);
        continue;
      }

      // Phase 2: Build full student record with sanitization
      const studentRecord = buildStudentRecord(mapped, semester);

      // Include program_to_study_now for the enrollment stage
      (studentRecord as any).program_to_study_now = mapped.program_to_study_now;

      // Compute row hash for tracking
      const rowHash = computeRowHash(row);
      (studentRecord as any).row_hash = rowHash;

      studentRecords.push(studentRecord);
    }

    if (studentRecords.length === 0) {
      return {
        success: true,
        fetched: rawRows.length,
        upserted: 0,
        skipped,
        errors: [...errors, 'Ninguna fila tenía un número de documento válido.'],
        semester,
        timestamp: startTime,
      };
    }

    // ─── STEP 5: Multi-Stage Upsert (Students + Truth Table + Enrollments) ───
    // Parity: Transactional Vault Pattern — Dual Persistence
    // 1. Upsert to students (semestre activo)
    // 2. Upsert to Tabla_Verdad_Estudiantes (REGLA DE ORO: fallo silencioso)
    // 3. Link with active semester in dyt_enrollments
    const BATCH_SIZE = 50;
    let totalUpserted = 0;

    for (let i = 0; i < studentRecords.length; i += BATCH_SIZE) {
      const batch = studentRecords.slice(i, i + BATCH_SIZE);

      // 5.1: Upsert Students (semestre activo)
      const cleanStudentBatch = batch.map(record => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { row_hash, program_to_study_now, ...rest } = record as any;
        return rest;
      });

      const { data: upsertedStudents, error: studentError } = await supabase
        .from('students')
        .upsert(cleanStudentBatch, {
          onConflict: 'semester,document_number',
          ignoreDuplicates: false,
        })
        .select('id, document_number');

      if (studentError) {
        errors.push(`Error en lote de estudiantes ${Math.floor(i / BATCH_SIZE) + 1}: ${studentError.message}`);
        continue;
      }

      totalUpserted += upsertedStudents?.length || 0;

      // 5.2: Doble Upsert → Tabla_Verdad_Estudiantes (REGLA DE ORO: silencioso si falla)
      const truthTableBatch = batch.map(record => {
        const mapped: MappedFormResponse = {
          document_number: (record as any).document_number,
          document_type: (record as any).document_type,
          first_name: (record as any).first_name,
          last_name: (record as any).last_name,
          gender: (record as any).gender,
          birth_date: (record as any).birth_date ? String((record as any).birth_date) : null,
          age: (record as any).age,
          document_expedition_place: (record as any).document_expedition_place,
          email: (record as any).email,
          phone: (record as any).phone,
          address: (record as any).address,
          neighborhood: (record as any).neighborhood,
          current_grade: (record as any).current_grade,
          current_school: (record as any).current_school,
          program_or_course: (record as any).program_or_course,
          program_to_study_now: (record as any).program_to_study_now,
          blood_type: (record as any).blood_type,
          rh_factor: (record as any).rh_factor,
          health_insurance: (record as any).health_insurance,
          father_full_name: (record as any).father_info?.full_name,
          father_mobile: (record as any).father_info?.mobile,
          father_landline: (record as any).father_info?.landline,
          father_email: (record as any).father_info?.email,
          father_document_number: (record as any).father_info?.document_number,
          mother_full_name: (record as any).mother_info?.full_name,
          mother_mobile: (record as any).mother_info?.mobile,
          mother_landline: (record as any).mother_info?.landline,
          mother_email: (record as any).mother_info?.email,
          mother_document_number: (record as any).mother_info?.document_number,
          guardian_full_name: (record as any).guardian_info_detailed?.full_name,
          guardian_phone: (record as any).guardian_info_detailed?.mobile,
          guardian_address: (record as any).guardian_info_detailed?.address,
          guardian_email: (record as any).guardian_info_detailed?.email,
          guardian_document_number: (record as any).guardian_info_detailed?.document_number,
        };
        return buildTruthTableRecord(mapped, semester);
      }).filter(r => r.numero_de_identificacion);

      if (truthTableBatch.length > 0) {
        try {
          const { error: truthError } = await supabase
            .from('Tabla_Verdad_Estudiantes')
            .upsert(truthTableBatch as any[], {
              onConflict: 'numero_de_identificacion',
              ignoreDuplicates: false,
            });

          if (truthError) {
            // REGLA DE ORO: Log silencioso — no bloquea el proceso principal.
            console.warn(`[SYNC] Tabla_Verdad_Estudiantes batch ${Math.floor(i / BATCH_SIZE) + 1} warning: ${truthError.message}`);
          }
        } catch (truthException) {
          console.warn('[SYNC] Tabla_Verdad_Estudiantes upsert exception (silenced):', truthException);
        }
      }

      // 5.3: Upsert Enrollments slot in dyt_enrollments
      if (upsertedStudents && upsertedStudents.length > 0) {
        const enrollmentBatch = upsertedStudents.map(s => {
          const original = batch.find(b => (b as any).document_number === s.document_number);
          
          return {
            student_id: s.id,
            semester: semester,
            status: 'Activa',
            program_name: (original as any)?.program_to_study_now || null,
            updated_at: new Date().toISOString()
          };
        });

        const { error: enrollError } = await supabase
          .from('dyt_enrollments')
          .upsert(enrollmentBatch, {
            onConflict: 'student_id,semester',
          });

        if (enrollError) {
          errors.push(`Error sincronizando matrículas (enrollments): ${enrollError.message}`);
        }
      }
    }

    return {
      success: errors.filter(e => e.includes('Error')).length === 0,
      fetched: rawRows.length,
      upserted: totalUpserted,
      skipped,
      errors,
      semester,
      timestamp: startTime,
    };
  } catch (error) {
    return {
      success: false,
      fetched: 0,
      upserted: 0,
      skipped: 0,
      errors: [`Error inesperado: ${(error as Error).message}`],
      semester: 'N/A',
      timestamp: startTime,
    };
  }
}
