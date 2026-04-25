import { execSync } from 'child_process';

const queries = [
  "DROP POLICY IF EXISTS \\\"Public Access for student-photos\\\" ON storage.objects;",
  "CREATE POLICY \\\"Public Access for student-photos\\\" ON storage.objects FOR SELECT TO public USING (bucket_id = 'student-photos');"
];

for (const query of queries) {
  try {
    console.log(`Executing: ${query.substring(0, 50)}...`);
    execSync(`npx supabase db query "${query}"`, { stdio: 'inherit' });
  } catch (e) {
    console.error(`Error executing query: ${e.message}`);
  }
}
