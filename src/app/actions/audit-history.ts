'use server';

import fs from 'fs';
import path from 'path';
import { createClient } from '@/infra/services/server';

/**
 * getRawHistoricalData
 * Fetches the first 50 records from Tabla_Verdad_Estudiantes for schema audit purposes.
 * @returns Array of raw student objects from history
 */
export async function getRawHistoricalData() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('Tabla_Verdad_Estudiantes')
      .select('*')
      .limit(50);

    if (error) {
      console.error('[AUDIT-HISTORY] Error fetching raw historical data:', error);
      return [];
    }

    if (data && data.length > 0) {
      try {
        const filePath = path.join(process.cwd(), 'HISTORIAL_COLUMNAS_DUMP.json');
        // Guardamos solo el primer registro formateado para ver todas las keys y un ejemplo de valor
        fs.writeFileSync(filePath, JSON.stringify(data[0], null, 2));
        console.log('[AUDITORÍA] Esquema guardado exitosamente en HISTORIAL_COLUMNAS_DUMP.json');
      } catch (fsError) {
        console.error('[AUDITORÍA] Error guardando el archivo de esquema:', fsError);
      }
    }

    // EXTRA: Capturar esquema actual de 'students'
    try {
      const { data: currentStudents, error: currentError } = await supabase.from('students').select('*').limit(1);
      if (currentStudents && currentStudents.length > 0) {
        const studentsPath = path.join(process.cwd(), 'STUDENTS_SCHEMA_DUMP.json');
        fs.writeFileSync(studentsPath, JSON.stringify(currentStudents[0], null, 2));
        console.log('[AUDITORÍA] Esquema de STUDENTS guardado exitosamente en STUDENTS_SCHEMA_DUMP.json');
      }
    } catch (fsError) {
      console.error('[AUDITORÍA] Error guardando el dump de students:', fsError);
    }

    return data || [];
  } catch (err) {
    console.error('[AUDIT-HISTORY] Unexpected exception:', err);
    return [];
  }
}
