'use server';

import { SemesterRepository } from '../repository/semester-repo';

export async function syncGoogleSheet() {
    try {
        const activeSemester = await SemesterRepository.getActive();

        if (!activeSemester) {
            return { error: 'No se encontró un semestre activo en el sistema.' };
        }

        if (!activeSemester.sheet_url) {
            return { error: 'El semestre activo no tiene una URL de Google Sheet configurada.' };
        }

        console.log(`[SYNC INIT] Iniciando sync con: ${activeSemester.sheet_url} para el semestre ${activeSemester.name}`);

        // TODO: Módulo de extracción y transformación de datos (Python/Streamlit migration logic)
        // Simulate heavy work
        await new Promise((resolve) => setTimeout(resolve, 2000));

        return {
            success: true,
            message: `Sincronización simulada completada para el semestre ${activeSemester.name}.`
        };

    } catch (e: any) {
        console.error('[Sync Error] Fallo en la sincronización:', e);
        return { error: 'Fallo al inicializar el proceso de sincronización.' };
    }
}
