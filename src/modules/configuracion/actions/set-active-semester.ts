'use server';

import { revalidatePath } from 'next/cache';
import { SemesterRepository } from '../repository/semester-repo';

export async function setActiveSemester(semesterId: string) {
    try {
        if (!semesterId) return { error: 'ID de semestre requerido' };

        const success = await SemesterRepository.setActive(semesterId);

        if (!success) {
            return { error: 'Error al establecer el semestre activo en BD' };
        }

        revalidatePath('/', 'layout'); // Update all layouts requiring semester badge
        return { success: true };
    } catch (e: any) {
        console.error('[Action Error] Fallo al establecer semestre activo:', e);
        return { error: e.message || 'Error del sistema' };
    }
}
