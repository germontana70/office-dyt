import { execSync } from 'child_process';
import fs from 'fs';

try {
  console.log("=== TAREA A: Identificación de Huérfanos ===");
  const orphansOutput = execSync(`npx supabase db query "SELECT program_name, COUNT(*) as cantidad FROM dyt_enrollment_programs WHERE agreed_price = 0 GROUP BY program_name ORDER BY cantidad DESC;" --output json`, { encoding: 'utf-8' });
  
  // Extract JSON array from output (ignoring boundary warnings)
  const orphansMatch = orphansOutput.match(/"rows": \s*(\[[\s\S]*?\])/);
  let orphans = [];
  if (orphansMatch) {
    orphans = JSON.parse(orphansMatch[1]);
    console.table(orphans);
  } else {
    console.log("Raw Output:", orphansOutput);
  }

  console.log("\n=== TAREA B: Generación de Manifiesto de Fotos Perdidas ===");
  const photosOutput = execSync(`npx supabase db query "SELECT photo_url FROM students WHERE photo_url IS NOT NULL;" --output json`, { encoding: 'utf-8' });
  
  const photosMatch = photosOutput.match(/"rows": \s*(\[[\s\S]*?\])/);
  if (photosMatch) {
    const photos = JSON.parse(photosMatch[1]);
    
    // Generar script de descarga
    let bashScript = `#!/bin/bash\n# Script de descarga masiva de fotos (Cloud a Local)\nmkdir -p supabase/volumes/storage/buckets/student-photos/2026-1\ncd supabase/volumes/storage/buckets/student-photos/2026-1\n\n`;
    
    let photoCount = 0;
    photos.forEach(row => {
      let url = row.photo_url;
      // Convertir URLs locales a URLs de nube para la descarga si es necesario, o extraer nombre
      if (url.includes('student-photos')) {
         const parts = url.split('student-photos/');
         if(parts.length > 1) {
            const path = parts[1];
            // La URL de nube origen
            const cloudUrl = `https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/${path}`;
            // Extraer solo el nombre del archivo para wget
            const filename = path.split('/').pop();
            bashScript += `wget -nc -O "${filename}" "${cloudUrl}"\n`;
            photoCount++;
         }
      }
    });
    
    fs.writeFileSync('scratch/download_photos.sh', bashScript);
    console.log(`Manifiesto generado en scratch/download_photos.sh con ${photoCount} fotos.`);
  }

  // Preparar Tarea C basado en huérfanos
  if (orphans.length > 0) {
     const topOrphan = orphans[0].program_name;
     console.log(`\n=== TAREA C: Lógica de Fallback de Precios ===`);
     console.log(`Mayor huérfano detectado: ${topOrphan} (${orphans[0].cantidad} registros)`);
     
     const sqlFallback = `
-- Fallback SQL: Asignar precio temporal al mayor huérfano
UPDATE dyt_enrollment_programs 
SET agreed_price = 1884000 -- Precio de referencia (ajustar si es necesario)
WHERE agreed_price = 0 
  AND program_name = '${topOrphan}';
     `;
     fs.writeFileSync('scratch/fallback_prices.sql', sqlFallback);
     console.log(`Script SQL de fallback guardado en scratch/fallback_prices.sql`);
  }

} catch (error) {
  console.error("Error ejecutando auditoría:", error.message);
}
