'use server';

import { revalidatePath } from 'next/cache';
import { CurrentStudentRepository } from '../repository/current-student-repo';

export async function withdrawStudent(studentId: string, reason?: string) {
    try {
        // Soft Delete: actualizamos el estado a 'Retirado'
        const updatedData = {
            enrollment_status: 'Retirado' as const,
            observations: reason ? `[RETIRO DEL SEMESTRE]: ${reason}` : undefined
        };

        const student = await CurrentStudentRepository.update(studentId, updatedData);

        if (!student) {
            return { error: 'No se pudo retirar al estudiante en la base de datos.' };
        }

        revalidatePath('/dashboard/matriculas');
        return { success: true, student };

    } catch (e) {
        console.error('[Action Error] Fallo al retirar al estudiante:', e);
        return { error: 'Error del sistema al procesar el retiro estudiantil.' };
    }
}
