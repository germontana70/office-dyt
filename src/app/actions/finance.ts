"use server";

import { createClient } from '@/infra/services/server';

type PaymentPlanRow = {
    id: string;
    enrollment_id: string;
    plan_type: 'contado' | 'cuotas';
    base_amount: number;
    enrollment_fee: number;
    uniform_fee: number;
    total_amount: number;
    status: 'pending' | 'partial' | 'paid';
    start_date?: string;
    installments_details?: any[];
    created_at?: string;
    updated_at?: string;
};

type ProgramPriceRow = {
    program_name: string | null;
    cash_price?: number | null;
    valor_contado?: number | null;
    increment_percentage?: number | null;
    total_classes?: number | null;
};

const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export async function initializePaymentPlan(enrollmentId: string) {
    try {
        if (!enrollmentId) {
            return { success: false, error: 'Falta enrollment_id.' };
        }

        const supabase = await createClient();

        const { data: existingPlan, error: existingError } = await supabase
            .from('dyt_payment_plans')
            .select('*')
            .eq('enrollment_id', enrollmentId)
            .maybeSingle();

        if (existingError) {
            console.error('[FINANCE INIT] Error consultando plan existente:', existingError);
            return { success: false, error: 'Error consultando plan existente.' };
        }

        if (existingPlan) {
            return { success: true, data: existingPlan as PaymentPlanRow };
        }

        const { data: enrollment, error: enrollmentError } = await supabase
            .from('dyt_enrollments')
            .select('id, semester')
            .eq('id', enrollmentId)
            .single();

        if (enrollmentError || !enrollment) {
            console.error('[FINANCE INIT] Error consultando matrícula:', enrollmentError);
            return { success: false, error: 'No se encontró la matrícula.' };
        }

        const { data: settings, error: settingsError } = await supabase
            .from('dyt_global_settings')
            .select('enrollment_fee, tshirt_fee')
            .eq('semester', enrollment.semester)
            .maybeSingle();

        if (settingsError) {
            console.error('[FINANCE INIT] Error consultando settings:', settingsError);
            return { success: false, error: 'Error consultando configuración global.' };
        }

        const enrollmentFee = Number(settings?.enrollment_fee ?? 0);
        const uniformFee = Number(settings?.tshirt_fee ?? 0);

        const { data: programs, error: programsError } = await supabase
            .from('dyt_enrollment_programs')
            .select('program_name')
            .eq('enrollment_id', enrollmentId);

        if (programsError) {
            console.error('[FINANCE INIT] Error consultando programas:', programsError);
            return { success: false, error: 'Error consultando programas.' };
        }

        const programNames = (programs || [])
            .map((row: any) => String(row.program_name || '').trim())
            .filter((name: string) => name.length > 0);

        let baseAmount = 0;
        let needsAudit = false;

        if (programNames.length > 0) {
            let priceRows: ProgramPriceRow[] = [];

            // 1. Leer EXCLUSIVAMENTE de la tabla moderna dyt_program_prices
            const { data: dytPrices, error: dytPricesError } = await supabase
                .from('dyt_program_prices')
                .select('*')
                .eq('semester', enrollment.semester);

            if (dytPricesError) {
                console.error('[FINANCE INIT] Supabase Error Real en dyt_program_prices:', dytPricesError);
                return { success: false, error: 'Error consultando precios de programa.' };
            }

            priceRows = (dytPrices || []) as ProgramPriceRow[];

            const roundup10k = (val: number) => Math.ceil(val / 10000) * 10000;

            // Mapa: nombre normalizado → { contado, incremento, total_classes }
            const priceMap = new Map(
                priceRows.map((row) => {
                    const cashValue = Number(row.valor_contado ?? row.cash_price ?? 0);
                    const incrementValue = Number(row.increment_percentage ?? 0);
                    const totalClassesValue = Number(row.total_classes ?? 16);
                    return [normalizeStr(String(row.program_name || '')), { cash: cashValue, increment: incrementValue, total_classes: totalClassesValue }];
                })
            );

            baseAmount = programNames.reduce((sum, name) => {
                const key = normalizeStr(name);
                const pricing = priceMap.get(key);
                
                if (pricing === undefined || pricing === null) {
                    needsAudit = true;
                    console.warn(`[FINANCE INIT] Precio no encontrado para: ${name}. Usando $0 temporal.`);
                    return sum + 0;
                }

                // Si se encuentra, calcula el total financiado y se aplica roundup10k
                const financed = pricing.cash * (1 + (pricing.increment / 100));
                const roundedFinanced = roundup10k(financed);

                console.log(`[FINANCE INIT] Programa: ${name} → Contado: ${pricing.cash}, Incremento: ${pricing.increment}%, Financiado Redondeado: ${roundedFinanced}`);
                
                // Retornar pricing.cash ya que el plan se sella en UI con `base_amount` como cash
                return sum + pricing.cash;
            }, 0);
        } else {
            needsAudit = true;
        }

        const totalAmount = baseAmount + enrollmentFee + uniformFee;

        const primaryPayload = {
            enrollment_id: enrollmentId,
            plan_type: 'cuotas',
            base_amount: baseAmount,
            enrollment_fee: enrollmentFee,
            uniform_fee: uniformFee,
            total_amount: totalAmount,
            status: 'pending',
            needs_audit: needsAudit
        };

        const { data: newPlan, error: insertError } = await supabase
            .from('dyt_payment_plans')
            .insert(primaryPayload)
            .select('*')
            .single();

        if (!insertError) {
            return { success: true, data: newPlan as PaymentPlanRow };
        }

        console.error('[FINANCE INIT] Error creando plan:', insertError);

        const shouldFallback = String(insertError?.message || '').includes('base_amount');

        if (!shouldFallback) {
            return { success: false, error: 'Error creando plan de pago.' };
        }

        const fallbackPayload: Record<string, any> = {
            enrollment_id: enrollmentId,
            plan_type: 'contado',
            total_amount: baseAmount,
            status: 'Pendiente de Auditoría'
        };

        const { data: fallbackPlan, error: fallbackError } = await supabase
            .from('dyt_payment_plans')
            .insert(fallbackPayload)
            .select('*')
            .single();

        if (fallbackError) {
            const fallbackStatus = String(fallbackError?.message || '').includes('enum')
                ? { ...fallbackPayload, status: 'pending' }
                : fallbackPayload;

            if (fallbackStatus !== fallbackPayload) {
                const { data: retryPlan, error: retryError } = await supabase
                    .from('dyt_payment_plans')
                    .insert(fallbackStatus)
                    .select('*')
                    .single();

                if (!retryError) {
                    return {
                        success: true,
                        data: retryPlan as PaymentPlanRow,
                        warning: 'Plan creado en modo contingencia (pendiente de auditoria).',
                        needsAudit
                    };
                }
            }

            console.error('[FINANCE INIT] Error fallback creando plan:', fallbackError);
            return { success: false, error: 'Error creando plan de pago.' };
        }

        return {
            success: true,
            data: fallbackPlan as PaymentPlanRow,
            warning: 'Plan creado en modo contingencia (pendiente de auditoria).',
            needsAudit
        };
    } catch (error: any) {
        console.error('[FINANCE INIT] Error inesperado:', error);
        return { success: false, error: error?.message || 'Error inesperado.' };
    }
}

