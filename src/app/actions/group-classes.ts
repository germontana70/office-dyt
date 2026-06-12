'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getActiveSemesterName } from '@/infra/services/semester-helper';

export async function createGroupClass(data: {
  semester: string;
  name: string;
  teacher_id?: string | null;
  room?: string | null;
  day_of_week?: string | null;
  start_time?: string | null;
  duration_minutes?: number | null;
}) {
  const supabase = await createClient();

  // Validate required fields
  if (!data.semester || !data.name) {
    return { error: 'El semestre y el nombre de la clase son requeridos' };
  }

  const { data: result, error } = await supabase
    .from('dyt_group_classes')
    .insert([
      {
        semester: data.semester,
        name: data.name,
        teacher_id: data.teacher_id,
        room: data.room,
        day_of_week: data.day_of_week,
        start_time: data.start_time,
        duration_minutes: data.duration_minutes,
      },
    ])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya existe una clase grupal con este nombre en este semestre. Por favor, selecciona el siguiente número de grupo (ej. 02, 03).' };
    }
    console.error('Error creating group class:', error);
    return { error: 'Error al crear la clase grupal: ' + error.message };
  }

  revalidatePath('/dashboard/clases-grupales');
  return { data: result };
}

export async function updateGroupClass(
  id: string,
  data: {
    semester: string;
    name: string;
    teacher_id?: string | null;
    room?: string | null;
    day_of_week?: string | null;
    start_time?: string | null;
    duration_minutes?: number | null;
  }
) {
  const supabase = await createClient();

  // Validate required fields
  if (!id || !data.semester || !data.name) {
    return { error: 'ID, semestre y nombre de la clase son requeridos' };
  }

  const { data: result, error } = await supabase
    .from('dyt_group_classes')
    .update({
      semester: data.semester,
      name: data.name,
      teacher_id: data.teacher_id,
      room: data.room,
      day_of_week: data.day_of_week,
      start_time: data.start_time,
      duration_minutes: data.duration_minutes,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya existe una clase grupal con este nombre en este semestre. Por favor, selecciona el siguiente número de grupo (ej. 02, 03).' };
    }
    console.error('Error updating group class:', error);
    return { error: 'Error al actualizar la clase grupal: ' + error.message };
  }

  revalidatePath('/dashboard/clases-grupales');
  return { data: result };
}

export async function getGroupClassesBySemester(semester: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('dyt_group_classes')
    .select(
      `
      *,
      teachers (
        id,
        name,
        instrument
      )
    `
    )
    .eq('semester', semester)
    .order('name');

  if (error) {
    console.error('Error fetching group classes:', error);
    return [];
  }

  return data;
}

export async function deleteGroupClass(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('dyt_group_classes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting group class:', error);
    return { error: 'Error al eliminar la clase grupal' };
  }

  revalidatePath('/dashboard/clases-grupales');
  return { success: true };
}

export async function enrollStudentInGroup(
  studentId: string,
  groupClassId: string,
  groupName: string
) {
  const supabase = await createClient();

  // Validate UUIDs are not empty
  if (!studentId || !groupClassId || !groupName) {
    return { error: 'Datos incompletos para la inscripción.' };
  }

  const semesterName = await getActiveSemesterName();

  // PASO 1: SELECT estricto — El alumno ya está matriculado, solo extraemos su enrollment_id
  const { data: enrollment, error: fetchErr } = await supabase
    .from('dyt_enrollments')
    .select('id')
    .eq('student_id', studentId)
    .eq('semester', semesterName)
    .limit(1)
    .maybeSingle();

  if (fetchErr) {
    console.error('[ENROLL GROUP] Error buscando matrícula:', fetchErr);
    return { error: 'Error al buscar la matrícula del estudiante.' };
  }

  if (!enrollment) {
    console.error('[ENROLL GROUP] No enrollment found for student:', studentId);
    return { error: 'No se encontró la matrícula activa del estudiante.' };
  }

  const enrollmentId = enrollment.id;

  // PASO 2: INSERT limpio en la tabla de multi-pertenencia
  const { error: insertErr } = await supabase
    .from('dyt_enrollment_programs')
    .insert([{
      id: crypto.randomUUID(),
      enrollment_id: enrollmentId,
      group_class_id: groupClassId,
      program_name: groupName,
      agreed_price: 0
    }]);

  if (insertErr) {
    console.error('[ENROLL GROUP] Error insertando programa grupal:', insertErr);
    return { error: 'Error BD: ' + insertErr.message + ' | Detalles: ' + (insertErr.details ?? insertErr.code ?? 'sin detalles') };
  }

  revalidatePath('/dashboard/clases-grupales');
  return { success: true };
}

