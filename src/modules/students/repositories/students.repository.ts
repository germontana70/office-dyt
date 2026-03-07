import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Tables } from '@/infra/types/database';
import { BaseRepository } from '@/infra/repositories/base.repository';
import { Student, StudentSchema } from '../schemas/students.schema';

type StudentRow = Tables<'students'>;

export class StudentsRepository extends BaseRepository<'students'> {
    constructor(client: SupabaseClient<Database>) {
        super(client, 'students');
    }

    async getById(id: string): Promise<StudentRow | null> {
        const { data, error } = await this.table.select('*').eq('id', id).single();
        if (error) throw new Error(`Error fetching student by ID: ${error.message}`);
        return data;
    }

    async getByDocument(documentNumber: string): Promise<StudentRow[]> {
        const { data, error } = await this.table.select('*').eq('document_number', documentNumber);
        if (error) throw new Error(`Error fetching student by document: ${error.message}`);
        return data;
    }

    async create(studentData: Student): Promise<StudentRow> {
        // Validate structural integrity before pushing to DB
        const validatedData = StudentSchema.parse(studentData);

        const { data, error } = await this.table
            .insert([validatedData as any])
            .select()
            .single();

        if (error) throw new Error(`Error creating student: ${error.message}`);
        return data;
    }

    async update(id: string, partialData: Partial<Student>): Promise<StudentRow> {
        const { data, error } = await this.table
            .update(partialData as any)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(`Error updating student: ${error.message}`);
        return data;
    }
}
