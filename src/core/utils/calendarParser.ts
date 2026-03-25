/**
 * calendarParser.ts
 *
 * Intelligent parser to extract class details from Google Calendar events.
 * It does NOT interact with the database; it merely infers the intent from the text
 * (summary, description, calendar name) written by the human operator.
 */

export interface ParsedEventData {
    status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
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
    const upperDesc = (description || '').toUpperCase();
    const upperCal = (calendarName || '').toUpperCase();

    // 1. Determine Status & Reposición
    const isReposicion = upperTitle.includes('REPOSICION') || upperTitle.includes('REPOSICIÓN');
    let status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' = 'scheduled';

    if (upperCal.includes('CLASES CANCELADAS') || upperCal.includes('CANCELADA')) {
        status = 'cancelled';
    } else if ((upperTitle.includes('CANCELAD') || upperTitle.includes('NO ASISTIO')) && !isReposicion) {
        status = 'cancelled';
    } else if (upperDesc.includes('COMPLETAD')) {
        status = 'completed';
    }

    if (isReposicion && status === 'scheduled') {
        // If it's a reposición and not explicitly cancelled, we consider it scheduled/rescheduled
        // 'rescheduled' status in our DB usually means the ORIGINAL class was cancelled
        // But a new event created as REPOSICIÓN acts as a 'completed' or 'scheduled' replacement.
        // For now we map it to scheduled (if in future) or completed (if past), handled later.
        status = 'scheduled';
    }

    // 2. Extract Class Number (Altura)
    // Matches "CLASE 8", "CL 08", "CLASE #8"
    let classNumber: number | null = null;
    const classMatch = /(?:CLASE|CL)\s*#?\s*(\d+)/.exec(upperTitle + ' ' + upperDesc);
    if (classMatch && classMatch[1]) {
        classNumber = parseInt(classMatch[1], 10);
    }

    // 3. Extract Hints for fuzzy matching
    // PRIMARY: Read from description — format is:
    // "👤 Estudiante: NOMBRE DEL ESTUDIANTE\n🎹 Profesor: NOMBRE DEL PROFESOR"
    const rawDescription = description || '';
    const studentFromDesc = /[Ee]studiante:\s*(.+)/i.exec(rawDescription);
    const teacherFromDesc = /[Pp]rofesor:\s*(.+)/i.exec(rawDescription);

    // FALLBACK: Parse title — real format is "PROF - ESTUDIANTE - Clase N"
    const parts = upperTitle.split('-').map(p => p.trim()).filter(p => p.length > 0);
    const fallbackTeacher = parts.length >= 1 ? parts[0] : upperTitle;
    const fallbackStudent = parts.length >= 2 ? parts[1] : '';

    // Clean hints from common noise words
    const cleanHint = (hint: string) => {
        return hint
            .replace(/CLASE\s*#?\d+/g, '')
            .replace(/REPOSICION/g, '')
            .replace(/REPOSICIÓN/g, '')
            .replace(/CANCELADA/g, '')
            .replace(/VIRTUAL/g, '')
            .replace(/PRESENCIAL/g, '')
            .trim();
    };

    const studentNameHint = cleanHint(
        studentFromDesc ? studentFromDesc[1].trim() : fallbackStudent
    );
    const teacherNameHint = cleanHint(
        teacherFromDesc ? teacherFromDesc[1].trim() : fallbackTeacher
    );

    return {
        status,
        classNumber,
        isReposicion,
        notes: description || '',
        studentNameHint,
        teacherNameHint,
    };
}
