'use server';

import { createClient } from '@/infra/services/server';
import { revalidatePath } from 'next/cache';

// Tipamos Partial fields
export async function updatePersonalData(studentId: string, payload: Record<string, any>) {
    if (!studentId || !payload) return { error: 'Faltan datos.' };

    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('students')
            .update(payload)
            .eq('id', studentId)
            .select();

        if (error) {
            console.error('[Supabase Auto-Save Error]:', error);
            return { error: 'Error al hacer auto-save en Supabase.' };
        }

        revalidatePath(`/dashboard/matriculas/${studentId}`);

        return { success: true };
    } catch (err) {
        console.error(err);
        return { error: 'Server throw.' };
    }
}
