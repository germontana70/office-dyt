import { createClient } from '@/infra/services/server';

export interface Semester {
    id: string;
    name: string;
    start_date: string;
    sheet_url: string;
    is_active: boolean;
    created_at?: string;
}

export class SemesterRepository {
    static async getAll(): Promise<Semester[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('semesters')
            .select('*')
            .order('name', { ascending: false });

        if (error) {
            console.error('[Supabase Error] Fallo al obtener semestres:', error);
            return []; // Fallback for now if table doesn't exist
        }

        return data || [];
    }

    static async getActive(): Promise<Semester | null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('semesters')
            .select('*')
            .eq('is_active', true)
            .single();

        if (error) {
            console.error('[Supabase Error] Fallo al obtener semestre activo:', error);
            return null;
        }

        return data;
    }

    static async create(semester: Omit<Semester, 'id' | 'is_active' | 'created_at'>): Promise<Semester | null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('semesters')
            .insert({ ...semester, is_active: false })
            .select()
            .single();

        if (error) {
            console.error('[Supabase Error] Fallo al crear semestre:', error);
            throw error;
        }

        return data;
    }

    static async setActive(id: string): Promise<boolean> {
        const supabase = await createClient();

        // Transaction-like approach (Supabase RPC would be better, but we do 2 steps)
        // 1. Set all to inactive
        const { error: error1 } = await supabase
            .from('semesters')
            .update({ is_active: false })
            .neq('id', '00000000-0000-0000-0000-000000000000'); // update all matching rows

        if (error1) {
            console.error('[Supabase Error] Fallo al desactivar semestres anteriores:', error1);
            return false;
        }

        // 2. Set target to active
        const { error: error2 } = await supabase
            .from('semesters')
            .update({ is_active: true })
            .eq('id', id);

        if (error2) {
            console.error('[Supabase Error] Fallo al activar semestre:', error2);
            return false;
        }

        return true;
    }
}