export async function sealPaymentPlan(input: {
    payment_plan_id: string;
    base_amount: number;
    enrollment_fee: number;
    uniform_fee: number;
    total_amount: number;
    plan_type: 'contado' | 'cuotas';
    initial_payment?: number;
    payment_method?: string;
    reference_code?: string;
    notes?: string;
    start_date?: string;
    installments_details?: any[];
    program_instruments?: Array<{ program_id: string; instrument_id: string | null }>;
    program_updates?: Array<{ program_id: string; program_name: string; group_class_id?: string | null; teacher_id?: string | null; schedules?: any[]; observations?: string; isNew?: boolean; isDeleted?: boolean }>;
    discount_percentage?: number;
    /** Datos de prorrateo por programa (ingreso tardío). Zero-DDL: se serializa en installments_details JSONB. */
    proration?: Array<{ program_id: string; classes_taken: number; total_classes: number }>;
}) {
    try {
        const supabase = await createClient();

        // Sanitización Estricta de UUIDs para evitar Type Mismatch en PostgreSQL
        const sanitizeUUID = (val: any) => {
            if (!val) return null;
            const str = String(val).trim();
            if (str === '' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'none') return null;
            return str;
        };

        const { data: plan, error: planError } = await supabase
            .from('dyt_payment_plans')
            .select('id, enrollment_id')
            .eq('id', input.payment_plan_id)
            .single();

        if (planError || !plan) {
            console.error('[FINANCE SEAL] Error consultando plan:', planError);
            return { success: false, error: 'No se encontró el plan de pago.' };
        }

        const { data: enrollment, error: enrollmentError } = await supabase
            .from('dyt_enrollments')
            .select('id, semester')
            .eq('id', plan.enrollment_id)
            .single();

        if (enrollmentError || !enrollment) {
            console.error('[FINANCE SEAL] Error consultando matrícula:', enrollmentError);
            return { success: false, error: 'No se encontró la matrícula del plan.' };
        }

        const initialPayment = Number(input.initial_payment || 0);
        let status: 'pending' | 'partial' | 'paid' = 'pending';

        // Calcular estado basado en recibos totales (si existen detalles de cuotas)
        const totalCollectedEntries = (input.installments_details || []).reduce((sum, inst) => sum + Number(inst.amount_paid || 0), 0);
        const effectiveCollected = Math.max(initialPayment, totalCollectedEntries);

        if (effectiveCollected > 0 && effectiveCollected < input.total_amount) {
            status = 'partial';
        }
        if (effectiveCollected >= input.total_amount) {
            status = 'paid';
        }

        // ── PRORRATEO: Serializar metadatos de ingreso tardío en el JSONB (Zero-DDL) ──
        const prorationMap = new Map(
            (input.proration || []).map(p => [p.program_id, p])
        );
        const installmentsArray = (input.installments_details || []).map(detail => {
            const proData = prorationMap.get(detail.program_id);
            if (!proData) return detail;
            // Enriquecer cada cuota con metadatos de auditoría de prorrateo
            return {
                ...detail,
                classes_taken: proData.classes_taken,
                total_classes: proData.total_classes,
                is_prorated: true
            };
        });

        const { data: updatedPlan, error: updateError } = await supabase
            .from('dyt_payment_plans')
            .update({
                base_amount: input.base_amount,
                enrollment_fee: input.enrollment_fee,
                uniform_fee: input.uniform_fee,
                total_amount: input.total_amount,
                plan_type: input.plan_type,
                start_date: input.start_date || null,
                installments_details: installmentsArray,
                number_of_installments: installmentsArray.length || 1,
                discount_percentage: input.discount_percentage || 0,
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', input.payment_plan_id)
            .select('*')
            .single();

        if (updateError) {
            console.error('[FINANCE SEAL] Error actualizando plan:', updateError);
            return { success: false, error: 'Error al actualizar el plan de pago.' };
        }

        const programInstrumentsMap = new Map();
        if (input.program_instruments && input.program_instruments.length > 0) {
            for (const entry of input.program_instruments) {
                programInstrumentsMap.set(entry.program_id, entry.instrument_id);
                
                // Evitamos que un ID provisional crasheé la transacción en PG
                if (entry.program_id.startsWith('new-')) continue;

                const sanitizedInstrument = sanitizeUUID(entry.instrument_id);

                const { error: programUpdateError } = await supabase
                    .from('dyt_enrollment_programs')
                    .update({ instrument_id: sanitizedInstrument })
                    .eq('id', entry.program_id)
                    .eq('enrollment_id', plan.enrollment_id);

                if (programUpdateError) {
                    console.error('[FINANCE SEAL] Error actualizando instrumento:', JSON.stringify(programUpdateError));
                    return { success: false, error: `Error al actualizar instrumento del programa. PG: ${programUpdateError.message || programUpdateError.code || JSON.stringify(programUpdateError)}` };
                }
            }
        }

        if (input.program_updates && input.program_updates.length > 0) {
            for (const entry of input.program_updates) {
                if (entry.isDeleted) {
                    if (!entry.program_id.startsWith('new-')) {
                        const { error: deleteError } = await supabase
                            .from('dyt_enrollment_programs')
                            .delete()
                            .eq('id', entry.program_id)
                            .eq('enrollment_id', plan.enrollment_id);
                        if (deleteError) {
                            console.error('[FINANCE SEAL] Error eliminando programa:', deleteError);
                        }
                    }
                    continue;
                }

                const updatePayload: Record<string, any> = { program_name: entry.program_name };
                if (entry.group_class_id !== undefined) {
                    updatePayload.group_class_id = sanitizeUUID(entry.group_class_id);
                }
                if (entry.teacher_id !== undefined) {
                    updatePayload.teacher_id = sanitizeUUID(entry.teacher_id);
                }
                
                // Mapeo Completo de Horarios (hasta 3 slots: day, time, room, duration)
                const schedules = entry.schedules || [];
                for (let i = 0; i < 3; i++) {
                    const slot = schedules[i];
                    const suffix = `_${i + 1}`;
                    updatePayload[`day${suffix}`] = slot?.day || null;
                    updatePayload[`time${suffix}`] = slot?.startTime || null;
                    updatePayload[`room${suffix}`] = slot?.room || null;
                    updatePayload[`duration${suffix}`] = slot?.duration || null;
                }

                if (entry.isNew) {
                    updatePayload.enrollment_id = plan.enrollment_id;
                    const instrumentIdRaw = programInstrumentsMap.get(entry.program_id);
                    if (instrumentIdRaw !== undefined) {
                        updatePayload.instrument_id = sanitizeUUID(instrumentIdRaw);
                    }
                    
                    const { error: insertError } = await supabase
                        .from('dyt_enrollment_programs')
                        .insert(updatePayload);
                    if (insertError) {
                        console.error('[FINANCE SEAL] Error insertando programa:', insertError);
                    }
                } else {
                    const { error: programUpdateError } = await supabase
                        .from('dyt_enrollment_programs')
                        .update(updatePayload)
                        .eq('id', entry.program_id)
                        .eq('enrollment_id', plan.enrollment_id);

                    if (programUpdateError) {
                        console.error('[FINANCE SEAL] Error actualizando programa:', programUpdateError);
                        return { success: false, error: 'Error al actualizar programa del estudiante.' };
                    }
                }
            }
        }


        let transaction = null;

        if (initialPayment > 0) {
            const { data: created, error: transactionError } = await supabase
                .from('dyt_transactions')
                .insert({
                    payment_plan_id: input.payment_plan_id,
                    amount_paid: initialPayment,
                    payment_date: new Date().toISOString(),
                    payment_method: input.payment_method || null,
                    reference_code: input.reference_code || null,
                    notes: input.notes || null
                })
                .select('*')
                .single();

            if (transactionError) {
                console.error('[FINANCE SEAL] Error creando transacción:', transactionError);
                return { success: false, error: 'Error al crear la transacción inicial.' };
            }

            transaction = created;
        }

        return { success: true, data: { plan: updatedPlan as PaymentPlanRow, transaction } };
    } catch (error: any) {
        console.error('[FINANCE SEAL] Error inesperado:', error);
        return { success: false, error: error?.message || 'Error inesperado.' };
    }
}

/**
 * Reconcilia los pagos migrados en dyt_transactions con el cronograma
 * de installments_details en dyt_payment_plans. Útil para estudiantes
 * cuyas cuotas fueron sincronizadas desde el módulo de Auditoría.
 */
export async function reconcileTransactionsToPaymentPlan(enrollmentId: string) {
    try {
        const supabase = await createClient();

        // 1. Buscar el plan de pago del enrollment
        const { data: plan, error: planError } = await supabase
            .from('dyt_payment_plans')
            .select('id, number_of_installments, total_amount')
            .eq('enrollment_id', enrollmentId)
            .maybeSingle();

        if (planError || !plan) {
            return { success: false, error: 'No se encontró un plan de pago para esta matrícula.' };
        }

        // 2. Leer las transacciones de dyt_transactions para este enrollment
        const { data: transactions, error: txError } = await supabase
            .from('dyt_transactions')
            .select('id, payment_date, amount_paid, payment_method, bank_entity, reference_number, concept')
            .eq('enrollment_id', enrollmentId)
            .order('payment_date', { ascending: true });

        if (txError) {
            return { success: false, error: 'Error leyendo transacciones.' };
        }

        if (!transactions || transactions.length === 0) {
            return { success: false, error: 'No hay transacciones registradas para este enrollment.' };
        }

        // 3. Obtener el primer programa de la matrícula para asociar los pagos (para que sean visibles en UI)
        const { data: programs } = await supabase
            .from('dyt_enrollment_programs')
            .select('id')
            .eq('enrollment_id', enrollmentId)
            .limit(1);
        
        const firstProgramId = programs && programs.length > 0 ? programs[0].id : null;

        // 4. Construir el array de installments_details a partir de las transacciones respetando cuotas pactadas
        const txs = transactions || [];
        const targetLength = Math.max(Number(plan.number_of_installments) || 0, txs.length);

        const installmentsDetails = Array.from({ length: targetLength }).map((_, index) => {
            const tx = txs[index];
            if (tx) {
                return {
                    installment_number: index + 1,
                    amount_due: Number(tx.amount_paid) || 0, // En reconciliación, lo pactado es lo pagado
                    amount_paid: Number(tx.amount_paid) || 0,
                    projected_date: tx.payment_date || null, // Usar la fecha real como proyectada si es reconciliado
                    payment_date: tx.payment_date || null,
                    payment_method: tx.payment_method || null,
                    entity: tx.bank_entity || null,          // UI espera 'entity'
                    reference: tx.reference_number || null,   // UI espera 'reference'
                    concept: tx.concept || null,
                    transaction_id: tx.id,
                    program_id: firstProgramId // Vincular para visibilidad en UI
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

        const totalPaid = installmentsDetails.reduce((sum, i) => sum + i.amount_paid, 0);
        const totalAmount = Number(plan.total_amount) || 0;
        const newStatus = totalPaid >= totalAmount ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';

        // 4. Actualizar el plan con los installments_details reales y la cantidad pactada conservada
        const { error: updateError } = await supabase
            .from('dyt_payment_plans')
            .update({
                installments_details: installmentsDetails,
                number_of_installments: targetLength,
                plan_type: targetLength > 1 ? 'cuotas' : 'contado',
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', plan.id);

        if (updateError) {
            return { success: false, error: 'Error actualizando el plan de pago: ' + updateError.message };
        }

        return {
            success: true,
            data: {
                installmentsReconciled: installmentsDetails.length,
                totalPaid,
                status: newStatus
            }
        };
    } catch (error: any) {
        return { success: false, error: error?.message || 'Error inesperado.' };
    }
}
