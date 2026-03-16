import { z } from "zod";

export const PaymentMadeSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Debe ser YYYY-MM-DD").or(z.literal("")),
    amount: z.coerce.number().nonnegative("El monto no puede ser negativo"),
    method: z.string().optional(),
    entity: z.string().optional(),
    reference: z.string().optional(),
    observations: z.string().optional()
});

export const ScheduleSchema = z.object({
    day: z.string().min(1, "Campo requerido"),
    time: z.string().min(1, "Campo requerido")
});

export const ProgramSchema = z.object({
    name: z.string().min(1, "Debe elegir un programa"),
    instrument: z.string().optional(),
    tuition_value: z.coerce.number().nonnegative("El valor no puede ser negativo"),
    payment_method: z.enum(["Contado", "6 cuotas", "5 cuotas", "4 cuotas", "3 cuotas", "2 cuotas"]),
    discount_percentage: z.coerce.number().min(0).max(100),
    teacher_assigned: z.string().optional(),
    observations: z.string().optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Debe ser YYYY-MM-DD").or(z.literal("")).optional(),
    schedules: z.array(ScheduleSchema),
    payments_made: z.array(PaymentMadeSchema)
});

export const EnrollmentSchema = z.object({
    // Global Data
    first_name: z.string().min(1, "El nombre es obligatorio"),
    last_name: z.string().min(1, "El apellido es obligatorio"),
    document_type: z.string(),
    document_number: z.string().min(1, "El número de documento es obligatorio"),

    // Global Costs
    inscription_value: z.coerce.number().nonnegative().default(0),
    shirt_value: z.coerce.number().nonnegative().default(0),
    shirt_size: z.string().optional(),
    financial_notes: z.string().optional(),

    // Programs Array (up to 8)
    programs: z.array(ProgramSchema).max(8)
});

export type EnrollmentFormData = z.infer<typeof EnrollmentSchema>;
