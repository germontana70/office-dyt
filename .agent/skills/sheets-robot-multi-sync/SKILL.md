---
name: sheets-robot-multi-sync
description: Conector Robot-Drive para listar, filtrar y seleccionar masivamente Sheets de "Programación de Muestras" e importarlos a la base de datos local. Port-Agnostic.
---

# 📡 SKILL: Sheets Robot Multi-Sync

## 🚀 Propósito

Permite que el agente utilice la **Service Account (Robot)** del proyecto para escanear Google Drive, listar las hojas de cálculo asociadas al módulo de **Programación de Muestras** y presentar una UI con selección múltiple (checkboxes) para importación masiva hacia la base de datos local de Supabase.

Esta skill es completamente **Port-Agnostic**: nunca usa URLs estáticas. Resuelve la URL de Supabase leyendo `process.env.NEXT_PUBLIC_SUPABASE_URL` en tiempo de ejecución.

---

## 🛠️ Instrucciones de Uso

Cuando el agente active esta skill, debe:

### 1. Auto-Discovery de URLs (Obligatorio)

Siempre obtener la URL de Supabase de forma dinámica, **nunca hardcodear puertos**:

```typescript
// src/infra/services/server.ts — patrón ya establecido en el proyecto
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Ejemplo resuelto: "http://192.168.0.24:54321" (leído de .env.local)
```

### 2. Server Action: `listMuestrasSheets`

Ubicación: `src/app/actions/muestras.ts`

```typescript
'use server';

import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

export interface MuestraSheet {
  id: string;
  name: string;
  semester: string;          // Extraído del nombre del archivo, ej: "2026-1"
  webViewLink: string;
  modifiedTime: string;
}

/** Inicializa el cliente de Drive con la Service Account del proyecto. */
function getDriveClient() {
  const credentialsPath = path.join(process.cwd(), 'credenciales', 'credenciales_robot.json');
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`[ROBOT] Credenciales no encontradas en: ${credentialsPath}`);
  }
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return google.drive({ version: 'v3', auth });
}

/**
 * Lista todos los Google Sheets que contienen "Muestra" en su nombre.
 * El semestre se extrae dinámicamente del nombre del archivo (ej: "2026-1").
 * Devuelve solo archivos del semestre activo si se indica.
 */
export async function listMuestrasSheets(
  activeSemester: string = '2026-1'
): Promise<{ success: boolean; sheets?: MuestraSheet[]; error?: string }> {
  try {
    const drive = getDriveClient();

    const response = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.spreadsheet' and name contains 'Muestra' and trashed=false`,
      spaces: 'drive',
      fields: 'files(id, name, webViewLink, modifiedTime)',
      orderBy: 'modifiedTime desc',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageSize: 100,
    });

    const files = response.data.files ?? [];

    const sheets: MuestraSheet[] = files
      .map((f) => {
        // Extrae el semestre del nombre del archivo si existe (ej: "Muestra 2026-1 - Juan")
        const semesterMatch = f.name?.match(/(\d{4}-\d)/);
        return {
          id: f.id!,
          name: f.name!,
          semester: semesterMatch ? semesterMatch[1] : 'Sin Semestre',
          webViewLink: f.webViewLink ?? '',
          modifiedTime: f.modifiedTime ?? '',
        };
      })
      // Filtro de aislamiento por semestre activo
      .filter((s) => s.semester === activeSemester);

    return { success: true, sheets };
  } catch (error: any) {
    console.error('[SHEETS-ROBOT] Error al listar sheets:', error);
    return { success: false, error: error.message };
  }
}
```

### 3. Server Action: `importSelectedSheets`

Lógica de importación masiva para los sheets seleccionados:

```typescript
'use server';

import { google } from 'googleapis';
import { createClient } from '@/infra/services/server';
// ... (importar getDriveClient del mismo archivo)

export interface ImportResult {
  sheetId: string;
  sheetName: string;
  rowsProcessed: number;
  rowsInserted: number;
  errors: string[];
}

/**
 * Importa masivamente los sheets seleccionados (por ID) hacia la tabla
 * `muestra_presentaciones` en Supabase local.
 * La URL de Supabase se resuelve dinámicamente vía process.env.
 */
