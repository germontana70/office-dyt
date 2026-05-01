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
    },

    /**
     * Envía un correo electrónico con un link para recuperar la contraseña.
     */
    async resetPassword(email: string) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
        });
        return { data, error };
    },

    /**
     * Actualiza la contraseña del usuario autenticado (después de recuperar cuenta).
     */
    async updatePassword(password: string) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.updateUser({ password });
        return { data, error };
    },

    /**
     * Verifica un código OTP (ej. código de recuperación de 6 dígitos).
     */
    async verifyOtp(email: string, token: string) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'recovery'
        });
        return { data, error };
    }
};
