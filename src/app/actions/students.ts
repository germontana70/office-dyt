'use server';

import { createClient } from '@/infra/services/server';

export async function searchStudents(query: string) {
  if (!query || query.length < 2) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('students')
    .select('id, first_name, last_name, document_number, email')
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,document_number.ilike.%${query}%`)
    .limit(10);

  if (error) {
    console.error('Error searching students:', error);
    return [];
  }

  return data || [];
}
