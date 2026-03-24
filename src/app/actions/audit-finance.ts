"use server";

import { createClient } from '@/infra/services/server';
import { revalidatePath } from 'next/cache';
import { initializePaymentPlan } from '@/app/actions/finance';

export async function syncProgramNames(formData: FormData) {
    const programId = String(formData.get('programId') || '').trim();
    const targetName = String(formData.get('targetName') || '').trim();
    const semester = String(formData.get('semester') || '').trim();
    const enrollmentId = String(formData.get('enrollmentId') || '').trim();

    if (!programId || !targetName || !semester) {
        return { success: false, error: 'Faltan datos para sincronizar el programa.' };
    }

    try {
        const supabase = await createClient();
        const isNew = programId.startsWith('new-');

        let student_id: string | null = null;
        let newProgramId: string | undefined;

        if (isNew) {
            if (!enrollmentId) return { success: false, error: 'Falta enrollmentId para insertar programa nuevo.' };
            const { data: insertedProgram, error: insertError } = await supabase
                .from('dyt_enrollment_programs')
                .insert({ enrollment_id: enrollmentId, program_name: targetName })
                .select('id')
                .single();
                
            if (insertError) {
                console.error('[AUDIT SYNC] Error insertando programa nuevo:', insertError);
                return { success: false, error: 'No se pudo crear el programa nuevo.' };
            }
            
            // Reemplazar programId para que luego la UI se entere
            newProgramId = insertedProgram?.id;

            // Para actualizar dyt_enrollments
            const { data: enrollmentRow } = await supabase
                .from('dyt_enrollments')
                .select('student_id')
                .eq('id', enrollmentId)
                .single();
            if (enrollmentRow) student_id = enrollmentRow.student_id;

        } else {
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

            student_id = enrollmentRow.student_id;
        }

        if (student_id) {
            const { error: enrollmentUpdateError } = await supabase
                .from('dyt_enrollments')
                .update({ 
                    program_name: targetName,
                    updated_at: new Date().toISOString()
                })
                .eq('student_id', student_id)
                .eq('semester', semester);

            if (enrollmentUpdateError) {
                console.error('[AUDIT SYNC] Error actualizando matricula (dyt_enrollments):', enrollmentUpdateError);
                return { 
                    success: false, 
                    error: `No se pudo sincronizar la matricula: ${enrollmentUpdateError.message}` 
                };
            }
        }

        revalidatePath('/dashboard/audit-finance');
        if (isNew && newProgramId) {
            return { success: true, newProgramId };
        }
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

export async function saveProgramDataPartial(input: {
    program_id: string;
    enrollment_id: string;
    teacher_id?: string | null;
    schedules?: any[];
    observations?: string;
}) {
    try {
        const supabase = await createClient();
        
        // Evitamos crashear si el programa aún es temporal
        if (input.program_id.startsWith('new-')) {
            return { success: false, error: 'Asigna un programa válido antes de guardar configuraciones.' };
        }

        const sanitizeUUID = (val: any) => {
            if (!val) return null;
            const str = String(val).trim();
            if (str === '' || str.toLowerCase() === 'null' || str.toLowerCase() === 'none') return null;
            return str;
        };

        const updatePayload: Record<string, any> = {};
        if (input.teacher_id !== undefined) updatePayload.teacher_id = sanitizeUUID(input.teacher_id);

        if (input.schedules) {
            for (let i = 0; i < 3; i++) {
                const slot = input.schedules[i];
                const suffix = `_${i + 1}`;
                updatePayload[`day${suffix}`] = slot?.day || null;
                updatePayload[`time${suffix}`] = slot?.startTime || null;
                updatePayload[`duration${suffix}`] = slot?.duration || null;
                updatePayload[`room${suffix}`] = slot?.room || null;
            }
        }

        const { error: updateError } = await supabase
            .from('dyt_enrollment_programs')
            .update(updatePayload)
            .eq('id', input.program_id)
            .eq('enrollment_id', input.enrollment_id);

        if (updateError) {
            console.error('[PROGRAM PARTIAL SAVE] Error Supabase:', updateError);
            return { success: false, error: updateError.message || JSON.stringify(updateError) };
        }

        revalidatePath('/dashboard/matriculas');
        return { success: true };
    } catch (error: any) {
        console.error('[PROGRAM PARTIAL SAVE] Excepción:', error);
        return { success: false, error: error?.message || 'Error inesperado al guardar datos.' };
    }
}
