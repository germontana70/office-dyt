'use server';

import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { createClient } from '@/infra/services/server';
import { normalizeNFD, getNameSearchTokens } from '@/infra/utils/normalize';
import { hhmmssToSeconds, secondsToHHMMSS } from '@/infra/utils/timeline';
import type { MuestraPresentacion, ProgramDetail, Recital, PresentacionPool } from '@/infra/types/muestras';

const ACTIVE_SEMESTER = '2026-1';

// ─────────────────────────────────────────────────────────────
//  ROBOT: Google Auth
// ─────────────────────────────────────────────────────────────

function getGoogleAuth() {
    const credentialsPath = path.join(process.cwd(), 'credenciales', 'credenciales_robot.json');
    if (!fs.existsSync(credentialsPath)) {
        throw new Error(`[ROBOT] Credenciales no encontradas en: ${credentialsPath}`);
    }
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    return new google.auth.GoogleAuth({
        credentials: {
            client_email: credentials.client_email,
            private_key: credentials.private_key.replace(/\\n/g, '\n'),
        },
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets.readonly',
            'https://www.googleapis.com/auth/drive.readonly',
        ],
    });
}

// ─────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────

export interface DriveFile {
    id: string;
    name: string;
    createdTime: string;
}

export interface CorrelationResult {
    inputName: string;
    studentId: string | null;
    fullName: string | null;
    birthDate: string | null;
    ageYears: number | null;
    confidence: 'exact' | 'fuzzy' | 'none';
    matchedOn: string | null;
}

export interface ImportTabResult {
    fileName: string;
    rowsProcessed: number;
    rowsInserted: number;
    rowsSkipped: number;
    errors: string[];
}

