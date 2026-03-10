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
    created_at?: string;
}

export class TeacherRepository {
    static async getAll(): Promise<Teacher[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('teachers')
            .select('*')
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
}
