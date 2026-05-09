import type { MuestraPresentacion } from '@/infra/types/muestras';

// ──────────────────────────────────────────────────────────
//  CONVERSIÓN DE TIEMPO
// ──────────────────────────────────────────────────────────

/**
 * Convierte un string HH:MM:SS (o MM:SS) a segundos totales.
 * @example "00:04:30" → 270 | "3:45" → 225
 */
export function hhmmssToSeconds(duration: string): number {
    if (!duration || !duration.includes(':')) return 0;
    const parts = duration.split(':').map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) {
        const [hh, mm, ss] = parts;
        return hh * 3600 + mm * 60 + ss;
    } else if (parts.length === 2) {
        const [mm, ss] = parts;
        return mm * 60 + ss;
    }
    return 0;
}

/**
 * Convierte segundos totales a string HH:MM:SS legible.
 * @example 270 → "00:04:30"
 */
export function secondsToHHMMSS(totalSeconds: number): string {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00:00';
    const hh = Math.floor(totalSeconds / 3600);
    const mm = Math.floor((totalSeconds % 3600) / 60);
    const ss = Math.floor(totalSeconds % 60);
    return [hh, mm, ss].map((v) => String(v).padStart(2, '0')).join(':');
}

/** Suma segundos a un objeto Date y retorna el nuevo Date. */
export function addSecondsToDate(base: Date, seconds: number): Date {
    return new Date(base.getTime() + seconds * 1000);
}

/** Formatea una fecha como "HH:MM" para visualización en el cronograma. */
export function formatTime(date: Date): string {
    return date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

/** Duración estándar de transición entre presentaciones (2 minutos). */
export const TRANSITION_SECONDS = 2 * 60;

// ──────────────────────────────────────────────────────────
//  MOTOR DE CRONOGRAMA
// ──────────────────────────────────────────────────────────

export interface TimelineEntry extends MuestraPresentacion {
    scheduled_start: string;    // "HH:MM"
    scheduled_end: string;      // "HH:MM"
    cumulative_seconds: number; // Segundos desde el inicio del recital
}

/**
 * Calcula el cronograma completo del recital.
 * Suma duración + transición entre presentaciones.
 * Los eventos en blanco (saludos) también consumen tiempo.
 *
 * @param presentaciones - Lista de presentaciones (se ordena internamente por sort_order).
 * @param recitalStart   - Hora de inicio del recital.
 * @param transitionSecs - Segundos de transición entre items (default: 120 = 2 min).
 */
export function calculateTimeline(
    presentaciones: MuestraPresentacion[],
    recitalStart: Date,
    transitionSecs: number = TRANSITION_SECONDS
): TimelineEntry[] {
    const sorted = [...presentaciones].sort((a, b) => a.sort_order - b.sort_order);
    let cursor = new Date(recitalStart);
    const entries: TimelineEntry[] = [];

    for (let i = 0; i < sorted.length; i++) {
        const item = sorted[i];
        const durationSecs = item.duration_seconds > 0
            ? item.duration_seconds
            : hhmmssToSeconds(item.duration_text);
        const startTime = new Date(cursor);
        const endTime = addSecondsToDate(startTime, durationSecs);

        entries.push({
            ...item,
            duration_seconds: durationSecs,
            scheduled_start: formatTime(startTime),
            scheduled_end: formatTime(endTime),
            cumulative_seconds: Math.floor((endTime.getTime() - recitalStart.getTime()) / 1000),
        });

        // Avanzar cursor: duración + transición (excepto tras el último item)
        cursor = addSecondsToDate(endTime, i < sorted.length - 1 ? transitionSecs : 0);
    }

    return entries;
}

/** Duración total del recital en segundos. */
export function getTotalRecitalDuration(entries: TimelineEntry[]): number {
    if (entries.length === 0) return 0;
    return entries[entries.length - 1].cumulative_seconds;
}
