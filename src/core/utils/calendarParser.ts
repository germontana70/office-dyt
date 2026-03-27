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

    // ============================================================================
    // 1. DESTRUCTOR TOTAL DE BASURA Y EXTRACCIÓN INFALIBLE
    // ============================================================================
    const cleanDesc = (description || '')
        .replace(/&nbsp;/gi, ' ') // Destruir espacios HTML
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Destruir caracteres invisibles
        .replace(/<(br|div|p|li)\s*\/?>/gi, '\n') // Forzar saltos de línea estructurales
        .replace(/<\/(div|p|li)>/gi, '\n')
        .replace(/<[^>]*>?/gm, ' ') // Purgar tags restantes
        .trim();

    const upperDesc = cleanDesc.toUpperCase();
    const rawCalendarName = (calendarName || '').trim();

    let studentNameHint = '';
    let teacherNameHint = '';

    // Extraer Estudiante (Soporta espacios colados antes de los dos puntos)
    const studentRegex = /(?:Estudiante\s*:|bienvenida a\s*:?)\s*([^\n]+)/i;
    const studentMatch = studentRegex.exec(cleanDesc);
    if (studentMatch && studentMatch[1]) {
        let rawName = studentMatch[1];
        // Truncar si la línea se fusionó con metadatos contiguos
        rawName = rawName.split(/(?:🎹|🏫|👤|👥|Programa:|Salón:|Motivo|Docente|Profesor)/i)[0];
        studentNameHint = rawName.trim();
    }

    // Extraer Docente
    const teacherRegex = /(?:Docente\s*:|Profesor(?:a)?\s*:)\s*([^\n]+)/i;
    const teacherMatch = teacherRegex.exec(cleanDesc);
    if (teacherMatch && teacherMatch[1]) {
        let rawName = teacherMatch[1];
        rawName = rawName.split(/(?:🎹|🏫|👤|👥|Programa:|Salón:|Motivo|Estudiante)/i)[0];
        teacherNameHint = rawName.trim();
    }

    // ============================================================================
    // 2. LÓGICA DE ESTADO (Status)
    // ============================================================================
    const isReposicion = /reposici[oó]n/i.test(title);
    let status: 'scheduled' | 'completed' | 'cancelled' | 'CANCELLED' | 'rescheduled' | 'makeup' = 'scheduled';

    if (rawCalendarName.toLowerCase() === 'clases canceladas') {
        status = 'cancelled';
    } else if (isReposicion) {
        status = 'makeup';
    } else if (upperDesc.includes('COMPLETAD')) {
        status = 'completed';
    }

    // ============================================================================
    // 3. EXTRAER ALTURA (Clase #X)
    // ============================================================================
    let classNumber: number | null = null;
    const classMatch = /(?:CLASE|CL)\s*#?\s*(\d+)/i.exec(title + ' ' + cleanDesc);
    if (classMatch && classMatch[1]) {
        classNumber = parseInt(classMatch[1], 10);
    }

    // ============================================================================
    // 4. EXTRAER MOTIVO CANCELACIÓN Y NOTAS
    // ============================================================================
    let notes = cleanDesc;
    if (status === 'cancelled') {
        const motivoMatch = /Motivo(?: Cancelaci[oó]n)?:\s*([^\n]+)/i.exec(cleanDesc);
        if (motivoMatch && motivoMatch[1]) {
            notes = motivoMatch[1].trim();
        }
    }

    return {
        status,
        classNumber,
        isReposicion,
        notes,
        studentNameHint,
        teacherNameHint,
    };
}
