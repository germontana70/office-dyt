'use server';

import { revalidatePath } from 'next/cache';
import { CalendarEventRepository } from '../repository/calendar-event-repo';
import { TeacherRepository } from '@/modules/maestros/repository/teacher-repo';
import { createClient } from '@/infra/services/server';
import { getActiveSemesterName } from '@/modules/configuracion/actions/set-active-semester';

export async function scheduleClass(formData: FormData) {
    try {
        const student_id = formData.get('student_id') as string;
        const teacher_id = formData.get('teacher_id') as string;
        const day_of_week = formData.get('day_of_week') as string;
        const start_time = formData.get('start_time') as string;
        const end_time = formData.get('end_time') as string;
        const class_type = formData.get('class_type') as string;

        if (!student_id || !teacher_id || !day_of_week || !start_time || !end_time) {
            return { error: 'Todos los campos son obligatorios' };
        }

        // 1. Get Teacher Name (Legacy Adapter Requirement)
        const teachers = await TeacherRepository.getAll();
        const teacher = teachers.find(t => t.id === teacher_id);

        if (!teacher) {
            return { error: 'Docente no encontrado' };
        }

        // 2. Get Active Semester
        const semester = await getActiveSemesterName();
        if (!semester) {
            return { error: 'No hay un semestre activo configurado' };
        }

        // 3. Construct dummy dates (Legacy Adapter Requirement)
        // Since SIA 2.0 calendar_events uses specific dates, we'll create a dummy date 
        // for the first occurrence of this class based on the day of week, or just today's date
        // Note: For a real recurring schedule, we might need a different approach, but to satisfy
        // the legacy table's timestamp with timezone requirement, we calculate a valid ISO string.
        const today = new Date();
        const event_date = new Date(`${today.toISOString().split('T')[0]}T${start_time}:00`).toISOString();
        const event_end_time = new Date(`${today.toISOString().split('T')[0]}T${end_time}:00`).toISOString();

        // 4. Insert into legacy table
        const newClass = await CalendarEventRepository.create({
            student_id,
            teacher_name: teacher.name, // Adapting to TEXT instead of UUID
            day_of_week,
            event_date,
            event_end_time,
            status: 'scheduled',
            semester,
            program_name: class_type,
            notes: 'Created via Office DYT Next.js Dashboard',

            // Legacy nullifiers
            google_event_id: null,
            google_calendar_id: null,
            event_link: null,
            meet_link: null,
            has_meet: false,
            student_email_sent: false,
            student_confirmed: false,
            welcome_message_included: false,
            created_by: 'Office DYT Next.js',
            class_number: 1
        });

        if (!newClass) {
            return { error: 'Fallo al insertar en base de datos legacy' };
        }

        revalidatePath('/dashboard/programacion');
        return { success: true };
    } catch (e: any) {
        console.error('[Action Error] Fallo al agendar clase:', e);
        return { error: e.message || 'Error interno del servidor' };
    }
}
