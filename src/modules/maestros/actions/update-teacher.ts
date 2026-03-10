'use server';

import { revalidatePath } from 'next/cache';
import { TeacherRepository } from '../repository/teacher-repo';

export async function updateTeacher(id: string, formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const instrument = formData.get('instrument') as string;
        const hourly_rate_str = formData.get('hourly_rate') as string;
        const phone = formData.get('phone') as string;
        const email = formData.get('email') as string;
        const document_number = formData.get('document_number') as string;
        const address = formData.get('address') as string;
        const bank_account = formData.get('bank_account') as string;
        const nickname_1 = formData.get('nickname_1') as string;
        const nickname_2 = formData.get('nickname_2') as string;

        if (!name) {
            return { error: 'El nombre es obligatorio' };
        }

        const hourly_rate = hourly_rate_str ? parseFloat(hourly_rate_str) : null;

        const updatedTeacher = await TeacherRepository.update(id, {
            name,
            instrument: instrument || null,
            hourly_rate: isNaN(hourly_rate as number) ? null : hourly_rate,
            phone: phone || null,
            email: email || null,
            document_number: document_number || null,
            address: address || null,
            bank_account: bank_account || null,
            nickname_1: nickname_1 || null,
            nickname_2: nickname_2 || null
        });

        if (!updatedTeacher) {
            return { error: 'Fallo al actualizar en base de datos' };
        }

        revalidatePath('/dashboard/maestros');
        return { success: true };
    } catch (e: any) {
        console.error('[Action Error] Fallo al actualizar maestro:', e);
        return { error: e.message || 'Error interno del servidor' };
    }
}
