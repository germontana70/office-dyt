import { createClient } from '@/infra/services/server';

export interface StudentBasic {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
}

export class StudentRepository {
    static async getActiveBasic(): Promise<StudentBasic[]> {
        const supabase = await createClient();

        // Asumiendo que la tabla real es 'students' y tiene estos campos
        const { data, error } = await supabase
            .from('students')
            .select('id, first_name, last_name, email')
            .eq('status', 'activo')
            .order('first_name', { ascending: true });

        if (error) {
            console.error('[Supabase Error] Fallo al obtener estudiantes:', error);
            return [];
        }

        return data || [];
    }
}
