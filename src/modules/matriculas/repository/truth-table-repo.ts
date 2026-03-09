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
            .from('Tabla_Verdad_Estudiantes')
            .select('*')
            .eq('numero_de_identificacion', documentNumber)
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

        // Mapear los campos de la DB al formato esperado por el Esquema Zod
        const mappedData = {
            id: data.id,
            document_number: data.numero_de_identificacion,
            first_name: data.nombres_del_estudiante,
            last_name: data.apellidos_del_estudiante,
            email: data.email,
            phone: data.celular_del_papa || data.celular_de_la_mama,
            // Los campos de sistema y legacy que Zod espera (si no están en DB, Zod usará fallbacks)
        };

        // Parseo Estricto y Resiliente (Data Hydration)
        const parsed = TruthTableStudentSchema.safeParse(mappedData);

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
            .from('Tabla_Verdad_Estudiantes')
            .select('*')
            .ilike('nombres_del_estudiante', `%${query}%`)
            .limit(10); // Límite razonable

        if (error) {
            console.error(`[Supabase Error] Fallo al buscar estudiantes históricos con "${query}":`, error);
            return [];
        }

        if (!data || data.length === 0) return [];

        const validStudents: TruthTableStudent[] = [];

        for (const row of data) {
            const mappedData = {
                id: row.id,
                document_number: row.numero_de_identificacion,
                first_name: row.nombres_del_estudiante,
                last_name: row.apellidos_del_estudiante,
                email: row.email,
                phone: row.celular_del_papa || row.celular_de_la_mama,
            };

            const parsed = TruthTableStudentSchema.safeParse(mappedData);

            if (parsed.success) {
                validStudents.push(parsed.data);
            } else {
                console.warn(`[Zod Warning] Estudiante omitido de búsqueda CRM por corrupción (ID: ${row.id}):`, parsed.error.issues);
            }
        }

        return validStudents;
    }
}
