'use server';

import { createClient } from '@/infra/services/server';
import { ProgramPrice } from '@/core/schemas/pricing';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';

/**
 * Función que replica `=REDONDEAR.MAS(valor; -4)` de Excel.
 * Redondea siempre hacia arriba a la decena de mil más cercana.
 * Ejemplo: 976.500 -> 980.000
 */
const roundUp10k = (val: number) => Math.ceil(val / 10000) * 10000;
const roundUp1k = (val: number) => Math.ceil(val / 1000) * 1000;

export async function updatePricingVault(prices: ProgramPrice[], semester: string) {
    const supabase = await createClient();
    const currentSemesterStr = String(semester);
    const yearNumber = parseInt(currentSemesterStr.split('-')[0], 10) || new Date().getFullYear();

    // 1. Obtener registros existentes para este semestre para mapear IDs reales
    const { data: existingRecords } = await supabase
        .from('dyt_program_prices')
        .select('id, program_name')
        .eq('semester', currentSemesterStr);

    const recordMap = new Map((existingRecords || []).map(r => [r.program_name.trim().toLowerCase(), r.id]));

    // 2. Procesar y calcular cada registro
    const pricesToUpsert = prices.map(price => {
        const cash_price = Number(price.cash_price || 0);
        // ✅ DIRECTIVA: El % de incremento es específico por programa. No asumir valor global.
        // Si viene undefined (caso raro), usar 0 para no aplicar incremento arbitrario.
        const increment_percentage = Number(price.increment_percentage ?? 0);
        
        // Misión 1: Total Diferido Dinámico (Redondeo 10k)
        const realTotal = roundUp10k(cash_price * (1 + (increment_percentage / 100)));
        
        const installments: Record<string, any> = {};

        // Misión 2: Cuotas "Espejo y Residuo" (Escalable)
        for (let n = 2; n <= 6; n++) {
            // C1 a CN-1: Redondeo hacia ARRIBA a la decena de mil
            const monthlyInstallment = roundUp10k(realTotal / n);
            const sumOfFirstNMinus1 = monthlyInstallment * (n - 1);
            
            // CN: Residuo absoluto
            const finalInstallment = realTotal - sumOfFirstNMinus1;

            const cuotasArray = Array(n - 1).fill(monthlyInstallment);
            cuotasArray.push(finalInstallment);

            installments[n.toString()] = {
                cuotas: cuotasArray,
                total: realTotal
            };
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const pName = String(price.program_name).trim();
        
        let targetId = price.id;

        // RESOLUCIÓN DE CONFLICTO: Si el ID es temporal, buscamos si ya existe por nombre
        if (!targetId || !uuidRegex.test(targetId)) {
            const existingId = recordMap.get(pName.toLowerCase());
            targetId = existingId || randomUUID();
        }

        return {
            id: targetId,
            semester: currentSemesterStr,
            program_name: pName,
            cash_price: cash_price,
            increment_percentage: increment_percentage,
            installments: installments
        };
    });

    console.log("PAYLOAD SENT TO SUPABASE:", JSON.stringify(pricesToUpsert, null, 2));

    const { error } = await supabase
        .from('dyt_program_prices')
        .upsert(pricesToUpsert, { onConflict: 'program_name, semester' });

    if (error) {
        console.error("[PRICING SAVE ERROR]:", error);
        return { success: false, error: 'Hubo un error al guardar los precios.' };
    }

    revalidatePath('/dashboard/configuracion/precios');
    return { success: true };
}
