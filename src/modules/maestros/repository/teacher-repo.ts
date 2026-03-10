import { createClient } from '@/infra/services/server';

export interface Teacher {
    id: string;
    full_name: string;
    specialty: string | null;
    hourly_rate: number | null;
    phone: string | null;
    is_active: boolean;
    created_at?: string;
}

export class TeacherRepository {
    static async getAll(): Promise<Teacher[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('teachers')
            .select('*')
            .order('full_name', { ascending: true });

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
}
