import { createClient as createBrowserClient } from './client';
import { Database } from '../types/database';

const supabase = createBrowserClient<Database>();

export interface ClassSession {
    id: string;
    event_date: string;
    status: string | null;
    teacher_name: string | null;
    program_name: string;
    notes: string | null;
}

export interface TeacherPaymentInfo {
    teacherId: string;
    teacherName: string;
    hourlyRate: number;
    totalHours: number;
    totalPayment: number;
    sessions: ClassSession[];
}

export const paymentService = {
    /**
     * Obtiene todas las clases de un profesor específico en un rango de fechas.
     * Filtra por defecto las clases con estado que amerite pago.
     */
    async getTeacherClasses(teacherName: string, startDate: string, endDate: string) {
        const { data, error } = await supabase
            .from('calendar_events')
            .select('id, event_date, status, teacher_name, program_name, notes')
            .eq('teacher_name', teacherName)
            .gte('event_date', startDate)
            .lte('event_date', endDate)
            .order('event_date', { ascending: true });

        if (error) throw error;
        return data as ClassSession[];
    },

    /**
     * Calcula el resumen de pago para un docente.
     * Por defecto, cada clase cuenta como 1 hora (ajustable en el futuro).
     */
    calculatePayment(name: string, rate: number, sessions: ClassSession[]): TeacherPaymentInfo {
        // Solo se pagan las clases 'scheduled', 'confirmed' o con estados específicos de asistencia si existen.
        // Según legacy, 'scheduled' suele ser el estado pagable.
        const payableSessions = sessions.filter(s =>
            s.status === 'scheduled' || s.status === 'Asistio' || s.status?.includes('Reposición')
        );

        const totalHours = payableSessions.length; // 1 clase = 1 hora por defecto en este modelo legacy
        const totalPayment = totalHours * rate;

        return {
            teacherId: '', // ID se vincula por nombre en el modelo legacy
            teacherName: name,
            hourlyRate: rate,
            totalHours,
            totalPayment,
            sessions
        };
    }
};
