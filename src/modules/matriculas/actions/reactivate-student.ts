'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/infra/services/server';

/**
 * Reactiva la matrícula de un estudiante que fue previamente retirado.
 *
 * Arquitectura Relacional (Fase 2+):
 *  - Actualiza dyt_enrollments.status = 'Activa' filtrando por student_id + semester activo
 *  - Registra la reactivación en global_observations
 *  - Retrocompatibilidad: students.is_active = true
 *  - NO crea registros nuevos — solo revierte el estado del semestre activo
 */
export async function reactivateStudent(studentId: string) {
    const supabase = await createClient();

    // ── 1. Obtener el semestre activo ────────────────────────────────────────
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

    // ── 2. Reactivar en dyt_enrollments (fuente de verdad) ───────────────────
    const observations = `[REACTIVACIÓN ${activeSemester}]: Matrícula reactivada manualmente`;

    const { error: enrollmentError } = await supabase
        .from('dyt_enrollments')
        .update({
            status: 'Activa',
            global_observations: observations,
            updated_at: new Date().toISOString(),
        })
        .eq('student_id', studentId)
        .eq('semester', activeSemester);

    if (enrollmentError) {
        console.error('[Supabase Error] Fallo al reactivar dyt_enrollments:', enrollmentError);
        return {
            error: `Error al reactivar la matrícula en BD: ${enrollmentError.message}`,
        };
    }

    // ── 3. Retrocompatibilidad: marcar is_active = true en students ──────────
    const { error: studentError } = await supabase
        .from('students')
        .update({ is_active: true })
        .eq('id', studentId);

    if (studentError) {
        console.warn(
            `[Supabase Warning] is_active no se pudo reactivar para ${studentId}:`,
            studentError.message,
        );
    }

    // ── 4. Revalidar la UI del módulo de matrículas ──────────────────────────
    revalidatePath('/dashboard/matriculas', 'layout');
    return { success: true };
}