export async function removeStudentFromGroup(programId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('dyt_enrollment_programs')
    .delete()
    .eq('id', programId);

  if (error) {
    console.error('Error removing student from group:', error);
    return { error: 'Error al retirar estudiante del grupo' };
  }

  revalidatePath('/dashboard/clases-grupales');
  return { success: true };
}

export async function getStudentsInGroup(
  groupClassId: string,
  semester: string
) {
  const supabase = await createClient();

  // Paso 1: Consultar dyt_enrollment_programs para esta clase
  const { data: programs, error: progErr } = await supabase
    .from('dyt_enrollment_programs')
    .select('id, program_name, enrollment_id')
    .eq('group_class_id', groupClassId);

  if (progErr) {
    console.error('[GET STUDENTS] Error buscando group programs:', progErr);
    return [];
  }

  if (!programs || programs.length === 0) {
    console.log(`[GET STUDENTS] No hay programas para groupClassId: ${groupClassId}`);
    return [];
  }

  const enrollmentIds = programs.map((p) => p.enrollment_id).filter(Boolean);
  if (enrollmentIds.length === 0) return [];

  // Paso 2: Extraer aspas a dyt_enrollments sin JOIN anidado para mayor fiabilidad
  const { data: enrollments, error: enrErr } = await supabase
    .from('dyt_enrollments')
    .select('id, student_id, semester')
    .in('id', enrollmentIds);

  if (enrErr || !enrollments || enrollments.length === 0) {
    console.error('[GET STUDENTS] Error buscando enrollments:', enrErr);
    return [];
  }

  const studentIds = enrollments.map((e) => e.student_id).filter(Boolean);
  if (studentIds.length === 0) return [];

  // Paso 3: Buscar finalmente datos del estudiante en la tabla legacy/actual
  const { data: students, error: stuErr } = await supabase
    .from('students')
    .select('id, first_name, last_name, document_number, email, phone')
    .in('id', studentIds);

  if (stuErr || !students) {
    console.error('[GET STUDENTS] Error buscando tabla students:', stuErr);
    return [];
  }

  // Paso 4: Mapear para cumplir con el contrato de la UI
  const results = [];
  for (const prog of programs) {
    // Vincular programa -> matricula -> estudiante
    const enrollment = enrollments.find((e) => e.id === prog.enrollment_id);
    if (!enrollment) continue;

    const student = students.find((s) => s.id === enrollment.student_id);
    if (!student) continue;

    results.push({
      programId: prog.id,
      programName: prog.program_name,
      studentId: student.id,
      studentName: `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Sin Nombre',
      studentDocument: student.document_number || '',
      studentEmail: student.email || '',
      studentPhone: student.phone || '',
      enrollmentId: enrollment.id,
    });
  }

  return results.sort((a, b) => a.studentName.localeCompare(b.studentName));
}

// ==========================================
// PROGRAM NAMES CATALOG
// ==========================================

export async function getGroupProgramNames(semester: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('dyt_group_program_names')
    .select('id, name')
    .eq('semester', semester)
    .order('name');

  if (error) {
    console.error('Error fetching program names:', error);
    return [];
  }
  return data;
}

export async function addGroupProgramName(semester: string, name: string) {
  const supabase = await createClient();
  const cleanName = name.trim().toUpperCase();

  if (!cleanName) {
    return { error: 'El nombre del programa es requerido' };
  }

  const { data, error } = await supabase
    .from('dyt_group_program_names')
    .insert([{ semester, name: cleanName }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: `"${cleanName}" ya existe en este semestre` };
    }
    console.error('Error adding program name:', error);
    return { error: 'Error al agregar programa: ' + error.message };
  }

  revalidatePath('/dashboard/clases-grupales');
  return { data };
}

export async function deleteGroupProgramName(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('dyt_group_program_names')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting program name:', error);
    return { error: 'Error al eliminar programa' };
  }

  revalidatePath('/dashboard/clases-grupales');
  return { success: true };
}
