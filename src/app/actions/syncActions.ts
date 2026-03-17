'use server';

/**
 * @module syncActions
 * @description Server Action: Google Sheets → Supabase Sync Engine
 * @layer SERVER ACTION (Business Logic)
 * @version 1.0.0
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
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface SyncResult {
  success: boolean;
  fetched: number;
  upserted: number;
  skipped: number;
  errors: string[];
  semester: string;
  timestamp: string;
}

interface RawSheetRow {
  [key: string]: string;
}

interface MappedFormResponse {
  [key: string]: string | number | null;
}

// ═══════════════════════════════════════════════════════════
// COLUMN MAPPING (SIA 2.0 PARITY — sync_service.py:93-137)
// ═══════════════════════════════════════════════════════════

const FIELD_MAPPING: Record<string, string> = {
  'Marca temporal': 'timestamp',
  'Categoria del estudiante': 'student_category',
  'Nombres del Estudiante': 'first_name',
  'Apellidos del Estudiante': 'last_name',
  'Tipo de documento de identificación': 'document_type',
  'Número de identificación': 'document_number',
  'Lugar de Expedición del documento': 'document_expedition_place',
  'Género': 'gender',
  'Fecha de nacimiento': 'birth_date',
  'Edad': 'age',
  'Teléfono de contacto': 'phone',
  'Dirección de su residencia': 'address',
  'Barrio': 'neighborhood',
  'Email': 'email',
  'Grado escolar actual': 'current_grade',
  'Nombre de la Institución educativa actual.': 'current_school',
  'Grupo Sanguíneo': 'blood_type',
  'FACTOR RH': 'rh_factor',
  'Nombre de la EPS o Medicina Prepagada': 'health_insurance',
  'Programas de iniciación musical': 'music_initiation_programs',
  'Programa o Curso': 'program_or_course',
  'Programa - que va a estudiar ahora': 'program_to_study_now',
  'Sede donde tomará las clases': 'campus',
  'Día que prefiere para sus clases (Los Lunes la escuela no opera)': 'preferred_day',
  'Franja horaria preferida': 'preferred_time_slot',
  'Horario sugerido': 'suggested_schedule',
  'Nombre completo del padre': 'father_full_name',
  'Teléfono Fijo del papá': 'father_landline',
  'Celular del Papá': 'father_mobile',
  'Email del papá': 'father_email',
  'Tipo de Documento': 'father_document_type',
  'Número de Documento del Papá': 'father_document_number',
  'Nombre completo de la mamá': 'mother_full_name',
  'Teléfono Fijo de la mamá': 'mother_landline',
  'Celular de la mamá': 'mother_mobile',
  'Email de la mamá': 'mother_email',
  'Número de Documento de la Mamá': 'mother_document_number',
  'Nombre completo del acudiente': 'guardian_full_name',
  'Teléfono del acudiente': 'guardian_phone',
  'Dirección del Acudiente': 'guardian_address',
  'Email del acudiente': 'guardian_email',
  'Tipo de Documento del Acudiente': 'guardian_document_type',
  'Número de Documento del Acudiente': 'guardian_document_number',
};

// ═══════════════════════════════════════════════════════════
// SANITIZERS (SIA 2.0 PARITY — supabase_student_repo.py)
// ═══════════════════════════════════════════════════════════

/**
 * Removes dots and commas from document numbers.
 * Parity: supabase_student_repo.py:327-331
 * Example: "1.147.489.612" → "1147489612"
 */
function cleanDocumentNumber(doc: string | null | undefined): string {
  if (!doc || String(doc).trim() === '') return '';
  return String(doc).replace(/\./g, '').replace(/,/g, '').trim();
}

/**
 * Removes dots and commas from phone numbers.
 * Parity: supabase_student_repo.py:335
 */
function cleanPhone(phone: string | null | undefined): string {
  return String(phone || '').replace(/\./g, '').replace(/,/g, '').trim();
}

/**
 * Converts to UPPERCASE for standardization.
 * Parity: supabase_student_repo.py:334
 */
function toUpperOrEmpty(value: string | null | undefined): string {
  return (value || '').toUpperCase();
}

