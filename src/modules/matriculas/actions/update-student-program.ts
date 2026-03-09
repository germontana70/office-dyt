'use server';

import { createClient } from '@/infra/services/server';
import { revalidatePath } from 'next/cache';

export async function updateStudentProgram(studentId: string, payload: Record<string, any>) {
    if (!studentId || !payload) return { error: 'Faltan datos.' };

    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from('students')
            .update(payload)
            .eq('id', studentId);

        if (error) {
            console.error('[Supabase Program Save Error]:', error);
            return { error: 'Error al actualizar el programa en Supabase.' };
        }

        revalidatePath(`/dashboard/matriculas/${studentId}`);

        return { success: true };
    } catch (err) {
        console.error(err);
        return { error: 'Server throw.' };
    }
}
