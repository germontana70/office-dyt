'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/infra/services/server';

export interface MedicalInfoPayload {
    medications?: string;
    allergies?: string;
    conditions?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relationship?: string;
}

/**
 * Actualiza la ficha médica ampliada de un estudiante.
 *
 * Estrategia: un único UPDATE sobre la columna JSONB medical_info en students.
 * Esta columna fue creada manualmente por el administrador en Supabase.
 * NO se tocan columnas legacy (medical_conditions, guardian_name, etc.)
 */
export async function updateMedicalInfo(studentId: string, payload: MedicalInfoPayload) {
    const supabase = await createClient();

    const medicalInfoJson = {
        medications: payload.medications?.trim() || null,
        allergies: payload.allergies?.trim() || null,
        conditions: payload.conditions?.trim() || null,
        emergency_contact_name: payload.emergency_contact_name?.trim() || null,
        emergency_contact_phone: payload.emergency_contact_phone?.trim() || null,
        emergency_contact_relationship: payload.emergency_contact_relationship?.trim() || null,
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
        .from('students')
        .update({ medical_info: medicalInfoJson })
        .eq('id', studentId);

    if (error) {
        console.error('[Supabase Error] Fallo al actualizar medical_info:', error);
        return { error: `Error al guardar ficha médica: ${error.message}` };
    }

    revalidatePath('/dashboard/matriculas', 'layout');
    return { success: true };
}
