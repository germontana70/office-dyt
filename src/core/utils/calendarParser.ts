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
    // Typically format is: "JUAN PEREZ - SEBAS - CLASE 8"
    // We'll split by "-" to get potential names
    const parts = upperTitle.split('-').map(p => p.trim()).filter(p => p.length > 0);

    let studentNameHint = upperTitle;
    let teacherNameHint = '';

    if (parts.length >= 2) {
        studentNameHint = parts[0];
        teacherNameHint = parts[1]; // Often the teacher nickname
    } else if (parts.length === 1) {
        studentNameHint = parts[0];
    }

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

    studentNameHint = cleanHint(studentNameHint);
    teacherNameHint = cleanHint(teacherNameHint);

    return {
        status,
        classNumber,
        isReposicion,
        notes: description || '',
        studentNameHint,
        teacherNameHint,
    };
}
