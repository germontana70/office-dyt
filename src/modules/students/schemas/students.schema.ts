import { z } from 'zod';

// Strict typing for students based on the database schema
export const StudentSchema = z.object({
    id: z.string().uuid().optional(),
    document_number: z.string().min(1, 'Document is required'),
    document_type: z.string().nullable().optional(),
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().email().nullable().optional(),
    phone: z.string().nullable().optional(),
    semester: z.string().min(1, 'Semester is required'),
    is_active: z.boolean().nullable().optional().default(true),
    programs: z.any().nullable().optional(),
    payments: z.any().nullable().optional(),
    form_response_id: z.string().uuid().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
});

export type Student = z.infer<typeof StudentSchema>;
