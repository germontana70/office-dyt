'use server';

import { createClient } from '@/infra/services/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { initializePaymentPlan } from './finance';

// Validadores estrictos
const ProgramSelectionSchema = z.object({
    id: z.string(), // ID de dyt_program_prices
    name: z.string()
});

const NewEnrollmentSchema = z.object({
    student_id: z.string().uuid(),
    semester: z.literal('2026-1'),
    enrollment_fee_enabled: z.boolean(),
    tshirt_quantity: z.number().min(0).max(5),
    tshirt_size: z.string().optional(),
    global_observations: z.string().optional(),
    payment_method: z.string(),
    bank_entity: z.string().optional(),
    reference_number: z.string().optional(),
    programs: z.array(ProgramSelectionSchema).min(1, 'Debe seleccionar al menos un programa.')
});

export type SaveNewEnrollmentResponse = {
    success: boolean;
    error?: string;
    data?: any;
};

export async function saveNewEnrollment(payload: z.infer<typeof NewEnrollmentSchema>): Promise<SaveNewEnrollmentResponse> {
    try {
        // 1. Zod Validation Estricta
        const validatedArgs = NewEnrollmentSchema.parse(payload);
        const supabase = await createClient();

        // 2. Transaccionalidad / Aislamiento
        // Creamos la matrícula base en dyt_enrollments (No JSON, solo el ID refricionado)
        const { data: enrollment, error: enrollmentError } = await supabase
            .from('dyt_enrollments')
            .upsert({
                student_id: validatedArgs.student_id,
                semester: validatedArgs.semester,
                is_active: true,
                enrollment_date: new Date().toISOString()
            }, { onConflict: 'student_id,semester' })
            .select()
            .single();

        if (enrollmentError || !enrollment) {
            console.error('[ENROLLMENT] Error creando dyt_enrollments:', enrollmentError);
            return { success: false, error: 'Error al registrar la matrícula base.' };
        }

        const enrollmentId = enrollment.id;

        // 3. Limpiar programas anteriores si es un Upsert
        await supabase
            .from('dyt_enrollment_programs')
            .delete()
            .eq('enrollment_id', enrollmentId);

        // 4. Múltiple Insert Atómico en dyt_enrollment_programs
        const programsToInsert = validatedArgs.programs.map((prog) => ({
            enrollment_id: enrollmentId,
            program_name: prog.name, // Referencia limpia textual normalizada
        }));

        const { error: programsError } = await supabase
            .from('dyt_enrollment_programs')
            .insert(programsToInsert);

        if (programsError) {
            console.error('[ENROLLMENT] Error insertando programas:', programsError);
            // Rollback manual simple (simulando trx)
            await supabase.from('dyt_enrollments').delete().eq('id', enrollmentId);
            return { success: false, error: 'Error al registrar los programas elegidos.' };
        }

        // 5. Invocación de Plan Financiero Dinámico
        // delegation del cálculo individual por porcentaje en finance.ts
        const financialInit = await initializePaymentPlan(enrollmentId);

        if (!financialInit.success) {
            return {
                success: false,
                error: `La matrícula y componentes se guardaron, pero falló motor financiero: ${financialInit.error}`
            };
        }

        revalidatePath('/dashboard/matriculas');
        revalidatePath(`/dashboard/matriculas/${validatedArgs.student_id}/edit`);
        
        return { success: true, data: { enrollmentId, financialInit } };

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return { success: false, error: 'Validación fallida: ' + error.issues[0].message };
        }
        console.error('[ENROLLMENT SAVER] Exception:', error);
        return { success: false, error: 'Error del servidor al registrar la matrícula.' };
    }
}
