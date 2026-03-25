import { createClient } from '@/infra/services/server';
import { CurrentStudentSchema, CurrentStudent } from '../models/student.schema';

export class CurrentStudentRepository {
    /**
     * Obtiene todos los estudiantes matriculados en un semestre específico.
     * Usa consultas paralelas (Memory Map) para cruzar el estado real de dyt_enrollments.
     * Aplica saneamiento estricto Zod para proteger el frontend.
     */
    static async getAllBySemester(semester: string): Promise<CurrentStudent[]> {
        const supabase = await createClient();

        // ── Consultas paralelas: students + dyt_enrollments simultáneamente ─────
        const [studentsResult, enrollmentsResult] = await Promise.all([
            supabase
                .from('students')
                .select('*')
                .eq('semester', semester)
                .order('first_name', { ascending: true }),
            supabase
                .from('dyt_enrollments')
                .select('student_id, status')
                .eq('semester', semester),
        ]);

        if (studentsResult.error) {
            console.error('[Supabase Error] Fallo al obtener students:', studentsResult.error);
            throw new Error(`No se pudieron obtener los estudiantes para el semestre ${semester}`);
        }

        if (!studentsResult.data || studentsResult.data.length === 0) return [];

        // ── Memory Map: { [student_id]: status } ────────────────────────────────
        const statusMap: Record<string, string> = {};
        if (!enrollmentsResult.error && enrollmentsResult.data) {
            for (const enrollment of enrollmentsResult.data) {
                if (enrollment.student_id) {
                    statusMap[enrollment.student_id] = enrollment.status;
                }
            }
        } else if (enrollmentsResult.error) {
            console.warn('[Supabase Warning] No se pudo obtener estados de dyt_enrollments:', enrollmentsResult.error.message);
        }

        // ── Parseo Estricto y Resiliente (Data Hydration) ───────────────────────
        const validStudents: CurrentStudent[] = [];

        for (const row of studentsResult.data) {
            const rawData = {
                ...row,
                semester_enrolled: row.semester_enrolled || row.semester,
                // Estado real desde dyt_enrollments; fallback 'Activo' si no hay matrícula mapeada
                enrollment_status: statusMap[row.id] ?? 'Activo',
            };

            const parsed = CurrentStudentSchema.safeParse(rawData);

            if (parsed.success) {
                validStudents.push(parsed.data);
            } else {
                console.warn(`[Zod Warning] Registro descartado o corrupto (ID: ${row.id}):`, parsed.error.issues);
            }
        }

        return validStudents;
    }

    /**
     * Obtiene un estudiante específico por su ID.
     * Cruza el estado real de dyt_enrollments en paralelo.
     */
    static async getById(studentId: string): Promise<CurrentStudent | null> {
        const supabase = await createClient();

        const [studentResult, enrollmentResult] = await Promise.all([
            supabase
                .from('students')
                .select('*')
                .eq('id', studentId)
                .single(),
            supabase
                .from('dyt_enrollments')
                .select('status')
                .eq('student_id', studentId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
        ]);

        if (studentResult.error) {
            console.error(`[Supabase Error] Fallo al obtener estudiante ${studentId}:`, studentResult.error);
            return null;
        }

        if (!studentResult.data) return null;

        const data = studentResult.data;

        let photo_url = data.photo_url;
        if (photo_url && !photo_url.startsWith('http')) {
            const { data: publicUrlData } = supabase.storage.from('student-photos').getPublicUrl(photo_url);
            photo_url = publicUrlData.publicUrl;
        }

        const realStatus = enrollmentResult.data?.status ?? 'Activo';

        const rawData = {
            ...data,
            photo_url,
            semester_enrolled: data.semester_enrolled || data.semester,
            enrollment_status: realStatus,
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
