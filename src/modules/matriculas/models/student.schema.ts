import { z } from 'zod';

// Helper custom transformers para datos heredados sucios (Legacy Data Sanitization)
// Resuelve strings vacíos, nulos, o con espacios que deberían ser null u opcionales
const emptyToNull = z
    .union([z.string(), z.null(), z.undefined()])
    .transform((val) => (val === '' || val === undefined ? null : val));

const emptyToUndefined = z
    .union([z.string(), z.null(), z.undefined()])
    .transform((val) => (val === '' || val === null ? undefined : val));

const safeDateTransform = z
    .union([z.string(), z.date(), z.null(), z.undefined()])
    .transform((val) => {
        if (!val) return null;
        if (val instanceof Date) return val.toISOString();
        // Intento básico de sanear fechas mal formateadas o dejarlas en null si es inválido
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d.toISOString();
    });

// ==========================================
// ESQUEMA 1: TABLA 'students' (Semestre Actual)
// ==========================================
/**
 * Esquema base para un estudiante matriculado en el semestre en curso.
 * Incluye saneamiento estricto `.catch()` y `.transform()` para evitar
 * rupturas por datos sucios provenientes de Google Forms.
 */
export const CurrentStudentSchema = z.object({
    id: z.string().uuid().optional(), // Generado por Supabase
    document_number: z.string().trim().min(3, "Documento muy corto").catch('-'), // Obligatorio y vital. Si falla, al menos pone un guión (aunque idealmente no debería fallar)
    document_type: z.string().trim().nullable().catch(null),
    first_name: z.string().trim().min(1, "El nombre es requerido").catch('Desconocido'),
    last_name: z.string().trim().min(1, "El apellido es requerido").catch('Desconocido'),
    email: emptyToNull,
    phone_number: emptyToNull,
    whatsapp_number: emptyToNull,
    birth_date: safeDateTransform,
    age: z.coerce.number().int().nullable().catch(null), // Forzamos a número entero
    gender: emptyToNull,
    address: emptyToNull,
    neighborhood: emptyToNull,
    city: emptyToNull,

    // Datos Familiares/Emergencia (pueden venir sucios)
    guardian_name: emptyToNull,
    guardian_phone: emptyToNull,

    // Relacionados con la Matrícula del Semestre
    instruments: z.array(z.string()).default([]).catch([]), // Array de UUIDs o Nombres de instrumentos
    enrollment_status: z.enum(['Activo', 'Inactivo', 'Retirado', 'Congelado', 'Graduado']).default('Activo').catch('Activo'),
    semester_enrolled: z.string().trim().catch(''), // Ej: '2026-1'
    created_at: safeDateTransform,
    updated_at: safeDateTransform,

    // Campos legacy que el Sheet suele enviar
    how_did_you_hear_about_us: emptyToNull,
    medical_conditions: emptyToNull,
});

export type CurrentStudent = z.infer<typeof CurrentStudentSchema>;


// ==========================================
// ESQUEMA 2: TABLA 'Tabla_Verdad_Estudiantes' (CRM Histórico)
// ==========================================
/**
 * Esquema del CRM Histórico Dones y Talentos.
 * Actúa como fuente de verdad perpetua cruzada por número de documento.
 */
export const TruthTableStudentSchema = z.object({
    id: z.string().uuid().optional(),
    document_number: z.string().trim().min(3).catch('-'), // Llave principal de cruce
    document_type: z.string().nullable().catch(null),
    first_name: z.string().trim().catch('Estudiante sin nombre'),
    last_name: z.string().trim().catch(''),
    email: emptyToNull,
    phone: emptyToNull,
    first_enrolled_semester: z.string().nullable().catch(null), // Primer semestre que cursó
    last_seen_semester: z.string().nullable().catch(null), // Último semestre donde estuvo activo
    total_semesters_studied: z.coerce.number().int().default(1).catch(1),

    historical_status: z.enum(['Egresado', 'Desertor', 'Activo_Temporal', 'Desconocido']).default('Activo_Temporal').catch('Desconocido'),
    created_at: safeDateTransform,
    updated_at: safeDateTransform,
});

export type TruthTableStudent = z.infer<typeof TruthTableStudentSchema>;


// ==========================================
// ESQUEMA 3: Google Forms (Raw Staging Data)
// ==========================================
/**
 * Esquema que documenta la estructura esperada que entra desde la tabla `form_responses`.
 * Las claves suelen ser los títulos de las preguntas del formulario.
 */
export const RawFormResponseSchema = z.object({
    id: z.string().uuid().optional(),
    row_hash: z.string().min(1), // Para control de duplicados
    processed: z.boolean().default(false), // Indica si ya se pasó a la tabla de students
    raw_data: z.record(z.unknown()), // JSON puro de las 42 columnas
    created_at: safeDateTransform,
});

export type RawFormResponse = z.infer<typeof RawFormResponseSchema>;