/**
 * Converts flexible date formats to ISO YYYY-MM-DD.
 * Parity: supabase_student_repo.py:285-311
 *
 * Supported formats (in order):
 *   DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, YYYY/MM/DD, DD/MM/YY, DD.MM.YYYY
 */
function convertBirthDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (['', 'None', 'N/A', 'nan'].includes(s)) return null;

  // Format: DD/MM/YYYY or DD/MM/YY
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, day, month, yearRaw] = slashMatch;
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Format: YYYY-MM-DD (already ISO)
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  // Format: DD-MM-YYYY
  const dashMatch = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    return `${dashMatch[3]}-${dashMatch[2].padStart(2, '0')}-${dashMatch[1].padStart(2, '0')}`;
  }

  // Format: YYYY/MM/DD
  const reverseSlashMatch = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (reverseSlashMatch) {
    return `${reverseSlashMatch[1]}-${reverseSlashMatch[2].padStart(2, '0')}-${reverseSlashMatch[3].padStart(2, '0')}`;
  }

  // Format: DD.MM.YYYY
  const dotMatch = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    return `${dotMatch[3]}-${dotMatch[2].padStart(2, '0')}-${dotMatch[1].padStart(2, '0')}`;
  }

  return null; // Unrecognized format → null to prevent SQL errors
}

/**
 * Converts "DD/M/YYYY HH:MM:SS" timestamp to ISO date "YYYY-MM-DD".
 * Parity: supabase_student_repo.py:314-324
 */
function convertTimestamp(tsStr: string | null | undefined): string | null {
  if (!tsStr || tsStr === '') return null;
  const s = String(tsStr);

  // Try DD/M/YYYY HH:MM:SS
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s/);
  if (match) {
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }

  // If already ISO-ish, take first 10 chars
  if (s.length >= 10) return s.substring(0, 10);
  return null;
}

/**
 * Extracts integer age from strings like "12 años".
 * Parity: supabase_student_repo.py:372
 */
function parseAge(ageStr: string | null | undefined): number | null {
  if (!ageStr) return null;
  const first = String(ageStr).trim().split(/\s+/)[0];
  const num = parseInt(first, 10);
  return isNaN(num) ? null : num;
}

/**
 * Converts empty strings and blank spaces to null.
 * Parity: sync_service.py:143-145
 */
function emptyToNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

// ═══════════════════════════════════════════════════════════
// HASH COMPUTATION (SIA 2.0 PARITY — sheets_fetch_skill.py:74-104)
// ═══════════════════════════════════════════════════════════

function computeRowHash(row: RawSheetRow): string {
  const excludeFields = ['Marca temporal', 'timestamp'];
  const filtered: Record<string, string> = {};

  for (const key of Object.keys(row).sort()) {
    if (!excludeFields.includes(key)) {
      filtered[key] = row[key];
    }
  }

  const jsonStr = JSON.stringify(filtered);
  return crypto.createHash('sha256').update(jsonStr, 'utf-8').digest('hex');
}

// ═══════════════════════════════════════════════════════════
// HELPER: Build Family Member JSONB
// Parity: supabase_student_repo.py:338-357
// ═══════════════════════════════════════════════════════════

interface FamilyMember {
  full_name: string;
  mobile: string;
  email: string | null;
  document_number: string;
  document_type: string;
  landline?: string;
  address?: string;
}

function buildFamilyMember(
  mapped: MappedFormResponse,
  nameKey: string,
  mobileKey: string,
  emailKey: string,
  docKey: string,
  docTypeKey: string,
  landlineKey?: string,
  addressKey?: string,
): FamilyMember | Record<string, never> {
  const fullName = toUpperOrEmpty(mapped[nameKey] as string | null);
  if (!fullName) return {};

  const docType = (mapped[docTypeKey] as string | null) || 'Cédula de Ciudadanía';

  const data: FamilyMember = {
    full_name: fullName,
    mobile: cleanPhone(mapped[mobileKey] as string | null),
    email: emptyToNull(mapped[emailKey] as string | null),
    document_number: cleanDocumentNumber(mapped[docKey] as string | null),
    document_type: docType,
  };

  if (landlineKey) {
    data.landline = cleanPhone(mapped[landlineKey] as string | null);
  }
  if (addressKey) {
    data.address = toUpperOrEmpty(mapped[addressKey] as string | null);
  }

  return data;
}

