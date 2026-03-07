import { z } from 'zod';

// Strict typing for legacy student truth table
export const TablaVerdadEstudianteSchema = z.object({
    id: z.string().optional(),
    numero_de_identificacion: z.string().nullable().optional(),
    nombres_del_estudiante: z.string().nullable().optional(),
    apellidos_del_estudiante: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    celular_del_papa: z.string().nullable().optional(),
    celular_de_la_mama: z.string().nullable().optional(),
});

export type TablaVerdadEstudiante = z.infer<typeof TablaVerdadEstudianteSchema>;
