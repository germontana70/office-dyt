import { createClient } from '@/infra/services/server';
import { ProgramPriceSchema, ProgramPrice } from '@/core/schemas/pricing';

export class PricingRepository {
    /**
     * Obtiene todos los precios de los programas para un semestre especifico.
     */
    static async getPricesBySemester(semester: string): Promise<ProgramPrice[]> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('program_prices')
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
}
