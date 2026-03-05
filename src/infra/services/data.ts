import { createClient as createBrowserClient } from './client';
import { Database } from '../types/database';

// Cliente universal para servicios de infraestructura (Browser/Client-side)
const supabase = createBrowserClient<Database>();

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Student = Database['public']['Tables']['students']['Row'];
export type Teacher = Database['public']['Tables']['teachers']['Row'];

export const dataService = {
    /**
     * Obtiene el perfil de un usuario por ID
     */
    async getProfile(id: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Profile;
    },

    /**
     * Obtiene la lista de estudiantes filtrada por semestre
     */
    async getStudents(semester?: string) {
        let query = supabase.from('students').select('*');
        if (semester) {
            query = query.eq('semester', semester);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data as Student[];
    },

    /**
     * Obtiene la lista de profesores activos
     */
    async getTeachers() {
        const { data, error } = await supabase
            .from('teachers')
            .select('*')
            .eq('is_active', true);
        if (error) throw error;
        return data as Teacher[];
    }
};
