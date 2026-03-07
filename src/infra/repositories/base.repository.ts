import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

export abstract class BaseRepository<T extends keyof Database['public']['Tables']> {
    protected client: SupabaseClient<Database>;
    protected tableName: T;

    constructor(client: SupabaseClient<Database>, tableName: T) {
        this.client = client;
        this.tableName = tableName;
    }

    protected get table() {
        return this.client.from(this.tableName);
    }
}
