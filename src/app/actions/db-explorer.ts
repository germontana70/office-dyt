'use server';

import { createClient } from '@/utils/supabase/server';

const ALLOWED_TABLES = [
  'students',
  'Tabla_Verdad_Estudiantes',
  'form_responses',
  'dyt_enrollments',
  'dyt_enrollment_programs',
  'dyt_payment_plans',
  'dyt_transactions',
  'dyt_global_settings',
  'dyt_program_prices'
] as const;

export type AllowedTable = typeof ALLOWED_TABLES[number];

export type DBExplorerResponse = {
  success: boolean;
  data?: any[];
  error?: string;
  totalCount?: number;
};

export async function getRawTableData(
  tableName: string,
  page: number = 1,
  limit: number = 50
): Promise<DBExplorerResponse> {
  const supabase = await createClient();

  // Whitelist check
  if (!ALLOWED_TABLES.includes(tableName as AllowedTable)) {
    console.error(`[DB_EXPLORER] Attempt to access unauthorized table: ${tableName}`);
    return {
      success: false,
      error: `Acceso Denegado: La tabla "${tableName}" no está en la lista blanca de la Bóveda DYT.`
    };
  }

  try {
    const fromOffset = (page - 1) * limit;
    const toOffset = fromOffset + limit - 1;

    // Fetch data with exact pagination
    const { data, error, count } = await supabase
      .from(tableName as AllowedTable)
      .select('*', { count: 'exact' })
      .range(fromOffset, toOffset);

    if (error) {
      console.error(`[DB_EXPLORER] Supabase Error querying ${tableName}:`, error);
      return {
        success: false,
        error: `Supabase Error (${error.code}): ${error.message} - ${error.details || ''}`
      };
    }

    return {
      success: true,
      data: data || [],
      totalCount: count || 0
    };
  } catch (err: any) {
    console.error(`[DB_EXPLORER] Unexpected Error:`, err);
    return {
      success: false,
      error: `Exception Fatal: ${err.message || 'Error desconocido ejecutando el Server Action'}`
    };
  }
}
