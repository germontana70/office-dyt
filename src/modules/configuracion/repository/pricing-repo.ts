import { createClient } from '@/infra/services/server';
import { ProgramPriceSchema, ProgramPrice } from '@/core/schemas/pricing';

export class PricingRepository {
    /**
     * Obtiene todos los precios de los programas para un semestre especifico.
     */
    static async getPricesBySemester(semester: string): Promise<ProgramPrice[]> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('dyt_program_prices')
            .select('*')
            .eq('semester', semester)
            .order('program_name', { ascending: true });

        if (error) {
            console.error('[Supabase Error] Fallo al obtener program_prices:', error);
            throw new Error(`No se pudieron obtener los precios para el semestre ${semester}`);
        }

        if (!data || data.length === 0) return [];

        const validPrices: ProgramPrice[] = [];

        for (const row of data) {
            const parsed = ProgramPriceSchema.safeParse(row);

            if (parsed.success) {
                validPrices.push(parsed.data);
            } else {
                console.warn(`[Zod Warning] Registro descartado o corrupto (ID: ${row.id}):`, parsed.error.issues);
            }
        }

        return validPrices;
    }

    /**
     * Clona los precios de programas de un semestre origen a uno destino,
     * útil cuando se crea un semestre nuevo para no tener que registrar todo desde cero.
     */
    static async cloneConfigToSemester(sourceSemester: string, targetSemester: string): Promise<boolean> {
        const supabase = await createClient();

        // 1. Check if target already has prices
        const { data: existingTarget } = await supabase
            .from('dyt_program_prices')
            .select('id')
            .eq('semester', targetSemester)
            .limit(1);

        if (existingTarget && existingTarget.length > 0) {
            return true; // Ya hay precios, no clonamos para no duplicar
        }

        // 2. Traer precios del sourceSemester
        const { data: sourcePrices, error: sourcePricesError } = await supabase
            .from('dyt_program_prices')
            .select('*')
            .eq('semester', sourceSemester);

        if (!sourcePricesError && sourcePrices && sourcePrices.length > 0) {
            const newPrices = sourcePrices.map(p => {
                const { id, created_at, ...rest } = p;
                return { ...rest, semester: targetSemester };
            });

            await supabase.from('dyt_program_prices').insert(newPrices);
        }

        // 3. Clonar global settings (Matrícula y Camiseta)
        const { data: existingSettings } = await supabase
            .from('dyt_global_settings')
            .select('id')
            .eq('semester', targetSemester)
            .limit(1);

        if (!existingSettings || existingSettings.length === 0) {
            const { data: sourceSettings, error: sourceSettingsError } = await supabase
                .from('dyt_global_settings')
                .select('*')
                .eq('semester', sourceSemester)
                .single();

            if (!sourceSettingsError && sourceSettings) {
                const { id, updated_at, ...rest } = sourceSettings;
                await supabase.from('dyt_global_settings').insert({
                    ...rest,
                    semester: targetSemester,
                    updated_at: new Date().toISOString()
                });
            }
        }

        return true;
    }
}
