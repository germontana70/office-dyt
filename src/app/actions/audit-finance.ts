"use server";

import { createClient } from '@/infra/services/server';
import { revalidatePath } from 'next/cache';
import { initializePaymentPlan } from '@/app/actions/finance';

export async function syncProgramNames(formData: FormData) {
    const programId = String(formData.get('programId') || '').trim();
    const targetName = String(formData.get('targetName') || '').trim();
    const semester = String(formData.get('semester') || '').trim();

    if (!programId || !targetName || !semester) {
        return { success: false, error: 'Faltan datos para sincronizar el programa.' };
    }

    try {
        const supabase = await createClient();

        const { data: programRow, error: programError } = await supabase
            .from('dyt_enrollment_programs')
            .select('id, enrollment_id, program_name')
            .eq('id', programId)
            .single();

        if (programError || !programRow) {
            console.error('[AUDIT SYNC] Error consultando programa:', programError);
            return { success: false, error: 'No se encontro el programa en matricula.' };
        }

        const { data: enrollmentRow, error: enrollmentError } = await supabase
            .from('dyt_enrollments')
            .select('id, semester, student_id')
            .eq('id', programRow.enrollment_id)
            .single();

        if (enrollmentError || !enrollmentRow) {
            console.error('[AUDIT SYNC] Error consultando matricula:', enrollmentError);
            return { success: false, error: 'No se encontro la matricula del programa.' };
        }

        if (enrollmentRow.semester !== semester) {
            return { success: false, error: 'Semestre inconsistente para esta correccion.' };
        }

        const { error: updateError } = await supabase
            .from('dyt_enrollment_programs')
            .update({ program_name: targetName })
            .eq('id', programId)
            .eq('enrollment_id', enrollmentRow.id);

        if (updateError) {
            console.error('[AUDIT SYNC] Error actualizando programa:', updateError);
            return { success: false, error: 'No se pudo sincronizar el nombre del programa.' };
        }

        if (enrollmentRow.student_id) {
            const { error: enrollmentUpdateError } = await supabase
                .from('dyt_enrollments')
                .update({ 
                    program_name: targetName,
                    updated_at: new Date().toISOString()
                })
                .eq('student_id', enrollmentRow.student_id)
                .eq('semester', semester);

            if (enrollmentUpdateError) {
                console.error('[AUDIT SYNC] Error actualizando matricula (dyt_enrollments):', enrollmentUpdateError);
                console.log('-- DETALLE ERROR:', JSON.stringify(enrollmentUpdateError, null, 2));
                return { 
                    success: false, 
                    error: `No se pudo sincronizar la matricula: ${enrollmentUpdateError.message}` 
                };
            }
        }

        revalidatePath('/dashboard/audit-finance');
        return { success: true };
    } catch (error: any) {
        console.error('[AUDIT SYNC] Error inesperado:', error);
        return { success: false, error: error?.message || 'Error inesperado.' };
    }
}

export async function legalizeEnrollmentProgram(formData: FormData) {
    const enrollmentId = String(formData.get('enrollmentId') || '').trim();
    const programId = String(formData.get('programId') || '').trim();
    const programName = String(formData.get('programName') || '').trim();
    const semester = String(formData.get('semester') || '').trim();

    if (!enrollmentId || !programName) {
        return { success: false, error: 'Faltan datos para legalizar la matricula.' };
    }

    try {
        const supabase = await createClient();

        const { data: enrollmentRow, error: enrollmentError } = await supabase
            .from('dyt_enrollments')
            .select('id, semester')
            .eq('id', enrollmentId)
            .single();

        if (enrollmentError || !enrollmentRow) {
            console.error('[LEGALIZE] Error consultando matricula:', enrollmentError);
            return { success: false, error: 'No se encontro la matricula.' };
        }

        if (semester && enrollmentRow.semester !== semester) {
            return { success: false, error: 'Semestre inconsistente para esta legalizacion.' };
        }

        let programSaved = false;

        if (programId) {
            const { error: updateError } = await supabase
                .from('dyt_enrollment_programs')
                .update({ program_name: programName })
                .eq('id', programId)
                .eq('enrollment_id', enrollmentId);

            if (updateError) {
                console.error('[LEGALIZE] Error actualizando programa:', updateError);
                return { success: false, error: 'No se pudo actualizar el programa.' };
            }
            programSaved = true;
        } else {
            const { error: insertError } = await supabase
                .from('dyt_enrollment_programs')
                .insert({ enrollment_id: enrollmentId, program_name: programName });

            if (insertError) {
                console.error('[LEGALIZE] Error creando programa:', insertError);
                return { success: false, error: 'No se pudo crear el programa.' };
            }
            programSaved = true;
        }

        const paymentResult = await initializePaymentPlan(enrollmentId);
        if (!paymentResult?.success) {
            return {
                success: false,
                error: 'Programa guardado, pero error en finanzas. Reintentar finanzas.',
                programSaved
            };
        }

        revalidatePath('/dashboard/audit-finance/legalize');
        return { success: true, warning: paymentResult?.warning || null, programSaved };
    } catch (error: any) {
        console.error('[LEGALIZE] Error inesperado:', error);
        return { success: false, error: error?.message || 'Error inesperado.' };
    }
}

export async function refreshAuditData(formData: FormData) {
    const path = String(formData.get('path') || '').trim() || '/dashboard/audit-finance';

    try {
        const supabase = await createClient();
        await supabase.from('dyt_enrollments').select('id').limit(1);
        revalidatePath(path);
        return { success: true };
    } catch (error: any) {
        console.error('[AUDIT REFRESH] Error inesperado:', error);
        return { success: false, error: error?.message || 'Error inesperado.' };
    }
}
