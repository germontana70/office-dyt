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
 * Estrategia de persistencia:
 *  - Campos legacy planos existentes: medical_conditions, guardian_name,
 *    guardian_phone, guardian_relationship → se actualizan directamente.
 *  - Datos nuevos (medications, allergies) → se consolidan en medical_info JSONB
 *    si la columna existe; si no, se loguea un warning sin crashear.
 */
export async function updateMedicalInfo(studentId: string, payload: MedicalInfoPayload) {
    const supabase = await createClient();

    // ── 1. Construir el payload de campos planos conocidos ───────────────────
    const knownFields: Record<string, string | null> = {
        // medical_conditions mapea "Condiciones Especiales / Diagnósticos"
        medical_conditions: payload.conditions?.trim() || null,
        // Contacto de emergencia → campos planos legacy
        guardian_name: payload.emergency_contact_name?.trim() || null,
        guardian_phone: payload.emergency_contact_phone?.trim() || null,
        guardian_relationship: payload.emergency_contact_relationship?.trim() || null,
    };

    // ── 2. Intentar incluir medical_info JSONB (campos nuevos) ───────────────
    const medicalInfoJson = {
        medications: payload.medications?.trim() || null,
        allergies: payload.allergies?.trim() || null,
        conditions: payload.conditions?.trim() || null,
        emergency_contact: {
            name: payload.emergency_contact_name?.trim() || null,
            phone: payload.emergency_contact_phone?.trim() || null,
            relationship: payload.emergency_contact_relationship?.trim() || null,
        },
        updated_at: new Date().toISOString(),
    };

    // ── 3. Ejecutar UPDATE combinado ─────────────────────────────────────────
    const { error } = await supabase
        .from('students')
        .update({
            ...knownFields,
            // Si medical_info no existe en la tabla, Supabase lo ignora silenciosamente
            // (PostgREST filtra columnas desconocidas). Se documenta aquí para cuando
            // se cree la columna vía migración.
            medical_info: medicalInfoJson,
            updated_at: new Date().toISOString(),
        })
        .eq('id', studentId);

    if (error) {
        console.error('[Supabase Error] Fallo al actualizar ficha médica:', error);
        // Si el error es por la columna medical_info inexistente, intentamos sin ella
        if (error.message?.includes('medical_info')) {
            console.warn('[Info] medical_info column not found — saving to legacy fields only');
            const { error: fallbackError } = await supabase
                .from('students')
                .update({
                    ...knownFields,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', studentId);

            if (fallbackError) {
                return { error: `Error al guardar ficha médica: ${fallbackError.message}` };
            }
            return { success: true, warning: 'Datos guardados en campos legacy (medical_info no disponible aún)' };
        }

        return { error: `Error al guardar ficha médica: ${error.message}` };
    }

    revalidatePath('/dashboard/matriculas', 'layout');
    return { success: true };
}
