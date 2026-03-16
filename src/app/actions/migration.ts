"use server";

import { createClient } from '@/infra/services/server';
import { revalidatePath } from 'next/cache';

type LegacyProgram = {
    name?: string;
    instrument?: string;
    teacher_assigned?: string;
    schedules?: Array<{ day?: string; time?: string }>;
};

export async function migrateSiaToDyt() {
    const semester = '2026-1';

    try {
        const supabase = await createClient();

        const [
            { data: instruments, error: instrumentsError },
            { data: teachers, error: teachersError }
        ] = await Promise.all([
            supabase.from('dyt_instruments').select('id, name'),
            supabase.from('teachers').select('id, name')
        ]);

        if (instrumentsError) {
            throw new Error(`Fallo al cargar instrumentos: ${instrumentsError.message}`);
        }
        if (teachersError) {
            throw new Error(`Fallo al cargar docentes: ${teachersError.message}`);
        }

        const instrumentMap = new Map((instruments || []).map(item => [item.name.toLowerCase().trim(), item.id]));
        const teacherMap = new Map((teachers || []).map(item => [item.name.toLowerCase().trim(), item.id]));

        const { data: legacyStudents, error: legacyError } = await supabase
            .from('students')
            .select('id, programs, semester')
            .eq('semester', semester);

        if (legacyError) {
            throw new Error(`Fallo en lectura de tabla students: ${legacyError.message}`);
        }

        let enrolledCount = 0;
        let programsInjectedCount = 0;

        for (const student of legacyStudents || []) {
            const { data: enrollment, error: enrollError } = await supabase
                .from('dyt_enrollments')
                .insert({
                    student_id: student.id,
                    semester,
                    total_calculated: 0,
                    enrollment_fee_enabled: false
                })
                .select('id')
                .single();

            if (enrollError) {
                throw new Error(`Fallo al insertar matrícula para estudiante ${student.id}: ${enrollError.message}`);
            }

            enrolledCount++;

            const programsArray: LegacyProgram[] = Array.isArray(student.programs) ? student.programs : [];

            for (const program of programsArray) {
                const rawInstrument = (program.instrument || '').trim().toLowerCase();
                const rawTeacher = (program.teacher_assigned || '').trim().toLowerCase();

                const instrumentId = instrumentMap.get(rawInstrument) || null;
                const teacherId = teacherMap.get(rawTeacher) || null;

                const firstSchedule = program.schedules && program.schedules[0] ? program.schedules[0] : {};

                const { error: programError } = await supabase
                    .from('dyt_enrollment_programs')
                    .insert({
                        enrollment_id: enrollment.id,
                        program_name: program.name || 'Programa Migrado',
                        instrument_id: instrumentId,
                        teacher_id: teacherId,
                        day_1: firstSchedule.day || null,
                        time_1: firstSchedule.time || null,
                        agreed_price: 0,
                        number_of_classes: 0
                    });

                if (programError) {
                    throw new Error(
                        `Fallo al insertar programa (${program.name || 'Programa Migrado'}): ${programError.message}`
                    );
                }

                programsInjectedCount++;
            }
        }

        revalidatePath('/dashboard/configuracion');
        revalidatePath('/dashboard/matriculas');

        return {
            success: true,
            message: `¡Éxito! ${enrolledCount} estudiantes y ${programsInjectedCount} programas migrados a la Bóveda DYT.`
        };
    } catch (error: any) {
        console.error('[MIGRATION ERROR]', error);
        return { success: false, error: `Fallo en migración: ${error.message}` };
    }
}

export async function getEnrollmentAudit(studentId: string, semester: string = '2026-1') {
    const supabase = await createClient();

    try {
        const { data: enrollment, error: enrollmentError } = await supabase
            .from('dyt_enrollments')
            .select('*')
            .eq('student_id', studentId)
            .eq('semester', semester)
            .maybeSingle();

        if (enrollmentError) {
            console.error('[AUDIT ERROR] Fallo al obtener matrícula:', enrollmentError);
            return null;
        }

        if (!enrollment) {
            return null;
        }

        const [
            { data: programs, error: programsError },
            { data: students, error: studentsError },
            { data: instruments, error: instrumentsError },
            { data: teachers, error: teachersError }
        ] = await Promise.all([
            supabase
                .from('dyt_enrollment_programs')
                .select('*')
                .eq('enrollment_id', enrollment.id),
            supabase
                .from('students')
                .select('id, first_name, last_name, document_number, birth_date, age, email, phone, photo_url, gender, address, neighborhood, blood_type, rh_factor, health_insurance, document_type, document_expedition_place, current_grade, current_school, parent_names, parent_phones, parent_emails, guardian_info, father_info, mother_info, guardian_info_detailed')
                .eq('id', enrollment.student_id || ''),
            supabase
                .from('dyt_instruments')
                .select('id, name'),
            supabase
                .from('teachers')
                .select('id, name')
        ]);

        if (programsError) {
            console.error('[AUDIT ERROR] Fallo al obtener programas:', programsError);
        }
        if (studentsError) {
            console.error('[AUDIT ERROR] Fallo al obtener estudiante:', studentsError);
        }
        if (instrumentsError) {
            console.error('[AUDIT ERROR] Fallo al obtener instrumentos:', instrumentsError);
        }
        if (teachersError) {
            console.error('[AUDIT ERROR] Fallo al obtener docentes:', teachersError);
        }

        const student = students && students[0] ? students[0] : null;

        // Resolve photo_url to public URL if it exists
        if (student && student.photo_url && !student.photo_url.startsWith('http')) {
            const { data: publicPhoto } = supabase.storage
                .from('student-photos')
                .getPublicUrl(student.photo_url);
            if (publicPhoto) {
                student.photo_url = publicPhoto.publicUrl;
            }
        }

        const instrumentMap = new Map((instruments || []).map((item) => [item.id, item]));
        const teacherMap = new Map((teachers || []).map((item) => [item.id, item]));

        let finalPrograms = programs || [];

        // ═══════ AUTO-SEED: Garantizar al menos 1 programa ═══════
        // Estudiantes recién sincronizados tienen matrícula pero 0 programas.
        // Sin un programa, el selector del frontend no renderiza nada.
        // Esto NO filtra por edad — TODO estudiante activo recibe su slot.
        if (finalPrograms.length === 0 && enrollment.id) {
            const seedName = enrollment.program_name || 'Pendiente de Asignación';

            const { data: seededProgram, error: seedError } = await supabase
                .from('dyt_enrollment_programs')
                .insert({
                    enrollment_id: enrollment.id,
                    program_name: seedName,
                    agreed_price: 0,
                    number_of_classes: 0
                })
                .select('*')
                .single();

            if (seedError) {
                console.warn('[AUDIT] No se pudo crear programa semilla:', seedError.message);
            } else if (seededProgram) {
                finalPrograms = [seededProgram];
            }
        }

        const enrichedPrograms = finalPrograms.map((program: any) => ({
            ...program,
            instrument: program.instrument_id ? instrumentMap.get(program.instrument_id) || null : null,
            teacher: program.teacher_id ? teacherMap.get(program.teacher_id) || null : null
        }));

        return {
            ...enrollment,
            student,
            programs: enrichedPrograms
        };
    } catch (error: any) {
        console.error('[AUDIT ERROR] Fallo inesperado en auditoría:', error);
        return null;
    }
}
