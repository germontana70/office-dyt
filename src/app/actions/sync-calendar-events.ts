'use server';

import { createClient } from '@/infra/services/server';
import { GoogleCalendarService } from '@/infra/services/googleCalendarService';
import { parseGoogleCalendarEvent } from '@/core/utils/calendarParser';

// Normaliza un texto: quita tildes y pasa a minúsculas
function normalizeText(text: string): string {
    if (!text) return '';
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

/**
 * Directiva 2: Algoritmo de Match flexible por tokens.
 * Compara dos nombres sin importar el orden de las palabras.
 * Si todas las palabras de nameA están presentes en nameB, es MATCH.
 * Resuelve el problema de "APELLIDO NOMBRE" vs "NOMBRE APELLIDO".
 */
function flexibleMatch(nameA: string, nameB: string): boolean {
    // Dividimos por espacios, guiones o comas para detectar tokens individuales
    const tokensA = normalizeText(nameA).split(/[\s\-,]+/).filter(t => t.length > 2);
    const tokensB = normalizeText(nameB).split(/[\s\-,]+/);
    if (tokensA.length === 0) return false;
    return tokensA.every(token => tokensB.some(b => b.includes(token) || token.includes(b)));
}

/**
 * Syncs events from Google Calendar to Supabase calendar_events table.
 * Adheres to Domain-Driven Design constraints:
 * - Does NOT create or overwrite students/teachers.
 * - Upserts exclusively into calendar_events.
 */
export async function syncCalendarEventsAction(startDateStr: string, endDateStr: string, semester: string) {
    try {
        const supabase = await createClient();

        // 1. Fetch raw events from Google Calendar
        // Simplificación radical de fechas YYYY-MM-DD
        const timeMin = startDateStr.substring(0, 10) + 'T00:00:00-05:00';
        const timeMax = endDateStr.substring(0, 10) + 'T23:59:59-05:00';

        console.log('[SYNC ENGINE] Solicitando a Google -> timeMin:', timeMin, 'timeMax:', timeMax);

        const rawEvents = await GoogleCalendarService.fetchEventsPeriod(timeMin, timeMax);
        if (!rawEvents || rawEvents.length === 0) {
            return { success: true, message: 'No se encontraron eventos en este periodo.', count: 0 };
        }

        // 2. Fetch Truth Tables from Supabase (Soberanía de Entidades)
        const [teachersRes, studentsRes] = await Promise.all([
            supabase.from('teachers').select('id, name, nickname_1, nickname_2'),
            supabase.from('students').select('id, first_name, last_name, document_number')
        ]);

        const teachers = teachersRes.data || [];
        const students = studentsRes.data || [];

        // 3. To do a safe Upsert without requiring a UNIQUE constraint on google_event_id,
        // we fetch existing events in this period to get their Supabase IDs.
        const googleEventIds = rawEvents.map(e => e.id);
        // Chunking might be needed if too many, but for 1 month ~ 1000 events, IN query is fine
        const existingEventsRes = await supabase
            .from('calendar_events')
            .select('id, google_event_id')
            .in('google_event_id', googleEventIds);

        const existingEventsMap = new Map();
        (existingEventsRes.data || []).forEach((row: any) => {
            existingEventsMap.set(row.google_event_id, row.id);
        });

        // 4. Parse and Match
        const batchUpserts: any[] = [];
        const warningsList: { eventTitle: string; date: string; calendarName: string; studentHint: string }[] = [];

        for (const raw of rawEvents) {
            const parsed = parseGoogleCalendarEvent(raw.summary, raw.description, raw.calendarName);

            // ── Directiva 1: Clasificación estricta por nombre de calendario ──────
            // Canceladas: ÚNICAMENTE si el calendario origen es "Clases Canceladas"
            const isCancelledCalendar = raw.calendarName.trim().toLowerCase() === 'clases canceladas';
            // Reposiciones: Detección por título (independiente del calendario)
            const isReposicion = /reposici[oó]n/i.test(raw.summary);

            let effectiveStatus = parsed.status;
            if (isCancelledCalendar) effectiveStatus = 'cancelled';
            else if (isReposicion) effectiveStatus = 'makeup';

            // ── Regla 1: Fuzzy Match Teacher por nombre completo ────────────────
            let matchedTeacherName = parsed.teacherNameHint || 'DESCONOCIDO';
            if (parsed.teacherNameHint) {
                const found = teachers.find((t: any) =>
                    flexibleMatch(parsed.teacherNameHint, t.name) ||
                    flexibleMatch(t.name, parsed.teacherNameHint)
                );
                if (found) matchedTeacherName = found.name;
            }

            // ══════════════════════════════════════════════════════════════════
            // REGLA 1: Fuzzy Match Student por nombre completo (descripción)
            // ══════════════════════════════════════════════════════════════════
            let matchedStudentId: string | null = null;
            let groupLabel: string | null = null;   // nombre del programa (Regla 2)

            if (parsed.studentNameHint) {
                const found = students.find((s: any) => {
                    const fullName = `${s.first_name} ${s.last_name}`;
                    return flexibleMatch(parsed.studentNameHint, fullName) ||
                           flexibleMatch(fullName, parsed.studentNameHint);
                });
                if (found) matchedStudentId = found.id;
            }

            // ══════════════════════════════════════════════════════════════════
            // REGLA 2 (solo si Regla 1 falló): Buscar nickname del profesor
            // en el TÍTULO del evento → clase grupal → extraer nombre del grupo
            // ══════════════════════════════════════════════════════════════════
            let regla2TeacherName: string | null = null;

            if (!matchedStudentId) {
                const titleNorm = normalizeText(raw.summary);
                const nickMatch = teachers.find((t: any) => {
                    const n1 = t.nickname_1 ? normalizeText(t.nickname_1) : null;
                    const n2 = t.nickname_2 ? normalizeText(t.nickname_2) : null;
                    return (n1 && titleNorm.includes(n1)) || (n2 && titleNorm.includes(n2));
                });

                if (nickMatch) {
                    // Regla 2 acierta: identificamos al docente
                    regla2TeacherName = nickMatch.name;
                    matchedTeacherName = nickMatch.name;

                    // Extraer nombre del grupo/programa: todo lo que va ANTES
                    // del nickname del profesor en el título (ej. "PIANO (01)")
                    const nick = normalizeText(nickMatch.nickname_1 || nickMatch.nickname_2 || '');
                    const dashIdx = titleNorm.indexOf(nick);
                    if (dashIdx > 0) {
                        groupLabel = raw.summary.substring(0, dashIdx).replace(/[-\s]+$/, '').trim();
                    } else {
                        groupLabel = raw.calendarName;
                    }
                }
            }

            // Warning SOLO si ambas reglas fallan
            const hasWarning = !matchedStudentId && !regla2TeacherName;
            if (hasWarning) {
                warningsList.push({
                    eventTitle: raw.summary,
                    date: raw.start,
                    calendarName: raw.calendarName,
                    studentHint: parsed.studentNameHint || '(sin nombre en descripción)',
                });
            }

            // Construir notas finales
            let finalNotes = parsed.notes;
            if (groupLabel) {
                finalNotes = `[GRUPO: ${groupLabel}]\n${parsed.notes || ''}`;
            } else if (hasWarning) {
                finalNotes = `[ALERTA: ESTUDIANTE NO ENCONTRADO EN BD - "${parsed.studentNameHint}"]\n\n${parsed.notes}`;
            }

            // ── Construct Upsert Payload ─────────────────────────────────────────
            const payload: any = {
                google_event_id: raw.id,
                google_calendar_id: raw.calendarName,
                teacher_name: matchedTeacherName,
                student_id: matchedStudentId,
                program_name: raw.calendarName,
                event_date: raw.start,
                event_end_time: raw.end,
                status: effectiveStatus,       // Directiva 1: usa status estricto
                class_number: parsed.classNumber,
                notes: finalNotes,
                semester: semester,
            };

            // ── Directiva 3: Unicidad por google_event_id ─────────────────────────
            // Permite múltiples eventos por estudiante/día si tienen IDs distintos.
            const existingId = existingEventsMap.get(raw.id);
            payload.id = existingId ? existingId : crypto.randomUUID();

            batchUpserts.push(payload);
        }

        // 5. Execute Upsert Batch
        // Upserting large arrays can be heavy, but Supabase handles up to a few thousands easily.
        const CHUNK_SIZE = 500;
        for (let i = 0; i < batchUpserts.length; i += CHUNK_SIZE) {
            const chunk = batchUpserts.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase.from('calendar_events').upsert(chunk, { onConflict: 'google_event_id' });
            if (error) {
                console.error('Error insertando chunk en Supabase:', error);
                throw new Error(`Error BD en Supabase: ${error.message}`);
            }
        }

        const warningsCount = warningsList.length;
        return {
            success: true,
            count: batchUpserts.length,
            warnings: warningsCount,
            warningsList,
            message: `Sincronizados ${batchUpserts.length} eventos. ${warningsCount > 0 ? `⚠️ ${warningsCount} advertencias de alumnos huérfanos.` : '✅ Todos los alumnos cruzados con éxito.'}`
        };

    } catch (err: any) {
        console.error('Sync error:', err);
        // Fail-loud return strict object matching directive
        return { success: false, error: err.message, message: `Error API/Sincronización: ${err.message}` };
    }
}
