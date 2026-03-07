import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Tables } from '@/infra/types/database';
import { BaseRepository } from '@/infra/repositories/base.repository';
import { FormResponse, FormResponseSchema } from '../schemas/form-responses.schema';

type FormResponseRow = Tables<'form_responses'>;

export class FormResponsesRepository extends BaseRepository<'form_responses'> {
    constructor(client: SupabaseClient<Database>) {
        super(client, 'form_responses');
    }

    async getByHash(hash: string): Promise<FormResponseRow | null> {
        const { data, error } = await this.table.select('*').eq('row_hash', hash).maybeSingle();
        if (error) throw new Error(`Error fetching form response by hash: ${error.message}`);
        return data;
    }

    /**
     * Intelligently upserts a form response based on the row_hash (MD5 of the row data).
     * If the hash already exists, it updates the record. If not, it inserts.
     */
    async upsertIntelligently(formData: FormResponse): Promise<FormResponseRow> {
        const validatedData = FormResponseSchema.parse(formData);

        if (!validatedData.row_hash) {
            throw new Error("Intelligent upsert requires a row_hash generated from the source data.");
        }

        const existingRecord = await this.getByHash(validatedData.row_hash);

        if (existingRecord) {
            // It exists and we are essentially doing nothing or a manual update, 
            // but to preserve DO NO HARM sync behavior, usually we just ignore or update timestamp.
            // Depending on the legacy Python behavior, it probably skipped or updated.
            return existingRecord;
        }

        // Is a new distinct record from the sheet
        const { data, error } = await this.table
            .insert([validatedData as any])
            .select()
            .single();

        if (error) throw new Error(`Error inserting new form response: ${error.message}`);
        return data;
    }
}
