/**
 * @module studentMapper
 * @description Pure helper functions for SIA 2.0 data sanitization and mapping.
 * NO 'use server' directive — these are pure utility functions safe to import anywhere.
 * Parity: SIA 2.0 supabase_student_repo.py + sync_service.py + sheets_fetch_skill.py
 */

import crypto from 'crypto';

// ── Types ──────────────────────────────────────────────────

export interface RawSheetRow {
  [key: string]: string;
}

export interface MappedFormResponse {
  [key: string]: string | number | null;
}

export interface FamilyMember {
  full_name: string;
  mobile: string;
  email: string | null;
  document_number: string;
  document_type: string;
  landline?: string;
  address?: string;
}

// ── Column Mapping (SIA 2.0 PARITY — sync_service.py:93-137) ─

export const FIELD_MAPPING: Record<string, string> = {
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

// ── Sanitizers (SIA 2.0 PARITY — supabase_student_repo.py) ──

/** Removes dots and commas from document numbers. Parity: repo.py:327 */
export function cleanDocumentNumber(doc: string | null | undefined): string {
  if (!doc || String(doc).trim() === '') return '';
  return String(doc).replace(/\./g, '').replace(/,/g, '').trim();
}

/** Removes dots and commas from phone numbers. Parity: repo.py:335 */
export function cleanPhone(phone: string | null | undefined): string {
  return String(phone || '').replace(/\./g, '').replace(/,/g, '').trim();
}

/** Converts to UPPERCASE. Parity: repo.py:334 */
export function toUpperOrEmpty(value: string | null | undefined): string {
  return (value || '').toUpperCase();
}

/**
 * Converts flexible date formats to ISO YYYY-MM-DD.
 * Supported: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, YYYY/MM/DD, DD/MM/YY, DD.MM.YYYY
 * Parity: repo.py:285-311
 */
export function convertBirthDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (['', 'None', 'N/A', 'nan'].includes(s)) return null;

  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, day, month, yearRaw] = slashMatch;
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;

  const dashMatch = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) return `${dashMatch[3]}-${dashMatch[2].padStart(2, '0')}-${dashMatch[1].padStart(2, '0')}`;

  const reverseSlashMatch = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (reverseSlashMatch) return `${reverseSlashMatch[1]}-${reverseSlashMatch[2].padStart(2, '0')}-${reverseSlashMatch[3].padStart(2, '0')}`;

  const dotMatch = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) return `${dotMatch[3]}-${dotMatch[2].padStart(2, '0')}-${dotMatch[1].padStart(2, '0')}`;

  return null;
}

/** Converts "DD/M/YYYY HH:MM:SS" timestamp to ISO date. Parity: repo.py:314 */
export function convertTimestamp(tsStr: string | null | undefined): string | null {
  if (!tsStr || tsStr === '') return null;
  const s = String(tsStr);
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  if (s.length >= 10) return s.substring(0, 10);
  return null;
}

/** Extracts integer age from strings like "12 años". Parity: repo.py:372 */
export function parseAge(ageStr: string | null | undefined): number | null {
  if (!ageStr) return null;
  const num = parseInt(String(ageStr).trim().split(/\s+/)[0], 10);
  return isNaN(num) ? null : num;
}

/** Converts empty strings to null. Parity: sync_service.py:143 */
export function emptyToNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

// ── Hash computation (SIA 2.0 PARITY — sheets_fetch_skill.py:74) ─

export function computeRowHash(row: RawSheetRow): string {
  const excludeFields = ['Marca temporal', 'timestamp'];
  const filtered: Record<string, string> = {};
  for (const key of Object.keys(row).sort()) {
    if (!excludeFields.includes(key)) filtered[key] = row[key];
  }
  return crypto.createHash('sha256').update(JSON.stringify(filtered), 'utf-8').digest('hex');
}

// ── Family Member JSONB builder (SIA 2.0 PARITY — repo.py:338) ─

export function buildFamilyMember(
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
  const data: FamilyMember = {
    full_name: fullName,
    mobile: cleanPhone(mapped[mobileKey] as string | null),
    email: emptyToNull(mapped[emailKey] as string | null),
    document_number: cleanDocumentNumber(mapped[docKey] as string | null),
    document_type: (mapped[docTypeKey] as string | null) || 'Cédula de Ciudadanía',
  };
  if (landlineKey) data.landline = cleanPhone(mapped[landlineKey] as string | null);
  if (addressKey) data.address = toUpperOrEmpty(mapped[addressKey] as string | null);
  return data;
}

