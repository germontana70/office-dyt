import { createClient } from './client';

export const authService = {
    /**
     * Inicia sesión con correo y contraseña.
     */
    async signIn(email: string, password: string) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { data, error };
    },

    /**
     * Cierra la sesión del usuario actual.
     */
    async signOut() {
        const supabase = createClient();
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    /**
     * Obtiene la sesión actual de forma segura.
     */
    async getCurrentUser() {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        return { user, error };
    }
};
