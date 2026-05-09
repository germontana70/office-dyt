// ──────────────────────────────────────────────────────────
//  TIPOS: Módulo de Programación de Muestras (Refactorizado)
// ──────────────────────────────────────────────────────────

/** Un tema/pieza musical dentro del programa de una presentación. */
export interface ProgramDetail {
    order: number;
    title: string;
    composer: string;
    duration_text: string;      // "HH:MM:SS"
    duration_seconds: number;
}

/** 
 * Presentación extraída del Sheet y almacenada en el Pool Maestro.
 * Es independiente de los recitales.
 */
export interface PresentacionPool {
    id: string;
    student_id: string | null;
    student_name: string;
    age_at_recital: number | null;
    
    teacher_id: string | null;
    teacher_name: string;
    instrument: string;
    
    program_details: ProgramDetail[];
    total_duration_seconds: number;
    duration_text: string;
    
    semester: string;
    imported_from_file_id: string;
    imported_from_file_name: string;
    imported_at: string;
    created_at?: string;
}

/** 
 * Ítem en un Recital.
 * Puede apuntar a una presentación del Pool, o ser un evento en blanco.
 * MuestraPresentacion combina los datos del item del cronograma con los de la presentación.
 */
export interface MuestraPresentacion {
    id: string;                // ID del dyt_recital_items
    recital_id: string;
    sort_order: number;
    pool_id: string | null;

    // Datos del evento en blanco
    is_blank_event: boolean;
    blank_event_label: string | null;
    blank_duration_seconds: number;
    blank_duration_text: string;

    // Datos del Pool (si pool_id no es nulo)
    student_id?: string | null;
    student_name?: string;
    age_at_recital?: number | null;
    teacher_id?: string | null;
    teacher_name?: string;
    instrument?: string;
    program_details?: ProgramDetail[];
    
    // Virtuales
    total_duration_seconds: number; // blank_duration o pool duration
    duration_text: string;          // blank_duration_text o pool duration_text

    // Calculados en runtime para el Timeline
    scheduled_start?: string;          // "HH:MM"
    scheduled_end?: string;            // "HH:MM"
}

/** Un recital contenedor de múltiples presentaciones. */
export interface Recital {
    id: string;
    name: string;
    semester: string;
    start_time: string;    // ISO: "2026-06-15T18:00:00"
    location: string | null;
    notes: string | null;
    created_at?: string;
    updated_at?: string;
}

/** Filtros activos en la vista del organizador del recital. */
export interface RecitalFilters {
    teacher: string;
    instrument: string;
    maxAge: number | null;
    minAge: number | null;
}
