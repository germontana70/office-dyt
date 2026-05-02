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
    const tokensA = normalizeText(nameA).split(/[\s\-,]+/).filter(t => t.length >= 3);
    const tokensB = normalizeText(nameB).split(/[\s\-,]+/).filter(t => t.length >= 3);
    if (tokensA.length === 0 || tokensB.length === 0) return false;

    // Verificación de que CADA palabra del string de búsqueda exista exactamente en el string objetivo
    return tokensA.every(tokenA => tokensB.includes(tokenA));
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

        // 3. HARD SYNC: Borrar todos los eventos del rango temporal antes de reinsertar.
        // Esto garantiza que Supabase siempre refleje la realidad actual de Google Calendar
        // sin ningún dato obsoleto o corrupto de sincronizaciones anteriores.
        console.log(`[SYNC ENGINE] 🗑️ Borrando eventos existentes del rango: ${timeMin} → ${timeMax}`);
        const { error: deleteRangeError, count: deletedRangeCount } = await supabase
            .from('calendar_events')
            .delete({ count: 'exact' })
            .gte('event_date', timeMin)
            .lte('event_date', timeMax);

        if (deleteRangeError) {
            console.error('[SYNC ENGINE] Error al limpiar el rango:', deleteRangeError);
            throw new Error(`Error limpiando rango en Supabase: ${deleteRangeError.message}`);
        }
        console.log(`[SYNC ENGINE] ✅ ${deletedRangeCount ?? 0} eventos anteriores eliminados del rango.`);

        // 4. Parse and Match
        const batchInserts: any[] = [];
        const warningsList: { eventTitle: string; date: string; calendarName: string; studentHint: string }[] = [];

        for (const raw of rawEvents) {
            // Paso 1: Parsear y Extraer identidades (ahora ocurre primero en calendarParser)
            const parsed = parseGoogleCalendarEvent(raw.summary, raw.description, raw.calendarName);

            // -- Purgado el Fallback Estudiante del Título (Prohibido) --

            // Paso 3: Cascada de Match
            let matchedTeacherName = parsed.teacherNameHint || 'DESCONOCIDO';
            let isTeacherMatchedInBD = false;

            if (parsed.teacherNameHint) {
                const found = teachers.find((t: any) =>
                    flexibleMatch(parsed.teacherNameHint, t.name) ||
                    flexibleMatch(t.name, parsed.teacherNameHint)
                );
                if (found) {
                    matchedTeacherName = found.name;
                    isTeacherMatchedInBD = true;
                }
            }

            let matchedStudentId: string | null = null;
            if (parsed.studentNameHint) {
                const found = students.find((s: any) => {
                    const fullName = `${s.first_name} ${s.last_name}`;
                    return flexibleMatch(parsed.studentNameHint, fullName) ||
                           flexibleMatch(fullName, parsed.studentNameHint);
                });
                if (found) matchedStudentId = found.id;
            }

            // Regla 2 (Fallback Docente/Grupo)
            let groupLabel: string | null = null;
            if (!isTeacherMatchedInBD || !matchedStudentId) {
                const titleNorm = normalizeText(raw.summary);
                const nickMatch = teachers.find((t: any) => {
                    const n1 = t.nickname_1 ? normalizeText(t.nickname_1) : null;
                    const n2 = t.nickname_2 ? normalizeText(t.nickname_2) : null;
                    return (n1 && titleNorm.includes(n1)) || (n2 && titleNorm.includes(n2));
                });

                if (nickMatch) {
                    matchedTeacherName = nickMatch.name;
                    isTeacherMatchedInBD = true;
                    const nick = normalizeText(nickMatch.nickname_1 || nickMatch.nickname_2 || '');
                    const dashIdx = titleNorm.indexOf(nick);
                    if (dashIdx > 0) {
                        groupLabel = raw.summary.substring(0, dashIdx).replace(/[-\s]+$/, '').trim();
                    } else {
                        groupLabel = raw.calendarName;
                    }
                }
            }

            // Paso 4: Creación del Payload OBLIGATORIAMENTE ANTES de alterar status
            const payload: any = {
                google_event_id: raw.id,
                google_calendar_id: raw.calendarName,
                teacher_name: matchedTeacherName,
                student_id: matchedStudentId, // Asignación inquebrantable de Identidad
                program_name: raw.calendarName,
                event_date: raw.start,
                event_end_time: raw.end,
                status: parsed.status, // Valor base enviado por el parser
                class_number: parsed.classNumber,
                semester: semester,
            };

            // Directiva 2: Override de Cancelación (Aplicable sobre el Payload ensamblado)
            const isCancelledCalendar = raw.calendarName && raw.calendarName.trim().toLowerCase() === 'clases canceladas';
            if (isCancelledCalendar || parsed.status === 'CANCELLED' || parsed.status === 'cancelled') {
                payload.status = 'CANCELLED';
            } else if (/reposici[oó]n/i.test(raw.summary)) {
                payload.status = 'makeup';
            }

            // Lógica de Notas y Advertencias (Basado en la Identidad) - Control Inteligente (Directiva 3)
            const hasWarning = !matchedStudentId && !groupLabel;
            const hasTeacherWarning = !isTeacherMatchedInBD;

            if (hasWarning || hasTeacherWarning) {
                warningsList.push({
                    eventTitle: raw.summary,
                    date: raw.start,
                    calendarName: raw.calendarName,
                    studentHint: hasTeacherWarning ? `(Docente no reg): ${parsed.teacherNameHint}` : (parsed.studentNameHint || '(Estudiante no identificado)'),
                });
            }

            // Construir notas finales seguras
            let finalNotes = parsed.notes || '';
            if (parsed.studentNameHint) {
                finalNotes = `[STUDENT_HINT: ${parsed.studentNameHint}]\n${finalNotes}`;
            }
            if (hasWarning) {
                finalNotes = `[ALERTA: ESTUDIANTE NO ENCONTRADO EN BD - "${parsed.studentNameHint || '(Estudiante no identificado)'}"]\n\n${finalNotes}`;
            }
            if (groupLabel) {
                finalNotes = `[GRUPO: ${groupLabel}]\n${finalNotes}`;
            }
            if (hasTeacherWarning) {
                finalNotes = `[ALERTA: DOCENTE NO REGISTRADO - "${parsed.teacherNameHint}"]\n\n${finalNotes}`;
            }

            payload.notes = finalNotes;

            // Siempre generar un UUID nuevo (Hard Sync: tabla limpiada antes de insertar)
            payload.id = crypto.randomUUID();

            // --- INICIO DIAGNÓSTICO CLASES CANCELADAS ---
            const isCancelledCal = raw.calendarName && raw.calendarName.toLowerCase().includes('canceladas');
            if (isCancelledCal) {
                console.log("==========================================");
                console.log(`🔍 EVENTO CANCELADO: ${raw.summary}`);
                console.log(`📝 1. Raw Desc (Primeros 100 chars):`, raw.description ? raw.description.substring(0, 100).replace(/\n/g, ' ') : 'NULL');
                console.log(`🤖 2. Nombre extraído por Parser: "${parsed.studentNameHint}"`);
                console.log(`🔎 3. ID Matcheado en BD: ${matchedStudentId ? matchedStudentId : 'FALLÓ FLEXIBLE MATCH'}`);
                console.log(`📦 4. Payload Final Student ID: ${payload.student_id}`);
                console.log("==========================================");
            }
            // --- FIN DIAGNÓSTICO CLASES CANCELADAS ---

            batchInserts.push(payload);
        }

        // 5. INSERT fresco en Supabase (la tabla ya fue limpiada en el Paso 3)
        console.log(`[SYNC ENGINE] 📥 Insertando ${batchInserts.length} eventos frescos de Google Calendar...`);
        const CHUNK_SIZE = 500;
        for (let i = 0; i < batchInserts.length; i += CHUNK_SIZE) {
            const chunk = batchInserts.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase.from('calendar_events').insert(chunk);
            if (error) {
                console.error('[SYNC ENGINE] Error insertando chunk:', error);
                throw new Error(`Error BD en Supabase: ${error.message}`);
            }
        }

        console.log(`[SYNC ENGINE] ✅ Hard Sync completado: ${batchInserts.length} eventos escritos.`);

        const warningsCount = warningsList.length;
        return {
            success: true,
            count: batchInserts.length,
            warnings: warningsCount,
            warningsList,
            message: `Sincronizados ${batchInserts.length} eventos desde Google Calendar. ${warningsCount > 0 ? `⚠️ ${warningsCount} advertencias de alumnos huérfanos.` : '✅ Todos los alumnos cruzados con éxito.'}`
        };

    } catch (err: any) {
        console.error('Sync error:', err);
        // Fail-loud return strict object matching directive
        return { success: false, error: err.message, message: `Error API/Sincronización: ${err.message}` };
    }
}