// ═══════════════════════════════════════════════════════════
// SHEET URL HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Extracts Google Sheet ID from URL.
 * Parity: migration_service.py:69-74
 */
function extractSheetIdFromUrl(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Builds a CSV download URL from a Google Sheet ID.
 * This allows us to fetch the sheet data without gspread/OAuth.
 */
function buildCsvExportUrl(sheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
}

// ═══════════════════════════════════════════════════════════
// CSV PARSER (replaces gspread + pandas)
// ═══════════════════════════════════════════════════════════

function parseCsvToRows(csvText: string): RawSheetRow[] {
  const lines = csvText.split('\n');
  if (lines.length < 2) return [];

  // Parse headers (first line)
  const headers = parseCsvLine(lines[0]);

  const rows: RawSheetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = parseCsvLine(line);

    // Skip completely empty rows (parity: sheets_fetch_skill.py:56)
    if (values.every(v => v.trim() === '')) continue;

    const row: RawSheetRow = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = j < values.length ? values[j] : '';
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Parses a single CSV line, respecting quoted fields.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

// ═══════════════════════════════════════════════════════════
// PHASE 1: MAP SHEET ROW → FORM_RESPONSE SCHEMA
// Parity: sync_service.py:80-179 (map_sheets_row_to_form_response)
// ═══════════════════════════════════════════════════════════

function mapSheetRowToFormResponse(row: RawSheetRow): MappedFormResponse {
  const mapped: MappedFormResponse = {};

  for (const [spanishKey, englishKey] of Object.entries(FIELD_MAPPING)) {
    if (spanishKey in row) {
      mapped[englishKey] = emptyToNull(row[spanishKey]);
    }
  }

  // Special: Age → integer
  if (mapped.age) {
    mapped.age = parseAge(mapped.age as string);
  }

  // Special: birth_date → ISO YYYY-MM-DD
  if (mapped.birth_date) {
    mapped.birth_date = convertBirthDate(mapped.birth_date as string);
  }

  // Special: timestamp → ISO datetime  
  if (mapped.timestamp) {
    const ts = mapped.timestamp as string;
    const parts = ts.split(' ');
    if (parts.length === 2) {
      const dateParts = parts[0].split('/');
      if (dateParts.length === 3) {
        const isoDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
        mapped.timestamp = `${isoDate}T${parts[1]}`;
      }
    }
  }

  return mapped;
}

// ═══════════════════════════════════════════════════════════
// PHASE 2: BUILD STUDENT RECORD FROM FORM RESPONSE
// Parity: supabase_student_repo.py:250-448 (create_from_form_response)
// ═══════════════════════════════════════════════════════════

function buildStudentRecord(mapped: MappedFormResponse, semester: string) {
  // Helper to get value with fallback keys
  const getVal = (keys: string[]): string | null => {
    for (const k of keys) {
      if (mapped[k] != null && String(mapped[k]).trim() !== '') {
        return String(mapped[k]);
      }
    }
    return null;
  };

  const fatherInfo = buildFamilyMember(
    mapped,
    'father_full_name',
    'father_mobile',
    'father_email',
    'father_document_number',
    'father_document_type',
    'father_landline',
  );

  const motherInfo = buildFamilyMember(
    mapped,
    'mother_full_name',
    'mother_mobile',
    'mother_email',
    'mother_document_number',
    'mother_document_type',
    'mother_landline',
  );

  const guardianInfo = buildFamilyMember(
    mapped,
    'guardian_full_name',
    'guardian_phone',
    'guardian_email',
    'guardian_document_number',
    'guardian_document_type',
    undefined,
    'guardian_address',
  );

  // Build parent_names, parent_phones, parent_emails, guardian_info (concatenated strings)
  // Parity: supabase_student_repo.py:390-393
  const fatherName = toUpperOrEmpty(getVal(['father_full_name']));
  const motherName = toUpperOrEmpty(getVal(['mother_full_name']));
  const parentNames = `Padre: ${fatherName} | Madre: ${motherName}`;

  const fatherMobile = cleanPhone(getVal(['father_mobile']));
  const motherMobile = cleanPhone(getVal(['mother_mobile']));
  const parentPhones = `Padre: ${fatherMobile} | Madre: ${motherMobile}`;

  const fatherEmail = getVal(['father_email']) || '';
  const motherEmail = getVal(['mother_email']) || '';
  const parentEmails = `Padre: ${fatherEmail} | Madre: ${motherEmail}`;

  const guardianName = toUpperOrEmpty(getVal(['guardian_full_name']));
  const guardianPhone = cleanPhone(getVal(['guardian_phone']));
  const guardianInfoStr = `${guardianName} - ${guardianPhone}`;

  const studentData: Record<string, unknown> = {
    semester,

    // Basic Info — STANDARDIZED
    first_name: toUpperOrEmpty(getVal(['first_name'])),
    last_name: toUpperOrEmpty(getVal(['last_name'])),
    document_type: getVal(['document_type']),
    document_number: cleanDocumentNumber(getVal(['document_number'])),
    document_expedition_place: toUpperOrEmpty(getVal(['document_expedition_place'])),
    gender: toUpperOrEmpty(getVal(['gender'])),
    birth_date: convertBirthDate(getVal(['birth_date'])),
    age: parseAge(getVal(['age'])),

    // Contact — STANDARDIZED
    phone: cleanPhone(getVal(['phone'])),
    address: toUpperOrEmpty(getVal(['address'])),
    neighborhood: toUpperOrEmpty(getVal(['neighborhood'])),
    email: getVal(['email']),

    // Academic
    current_grade: getVal(['current_grade']),
    current_school: toUpperOrEmpty(getVal(['current_school'])),

    // Health
    blood_type: toUpperOrEmpty(getVal(['blood_type'])),
    rh_factor: toUpperOrEmpty(getVal(['rh_factor'])),
    health_insurance: toUpperOrEmpty(getVal(['health_insurance'])),

    // Family Info (concatenated strings — legacy compatibility)
    parent_names: parentNames,
    parent_phones: parentPhones,
    parent_emails: parentEmails,
    guardian_info: guardianInfoStr,

    // Family Info (detailed JSONB — new architecture)
    father_info: Object.keys(fatherInfo).length > 0 ? fatherInfo : {},
    mother_info: Object.keys(motherInfo).length > 0 ? motherInfo : {},
    guardian_info_detailed: Object.keys(guardianInfo).length > 0 ? guardianInfo : {},

    // Initialize defaults
    programs: [],
    payments: [],
    installments: [],
    is_active: true,
    enrollment_date: convertTimestamp(getVal(['timestamp'])),
  };

  // Remove null/undefined values (parity: supabase_student_repo.py:437)
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(studentData)) {
    if (value != null) {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

// ═══════════════════════════════════════════════════════════
// TRUTH TABLE RECORD BUILDER
// Maps sanitized student to Tabla_Verdad_Estudiantes columns (Spanish, SIA 2.0 parity)
// Parity: supabase_student_repo.py — create_from_form_response (truth table branch)
// ═══════════════════════════════════════════════════════════

/**
 * Builds a record compatible with Tabla_Verdad_Estudiantes Spanish column schema.
 * @see SIA 2.0 — supabase_student_repo.py
 * REGLA DE ORO: All fields are nullable. Never throws. Unknown columns → silently omit.
 */
function buildTruthTableRecord(mapped: MappedFormResponse, semester: string): Record<string, unknown> {
  const getVal = (keys: string[]): string | null => {
    for (const k of keys) {
      if (mapped[k] != null && String(mapped[k]).trim() !== '') return String(mapped[k]);
    }
    return null;
  };

  return {
    // Core identity (Spanish column names — SIA 2.0 dict)
    numero_de_identificacion: cleanDocumentNumber(getVal(['document_number'])),
    tipo_de_documento_de_identificacion: getVal(['document_type']),
    nombres_del_estudiante: toUpperOrEmpty(getVal(['first_name'])),
    apellidos_del_estudiante: toUpperOrEmpty(getVal(['last_name'])),
    genero: toUpperOrEmpty(getVal(['gender'])),
    fecha_de_nacimiento: convertBirthDate(getVal(['birth_date'])),
    edad: mapped.age ?? null,
    lugar_de_expedicion_del_documento: toUpperOrEmpty(getVal(['document_expedition_place'])),

    // Contact
    email: getVal(['email']),
    telefono_de_contacto: cleanPhone(getVal(['phone'])),
    direccion_de_su_residencia: toUpperOrEmpty(getVal(['address'])),
    barrio: toUpperOrEmpty(getVal(['neighborhood'])),

    // Academic
    grado_escolar_actual: getVal(['current_grade']),
    nombre_de_la_institucion_educativa_actual: toUpperOrEmpty(getVal(['current_school'])),
    programa_o_curso: getVal(['program_or_course']),
    programa_a_estudiar: getVal(['program_to_study_now']),

    // Health
    grupo_sanguineo: toUpperOrEmpty(getVal(['blood_type'])),
    factor_rh: toUpperOrEmpty(getVal(['rh_factor'])),
    nombre_de_la_eps_o_medicina_prepagada: toUpperOrEmpty(getVal(['health_insurance'])),

    // Father info (flattened)
    nombre_completo_del_padre: toUpperOrEmpty(getVal(['father_full_name'])),
    telefono_fijo_del_papa: cleanPhone(getVal(['father_landline'])),
    celular_del_papa: cleanPhone(getVal(['father_mobile'])),
    email_del_papa: getVal(['father_email']),
    numero_de_documento_del_papa: cleanDocumentNumber(getVal(['father_document_number'])),

    // Mother info (flattened)
    nombre_completo_de_la_mama: toUpperOrEmpty(getVal(['mother_full_name'])),
    telefono_fijo_de_la_mama: cleanPhone(getVal(['mother_landline'])),
    celular_de_la_mama: cleanPhone(getVal(['mother_mobile'])),
    email_de_la_mama: getVal(['mother_email']),
    numero_de_documento_de_la_mama: cleanDocumentNumber(getVal(['mother_document_number'])),

    // Guardian info (flattened)
    nombre_completo_del_acudiente: toUpperOrEmpty(getVal(['guardian_full_name'])),
    telefono_del_acudiente: cleanPhone(getVal(['guardian_phone'])),
    direccion_del_acudiente: toUpperOrEmpty(getVal(['guardian_address'])),
    email_del_acudiente: getVal(['guardian_email']),
    numero_de_documento_del_acudiente: cleanDocumentNumber(getVal(['guardian_document_number'])),

    // Semester tracking (audit fields)
    ultimo_semestre_visto: semester,
    updated_at: new Date().toISOString(),
  };
}

// Export sanitizers for use in reintegration actions
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
      // Rebuild truth table records from the original mapped data
      const truthTableBatch = batch.map(record => {
        // Reconstruct mapped from the student record enough for truth table
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
          // Father (extract from JSONB)
          father_full_name: (record as any).father_info?.full_name,
          father_mobile: (record as any).father_info?.mobile,
          father_landline: (record as any).father_info?.landline,
          father_email: (record as any).father_info?.email,
          father_document_number: (record as any).father_info?.document_number,
          // Mother
          mother_full_name: (record as any).mother_info?.full_name,
          mother_mobile: (record as any).mother_info?.mobile,
          mother_landline: (record as any).mother_info?.landline,
          mother_email: (record as any).mother_info?.email,
          mother_document_number: (record as any).mother_info?.document_number,
          // Guardian
          guardian_full_name: (record as any).guardian_info_detailed?.full_name,
          guardian_phone: (record as any).guardian_info_detailed?.mobile,
          guardian_address: (record as any).guardian_info_detailed?.address,
          guardian_email: (record as any).guardian_info_detailed?.email,
          guardian_document_number: (record as any).guardian_info_detailed?.document_number,
        };
        return buildTruthTableRecord(mapped, semester);
      }).filter(r => r.numero_de_identificacion); // Only valid entries

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
