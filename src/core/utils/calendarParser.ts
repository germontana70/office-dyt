/**
 * calendarParser.ts
 *
 * Intelligent parser to extract class details from Google Calendar events.
 * It does NOT interact with the database; it merely infers the intent from the text
 * (summary, description, calendar name) written by the human operator.
 */

export interface ParsedEventData {
    status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'makeup';
    classNumber: number | null;
    isReposicion: boolean;
    notes: string;
    studentNameHint: string;
    teacherNameHint: string;
}

/**
 * Parses a Google Calendar event's raw text fields to infer standardized fields.
 *
 * @param title The event summary/title
 * @param description The event description/notes
 * @param calendarName The name of the calendar the event belongs to
 * @returns ParsedEventData indicating the inferred status and details
 */
export function parseGoogleCalendarEvent(
    title: string,
    description: string,
    calendarName: string
): ParsedEventData {
    const upperTitle = (title || '').toUpperCase();
    const cleanDesc = (description || '').replace(/<[^>]*>?/gm, ''); // Sanitization HTML
    const upperDesc = cleanDesc.toUpperCase();
    const rawCalendarName = (calendarName || '').trim();

    // 1. Determine Status & Reposición
    // REGLA: Reposición ÚNICAMENTE si está en el título
    const isReposicion = /reposici[oó]n/i.test(title);
    let status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'makeup' = 'scheduled';

    // Regla Absoluta de Cancelación
    if (rawCalendarName.toLowerCase() === 'clases canceladas') {
        status = 'cancelled';
    } else if (isReposicion) {
        status = 'makeup';
    } else if (upperDesc.includes('COMPLETAD')) {
        status = 'completed';
    }

    // 2. Extract Class Number (Altura)
    let classNumber: number | null = null;
    // Preferimos el título para la altura si está disponible
    const classMatch = /(?:CLASE|CL)\s*#?\s*(\d+)/i.exec(title + ' ' + cleanDesc);
    if (classMatch && classMatch[1]) {
        classNumber = parseInt(classMatch[1], 10);
    }

    // 3. Extract Motivo Cancelación & Notes
    let notes = cleanDesc;
    if (status === 'cancelled') {
        const motivoMatch = /Motivo(?: Cancelaci[oó]n)?:\s*([^\n]+)/i.exec(cleanDesc);
        if (motivoMatch && motivoMatch[1]) {
            notes = motivoMatch[1].trim();
        }
    }

    // 4. Extract Hints for fuzzy matching
    // PRIORIDAD MÁXIMA: Contenido de la descripción (Estudiante / Profesor)
    const studentFromDesc = /[Ee]studiante:\s*([^\n<]+)/i.exec(cleanDesc);
    const teacherFromDesc = /[Pp]rofesor:\s*([^\n<]+)/i.exec(cleanDesc);

    // FALLBACK: Parse title (Apellido - Nombre / Docente - Estudiante)
    const parts = title.split('-').map(p => p.trim()).filter(p => p.length > 0);
    const fallbackTeacher = parts.length >= 1 ? parts[0] : title;
    const fallbackStudent = parts.length >= 2 ? parts[1] : '';

    const studentNameHint = studentFromDesc 
        ? studentFromDesc[1].trim() 
        : fallbackStudent.trim();
        
    const teacherNameHint = teacherFromDesc 
        ? teacherFromDesc[1].trim() 
        : fallbackTeacher.trim();

    return {
        status,
        classNumber,
        isReposicion,
        notes,
        studentNameHint,
        teacherNameHint,
    };
}
