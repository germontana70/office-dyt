'use server';

import { createClient } from '@/utils/supabase/server';
import { AuditRecord } from './audit-legacy-payments';

const VALID_PROGRAMS = [
    "Curso Libre - Artes (8 Clases)",
    "Piano iniciación",
    "Danza y Expresión (8 Clases)",
    "Curso Libre - Teatro (8 Clases)",
    "Curso Libre - Instrumento (8 Clases)",
    "Semestre Semipersonalizado",
    "Curso Libre - Teatro (12 Clases)",
    "Curso Libre - Teoría (8 Clases)",
    "Curso Libre - Artes (16 Clases)",
    "Curso Libre - Instrumento (12 Clases)",
    "Semestre Personalizado",
    "Curso Libre - Artes (12 Clases)",
    "Curso Libre - Danzas (16 Clases)",
    "Curso Libre - Teatro (16 Clases)",
    "Piano Entonación",
    "Curso Libre - Teoría (16 Clases)",
    "Semestre Piano Entonación",
    "Aprestamiento",
    "Piano Ukelele",
    "Danza Grupal - (8 Clases)",
    "Curso Libre - Teoría (12 Clases)",
    "Curso Libre - Instrumento (16 Clases)"
];

function mapProgramName(sheetName: string): string {
    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const normalizedSheet = normalize(sheetName);
    
    // 1. Exact match normalized
    for (const valid of VALID_PROGRAMS) {
        if (normalize(valid) === normalizedSheet) return valid;
    }
    // 2. Substring match
    for (const valid of VALID_PROGRAMS) {
        if (normalize(valid).includes(normalizedSheet) || normalizedSheet.includes(normalize(valid))) return valid;
    }
    return sheetName; // Fallback
}

function SpToInsert(sheetPrograms: string[], enrollmentId: string) {
    return sheetPrograms.map(sp => ({
        enrollment_id: enrollmentId,
        program_name: mapProgramName(sp),
        number_of_classes: 0,
        agreed_price: 0
    }));
}

export async function fixInstallmentMismatches(fixes: { paymentPlanId?: string, enrollmentId?: string, sheetCuotas: number, sheetPrograms?: string[] }[]) {
    try {
        const supabase = await createClient();
        let fixedCount = 0;
        let errorCount = 0;

        for (const fix of fixes) {
            let { paymentPlanId, enrollmentId, sheetCuotas } = fix;
            
            const planType = sheetCuotas <= 1 ? 'contado' : 'cuotas';
            const newDetails: any[] = sheetCuotas > 1 ? Array.from({ length: sheetCuotas }).map(() => ({})) : [];

            // 1. Si NO tiene paymentPlanId pero SÍ tiene enrollmentId, crearlo desde cero.
            if (!paymentPlanId && enrollmentId) {
                const { data: newPlan, error: insertError } = await supabase
                    .from('dyt_payment_plans')
                    .insert({
                        enrollment_id: enrollmentId,
                        plan_type: planType,
                        status: 'pending',
                        base_amount: 0,
                        total_amount: 0,
                        number_of_installments: sheetCuotas,
                        installments_details: newDetails
                    })
                    .select('id')
                    .single();

                if (insertError) {
                    console.error(`[AUDIT FIX] Error creando plan ciego para enrollment ${enrollmentId}:`, insertError);
                    errorCount++;
                    continue; // Skip the rest if we couldn't even make the plan and had no plan id
                }
                
                paymentPlanId = newPlan.id;
                fixedCount++; // Creado con éxito y seteado
            }

            if (!paymentPlanId && !enrollmentId) {
                console.warn(`[AUDIT FIX] No se proveyó ni paymentPlanId ni enrollmentId. Fila ignorada.`);
                errorCount++;
                continue;
            }

            // A. PARIDAD DE PROGRAMAS
            // Google Sheet es la fuente de verdad: siempre sobreescribir con los programas del Sheet
            if (enrollmentId && fix.sheetPrograms && fix.sheetPrograms.length > 0) {
                // 1. Mapear los nombres del Sheet a los nombres válidos de Supabase
                const programsToWrite = fix.sheetPrograms
                    .map(sp => mapProgramName(sp))
                    .filter(p => p && p.length > 0);

                if (programsToWrite.length > 0) {
                    // 2. Borrar los programas actuales del enrollment
                    await supabase
                        .from('dyt_enrollment_programs')
                        .delete()
                        .eq('enrollment_id', enrollmentId);

                    // 3. Insertar los programas correctos del Sheet
                    const programsToInsert = programsToWrite.map(name => ({
                        enrollment_id: enrollmentId,
                        program_name: name,
                        number_of_classes: 0,
                        agreed_price: 0
                    }));
                    await supabase.from('dyt_enrollment_programs').insert(programsToInsert);
                }
            }

            // B. ACTUALIZAR PLAN EXISTENTE (SI YA TIENE ID O SE ACABA DE CREAR)
            // Solo si no se acaba de crear (para evitar doble conteo y redundancia)
            if (paymentPlanId && !fix.paymentPlanId) {
                // Si llegamos aquí con paymentPlanId pero sin fix.paymentPlanId, es que se creó arriba.
                // Arriba ya incrementamos fixedCount y seteamos todo. No hacemos nada más.
            } else if (paymentPlanId) {
                const { data: currentPlan } = await supabase
                    .from('dyt_payment_plans')
                    .select('installments_details')
                    .eq('id', paymentPlanId)
                    .single();
                    
                let updateDetails: any[] = [];
                if (sheetCuotas > 1) {
                    const currentDetails = Array.isArray(currentPlan?.installments_details) ? currentPlan.installments_details : [];
                    updateDetails = Array.from({ length: sheetCuotas }).map((_, i) => {
                        return currentDetails[i] || {}; // Conservar si existe
                    });
                }

                const { error: updateError } = await supabase
                    .from('dyt_payment_plans')
                    .update({ 
                        plan_type: planType, 
                        number_of_installments: sheetCuotas,
                        installments_details: planType === 'cuotas' ? updateDetails : [] 
                    })
                    .eq('id', paymentPlanId);

                if (updateError) {
                    console.error(`[AUDIT FIX] Error fixing plan ${paymentPlanId}:`, updateError);
                    errorCount++;
                } else {
                    fixedCount++;
                }
            }
        }
        
        return { success: true, fixedCount, errorCount };
    } catch (e: any) {
        console.error('[AUDIT FIX] Error:', e);
        return { success: false, error: e.message };
    }
}

