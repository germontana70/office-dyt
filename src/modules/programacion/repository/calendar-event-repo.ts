import { createClient } from '@/infra/services/server';

export interface LegacyCalendarEvent {
    id: string;
    student_id: string;
    program_name: string | null;
    class_number: number | null;
    teacher_name: string;
    google_event_id: string | null;
    google_calendar_id: string | null;
    event_link: string | null;
    meet_link: string | null;
    has_meet: boolean | null;
    event_date: string;
    event_end_time: string;
    day_of_week: string;
    status: string;
    student_email_sent: boolean | null;
    student_confirmed: boolean | null;
    notes: string | null;
    welcome_message_included: boolean | null;
    created_at?: string;
    updated_at?: string;
    created_by: string | null;
    semester: string;
}

export class CalendarEventRepository {

    static async create(eventData: Partial<Omit<LegacyCalendarEvent, 'id' | 'created_at' | 'updated_at'>>): Promise<LegacyCalendarEvent | null> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('calendar_events')
            .insert([eventData])
            .select()
            .single();

        if (error) {
            console.error('[Supabase Error] Fallo al crear calendar_event (SIA 2.0 Adapter):', error);
            throw error;
        }

        return data;
    }

    static async getBySemester(semester: string): Promise<LegacyCalendarEvent[]> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('calendar_events')
            // Filtrar solo clases válidas programadas para este semestre
            .select('*')
            .eq('semester', semester)
            .neq('status', 'cancelled')
            .order('event_date', { ascending: true });

        if (error) {
            console.error('[Supabase Error] Fallo al obtener calendar_events:', error);
            return [];
        }

        return data || [];
    }
}
