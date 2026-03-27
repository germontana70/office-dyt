/**
 * calendarParser.ts
 *
 * Intelligent parser to extract class details from Google Calendar events.
 * It does NOT interact with the database; it merely infers the intent from the text
 * (summary, description, calendar name) written by the human operator.
 */

export interface ParsedEventData {
    status: 'scheduled' | 'completed' | 'cancelled' | 'CANCELLED' | 'rescheduled' | 'makeup';
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

    // 4. Extract Hints for fuzzy matching (Prioridad Máxima: Descripción)
    // Directiva 1: Regex con Positive Lookahead por Límites Lógicos
    let studentFromDesc = '';
    let teacherFromDesc = '';

    // Patrón lookahead detiene la captura al encontrar: 🎹, 🏫, Programa:, Salón:, Unirse, \n o fin de string
    const logicalDelimiters = /(?=\s*(?:🎹|🏫|Programa:|Salón:|Unirse|\n|$))/i;

    const teacherMatch = new RegExp(`(?:Docente|Profesor(?:a)?):\\s*(.*?)${logicalDelimiters.source}`, 'is').exec(cleanDesc);
    if (teacherMatch && teacherMatch[1]) {
        teacherFromDesc = teacherMatch[1].trim();
    }

    const studentMatch = new RegExp(`Estudiante:\\s*(.*?)${logicalDelimiters.source}`, 'is').exec(cleanDesc);
    if (studentMatch && studentMatch[1]) {
        studentFromDesc = studentMatch[1].trim();
    }

    // Directiva 1: Fallback Estudiante (Si desc es nulo, buscar antes del primer guion en título)
    const titleParts = title.split('-');
    const studentTitleFallback = titleParts[0]?.trim() || '';
    const teacherTitleFallback = (titleParts.length >= 2 ? titleParts[1]?.trim() : title) || '';

    const studentNameHint = studentFromDesc || studentTitleFallback;
    const teacherNameHint = teacherFromDesc || teacherTitleFallback;

    return {
        status,
        classNumber,
        isReposicion,
        notes,
        studentNameHint,
        teacherNameHint,
    };
}
