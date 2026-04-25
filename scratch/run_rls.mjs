import { execSync } from 'child_process';

const queries = [
  'DROP POLICY IF EXISTS "Acceso Publico" ON storage.objects;',
  'CREATE POLICY "Acceso Publico" ON storage.objects FOR SELECT TO public USING (bucket_id = \'student-photos\');',
  'SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = \'objects\' AND schemaname = \'storage\';'
];

for (const q of queries) {
  try {
    console.log(`→ ${q.substring(0, 70)}...`);
    execSync(`npx supabase db query "${q.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
  } catch(e) { console.error('Error:', e.message); }
}
