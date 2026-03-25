import { createClient as createBrowserClient } from './client';
import { Database } from '../types/database';

const supabase = createBrowserClient<Database>();

export interface ClassSession {
    id: string;
    event_date: string;
    event_end_time: string | null;
    status: string | null;
    teacher_name: string | null;
    program_name: string;
    notes: string | null;
    class_number?: number | null;
    students?: {
        first_name: string;
        last_name: string;
    } | null;
}

export interface TeacherPaymentInfo {
    teacherId: string;
    teacherName: string;
    instrument?: string;
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
            .select('id, event_date, event_end_time, status, teacher_name, program_name, notes, class_number, students(first_name, last_name)')
            .eq('teacher_name', teacherName)
            .gte('event_date', startDate)
            .lte('event_date', endDate)
            .order('event_date', { ascending: true });

        if (error) throw error;
        return data as unknown as ClassSession[];
    },

    /**
     * Calcula el resumen de pago para un docente.
     * Calcula horas dinámicamente usando event_date y event_end_time.
     */
    calculatePayment(name: string, rate: number, sessions: ClassSession[], instrument: string = ''): TeacherPaymentInfo {
        // Excluir sesiones CANCELADAS (cualquier capitalización).
        // Todo lo demás (scheduled, completed, rescheduled, Reposición) es pagable.
        const CANCELLED_KEYWORDS = ['cancel', 'cancelad', 'canceled', 'no asistio', 'no asistió'];
        const payableSessions = sessions.filter(s => {
            const statusLower = (s.status || '').toLowerCase();
            const notesLower = (s.notes || '').toLowerCase();
            const isCancelled = CANCELLED_KEYWORDS.some(k => statusLower.includes(k) || notesLower.includes(k));
            return !isCancelled;
        });

        let totalHours = 0;

        for (const s of payableSessions) {
            if (s.event_end_time && s.event_date) {
                const start = new Date(s.event_date).getTime();
                const end = new Date(s.event_end_time).getTime();
                const diffHours = (end - start) / (1000 * 60 * 60);
                totalHours += diffHours > 0 ? diffHours : 1;
            } else {
                totalHours += 1;
            }
        }

        totalHours = Math.round(totalHours * 100) / 100;
        const totalPayment = totalHours * rate;

        return {
            teacherId: '',
            teacherName: name,
            instrument,
            hourlyRate: rate,
            totalHours,
            totalPayment,
            sessions
        };
    }
};
