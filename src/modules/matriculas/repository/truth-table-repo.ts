import { createClient } from '@/infra/services/server';
import { TruthTableStudentSchema, TruthTableStudent } from '../models/student.schema';

export class TruthTableRepository {
    /**
     * Busca en el CRM Histórico de estudiantes por su documento.
     * Aplica saneamiento estricto Zod para proteger el frontend.
     */
    static async searchByDocument(documentNumber: string): Promise<TruthTableStudent | null> {
        const supabase = await createClient();

        // Obtenemos los datos desde la tabla legacy de Streamlit. Usamos casting para evitar
        // fallos de TS si no está mapeada 100% en src/infra/types/database.ts
        const { data, error } = await supabase
            .from('Tabla_Verdad_Estudiantes' as any)
            .select('*')
            .eq('document_number', documentNumber)
            .single();

        if (error) {
            // errorCode PGRST116: no rows returned
            if (error.code === 'PGRST116') {
                return null; // No está en el histórico
            }
            console.error('[Supabase Error] Fallo al buscar en CRM Histórico:', error);
            throw new Error(`Se produjo un error al buscar el estudiante con doc ${documentNumber}`);
        }

        if (!data) return null;

        // Parseo Estricto y Resiliente (Data Hydration)
        const parsed = TruthTableStudentSchema.safeParse(data);

        if (parsed.success) {
            return parsed.data;
        } else {
            // DO NO HARM: Si el estudiante existe pero la data es tan corrupta que
            // no sobrevive los transformers de Zod, no podemos devolverlo sin más.
            console.error(`[Zod Error] El registro histórico de ${documentNumber} está corrupto:`, parsed.error.issues);
            throw new Error(`Los datos históricos de este estudiante se detectaron como inválidos o corruptos.`);
        }
    }

    /**
     * Obtiene una lista de estudiantes en el histórico que coincidan con un texto
     * Usado para reintegros cuando la búsqueda por documento exacto no basta
     */
    static async searchByName(query: string): Promise<TruthTableStudent[]> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('Tabla_Verdad_Estudiantes' as any)
            .select('*')
            .ilike('first_name', `%${query}%`)
            .limit(10); // Límite razonable

        if (error) {
            console.error(`[Supabase Error] Fallo al buscar estudiantes históricos con "${query}":`, error);
            return [];
        }

        if (!data || data.length === 0) return [];

        const validStudents: TruthTableStudent[] = [];

        for (const row of data) {
            const parsed = TruthTableStudentSchema.safeParse(row);

            if (parsed.success) {
                validStudents.push(parsed.data);
            } else {
                console.warn(`[Zod Warning] Estudiante omitido de búsqueda CRM por corrupción (ID: ${row.id}):`, parsed.error.issues);
            }
        }

        return validStudents;
    }
}
