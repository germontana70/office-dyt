import { createClient } from '@/infra/services/server';
import { CurrentStudentSchema, CurrentStudent } from '../models/student.schema';

export class CurrentStudentRepository {
    /**
     * Obtiene todos los estudiantes matriculados en un semestre específico.
     * Aplica saneamiento estricto Zod para proteger el frontend.
     */
    static async getAllBySemester(semester: string): Promise<CurrentStudent[]> {
        const supabase = await createClient();

        // Obtenemos los datos crudos de Supabase
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('semester', semester); // En la base actual puede llamarse 'semester', ajustamos en el mapeo si es diferente

        if (error) {
            console.error('[Supabase Error] Fallo al obtener students:', error);
            throw new Error(`No se pudieron obtener los estudiantes para el semestre ${semester}`);
        }

        if (!data || data.length === 0) return [];

        // Parseo Estricto y Resiliente (Data Hydration)
        const validStudents: CurrentStudent[] = [];

        for (const row of data) {
            // Ajuste al vuelo por si la BD usa 'semester' en lugar de 'semester_enrolled'
            const rawData = {
                ...row,
                semester_enrolled: row.semester_enrolled || row.semester // Compatibilidad
            };

            const parsed = CurrentStudentSchema.safeParse(rawData);

            if (parsed.success) {
                validStudents.push(parsed.data);
            } else {
                // DO NO HARM: Logueamos la advertencia sin que caiga la aplicación entera
                console.warn(`[Zod Warning] Registro descartado o corrupto (ID: ${row.id}):`, parsed.error.issues);
            }
        }

        return validStudents;
    }

    /**
     * Actualiza el estado de la matrícula de un estudiante (ej. Retiro).
     */
    static async updateStatus(studentId: string, status: CurrentStudent['enrollment_status']): Promise<CurrentStudent | null> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('students')
            .update({ enrollment_status: status })
            .eq('id', studentId)
            .select()
            .single();

        if (error) {
            console.error(`[Supabase Error] Fallo al actualizar estudiante ${studentId}:`, error);
            throw error;
        }

        if (!data) return null;

        const parsed = CurrentStudentSchema.safeParse(data);
        if (!parsed.success) {
            console.error(`[Zod Error] Validación fallida tras update de ${studentId}:`, parsed.error.issues);
            throw new Error('El registro actualizado está corrupto');
        }

        return parsed.data;
    }
}
