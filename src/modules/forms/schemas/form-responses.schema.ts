import { z } from 'zod';

// Strict typing for form responses (staging area)
export const FormResponseSchema = z.object({
    id: z.string().uuid().optional(),
    document_number: z.string().min(1, 'Document is required'),
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().email(),
    semester: z.string().min(1, 'Semester is required'),
    row_hash: z.string().nullable().optional(),
    raw_data: z.any().nullable().optional(),
    synced_to_students: z.boolean().nullable().optional().default(false),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
});

export type FormResponse = z.infer<typeof FormResponseSchema>;