// ── CSV helpers ─────────────────────────────────────────────

export function extractSheetIdFromUrl(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export function buildCsvExportUrl(sheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
}

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
      else insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) { result.push(current); current = ''; }
    else current += char;
  }
  result.push(current);
  return result;
}

export function parseCsvToRows(csvText: string): RawSheetRow[] {
  const lines = csvText.split('\n');
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const rows: RawSheetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvLine(line);
    if (values.every(v => v.trim() === '')) continue;
    const row: RawSheetRow = {};
    for (let j = 0; j < headers.length; j++) row[headers[j]] = j < values.length ? values[j] : '';
    rows.push(row);
  }
  return rows;
}

// ── Row → FormResponse mapper ────────────────────────────────

export function mapSheetRowToFormResponse(row: RawSheetRow): MappedFormResponse {
  const mapped: MappedFormResponse = {};
  for (const [spanishKey, englishKey] of Object.entries(FIELD_MAPPING)) {
    if (spanishKey in row) mapped[englishKey] = emptyToNull(row[spanishKey]);
  }
  if (mapped.age) mapped.age = parseAge(mapped.age as string);
  if (mapped.birth_date) mapped.birth_date = convertBirthDate(mapped.birth_date as string);
  if (mapped.timestamp) {
    const ts = mapped.timestamp as string;
    const parts = ts.split(' ');
    if (parts.length === 2) {
      const dp = parts[0].split('/');
      if (dp.length === 3)
        mapped.timestamp = `${dp[2]}-${dp[1].padStart(2, '0')}-${dp[0].padStart(2, '0')}T${parts[1]}`;
    }
  }
  return mapped;
}

// ── Student Record builder ───────────────────────────────────

export function buildStudentRecord(mapped: MappedFormResponse, semester: string): Record<string, unknown> {
  const getVal = (keys: string[]): string | null => {
    for (const k of keys) {
      if (mapped[k] != null && String(mapped[k]).trim() !== '') return String(mapped[k]);
    }
    return null;
  };

  const fatherInfo = buildFamilyMember(mapped, 'father_full_name', 'father_mobile', 'father_email', 'father_document_number', 'father_document_type', 'father_landline');
  const motherInfo = buildFamilyMember(mapped, 'mother_full_name', 'mother_mobile', 'mother_email', 'mother_document_number', 'mother_document_type', 'mother_landline');
  const guardianInfo = buildFamilyMember(mapped, 'guardian_full_name', 'guardian_phone', 'guardian_email', 'guardian_document_number', 'guardian_document_type', undefined, 'guardian_address');

  const fatherName = toUpperOrEmpty(getVal(['father_full_name']));
  const motherName = toUpperOrEmpty(getVal(['mother_full_name']));

  const studentData: Record<string, unknown> = {
    semester,
    first_name: toUpperOrEmpty(getVal(['first_name'])),
    last_name: toUpperOrEmpty(getVal(['last_name'])),
    document_type: getVal(['document_type']),
    document_number: cleanDocumentNumber(getVal(['document_number'])),
    document_expedition_place: toUpperOrEmpty(getVal(['document_expedition_place'])),
    gender: toUpperOrEmpty(getVal(['gender'])),
    birth_date: convertBirthDate(getVal(['birth_date'])),
    age: parseAge(getVal(['age'])),
    phone: cleanPhone(getVal(['phone'])),
    address: toUpperOrEmpty(getVal(['address'])),
    neighborhood: toUpperOrEmpty(getVal(['neighborhood'])),
    email: getVal(['email']),
    current_grade: getVal(['current_grade']),
    current_school: toUpperOrEmpty(getVal(['current_school'])),
    blood_type: toUpperOrEmpty(getVal(['blood_type'])),
    rh_factor: toUpperOrEmpty(getVal(['rh_factor'])),
    health_insurance: toUpperOrEmpty(getVal(['health_insurance'])),
    parent_names: `Padre: ${fatherName} | Madre: ${motherName}`,
    parent_phones: `Padre: ${cleanPhone(getVal(['father_mobile']))} | Madre: ${cleanPhone(getVal(['mother_mobile']))}`,
    parent_emails: `Padre: ${getVal(['father_email']) || ''} | Madre: ${getVal(['mother_email']) || ''}`,
    guardian_info: `${toUpperOrEmpty(getVal(['guardian_full_name']))} - ${cleanPhone(getVal(['guardian_phone']))}`,
    father_info: Object.keys(fatherInfo).length > 0 ? fatherInfo : {},
    mother_info: Object.keys(motherInfo).length > 0 ? motherInfo : {},
    guardian_info_detailed: Object.keys(guardianInfo).length > 0 ? guardianInfo : {},
    programs: [],
    payments: [],
    installments: [],
    is_active: true,
    enrollment_date: convertTimestamp(getVal(['timestamp'])),
  };

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(studentData)) {
    if (value != null) cleaned[key] = value;
  }
  return cleaned;
}

