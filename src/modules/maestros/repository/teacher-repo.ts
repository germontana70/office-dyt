import { createClient } from '@/infra/services/server';

export interface Teacher {
    id: string;
    name: string;
    instrument: string | null;
    hourly_rate: number | null;
    phone: string | null;
    email: string | null;
    document_number: string | null;
    address: string | null;
    bank_account: string | null;
    nickname_1: string | null;
    nickname_2: string | null;
    is_active: boolean;
    semester: string;
    created_at?: string;
}

export class TeacherRepository {
    static async getAll(semester: string): Promise<Teacher[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('teachers')
            .select('*')
            .eq('semester', semester)
            .order('name', { ascending: true });

        if (error) {
            console.error('[Supabase Error] Fallo al obtener maestros:', error);
            // Fallback for UI if table empty or error
            return [];
        }

        return data || [];
    }

    static async create(teacherData: Omit<Teacher, 'id' | 'is_active' | 'created_at'>): Promise<Teacher | null> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('teachers')
            .insert({ ...teacherData, is_active: true })
            .select()
            .single();

        if (error) {
            console.error('[Supabase Error] Fallo al crear maestro:', error);
            throw error;
        }

        return data;
    }

    static async update(id: string, teacherData: Partial<Omit<Teacher, 'id' | 'created_at'>>): Promise<Teacher | null> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('teachers')
            .update(teacherData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[Supabase Error] Fallo al actualizar maestro:', error);
            throw error;
        }

        return data;
    }

    /**
     * Clona todos los maestros de un semestre a otro.
     */
    static async cloneTeachersToSemester(sourceSemester: string, targetSemester: string): Promise<boolean> {
        const supabase = await createClient();

        // 1. Check if target already has teachers
        const { data: existingTarget } = await supabase
            .from('teachers')
            .select('id')
            .eq('semester', targetSemester)
            .limit(1);

        if (existingTarget && existingTarget.length > 0) {
            return true; // Ya hay maestros, no clonamos para evitar duplicados
        }

        // 2. Traer maestros del sourceSemester
        const { data: sourceTeachers, error: sourceError } = await supabase
            .from('teachers')
            .select('*')
            .eq('semester', sourceSemester);

        if (!sourceError && sourceTeachers && sourceTeachers.length > 0) {
            const newTeachers = sourceTeachers.map(t => {
                const { id, created_at, ...rest } = t;
                return { ...rest, semester: targetSemester };
            });

            await supabase.from('teachers').insert(newTeachers);
        }

        return true;
    }
}
