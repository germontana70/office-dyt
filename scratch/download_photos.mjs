import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

const photos = [
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/NOEMI_SUAREZ_SUAREZ_LENIS_8ee117e81c2f48b3b03d0c847576e21f.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/NOEMI_SUAREZ_SUAREZ_LENIS_8ee117e81c2f48b3b03d0c847576e21f.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/MATTIAS_ACOSTA_TAPIA_1036c31bbeeb4dd3a5822bae534a5c7e.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/MATTIAS_ACOSTA_TAPIA_1036c31bbeeb4dd3a5822bae534a5c7e.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/MARTIN_CEBALLOS_SANCHEZ_3042d0ed-267d-4864-b07c-75545a1e6c49.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/MARTIN_CEBALLOS_SANCHEZ_3042d0ed-267d-4864-b07c-75545a1e6c49.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/ANTONIA_ESCOBAR_RIOS_c747748defaf460cbe43e194510a1446.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/ANTONIA_ESCOBAR_RIOS_c747748defaf460cbe43e194510a1446.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/DAVID_MUNOZ_RAMOS_496b239d015843aa839f38606c4cf513.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/DAVID_MUNOZ_RAMOS_496b239d015843aa839f38606c4cf513.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/MIA_OSPINA_SANDOVAL_fac391186fd9491e872fac601525aa23.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/MIA_OSPINA_SANDOVAL_fac391186fd9491e872fac601525aa23.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/JOSUE_DANIEL_MUNOZ_GAONA_769056df71b24428974d31b2d5c32ca6.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/JOSUE_DANIEL_MUNOZ_GAONA_769056df71b24428974d31b2d5c32ca6.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/MARIA_PAZ_RIVEROS_LEON_e9572fdf3e5e4c06968975b433a8c613.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/MARIA_PAZ_RIVEROS_LEON_e9572fdf3e5e4c06968975b433a8c613.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/LAURA_VALENTINA_MORALES_ARIAS_415d32024dcb4f4d9c4df58c284979ff.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/LAURA_VALENTINA_MORALES_ARIAS_415d32024dcb4f4d9c4df58c284979ff.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/DAVID_SANTIAGO_PEREZ_ROA_a85e29f5149b4e4f952e21da7653c474.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/DAVID_SANTIAGO_PEREZ_ROA_a85e29f5149b4e4f952e21da7653c474.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/SALOME_CASTRO_CARDENAS_277ed209302c467fb67627e1c87735b1.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/SALOME_CASTRO_CARDENAS_277ed209302c467fb67627e1c87735b1.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/ARIANA_SALOME_COMBITA_BALLEN_91477bbdd18d4eeea504a622296de57a.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/ARIANA_SALOME_COMBITA_BALLEN_91477bbdd18d4eeea504a622296de57a.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/LAURA_FERNANDA_CAMACHO_OTALVARO_b427f48aa95441b9b3bd40a33b6489cb.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/LAURA_FERNANDA_CAMACHO_OTALVARO_b427f48aa95441b9b3bd40a33b6489cb.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/ANA_MARIA_MONROY_BUITRAGO_db7354f8-f774-46ce-899e-eb1d0a1ff644.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/ANA_MARIA_MONROY_BUITRAGO_db7354f8-f774-46ce-899e-eb1d0a1ff644.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/ESTEBAN_DAVID_SALAS_MARTINEZ_8b64da14cb1341229e3d13e2de91f1f7.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/ESTEBAN_DAVID_SALAS_MARTINEZ_8b64da14cb1341229e3d13e2de91f1f7.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/JUAN_ESTEBAN_HENAO_OTALVARO_63054f9d908d41d38c3768891ac5011c.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/JUAN_ESTEBAN_HENAO_OTALVARO_63054f9d908d41d38c3768891ac5011c.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/Juan_Sebastian_Mendoza_Reyes_fce8c4db772548648764be76e96e63d5.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/Juan_Sebastian_Mendoza_Reyes_fce8c4db772548648764be76e96e63d5.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/ANTONELLA_CRUZ_RANGEL_0cd8faa4dfd747a7b507220710ac2504.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/ANTONELLA_CRUZ_RANGEL_0cd8faa4dfd747a7b507220710ac2504.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/MARIA_JOSE_MARTINEZ_HERRENO_adc3e13a288e4667a4f3d5b00cc428b3.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/MARIA_JOSE_MARTINEZ_HERRENO_adc3e13a288e4667a4f3d5b00cc428b3.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/GABRIELA_CANTOR_HENRIQUEZ_4cf979497ab74eb785888e90c7e9f028.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/GABRIELA_CANTOR_HENRIQUEZ_4cf979497ab74eb785888e90c7e9f028.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/GABRIELA_PORTELA_TRIVINO_848a0f98c71b4b5a9d9a0165ddf7f159.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/GABRIELA_PORTELA_TRIVINO_848a0f98c71b4b5a9d9a0165ddf7f159.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/SARA_SOFIA_GARCIA_CASAS_1fe31297c81546e3ae33ec61e0fa4529.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/SARA_SOFIA_GARCIA_CASAS_1fe31297c81546e3ae33ec61e0fa4529.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/JADE_SOFIA_GONZALEZ_ROMERO_883246b3db204eb99423a1d52a11e865.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/JADE_SOFIA_GONZALEZ_ROMERO_883246b3db204eb99423a1d52a11e865.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/SARAH_GARAY_RIVERA_2c414607666342698cdc88c6c9a2cbf7.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/SARAH_GARAY_RIVERA_2c414607666342698cdc88c6c9a2cbf7.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/TOMAS_RINCON_RAMIREZ_da9b6646eaea41f992e062f2a654550d.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/TOMAS_RINCON_RAMIREZ_da9b6646eaea41f992e062f2a654550d.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/JUAN_PABLO_RIVEROS_MURCIA_bd18a3517e624552912e121b74eb4e7f.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/JUAN_PABLO_RIVEROS_MURCIA_bd18a3517e624552912e121b74eb4e7f.jpg"
  },
  {
    url: "https://jhduncasbfiikrtxirun.supabase.co/storage/v1/object/public/student-photos/2026-1/AMELIA_PINEROS_CAMACHO_920e162aed494a65a38fcf93f1f9192e.jpg",
    dest: "supabase/volumes/storage/student-photos/2026-1/AMELIA_PINEROS_CAMACHO_920e162aed494a65a38fcf93f1f9192e.jpg"
  }
];