function calculateAge(birthDate: string | null): number | null {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

export async function correlateStudentIdentity(rawName: string): Promise<CorrelationResult> {
    const result: CorrelationResult = {
        inputName: rawName,
        studentId: null,
        fullName: null,
        birthDate: null,
        ageYears: null,
        confidence: 'none',
        matchedOn: null,
    };

    if (!rawName || rawName.trim() === '') return result;

    try {
        const supabase = await createClient();
        const normalizedInput = normalizeNFD(rawName);
        const tokens = getNameSearchTokens(rawName);

        const { data: students, error } = await supabase
            .from('students')
            .select('id, first_name, last_name, birth_date')
            .eq('status', 'active');

        if (error || !students) return result;

        for (const s of students) {
            const dbFull = normalizeNFD(`${s.first_name} ${s.last_name}`);
            if (dbFull === normalizedInput) {
                return {
                    ...result,
                    studentId: s.id,
                    fullName: `${s.first_name} ${s.last_name}`,
                    birthDate: s.birth_date,
                    ageYears: calculateAge(s.birth_date),
                    confidence: 'exact',
                    matchedOn: 'full_name',
                };
            }
        }

        for (const token of tokens) {
            for (const s of students) {
                const dbFirst = normalizeNFD(s.first_name);
                const dbLast = normalizeNFD(s.last_name);
                if (dbFirst.includes(token) || dbLast.includes(token)) {
                    return {
                        ...result,
                        studentId: s.id,
                        fullName: `${s.first_name} ${s.last_name}`,
                        birthDate: s.birth_date,
                        ageYears: calculateAge(s.birth_date),
                        confidence: 'fuzzy',
                        matchedOn: `token:${token}`,
                    };
                }
            }
        }

        return result;
    } catch (err: any) {
        console.error('[BIO-CORRELATOR] Error:', err);
        return result;
    }
}

// ─────────────────────────────────────────────────────────────
//  SKILL: sheets-robot-multi-sync
//  Escaneo de Archivos en Drive
// ─────────────────────────────────────────────────────────────

export async function listSheetFiles(
    semester: string = ACTIVE_SEMESTER
): Promise<{ success: boolean; files?: DriveFile[]; error?: string }> {
    try {
        const auth = getGoogleAuth();
        const drive = google.drive({ version: 'v3', auth });

        // Busca archivos Sheets que contengan el semestre en el nombre, ordenados de más reciente a más antiguo
        const response = await drive.files.list({
            // Buscamos el semestre pero excluimos archivos de consolidación de pagos
            q: `mimeType='application/vnd.google-apps.spreadsheet' and name contains '${semester}' and not name contains 'pago' and trashed=false`,
            spaces: 'drive',
            fields: 'files(id, name, createdTime)',
            orderBy: 'createdTime desc',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            pageSize: 50,
        });

        const files = response.data.files ?? [];
        return {
            success: true,
            files: files.map((f) => ({
                id: f.id!,
                name: f.name!,
                createdTime: f.createdTime!,
            })),
        };
    } catch (error: any) {
        console.error('[ROBOT] Error al listar archivos:', error);
        return { success: false, error: error.message };
    }
}

// ─────────────────────────────────────────────────────────────
//  ETL: Importar Hoja 1 de múltiples archivos al POOL MAESTRO
// ─────────────────────────────────────────────────────────────

export async function importFilesToPool(
    files: { id: string; name: string }[],
    semester: string = ACTIVE_SEMESTER
): Promise<{ success: boolean; results?: ImportTabResult[]; error?: string }> {
    try {
        const auth = getGoogleAuth();
        const sheets = google.sheets({ version: 'v4', auth });
        const supabase = await createClient();
        const results: ImportTabResult[] = [];

        for (const file of files) {
            const result: ImportTabResult = {
                fileName: file.name,
                rowsProcessed: 0,
                rowsInserted: 0,
                rowsSkipped: 0,
                errors: [],
            };

            try {
                // Obtener propiedades para saber el nombre exacto de la primera pestaña
                const meta = await sheets.spreadsheets.get({
                    spreadsheetId: file.id,
                    fields: 'sheets.properties.title',
                });
                
                const firstTabName = meta.data.sheets?.[0]?.properties?.title ?? 'Hoja 1';

                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: file.id,
                    range: `'${firstTabName}'!A:Z`,
                });

                const rows = response.data.values ?? [];
                if (rows.length < 2) { results.push(result); continue; }

                // Normalizar encabezados
                const rawHeaders = rows[0].map((h: string) => String(h ?? '').trim().toLowerCase());
                const dataRows = rows.slice(1);
                result.rowsProcessed = dataRows.length;

                const col = (keyword: string): number => rawHeaders.findIndex((h) => h.includes(keyword.toLowerCase()));

                // ESTRUCTURA DEL SHEET:
                //   'fullname' → Identificador del BLOQUE horario (ej: "PIANO - 3:00pm - CASTELLANA") — NO es el nombre del alumno
                //   'cupo 1'   → Nombre REAL del estudiante (ej: "MARÍA PAZ RIVEROS LEÓN")
                // Por eso se prioriza 'cupo' (nombre real) y 'fullname' solo se guarda como referencia de bloque.
                const iBlockName = col('fullname');                          // Bloque horario (referencia)
                const iStudentName = col('cupo');                            // Nombre real del estudiante
                const iTeacher = col('profesor');
                const iInstrument = col('materia');

                const temaCols = rawHeaders.map((h, i) => (h.includes('tema') && !h.includes('dur') ? i : -1)).filter((i) => i !== -1);
                const compositorCols = rawHeaders.map((h, i) => (h.includes('compositor') ? i : -1)).filter((i) => i !== -1);
                const duracionCols = rawHeaders.map((h, i) => (h.includes('duración') || h.includes('duracion') ? i : -1)).filter((i) => i !== -1);

                for (const row of dataRows) {
                    const studentName = (row[iStudentName] ?? '').toString().trim();
                    if (!studentName) { result.rowsSkipped++; continue; }

                    const teacherName = (row[iTeacher] ?? '').toString().trim();
                    const instrument = (row[iInstrument] ?? '').toString().trim();

                    const programDetails: ProgramDetail[] = [];
                    let totalDurationSecs = 0;

                    for (let t = 0; t < temaCols.length; t++) {
                        const title = (row[temaCols[t]] ?? '').toString().trim();
                        if (!title) continue;

                        const composer = (row[compositorCols[t]] ?? '').toString().trim();
                        const durText = (row[duracionCols[t]] ?? '00:00:00').toString().trim();
                        const durSecs = hhmmssToSeconds(durText);
                        totalDurationSecs += durSecs;

                        programDetails.push({
                            order: t + 1,
                            title,
                            composer,
                            duration_text: durText,
                            duration_seconds: durSecs,
                        });
                    }

                    const correlation = await correlateStudentIdentity(studentName);

                    const record = {
                        student_id: correlation.studentId,
                        student_name: studentName,
                        age_at_recital: correlation.ageYears,
                        teacher_id: null,
                        teacher_name: teacherName,
                        instrument,
                        program_details: programDetails,
                        total_duration_seconds: totalDurationSecs,
                        duration_text: secondsToHHMMSS(totalDurationSecs),
                        semester,
                        imported_from_file_id: file.id,
                        imported_from_file_name: file.name,
                    };

                    const { error: insertError } = await supabase
                        .from('dyt_presentaciones_pool')
                        .insert(record);

                    if (insertError) {
                        result.errors.push(`${studentName}: ${insertError.message}`);
                    } else {
                        result.rowsInserted++;
                    }
                }
            } catch (tabErr: any) {
                result.errors.push(`Error al procesar archivo: ${tabErr.message}`);
            }

            results.push(result);
        }

        return { success: true, results };
    } catch (error: any) {
        console.error('[ETL] Error general de importación al pool:', error);
        return { success: false, error: error.message };
    }
}

// ─────────────────────────────────────────────────────────────
//  POOL: Operaciones
// ─────────────────────────────────────────────────────────────

