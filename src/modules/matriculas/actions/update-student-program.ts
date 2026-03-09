'use server';

import { revalidatePath } from 'next/cache';
import { CurrentStudentRepository } from '../repository/current-student-repo';
import { CurrentStudent } from '../models/student.schema';

export async function updateStudentProgram(studentId: string, data: Partial<CurrentStudent>) {
    try {
        const student = await CurrentStudentRepository.update(studentId, data);

        if (!student) {
            return { error: 'No se pudo actualizar la información académica' };
        }

        revalidatePath(`/dashboard/matriculas/${studentId}`);
        return { success: true, student };

    } catch (e) {
        console.error(e);
        return { error: 'Error del sistema al actualizar datos' };
    }
}