const downloadFile = (url, dest) => new Promise((resolve, reject) => {
  if (fs.existsSync(dest)) {
    console.log(`⏭ Already exists, skipping: ${path.basename(dest)}`);
    return resolve('skipped');
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const file = fs.createWriteStream(dest);
  https.get(url, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      file.close();
      fs.unlinkSync(dest);
      return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
    }
    if (res.statusCode !== 200) {
      file.close();
      fs.unlinkSync(dest);
      return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
    }
    res.pipe(file);
    file.on('finish', () => { file.close(); resolve('downloaded'); });
  }).on('error', (err) => {
    fs.unlinkSync(dest);
    reject(err);
  });
});

let downloaded = 0, skipped = 0, failed = 0;

for (const photo of photos) {
  try {
    const result = await downloadFile(photo.url, photo.dest);
    if (result === 'skipped') { skipped++; } else { downloaded++; console.log(`✅ Downloaded: ${path.basename(photo.dest)}`); }
  } catch (err) {
    failed++;
    console.error(`❌ Failed: ${path.basename(photo.dest)} - ${err.message}`);
  }
}

console.log(`\n=== Download Summary ===`);
console.log(`✅ Downloaded: ${downloaded}`);
console.log(`⏭  Skipped:    ${skipped}`);
console.log(`❌ Failed:     ${failed}`);