export async function getPoolItems(
    semester: string = ACTIVE_SEMESTER
): Promise<{ success: boolean; items?: PresentacionPool[]; error?: string }> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('dyt_presentaciones_pool')
            .select('*')
            .eq('semester', semester)
            .order('imported_at', { ascending: false });
            
        if (error) throw new Error(error.message);
        return { success: true, items: (data ?? []) as PresentacionPool[] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function assignToRecital(
    poolIds: string[],
    recitalId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();

        // Obtener el máximo sort_order actual para agregar al final
        const { data: maxRow } = await supabase
            .from('dyt_recital_items')
            .select('sort_order')
            .eq('recital_id', recitalId)
            .order('sort_order', { ascending: false })
            .limit(1)
            .single();

        let currentOrder = (maxRow?.sort_order ?? 0) + 1;

        const itemsToInsert = poolIds.map(poolId => ({
            recital_id: recitalId,
            pool_id: poolId,
            sort_order: currentOrder++,
            is_blank_event: false,
        }));

        const { error } = await supabase
            .from('dyt_recital_items')
            .insert(itemsToInsert);

        if (error) throw new Error(error.message);
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─────────────────────────────────────────────────────────────
//  RECITALES: CRUD
// ─────────────────────────────────────────────────────────────

export async function getRecitalesBySemester(
    semester: string = ACTIVE_SEMESTER
): Promise<{ success: boolean; recitales?: Recital[]; error?: string }> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('dyt_recitales')
            .select('*')
            .eq('semester', semester)
            .order('start_time', { ascending: true });
        if (error) throw new Error(error.message);
        return { success: true, recitales: data ?? [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function createRecital(
    name: string,
    startTime: string,
    semester: string = ACTIVE_SEMESTER,
    location?: string
): Promise<{ success: boolean; recital?: Recital; error?: string }> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('dyt_recitales')
            .insert({ name, start_time: startTime, semester, location: location ?? null })
            .select()
            .single();
        if (error) throw new Error(error.message);
        return { success: true, recital: data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─────────────────────────────────────────────────────────────
//  TIMELINE: Reorder, blank events, duration update
// ─────────────────────────────────────────────────────────────

export async function getRecitalItems(
    recitalId: string
): Promise<{ success: boolean; items?: MuestraPresentacion[]; error?: string }> {
    try {
        const supabase = await createClient();
        // Join con pool
        const { data, error } = await supabase
            .from('dyt_recital_items')
            .select(`
                id, recital_id, sort_order, pool_id, is_blank_event, blank_event_label, blank_duration_seconds, blank_duration_text,
                pool:dyt_presentaciones_pool (
                    student_id, student_name, age_at_recital, teacher_id, teacher_name, instrument, program_details, total_duration_seconds, duration_text
                )
            `)
            .eq('recital_id', recitalId)
            .order('sort_order', { ascending: true });
            
        if (error) throw new Error(error.message);

        const items: MuestraPresentacion[] = (data ?? []).map((row: any) => {
            const p = row.pool;
            return {
                id: row.id,
                recital_id: row.recital_id,
                sort_order: row.sort_order,
                pool_id: row.pool_id,
                is_blank_event: row.is_blank_event,
                blank_event_label: row.blank_event_label,
                blank_duration_seconds: row.blank_duration_seconds,
                blank_duration_text: row.blank_duration_text,
                
                // Mapeo desde el pool o del blank_event
                student_id: p?.student_id,
                student_name: p?.student_name,
                age_at_recital: p?.age_at_recital,
                teacher_id: p?.teacher_id,
                teacher_name: p?.teacher_name,
                instrument: p?.instrument,
                program_details: p?.program_details,
                total_duration_seconds: row.is_blank_event ? row.blank_duration_seconds : (p?.total_duration_seconds ?? 0),
                duration_text: row.is_blank_event ? row.blank_duration_text : (p?.duration_text ?? '00:00:00'),
            };
        });

        return { success: true, items };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function reorderItem(
    idA: string, orderA: number,
    idB: string, orderB: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();
        await supabase.from('dyt_recital_items').update({ sort_order: -999 }).eq('id', idA);
        await supabase.from('dyt_recital_items').update({ sort_order: orderA }).eq('id', idB);
        const { error } = await supabase.from('dyt_recital_items').update({ sort_order: orderB }).eq('id', idA);
        if (error) throw new Error(error.message);
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function insertBlankEvent(
    recitalId: string,
    afterSortOrder: number,
    label: string,
    durationText: string = '00:02:00'
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();
        const newOrder = afterSortOrder + 1;

        await supabase.rpc('shift_sort_order', {
            p_recital_id: recitalId,
            p_from_order: newOrder
        });

        const durationSecs = hhmmssToSeconds(durationText);
        const { error } = await supabase.from('dyt_recital_items').insert({
            recital_id: recitalId,
            sort_order: newOrder,
            is_blank_event: true,
            blank_event_label: label,
            blank_duration_seconds: durationSecs,
            blank_duration_text: durationText,
        });

        if (error) throw new Error(error.message);
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function deleteRecitalItem(itemId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();
        const { error } = await supabase.from('dyt_recital_items').delete().eq('id', itemId);
        if (error) throw new Error(error.message);
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function updateItemDuration(
    itemId: string,
    durationText: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();
        const secs = hhmmssToSeconds(durationText);
        // Sólo actualizamos blank_duration porque el tiempo de un pool item es fijo
        const { error } = await supabase
            .from('dyt_recital_items')
            .update({ blank_duration_text: durationText, blank_duration_seconds: secs })
            .eq('id', itemId);
        if (error) throw new Error(error.message);
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
