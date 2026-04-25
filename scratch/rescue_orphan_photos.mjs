import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Config
const LOCAL_SUPABASE_URL = 'http://192.168.0.20:54321';
const LOCAL_ANON_KEY = 'sb_publishable_ACJWlzQHlzJBrEguHvfOxg_3BJgxAaH';
// JWT legacy requerido por el Storage local de Supabase (obtenido con `supabase status`)
const LOCAL_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const CLOUD_SUPABASE_URL = 'https://jhduncasbfiikrtxirun.supabase.co';

// Files that have a broken relative path in DB - try to fetch from cloud root
const ORPHAN_FILES = [
  'profile_763d0d8c-df43-45a9-ac0b-07d352c39205_1773592019115.jpg', // ABBY REDONDO SABOGAL
  'profile_b3e41f11-d374-4037-ba95-9f2094c7c759_1773592552988.jpg', // ABIGAIL RODRIGUEZ ACUÑA
];

// Helper to make HTTP/HTTPS requests
const request = (url, options = {}) => new Promise((resolve, reject) => {
  const mod = url.startsWith('https') ? https : http;
  const req = mod.request(url, options, (res) => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
  });
  req.on('error', reject);
  if (options.body) req.write(options.body);
  req.end();
});

// Download a file buffer from a URL
const fetchBuffer = (url) => new Promise((resolve, reject) => {
  const mod = url.startsWith('https') ? https : http;
  mod.get(url, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      return fetchBuffer(res.headers.location).then(resolve).catch(reject);
    }
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => resolve({ statusCode: res.statusCode, buffer: Buffer.concat(chunks) }));
  }).on('error', reject);
});

// Upload a buffer to local Supabase Storage via API
const uploadToLocalStorage = async (bucket, filePath, buffer, contentType = 'image/jpeg') => {
  const url = `${LOCAL_SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`;
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOCAL_SERVICE_KEY}`,
      'Content-Type': contentType,
      'Content-Length': buffer.length,
      'x-upsert': 'true'  // upsert: overwrite if exists
    },
    body: buffer
  };
  
  return request(url, options);
};

// Check if a file exists in local Supabase Storage
const checkLocalStorage = async (bucket, filePath) => {
  const url = `${LOCAL_SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
  const res = await fetchBuffer(url);
  return res.statusCode === 200;
};

console.log('=== Auditoría y Rescate de Fotos Huérfanas ===\n');

// STEP 1: Verify RLS policy exists
console.log('── Paso 1: Verificando RLS Policy en storage local...');
const policyCheck = await fetchBuffer(`${LOCAL_SUPABASE_URL}/storage/v1/bucket/student-photos`);
console.log(`   Bucket check status: ${policyCheck.statusCode}`);
if (policyCheck.statusCode === 200) {
  console.log('   ✅ Bucket student-photos accesible');
} else {
  console.log(`   ⚠️  Respuesta: ${policyCheck.buffer.toString().substring(0, 200)}`);
}

// STEP 2: For each orphan file, try to fetch from cloud and upload to local
console.log('\n── Paso 2: Rescatando archivos huérfanos de la Nube...');

for (const fileName of ORPHAN_FILES) {
  console.log(`\n→ Procesando: ${fileName}`);
  
  // Check if already exists locally
  const exists = await checkLocalStorage('student-photos', `2026-1/${fileName}`);
  if (exists) {
    console.log(`   ⏭  Ya existe en Storage local. Saltando.`);
    continue;
  }

  // Try to fetch from cloud storage root
  const cloudUrl = `${CLOUD_SUPABASE_URL}/storage/v1/object/public/student-photos/${fileName}`;
  console.log(`   📥 Intentando descargar de: ${cloudUrl}`);
  
  try {
    const { statusCode, buffer } = await fetchBuffer(cloudUrl);
    
    if (statusCode === 200 && buffer.length > 1000) {
      console.log(`   ✅ Descargado (${Math.round(buffer.length / 1024)}KB). Subiendo a Storage local en /2026-1/...`);
      
      const uploadRes = await uploadToLocalStorage('student-photos', `2026-1/${fileName}`, buffer);
      const uploadBody = uploadRes.body.toString();
      
      if (uploadRes.statusCode >= 200 && uploadRes.statusCode < 300) {
        console.log(`   ✅ Subido exitosamente al Storage local.`);
      } else {
        console.log(`   ❌ Error al subir (HTTP ${uploadRes.statusCode}): ${uploadBody.substring(0, 300)}`);
      }
    } else {
      console.log(`   ❌ Archivo no encontrado en Cloud (HTTP ${statusCode}). La foto de la DB es un bug de guardado que nunca se subió al Storage.`);
      console.log(`   → Acción recomendada: Re-subir foto manualmente desde la ficha del estudiante.`);
    }
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
  }
}

// STEP 3: Verify final status
console.log('\n── Paso 3: Verificación final de acceso público...');
for (const fileName of ORPHAN_FILES) {
  const url = `${LOCAL_SUPABASE_URL}/storage/v1/object/public/student-photos/2026-1/${fileName}`;
  try {
    const { statusCode } = await fetchBuffer(url);
    const icon = statusCode === 200 ? '✅' : '❌';
    console.log(`   ${icon} ${fileName} → HTTP ${statusCode}`);
    console.log(`      URL: ${url}`);
  } catch (err) {
    console.log(`   ❌ ${fileName} → Error: ${err.message}`);
  }
}

console.log('\n=== Auditoría completada ===');