// ── Truth Table Record builder ───────────────────────────────

export function buildTruthTableRecord(mapped: MappedFormResponse, semester: string): Record<string, unknown> {
  const getVal = (keys: string[]): string | null => {
    for (const k of keys) {
      if (mapped[k] != null && String(mapped[k]).trim() !== '') return String(mapped[k]);
    }
    return null;
  };

  return {
    numero_de_identificacion: cleanDocumentNumber(getVal(['document_number'])),
    tipo_de_documento_de_identificacion: getVal(['document_type']),
    nombres_del_estudiante: toUpperOrEmpty(getVal(['first_name'])),
    apellidos_del_estudiante: toUpperOrEmpty(getVal(['last_name'])),
    genero: toUpperOrEmpty(getVal(['gender'])),
    fecha_de_nacimiento: convertBirthDate(getVal(['birth_date'])),
    edad: mapped.age ?? null,
    lugar_de_expedicion_del_documento: toUpperOrEmpty(getVal(['document_expedition_place'])),
    email: getVal(['email']),
    telefono_de_contacto: cleanPhone(getVal(['phone'])),
    direccion_de_su_residencia: toUpperOrEmpty(getVal(['address'])),
    barrio: toUpperOrEmpty(getVal(['neighborhood'])),
    grado_escolar_actual: getVal(['current_grade']),
    nombre_de_la_institucion_educativa_actual: toUpperOrEmpty(getVal(['current_school'])),
    programa_o_curso: getVal(['program_or_course']),
    programa_a_estudiar: getVal(['program_to_study_now']),
    grupo_sanguineo: toUpperOrEmpty(getVal(['blood_type'])),
    factor_rh: toUpperOrEmpty(getVal(['rh_factor'])),
    nombre_de_la_eps_o_medicina_prepagada: toUpperOrEmpty(getVal(['health_insurance'])),
    nombre_completo_del_padre: toUpperOrEmpty(getVal(['father_full_name'])),
    telefono_fijo_del_papa: cleanPhone(getVal(['father_landline'])),
    celular_del_papa: cleanPhone(getVal(['father_mobile'])),
    email_del_papa: getVal(['father_email']),
    numero_de_documento_del_papa: cleanDocumentNumber(getVal(['father_document_number'])),
    nombre_completo_de_la_mama: toUpperOrEmpty(getVal(['mother_full_name'])),
    telefono_fijo_de_la_mama: cleanPhone(getVal(['mother_landline'])),
    celular_de_la_mama: cleanPhone(getVal(['mother_mobile'])),
    email_de_la_mama: getVal(['mother_email']),
    numero_de_documento_de_la_mama: cleanDocumentNumber(getVal(['mother_document_number'])),
    nombre_completo_del_acudiente: toUpperOrEmpty(getVal(['guardian_full_name'])),
    telefono_del_acudiente: cleanPhone(getVal(['guardian_phone'])),
    direccion_del_acudiente: toUpperOrEmpty(getVal(['guardian_address'])),
    email_del_acudiente: getVal(['guardian_email']),
    numero_de_documento_del_acudiente: cleanDocumentNumber(getVal(['guardian_document_number'])),
    ultimo_semestre_visto: semester,
    updated_at: new Date().toISOString(),
  };
}
