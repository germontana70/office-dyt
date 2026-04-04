/**
 * @module resolveStudentLabel
 * @description
 * Helper puro para el Motor de Liquidación de Honorarios (SIA 2.0).
 *
 * Resuelve el valor correcto para la columna "Estudiante" en la UI y el PDF,
 * aplicando la regla de negocio discriminadora entre programas 1a1 y grupales.
 *
 * REGLA DE ORO:
 *   - Programas 1a1  → retorna el nombre del alumno (de cualquier fuente disponible)
 *   - Programas grupales → retorna el nombre del programa directamente
 *
 * Esta función es la ÚNICA fuente de verdad para esta lógica.
 * NO duplicar en PaymentClientWrapper.tsx ni en reports.ts.
 */

import type { ClassSession } from '@/infra/services/payments';

// ─── Clasificador de Programas ────────────────────────────────────────────────

/**
 * Fragmentos canónicos de nombres de programas GRUPALES.
 * El matching es parcial (includes) e insensible a mayúsculas,
 * para cubrir variantes como "Piano Iniciación (Grupo A)" etc.
 */
const GRUPO_PROGRAM_FRAGMENTS = [
    'aprestamiento',
    'piano iniciación',
    'piano iniciacion',
    'piano ukelele',
    'danza y expresión',
    'danza y expresion',
] as const;

/**
 * Determina si un programa es de modalidad grupal.
 * @param programName El valor de `calendar_events.program_name`
 */
export function isProgramaGrupal(programName: string): boolean {
    const lower = (programName || '').toLowerCase().trim();
    return GRUPO_PROGRAM_FRAGMENTS.some(fragment => lower.includes(fragment));
}

// ─── Resolver Principal ───────────────────────────────────────────────────────

/**
 * Resuelve el label del estudiante/grupo para una sesión de clase.
 *
 * Cascada de resolución para programas 1a1:
 *   1. Relación SQL directa (`s.students`)
 *   2. Watermark `[STUDENT_HINT: Nombre]` en `s.notes`
 *   3. Campo extendido `student_name_hint` (retrocompatibilidad)
 *   4. Regex `Estudiante:` en la descripción del evento de GCal
 *   5. Regex de alerta de sincronización en `s.notes`
 *   6. Último recurso: "Estudiante No Registrado"
 *
 * Para programas GRUPALES la cascada se cortocircuita en el paso 0,
 * retornando `program_name` directamente. Esto es semánticamente correcto:
 * en una clase grupal no hay un único alumno que identificar.
 *
 * @param session Un objeto `ClassSession` tal como lo entrega `paymentService.getTeacherClasses`
 * @returns El string que debe mostrarse en la columna "Estudiante"
 */
export function resolveStudentLabel(session: ClassSession): string {
    const programName = session.program_name || '';
    const notes = session.notes || '';

    // ── PASO -1: Detección PRIORITARIA por tag [GRUPO:] en notes ─────────────
    // El sincronizador inyecta [GRUPO: Nombre del Programa] cuando detecta una
    // clase grupal via nicknames del docente. Ejemplo:
    //   program_name = "SALÓN 206"  (calendario GCal)
    //   notes        = "[GRUPO: Aprestamiento Musical (01)]..."
    // → Retornar "Clase Grupal - Aprestamiento Musical (01)"
    if (notes) {
        const grupoTagMatch = /\[GRUPO:\s*([^\]]+)\]/i.exec(notes);
        if (grupoTagMatch?.[1]) {
            return `Clase Grupal - ${grupoTagMatch[1].trim()}`;
        }
    }

    // ── PASO 0: Cortocircuito grupal por nombre de programa ───────────────────
    if (isProgramaGrupal(programName)) {
        return `Clase Grupal - ${programName}`;
    }

    // ── CASCADA 1a1 ───────────────────────────────────────────────────────────

    // 1. Relación SQL directa (mejor fuente de verdad)
    if (session.students) {
        const fullName = `${session.students.first_name} ${session.students.last_name}`.trim();
        if (fullName) return fullName;
    }

    // 2. Watermark de identidad inyectada durante la sincronización
    if (notes) {
        const watermarkMatch = /\[STUDENT_HINT:\s*([^\]]+)\]/i.exec(notes);
        if (watermarkMatch?.[1]) return watermarkMatch[1].trim();
    }

    // 3. Campo extendido de retrocompatibilidad
    const extendedSession = session as ClassSession & { student_name_hint?: string };
    if (extendedSession.student_name_hint) {
        return extendedSession.student_name_hint;
    }

    // 4. Regex sobre la descripción original del evento GCal
    if (notes) {
        const cleanNotes = notes.replace(/<[^>]*>?/gm, '');

        const studentMatch = /[Ee]studiante:\s*([^\n]+)/i.exec(cleanNotes);
        if (studentMatch?.[1]) return studentMatch[1].trim();

        // 5. Rescate desde bitácora de alertas de sincro
        const alertMatch = /ESTUDIANTE NO ENCONTRADO EN BD\s*-\s*"([^"]+)"\]/i.exec(cleanNotes);
        if (alertMatch?.[1]) return alertMatch[1].trim();
    }

    // 6. Último recurso: placeholder semántico (NUNCA program_name para 1a1)
    return 'Estudiante No Registrado';
}
