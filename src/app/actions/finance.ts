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

            // 1. Intentar buscar en la tabla moderna dyt_program_prices
            const { data: dytPrices, error: dytPricesError } = await supabase
                .from('dyt_program_prices')
                .select('*')
                .eq('semester', enrollment.semester);

            if (dytPricesError) {
                console.error('[FINANCE INIT] Supabase Error Real en dyt_program_prices:', dytPricesError);
            }

            if (!dytPricesError && dytPrices && dytPrices.length > 0) {
                priceRows = dytPrices as ProgramPriceRow[];
            } else {
                // 2. Fallback a la tabla legacy program_prices
                const { data: legacyPrices, error: legacyPricesError } = await supabase
                    .from('program_prices')
                    .select('*')
                    .eq('semester', enrollment.semester);

                if (legacyPricesError) {
                    console.error('[FINANCE INIT] Supabase Error Real en program_prices:', legacyPricesError);
                    return { success: false, error: 'Error consultando precios de programa.' };
                }
                priceRows = (legacyPrices || []) as ProgramPriceRow[];
            }

            const roundup10k = (val: number) => Math.ceil(val / 10000) * 10000;

            // Mapa: nombre normalizado → { contado, incremento }
            const priceMap = new Map(
                priceRows.map((row) => {
                    const cashValue = Number(row.valor_contado ?? row.cash_price ?? 0);
                    const incrementValue = Number(row.increment_percentage ?? 0);
                    return [normalizeStr(String(row.program_name || '')), { cash: cashValue, increment: incrementValue }];
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
}) {
    try {
        const supabase = await createClient();

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

        const { data: updatedPlan, error: updateError } = await supabase
            .from('dyt_payment_plans')
            .update({
                base_amount: input.base_amount,
                enrollment_fee: input.enrollment_fee,
                uniform_fee: input.uniform_fee,
                total_amount: input.total_amount,
                plan_type: input.plan_type,
                start_date: input.start_date || null,
                installments_details: input.installments_details || [],
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

        if (input.program_instruments && input.program_instruments.length > 0) {
            for (const entry of input.program_instruments) {
                const { error: programUpdateError } = await supabase
                    .from('dyt_enrollment_programs')
                    .update({ instrument_id: entry.instrument_id })
                    .eq('id', entry.program_id)
                    .eq('enrollment_id', plan.enrollment_id);

                if (programUpdateError) {
                    console.error('[FINANCE SEAL] Error actualizando instrumento:', programUpdateError);
                    return { success: false, error: 'Error al actualizar instrumento del programa.' };
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
                    updatePayload.group_class_id = entry.group_class_id;
                }
                if (entry.teacher_id !== undefined) {
                    updatePayload.teacher_id = entry.teacher_id;
                }
                if (entry.schedules !== undefined) {
                    updatePayload.schedules = entry.schedules;
                }
                if (entry.observations !== undefined) {
                    updatePayload.observations = entry.observations;
                }

                if (entry.isNew) {
                    updatePayload.enrollment_id = plan.enrollment_id;
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
