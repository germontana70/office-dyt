import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Tables } from '@/infra/types/database';
import { BaseRepository } from '@/infra/repositories/base.repository';

type TablaVerdadEstudiantesRow = Tables<'Tabla_Verdad_Estudiantes'>;

export class TablaVerdadEstudiantesRepository extends BaseRepository<'Tabla_Verdad_Estudiantes'> {
    constructor(client: SupabaseClient<Database>) {
        super(client, 'Tabla_Verdad_Estudiantes');
    }

    async getByDocument(documentNumber: string): Promise<TablaVerdadEstudiantesRow | null> {
        const { data, error } = await this.table
            .select('*')
            .eq('numero_de_identificacion', documentNumber)
            .maybeSingle();

        if (error) throw new Error(`Error fetching historical student tracking by document: ${error.message}`);
        return data;
    }
}
