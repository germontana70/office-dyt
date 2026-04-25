import http from 'http';

const LOCAL_URL = 'http://192.168.0.20:54321';
const SERVICE_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const apiGet = (path) => new Promise((resolve, reject) => {
  const url = `${LOCAL_URL}${path}`;
  http.get(url, { headers: { Authorization: `Bearer ${SERVICE_JWT}` } }, (res) => {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString() || '[]') }));
  }).on('error', reject);
});

const apiPost = (path, payload) => new Promise((resolve, reject) => {
  const data = JSON.stringify(payload);
  const urlParts = new URL(`${LOCAL_URL}${path}`);
  const options = {
    hostname: urlParts.hostname, port: urlParts.port,
    path: urlParts.pathname, method: 'POST',
    headers: { 'Authorization': `Bearer ${SERVICE_JWT}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
  };
  const req = http.request(options, (res) => {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }); } catch { resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }); } });
  });
  req.on('error', reject);
  req.write(data);
  req.end();
});

// 1. List ALL objects in student-photos bucket (root + all prefixes)
console.log('=== Auditoría de Objetos en student-photos bucket ===\n');

const rootList = await apiGet('/storage/v1/object/list/student-photos');
if (rootList.status === 200) {
  console.log(`📁 Raíz del bucket (${rootList.body.length} objetos):`);
  rootList.body.forEach(obj => {
    const isFolder = obj.id === null;
    const icon = isFolder ? '📂' : '📄';
    console.log(`   ${icon} ${obj.name}${isFolder ? '/' : ''} ${obj.id ? `(${Math.round((obj.metadata?.size || 0)/1024)}KB)` : ''}`);
  });
} else {
  console.log('❌ Error listando raíz:', rootList.body);
}

// 2. List objects inside 2026-1/ prefix
console.log('\n📁 Contenido de /2026-1/:');
const subfolder = await apiPost('/storage/v1/object/list/student-photos', { prefix: '2026-1/', limit: 100 });
if (subfolder.status === 200) {
  console.log(`   ${subfolder.body.length} objetos encontrados:`);
  subfolder.body.forEach(obj => console.log(`   📄 ${obj.name} (${Math.round((obj.metadata?.size || 0)/1024)}KB)`));
} else {
  console.log('   ❌ Error:', JSON.stringify(subfolder.body).substring(0, 200));
}

// 3. Check public access for ABBY's file
console.log('\n=== Verificación de Acceso Público ===');
const abbyFile = 'profile_763d0d8c-df43-45a9-ac0b-07d352c39205_1773592019115.jpg';
const abbyRootUrl = `${LOCAL_URL}/storage/v1/object/public/student-photos/${abbyFile}`;
const abby2026Url = `${LOCAL_URL}/storage/v1/object/public/student-photos/2026-1/${abbyFile}`;

const checkPublic = (url) => new Promise((resolve) => {
  http.get(url, (res) => resolve(res.statusCode)).on('error', () => resolve(0));
});

const rootStatus = await checkPublic(abbyRootUrl);
const sub2026Status = await checkPublic(abby2026Url);

console.log(`   /student-photos/${abbyFile}          → HTTP ${rootStatus} ${rootStatus === 200 ? '✅' : '❌'}`);
console.log(`   /student-photos/2026-1/${abbyFile}   → HTTP ${sub2026Status} ${sub2026Status === 200 ? '✅' : '❌'}`);
console.log(`\n   📌 URL que funciona: ${rootStatus === 200 ? abbyRootUrl : (sub2026Status === 200 ? abby2026Url : 'NINGUNA')}`);
