'use server';

import { revalidatePath } from 'next/cache';
import { TeacherRepository } from '../repository/teacher-repo';

export async function createTeacher(formData: FormData) {
    try {
        const full_name = formData.get('full_name') as string;
        const specialty = formData.get('specialty') as string;
        const hourly_rate_str = formData.get('hourly_rate') as string;
        const phone = formData.get('phone') as string;

        if (!full_name) {
            return { error: 'El nombre es obligatorio' };
        }

        const hourly_rate = hourly_rate_str ? parseFloat(hourly_rate_str) : null;

        const newTeacher = await TeacherRepository.create({
            full_name,
            specialty: specialty || null,
            hourly_rate: isNaN(hourly_rate as number) ? null : hourly_rate,
            phone: phone || null,
        });

        if (!newTeacher) {
            return { error: 'Fallo al insertar en base de datos' };
        }

        revalidatePath('/dashboard/maestros');
        return { success: true };
    } catch (e: any) {
        console.error('[Action Error] Fallo al crear maestro:', e);
        return { error: e.message || 'Error interno del servidor' };
    }
}
