'use server';

import { revalidatePath } from 'next/cache';
import { SemesterRepository } from '../repository/semester-repo';
import { PricingRepository } from '../repository/pricing-repo';
import { TeacherRepository } from '@/modules/maestros/repository/teacher-repo';

export async function createSemester(formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const start_date = formData.get('start_date') as string;
        const sheet_url = formData.get('sheet_url') as string;

        if (!name || !start_date || !sheet_url) {
            return { error: 'Todos los campos son obligatorios' };
        }

        const newSemester = await SemesterRepository.create({
            name,
            start_date,
            sheet_url,
        });

        if (!newSemester) {
            return { error: 'Error al crear el semestre en la base de datos' };
        }

        // Obtener la lista de semestres ordenados
        const semesters = await SemesterRepository.getAll();
        
        // Encontrar un semestre anterior para usarlo como fuente de clonación
        const sourceSemester = semesters.find(s => s.name !== name);

        if (sourceSemester) {
            // Clonar precios de programas y configuración global
            await PricingRepository.cloneConfigToSemester(sourceSemester.name, name);
            // Clonar el directorio de maestros (preserva tarifas e instrumentos de cada período)
            await TeacherRepository.cloneTeachersToSemester(sourceSemester.name, name);
        }

        revalidatePath('/dashboard/configuracion');
        return { success: true };
    } catch (e: any) {
        console.error('[Action Error] Fallo al crear semestre:', e);
        return { error: e.message || 'Error del sistema al crear semestre' };
    }
}
