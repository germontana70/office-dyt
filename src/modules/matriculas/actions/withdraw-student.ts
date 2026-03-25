'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/infra/services/server';

/**
 * Retira a un estudiante del semestre activo.
 *
 * Arquitectura Relacional (Fase 2+):
 *  - Fuente de verdad del retiro: dyt_enrollments.status = 'Retirado'
 *  - Motivo del retiro: dyt_enrollments.global_observations
 *  - Retrocompatibilidad: students.is_active = false
 *  - NO se borra ningún registro físico.
 *  - Filtro doble: student_id + semester (semestre activo)
 */
export async function withdrawStudent(studentId: string, reason?: string) {
    const supabase = await createClient();

    // ── 1. Obtener el semestre activo desde la configuración global ──────────
    const { data: settings, error: settingsError } = await supabase
        .from('dyt_global_settings')
        .select('semester')
        .single();

    if (settingsError || !settings?.semester) {
        return {
            error: `No se pudo obtener el semestre activo: ${settingsError?.message ?? 'configuración no encontrada'}`,
        };
    }

    const activeSemester = settings.semester;

    // ── 2. Actualizar dyt_enrollments (fuente de verdad del semestre) ────────
    const observations = reason
        ? `[RETIRO ${activeSemester}]: ${reason}`
        : `[RETIRO ${activeSemester}]`;

    const { error: enrollmentError } = await supabase
        .from('dyt_enrollments')
        .update({
            status: 'Retirado',
            global_observations: observations,
            updated_at: new Date().toISOString(),
        })
        .eq('student_id', studentId)
        .eq('semester', activeSemester);

    if (enrollmentError) {
        console.error('[Supabase Error] Fallo al actualizar dyt_enrollments:', enrollmentError);
        return {
            error: `Error al actualizar la matrícula en BD: ${enrollmentError.message}`,
        };
    }

    // ── 3. Retrocompatibilidad: marcar is_active = false en students ─────────
    const { error: studentError } = await supabase
        .from('students')
        .update({ is_active: false })
        .eq('id', studentId);

    if (studentError) {
        // No es crítico — logueamos pero no bloqueamos el flujo
        console.warn(
            `[Supabase Warning] is_active no se pudo actualizar para ${studentId}:`,
            studentError.message,
        );
    }

    // ── 4. Revalidar la UI del módulo de matrículas ──────────────────────────
    revalidatePath('/dashboard/matriculas', 'layout');
    return { success: true };
}
