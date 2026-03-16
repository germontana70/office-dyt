'use server';

import { createClient } from '@/infra/services/server';
import { GoogleCalendarService } from '@/infra/services/googleCalendarService';
import { parseGoogleCalendarEvent } from '@/core/utils/calendarParser';

// Helper to remove accents and uppercase for fuzzy matching
function normalizeText(text: string) {
    if (!text) return '';
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .trim();
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
        // timeMin and timeMax need to be RFC3339, we assume America/Bogota GMT-5
        const timeMin = `${startDateStr}T00:00:00-05:00`;
        const timeMax = `${endDateStr}T23:59:59-05:00`;

        const rawEvents = await GoogleCalendarService.fetchEventsPeriod(timeMin, timeMax);
        if (!rawEvents || rawEvents.length === 0) {
            return { success: true, message: 'No se encontraron eventos en este periodo.', count: 0 };
        }

        // 2. Fetch Truth Tables from Supabase (Soberanía de Entidades)
        const [teachersRes, studentsRes] = await Promise.all([
            supabase.from('teachers').select('id, name'),
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
        let warningsCount = 0;

        for (const raw of rawEvents) {
            const parsed = parseGoogleCalendarEvent(raw.summary, raw.description, raw.calendarName);

            // Fuzzy Match Teacher
            const normHintTeacher = normalizeText(parsed.teacherNameHint);
            let matchedTeacherName = parsed.teacherNameHint || 'DESCONOCIDO';

            // In SIA 2.0, the Nicknames were used. Here we match by name substring.
            if (normHintTeacher) {
                const found = teachers.find((t: any) => normalizeText(t.name).includes(normHintTeacher) || normHintTeacher.includes(normalizeText(t.name.split(' ')[0])));
                if (found) matchedTeacherName = found.name;
            }

            // Fuzzy Match Student
            const normHintStudent = normalizeText(parsed.studentNameHint);
            let matchedStudentId = null;

            if (normHintStudent) {
                const found = students.find((s: any) => {
                    const fullName = normalizeText(`${s.first_name} ${s.last_name}`);
                    return fullName.includes(normHintStudent) || normHintStudent.includes(fullName);
                });
                if (found) {
                    matchedStudentId = found.id;
                }
            }

            const hasWarning = !matchedStudentId;
            if (hasWarning) warningsCount++;

            // Construct Upsert Payload
            // Note: We avoid 'program_name' overwriting if it exists, but for simplicity we set a default.
            const payload: any = {
                google_event_id: raw.id,
                google_calendar_id: raw.calendarName,
                teacher_name: matchedTeacherName,
                student_id: matchedStudentId,
                program_name: raw.calendarName, // Assuming calendar name is the program/classroom
                event_date: raw.start,
                event_end_time: raw.end,
                status: parsed.status,
                class_number: parsed.classNumber,
                notes: hasWarning ? `[ALERTA: ESTUDIANTE NO ENCONTRADO EN BD - "${parsed.studentNameHint}"]\n\n${parsed.notes}` : parsed.notes,
                semester: semester,
            };

            // Ensure we update exactly the row
            const existingId = existingEventsMap.get(raw.id);
            if (existingId) {
                payload.id = existingId;
            }

            batchUpserts.push(payload);
        }

        // 5. Execute Upsert Batch
        // Upserting large arrays can be heavy, but Supabase handles up to a few thousands easily.
        const CHUNK_SIZE = 500;
        for (let i = 0; i < batchUpserts.length; i += CHUNK_SIZE) {
            const chunk = batchUpserts.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase.from('calendar_events').upsert(chunk);
            if (error) {
                console.error('Error insertando chunk en Supabase:', error);
                throw new Error(`Error BD: ${error.message}`);
            }
        }

        return {
            success: true,
            count: batchUpserts.length,
            warnings: warningsCount,
            message: `Sincronizados ${batchUpserts.length} eventos. ${warningsCount > 0 ? `⚠️ ${warningsCount} advertencias de alumnos huérfanos.` : '✅ Todos los alumnos cruzados con éxito.'}`
        };

    } catch (err: any) {
        console.error('Sync error:', err);
        return { success: false, message: err.message || 'Error desconocido sincronizando' };
    }
}
