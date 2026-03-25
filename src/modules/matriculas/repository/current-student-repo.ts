import { createClient } from '@/infra/services/server';
import { CurrentStudentSchema, CurrentStudent } from '../models/student.schema';

export class CurrentStudentRepository {
    /**
     * Obtiene todos los estudiantes matriculados en un semestre específico.
     * Aplica saneamiento estricto Zod para proteger el frontend.
     */
    static async getAllBySemester(semester: string): Promise<CurrentStudent[]> {
        const supabase = await createClient();

        // Obtenemos los datos crudos de Supabase con JOIN a la matrícula del semestre
        const { data, error } = await supabase
            .from('students')
            .select(`
                *,
                dyt_enrollments!inner(status, semester)
            `)
            .eq('semester', semester) // Compatibilidad legacy (si la tabla original lo tiene)
            .eq('dyt_enrollments.semester', semester) // Filtro estricto del JOIN
            .order('first_name', { ascending: true });

        if (error) {
            console.error('[Supabase Error] Fallo al obtener students con JOIN:', error);
            throw new Error(`No se pudieron obtener los estudiantes para el semestre ${semester}`);
        }

        if (!data || data.length === 0) return [];

        // Parseo Estricto y Resiliente (Data Hydration)
        const validStudents: CurrentStudent[] = [];

        for (const row of data) {
            // Ajuste al vuelo por si la BD usa 'semester' en lugar de 'semester_enrolled'
            // Y extracción del status real de Phase 2 (dyt_enrollments)
            const dytEnrollments = Array.isArray(row.dyt_enrollments) ? row.dyt_enrollments : [row.dyt_enrollments];
            const realStatus = dytEnrollments[0]?.status || 'Retirado';

            const rawData = {
                ...row,
                semester_enrolled: row.semester_enrolled || row.semester, // Compatibilidad
                enrollment_status: realStatus // Sobrescribir el fallback de Zod
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
     * Obtiene un estudiante específico por su ID.
     */
    static async getById(studentId: string): Promise<CurrentStudent | null> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('students')
            .select(`
                *,
                dyt_enrollments(status, semester)
            `)
            .eq('id', studentId)
            .single();

        if (error) {
            console.error(`[Supabase Error] Fallo al obtener estudiante ${studentId}:`, error);
            return null;
        }

        if (!data) return null;

        let photo_url = data.photo_url;
        if (photo_url && !photo_url.startsWith('http')) {
            const { data: publicUrlData } = supabase.storage.from('student-photos').getPublicUrl(photo_url);
            photo_url = publicUrlData.publicUrl;
        }

        // Identificar la matrícula más reciente o activa (idealmente cruzar contra el activeSemester)
        const allEnrollments = Array.isArray(data.dyt_enrollments) ? data.dyt_enrollments : (data.dyt_enrollments ? [data.dyt_enrollments] : []);
        // Si hay una matrícula activa, la tomamos. Si no, tomamos la primera que encuentre, o 'Retirado'
        const activeEnrollment = allEnrollments.find((e: any) => e.status === 'Activa') || allEnrollments[0];
        const realStatus = activeEnrollment?.status || 'Retirado';

        const rawData = {
            ...data,
            photo_url,
            semester_enrolled: data.semester_enrolled || data.semester,
            enrollment_status: realStatus
        };

        const parsed = CurrentStudentSchema.safeParse(rawData);

        if (parsed.success) {
            return parsed.data;
        } else {
            console.error(`[Zod Error] Registro corrupto (ID: ${data.id}):`, parsed.error.issues);
            return null;
        }
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

    /**
     * Actualización parcial de campos de un estudiante.
     */
    static async update(studentId: string, data: Partial<CurrentStudent>): Promise<CurrentStudent | null> {
        const supabase = await createClient();

        const { data: updatedData, error } = await supabase
            .from('students')
            .update(data)
            .eq('id', studentId)
            .select()
            .single();

        if (error) {
            console.error(`[Supabase Error] Fallo al actualizar estudiante ${studentId}:`, error);
            throw error;
        }

        if (!updatedData) return null;

        const parsed = CurrentStudentSchema.safeParse(updatedData);
        return parsed.success ? parsed.data : null;
    }
}
