'use server';

import { createClient } from '@/infra/services/server';
import { revalidatePath } from 'next/cache';

export async function uploadStudentPhoto(studentId: string, formData: FormData) {
    const file = formData.get('photo') as File;

    if (!file) {
        return { error: 'No se recibió ningún archivo' };
    }

    // Validación básica de tipo y tamaño
    if (!file.type.startsWith('image/')) {
        return { error: 'El archivo debe ser una imagen válida' };
    }

    if (file.size > 1 * 1024 * 1024) { // 1MB limit
        return { error: 'La imagen excede el límite de 1MB' };
    }

    try {
        const supabase = await createClient();

        // Extensión
        const ext = file.name.split('.').pop() || 'png';

        // Generar un random hash o timestamp para evitar caché agresivo de edge (Next.js image problem)
        const timestamp = Date.now();
        const filePath = `profile_${studentId}_${timestamp}.${ext}`;
        const bucketName = 'student-photos';

        // Convertir el FormData (File) a Blob/Buffer/ArrayBuffer para Supabase JS client
        const buffer = await file.arrayBuffer();

        // Subir al bucket
        const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: true
            });

        if (uploadError) {
            console.error("[Storage Error]:", uploadError);
            return { error: 'Error al subir la imagen al bucket' };
        }

        // Obtener la URL publica para guardarla en la BD, o podemos solo guardar el relative path.
        // Dado el repo original, guardábamos el link público o la ruta en su defecto.
        // Lo más seguro es que el REPOSITORIO resuelva el relative path, por lo que guardaremos ambos o el full path.
        // Optaremos por dejar que el backend confíe en el publicUrl generado por si las moscas, 
        // pero preferible guardar the publicUrl directamente para retrocompatibilidad con el `current-student-repo.ts` existente.
        const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(filePath);

        // Actualizar el string photo_url en la tabla students con URl / ruta
        const { error: dbError } = await supabase
            .from('students')
            .update({ photo_url: filePath }) // Guardamos el nombre del archivo / path! El GET public url está en el server-repo
            .eq('id', studentId);

        if (dbError) {
            console.error("[DB Error Photo]:", dbError);
            return { error: 'Error al asociar la foto al estudiante en la base de datos' };
        }

        // Revalidar la vista de este estudiante y del dashboard global
        revalidatePath(`/dashboard/matriculas/${studentId}`);
        revalidatePath('/dashboard/matriculas');

        return { success: true, newPhotoUrl: publicData.publicUrl };

    } catch (e) {
        console.error(e);
        return { error: 'System Exception: Upload failure' };
    }
}