/**
 * Parsea moneda en formato Latino (ej. $ 400.000,00 -> 400000).
 */
const parseLatinCurrency = (rawString: string): number => {
    if (!rawString) return 0;
    const sanitized = rawString
        .replace(/\$/g, '')
        .replace(/\s+/g, '')
        .replace(/\./g, '')
        .replace(/,/g, '.');
    const result = parseFloat(sanitized);
    return isNaN(result) ? 0 : result;
};

export interface SyncResult {
    synced: number;
    skipped: number;
    errors: string[];
}

export async function syncSelectedPayments(records: AuditRecord[]): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, skipped: 0, errors: [] };

    if (!records || records.length === 0) {
        return result;
    }

    try {
        const supabase = await createClient();
        const { getActiveSemesterName } = await import('@/infra/services/semester-helper');
        const activeSemester = await getActiveSemesterName();

        for (const record of records) {
            // Saltamos registros que no hicieron match con DB
            if (!record.isMatch || !record.document || record.installments.length === 0) {
                result.skipped++;
                continue;
            }

            // 1. Obtener el student_id usando el documento
            const sanitizedDoc = record.document.replace(/[\.\s-]/g, '').trim();
            const { data: students, error: studentError } = await supabase
                .from('students')
                .select('id')
                .eq('document_number', sanitizedDoc)
                .limit(1);

            if (studentError || !students || students.length === 0) {
                result.errors.push(`Estudiante no encontrado para documento: ${record.document}`);
                result.skipped++;
                continue;
            }
            const studentId = students[0].id;

            // 2. Obtener el enrollment_id del semestre activo
            const { data: enrollments, error: enrollError } = await supabase
                .from('dyt_enrollments')
                .select('id')
                .eq('student_id', studentId)
                .eq('semester', activeSemester)
                .limit(1);

            if (enrollError || !enrollments || enrollments.length === 0) {
                result.errors.push(`Matrícula no encontrada para documento: ${record.document} en ${activeSemester}`);
                result.skipped++;
                continue;
            }
            const enrollmentId = enrollments[0].id;

            // 3. Obtener el payment_plan_id
            const { data: plans, error: planError } = await supabase
                .from('dyt_payment_plans')
                .select('id')
                .eq('enrollment_id', enrollmentId)
                .limit(1);

            if (planError || !plans || plans.length === 0) {
                result.errors.push(`Plan de pago no encontrado para matrícula de: ${record.document}`);
                result.skipped++;
                continue;
            }
            const paymentPlanId = plans[0].id;

            // 3. Obtener el enrollment_id (Ya lo tenemos en enrollmentId)

            // 4. Iterar sobre las cuotas y sincronizar
            for (const inst of record.installments) {
                if (!inst.reference || inst.reference === 'N/A' || inst.amount <= 0) {
                    result.skipped++;
                    continue;
                }

                // Verificar duplicidad en transacciones
                // IMPORTANTE: dyt_transactions usa enrollment_id y reference_number
                const { data: existingTx, error: txCheckError } = await supabase
                    .from('dyt_transactions')
                    .select('id')
                    .eq('enrollment_id', enrollmentId)
                    .eq('reference_number', String(inst.reference).trim())
                    .limit(1);

                if (txCheckError) {
                    result.errors.push(`Error al verificar transacción ${inst.reference}: ${txCheckError.message}`);
                    continue;
                }

                if (existingTx && existingTx.length > 0) {
                    result.skipped++;
                    continue;
                }

                const definitiveAmount = parseLatinCurrency(String(inst.amount));
                const paymentDate = new Date();
                paymentDate.setHours(12, 0, 0, 0);

                // Inserción Atómica con esquema real
                const { error: insertError } = await supabase
                    .from('dyt_transactions')
                    .insert({
                        enrollment_id: enrollmentId,
                        amount_paid: definitiveAmount,
                        payment_date: paymentDate.toISOString().split('T')[0], // Es tipo DATE
                        payment_method: inst.method || 'Transferencia',
                        reference_number: String(inst.reference).trim(),
                        bank_entity: inst.bank || 'N/A',
                        concept: `[API] Migrado: Cuota ${inst.cuota} - Recibo Original: ${inst.date}`
                    });

                if (insertError) {
                    if (insertError.code === '23505') {
                        result.skipped++;
                    } else {
                        result.errors.push(`Error insertando recibo ${inst.reference}: ${insertError.message}`);
                    }
                } else {
                    result.synced++;
                }
            }

            // --- RECONCILIACIÓN INTELIGENTE DE CUOTAS ---
            // Leemos todas las transacciones de la inscripción
            const { data: allTxs } = await supabase
                .from('dyt_transactions')
                .select('*')
                .eq('enrollment_id', enrollmentId)
                .order('payment_date', { ascending: true });

            // Extraemos el primer programa para linkear en la UI
            const { data: programs } = await supabase
                .from('dyt_enrollment_programs')
                .select('id')
                .eq('enrollment_id', enrollmentId)
                .limit(1);
            
            const firstProgramId = programs && programs.length > 0 ? programs[0].id : null;
            const txs = allTxs || [];
            
            // Forzamos que la cantidad de cuotas sea la declarada en el Sheet (mínimo las pagadas)
            const targetLength = Math.max(record.sheetCuotas || 0, txs.length);

            // Reconstruir installments_details con fidelidad
            const newInstallmentsDetails = Array.from({ length: targetLength }).map((_, index) => {
                const tx = txs[index];
                if (tx) {
                    return {
                        installment_number: index + 1,
                        amount_due: Number(tx.amount_paid) || 0,
                        amount_paid: Number(tx.amount_paid) || 0,
                        projected_date: tx.payment_date || null,
                        payment_date: tx.payment_date || null,
                        payment_method: tx.payment_method || null,
                        entity: tx.bank_entity || null,
                        reference: tx.reference_number || null,
                        concept: tx.concept || null,
                        transaction_id: tx.id,
                        program_id: firstProgramId
                    };
                } else {
                    return {
                        installment_number: index + 1,
                        amount_due: 0,
                        amount_paid: 0,
                        projected_date: null,
                        payment_date: null,
                        payment_method: null,
                        entity: null,
                        reference: null,
                        concept: null,
                        transaction_id: null,
                        program_id: firstProgramId
                    };
                }
            });

            // Actualizar el plan de pagos padre
            await supabase
                .from('dyt_payment_plans')
                .update({
                    plan_type: targetLength > 1 ? 'cuotas' : 'contado',
                    number_of_installments: targetLength,
                    installments_details: newInstallmentsDetails
                })
                .eq('id', paymentPlanId);
            // --------------------------------------------
        }

        return result;
    } catch (error: any) {
        console.error('[SYNC AUDIT PAYMENTS] Fallo general:', error);
        result.errors.push(`Fallo general del motor: ${error.message}`);
        return result;
    }
}
