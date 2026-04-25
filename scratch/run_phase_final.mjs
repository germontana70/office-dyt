import { execSync } from 'child_process';

const queries = [
  // Tarea A: Re-vincular agreed_price desde la bóveda de precios por match de nombre
  "UPDATE dyt_enrollment_programs SET agreed_price = pp.cash_price FROM dyt_program_prices pp WHERE dyt_enrollment_programs.program_name = pp.program_name AND pp.semester = '2026-1' AND dyt_enrollment_programs.agreed_price = 0;",
  
  // Verificación post-update
  "SELECT COUNT(*) as still_zero FROM dyt_enrollment_programs WHERE agreed_price = 0;",

  // Tarea B: Reparar la foto con URL relativa (sin dominio base)
  "UPDATE students SET photo_url = 'http://192.168.0.20:54321/storage/v1/object/public/student-photos/' || photo_url WHERE photo_url IS NOT NULL AND photo_url NOT LIKE 'http%';",

  // Verificación de fotos reparadas
  "SELECT photo_url FROM students WHERE photo_url IS NOT NULL ORDER BY created_at DESC LIMIT 5;"
];

for (const query of queries) {
  try {
    console.log(`\n→ Executing: ${query.substring(0, 80)}...`);
    execSync(`npx supabase db query "${query.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
  } catch (e) {
    console.error(`Error: ${e.message}`);
  }
}