export async function importSelectedSheets(
  selectedSheetIds: string[],
  activeSemester: string = '2026-1'
): Promise<{ success: boolean; results?: ImportResult[]; error?: string }> {
  try {
    const sheets = google.sheets({ version: 'v4', auth: /* reusar getDriveClient auth */ null as any });
    const supabase = await createClient(); // URL dinámica desde .env.local
    const results: ImportResult[] = [];

    for (const sheetId of selectedSheetIds) {
      const result: ImportResult = {
        sheetId,
        sheetName: '',
        rowsProcessed: 0,
        rowsInserted: 0,
        errors: [],
      };

      try {
        // Leer datos del sheet (Fila 1 = encabezados, desde Fila 2 = datos)
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: 'A:Z',
        });

        const [headers, ...rows] = response.data.values ?? [];
        result.rowsProcessed = rows.length;

        for (const row of rows) {
          const record: Record<string, string> = {};
          headers.forEach((h: string, i: number) => {
            record[h.toLowerCase().replace(/\s+/g, '_')] = row[i] ?? '';
          });

          const { error } = await supabase
            .from('muestra_presentaciones')
            .upsert({
              ...record,
              semester: activeSemester,
              imported_at: new Date().toISOString(),
            });

          if (error) {
            result.errors.push(`Fila: ${JSON.stringify(record)} → ${error.message}`);
          } else {
            result.rowsInserted++;
          }
        }
      } catch (err: any) {
        result.errors.push(`Error al procesar sheet ${sheetId}: ${err.message}`);
      }

      results.push(result);
    }

    return { success: true, results };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

### 4. Componente UI: `MuestrasSheetSelector`

Patrón de diseño Neon-Glass obligatorio:

```typescript
// src/modules/muestras/components/MuestrasSheetSelector.tsx
'use client';

import { useState, useTransition } from 'react';
import { listMuestrasSheets, importSelectedSheets, MuestraSheet } from '@/app/actions/muestras';
import { toast } from 'sonner';
import { Loader2, FolderSearch, Download } from 'lucide-react';

export function MuestrasSheetSelector({ activeSemester }: { activeSemester: string }) {
  const [sheets, setSheets] = useState<MuestraSheet[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const handleScan = () => {
    startTransition(async () => {
      const res = await listMuestrasSheets(activeSemester);
      if (res.success && res.sheets) {
        setSheets(res.sheets);
        toast.success(`${res.sheets.length} sheets de Muestra encontrados`);
      } else {
        toast.error(res.error ?? 'Error al escanear Drive');
      }
    });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleImport = () => {
    startTransition(async () => {
      const res = await importSelectedSheets([...selected], activeSemester);
      if (res.success) {
        toast.success(`Importación completada: ${res.results?.reduce((a, r) => a + r.rowsInserted, 0)} filas insertadas`);
      } else {
        toast.error(res.error ?? 'Error en la importación');
      }
    });
  };

  return (
    // Estética Neon-Glass ADN: bg-black/60 + backdrop-blur-2xl
    <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Robot Drive Scanner</h2>
        <div className="flex gap-2">
          <button
            onClick={handleScan}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent rounded-xl text-sm font-medium transition-all"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderSearch className="w-4 h-4" />}
            Escanear Drive
          </button>
          {selected.size > 0 && (
            <button
              onClick={handleImport}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary/80 hover:bg-primary border-0 text-primary-foreground rounded-xl text-sm font-medium transition-all"
            >
              <Download className="w-4 h-4" />
              Importar ({selected.size})
            </button>
          )}
        </div>
      </div>

      {sheets.length > 0 && (
        <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {sheets.map((sheet) => (
            <li
              key={sheet.id}
              onClick={() => toggleSelect(sheet.id)}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                selected.has(sheet.id)
                  ? 'bg-primary/20 border-primary/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <input type="checkbox" readOnly checked={selected.has(sheet.id)} className="accent-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{sheet.name}</p>
                <p className="text-xs text-muted-foreground">{new Date(sheet.modifiedTime).toLocaleDateString('es-CO')}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## 🏛️ Reglas Arquitectónicas

1. **Port-Agnostic ABSOLUTO**: Nunca escribir `54321`, `3000`, `3001` o cualquier IP/puerto estático. Siempre `process.env.NEXT_PUBLIC_SUPABASE_URL`.
2. **Aislamiento por Semestre**: Todo registro importado debe incluir `semester = activeSemester`. Nunca mezclar semestres.
3. **Credenciales del Robot**: Siempre usar `credenciales/credenciales_robot.json`. Nunca exponer claves en el cliente.
4. **Estética Neon-Glass**: Cualquier componente UI generado debe usar `bg-black/60 backdrop-blur-2xl border border-white/10`.
5. **Server Actions**: Toda operación de I/O (Drive, Supabase) vive en `src/app/actions/muestras.ts` como Server Action con `'use server'`.

---

## 📦 Recursos Disponibles

- `credenciales/credenciales_robot.json` — Service Account Key del Robot.
- `src/infra/services/server.ts` — Factory de cliente Supabase con URL dinámica.
- `src/app/actions/drive.ts` — Referencia de patrón `getDriveClient()` existente.
- Tabla destino: `muestra_presentaciones` (debe crearse vía migración Supabase si no existe).
