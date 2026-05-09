---
name: timeline-continuity-engine
description: Cerebro del Recital. Gestiona el sort_order de presentaciones, convierte duraciones HH:MM:SS a segundos y calcula automáticamente el cronograma completo incluyendo saludos, transiciones y hora de finalización.
---

# ⏱️ SKILL: Timeline Continuity Engine

## 🚀 Propósito

Esta skill es el **motor temporal central del Recital**. Resuelve tres problemas críticos del módulo de Programación de Muestras:

1. **Conversión de duración**: Transforma strings de texto `HH:MM:SS` → `segundos` (enteros) y viceversa para persistencia y visualización.
2. **Gestión de orden**: Permite subir/bajar presentaciones en el `sort_order` de forma segura (swap atómico).
3. **Cálculo de cronograma**: Calcula automáticamente la hora de finalización de cada presentación sumando duraciones + saludos (eventos en blanco) + transiciones prefijadas (2 min por defecto).

Es **Port-Agnostic**: resuelve la URL de Supabase desde `process.env.NEXT_PUBLIC_SUPABASE_URL`.

---

## 🛠️ Instrucciones de Uso

### 1. Utilidades de Tiempo: `src/infra/utils/timeline.ts`

```typescript
// src/infra/utils/timeline.ts

/**
 * Convierte un string HH:MM:SS a segundos totales.
 * Acepta también MM:SS (asume HH=0).
 * @example "00:04:30" → 270 | "3:45" → 225
 */
export function hhmmssToSeconds(duration: string): number {
  if (!duration || !duration.includes(':')) return 0;
  const parts = duration.split(':').map(Number);

  if (parts.some(isNaN)) return 0;

  if (parts.length === 3) {
    const [hh, mm, ss] = parts;
    return hh * 3600 + mm * 60 + ss;
  } else if (parts.length === 2) {
    const [mm, ss] = parts;
    return mm * 60 + ss;
  }
  return 0;
}

/**
 * Convierte segundos totales a string HH:MM:SS legible.
 * @example 270 → "00:04:30"
 */
export function secondsToHHMMSS(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00:00';
  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = Math.floor(totalSeconds % 60);
  return [hh, mm, ss].map((v) => String(v).padStart(2, '0')).join(':');
}

/**
 * Suma segundos a un objeto Date y retorna el nuevo Date.
 */
export function addSecondsToDate(base: Date, seconds: number): Date {
  return new Date(base.getTime() + seconds * 1000);
}

/**
 * Formatea una fecha/hora como "HH:MM" para visualización en el cronograma.
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// Constante global: duración estándar de transición entre presentaciones
export const TRANSITION_SECONDS = 2 * 60; // 2 minutos
```

### 2. Tipos: `MuestraPresentacion`

```typescript
// src/infra/types/muestras.ts

export interface MuestraPresentacion {
  id: string;
  sort_order: number;
  student_name: string;
  student_id: string | null;
  program: string;               // Ej: "Piano", "Canto"
  piece_title: string;
  duration_text: string;         // Ej: "00:04:30" — fuente de verdad
  duration_seconds: number;      // Calculado al importar/editar
  is_blank_event: boolean;       // true = saludo, presentación de maestro, etc.
  blank_event_label: string | null; // Ej: "Saludo inicial", "Palabras de clausura"
  semester: string;
  // Campos calculados en runtime (no se persisten):
  scheduled_start?: string;      // "HH:MM"
  scheduled_end?: string;        // "HH:MM"
}
```

### 3. Motor Principal: `calculateTimeline`

```typescript
// src/infra/utils/timeline.ts (añadir al mismo archivo)

import { MuestraPresentacion } from '@/infra/types/muestras';
import { hhmmssToSeconds, addSecondsToDate, formatTime, TRANSITION_SECONDS } from './timeline';

export interface TimelineEntry extends MuestraPresentacion {
  scheduled_start: string;   // "HH:MM"
  scheduled_end: string;     // "HH:MM"
  cumulative_seconds: number; // Segundos acumulados desde el inicio del recital
}

/**
 * Calcula el cronograma completo del recital.
 *
 * @param presentaciones - Lista ordenada por sort_order (ASC).
 * @param recitalStart   - Hora de inicio del recital (Date object).
 * @param transitionSecs - Segundos de transición entre items (default 120 = 2 min).
 * @returns Array de TimelineEntry con scheduled_start y scheduled_end calculados.
 */
export function calculateTimeline(
  presentaciones: MuestraPresentacion[],
  recitalStart: Date,
  transitionSecs: number = TRANSITION_SECONDS
): TimelineEntry[] {
  // Ordenar por sort_order para garantizar continuidad
  const sorted = [...presentaciones].sort((a, b) => a.sort_order - b.sort_order);

  let cursor = new Date(recitalStart);
  const entries: TimelineEntry[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const durationSecs = item.duration_seconds || hhmmssToSeconds(item.duration_text);
    const startTime = new Date(cursor);
    const endTime = addSecondsToDate(startTime, durationSecs);

    entries.push({
      ...item,
      duration_seconds: durationSecs,
      scheduled_start: formatTime(startTime),
      scheduled_end: formatTime(endTime),
      cumulative_seconds: Math.floor((endTime.getTime() - recitalStart.getTime()) / 1000),
    });

    // Avanzar cursor: duración + transición (salvo en el último item)
    cursor = addSecondsToDate(endTime, i < sorted.length - 1 ? transitionSecs : 0);
  }

  return entries;
}

/**
 * Calcula la duración total del recital en segundos.
 */
export function getTotalRecitalDuration(entries: TimelineEntry[]): number {
  if (entries.length === 0) return 0;
  return entries[entries.length - 1].cumulative_seconds;
}
```

### 4. Server Actions: `reorderPresentacion` y `updateDuration`

```typescript
// src/app/actions/muestras.ts (añadir al archivo)
'use server';

import { createClient } from '@/infra/services/server';
import { hhmmssToSeconds } from '@/infra/utils/timeline';

/**
 * Intercambia el sort_order de dos presentaciones (swap atómico).
 * Permite implementar controles "Subir / Bajar" en la UI.
 * La URL de Supabase se resuelve dinámicamente.
 */
export async function reorderPresentacion(
  idA: string,
  orderA: number,
  idB: string,
  orderB: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Swap atómico: usar un valor temporal negativo para evitar colisiones de unique
    const TEMP_ORDER = -1;

    const [r1, r2, r3] = await Promise.all([
      supabase.from('muestra_presentaciones').update({ sort_order: TEMP_ORDER }).eq('id', idA),
      supabase.from('muestra_presentaciones').update({ sort_order: orderA }).eq('id', idB),
    ]);

    // Asignar el orden final de A
    const r4 = await supabase
      .from('muestra_presentaciones')
      .update({ sort_order: orderB })
      .eq('id', idA);

    if (r4.error) throw new Error(r4.error.message);

    return { success: true };
  } catch (error: any) {
    console.error('[TIMELINE] reorderPresentacion error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Actualiza la duración de una presentación.
 * Convierte el texto HH:MM:SS a segundos antes de persistir.
 */
export async function updateDuration(
  presentacionId: string,
  durationText: string
): Promise<{ success: boolean; durationSeconds?: number; error?: string }> {
  try {
    const supabase = await createClient();
    const durationSeconds = hhmmssToSeconds(durationText);

    const { error } = await supabase
      .from('muestra_presentaciones')
      .update({
        duration_text: durationText,
        duration_seconds: durationSeconds,
      })
      .eq('id', presentacionId);

    if (error) throw new Error(error.message);

    return { success: true, durationSeconds };
  } catch (error: any) {
    console.error('[TIMELINE] updateDuration error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Inserta un evento en blanco (saludo, transición especial) en el sort_order indicado.
 * Desplaza automáticamente todos los items posteriores +1.
 */
export async function insertBlankEvent(
  afterOrder: number,
  label: string,
  semester: string = '2026-1'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const newOrder = afterOrder + 1;

    // Desplazar items posteriores
    const { error: shiftError } = await supabase.rpc('shift_sort_order', {
      p_semester: semester,
      p_from_order: newOrder,
    });
    if (shiftError) throw new Error(shiftError.message);

    // Insertar evento en blanco
    const { error: insertError } = await supabase.from('muestra_presentaciones').insert({
      sort_order: newOrder,
      student_name: label,
      student_id: null,
      program: 'EVENTO',
      piece_title: label,
      duration_text: '00:02:00',
      duration_seconds: 120,
      is_blank_event: true,
      blank_event_label: label,
      semester,
    });

    if (insertError) throw new Error(insertError.message);

    return { success: true };
  } catch (error: any) {
    console.error('[TIMELINE] insertBlankEvent error:', error);
    return { success: false, error: error.message };
  }
}
```

### 5. Componente UI: `TimelineView`

```typescript
// src/modules/muestras/components/TimelineView.tsx
'use client';

import { useState } from 'react';
import { TimelineEntry, calculateTimeline, getTotalRecitalDuration, secondsToHHMMSS } from '@/infra/utils/timeline';
import { MuestraPresentacion } from '@/infra/types/muestras';
import { reorderPresentacion } from '@/app/actions/muestras';
import { ChevronUp, ChevronDown, Clock, Music, Star } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  presentaciones: MuestraPresentacion[];
  recitalStartISO: string; // "2026-06-15T15:00:00"
}

export function TimelineView({ presentaciones, recitalStartISO }: Props) {
  const [items, setItems] = useState(presentaciones);
  const recitalStart = new Date(recitalStartISO);
  const timeline: TimelineEntry[] = calculateTimeline(items, recitalStart);
  const totalSecs = getTotalRecitalDuration(timeline);

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;

    const newItems = [...items];
    const tempOrder = newItems[index].sort_order;
    newItems[index].sort_order = newItems[swapIndex].sort_order;
    newItems[swapIndex].sort_order = tempOrder;
    newItems.sort((a, b) => a.sort_order - b.sort_order);
    setItems(newItems); // Optimistic update

    const res = await reorderPresentacion(
      timeline[index].id, timeline[index].sort_order,
      timeline[swapIndex].id, timeline[swapIndex].sort_order
    );
    if (!res.success) {
      setItems(presentaciones); // Rollback
      toast.error('Error al reordenar: ' + res.error);
    }
  };

  return (
    // Neon-Glass ADN
    <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent" />
          <h3 className="font-bold text-sm text-foreground">Cronograma del Recital</h3>
        </div>
        <span className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-lg">
          Duración total: {secondsToHHMMSS(totalSecs)}
        </span>
      </div>

      {/* Timeline Items */}
      <ul className="divide-y divide-white/5">
        {timeline.map((entry, i) => (
          <li
            key={entry.id}
            className={`flex items-center gap-3 p-3 transition-colors hover:bg-white/5 ${
              entry.is_blank_event ? 'bg-accent/5' : ''
            }`}
          >
            {/* Sort Controls */}
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => handleMove(i, 'up')}
                disabled={i === 0}
                className="p-0.5 rounded text-muted-foreground hover:text-accent disabled:opacity-20 transition-colors"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleMove(i, 'down')}
                disabled={i === timeline.length - 1}
                className="p-0.5 rounded text-muted-foreground hover:text-accent disabled:opacity-20 transition-colors"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {/* Sort Number */}
            <span className="w-6 text-center text-xs font-mono text-muted-foreground">{i + 1}</span>

            {/* Icon */}
            <div className={`p-1.5 rounded-lg ${entry.is_blank_event ? 'bg-accent/20' : 'bg-primary/20'}`}>
              {entry.is_blank_event
                ? <Star className="w-3 h-3 text-accent" />
                : <Music className="w-3 h-3 text-primary" />}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {entry.is_blank_event ? entry.blank_event_label : entry.student_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">{entry.piece_title}</p>
            </div>

            {/* Time Slot */}
            <div className="text-right shrink-0">
              <p className="text-xs font-mono text-accent">{entry.scheduled_start}</p>
              <p className="text-xs text-muted-foreground">{entry.duration_text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 🏛️ Reglas Arquitectónicas

1. **SSOT de Duración**: `duration_text` (string `HH:MM:SS`) es la fuente de verdad. `duration_seconds` es siempre un campo **calculado** y derivado, nunca editado manualmente.
2. **Sort Order Atómico**: El swap de `sort_order` DEBE ser atómico. Usar el patrón de valor temporal negativo (`TEMP_ORDER = -1`) para evitar colisiones de unicidad en la columna.
3. **Transición Prefijada**: La constante `TRANSITION_SECONDS = 120` (2 min) se aplica entre **todas** las presentaciones excepto tras la última. Puede sobrescribirse por parámetro sin modificar la constante global.
4. **Eventos en Blanco**: `is_blank_event = true` indica un saludo, palabra o pausa. Se incluyen en el cálculo de tiempo como cualquier otra presentación.
5. **Port-Agnostic**: Toda mutación pasa por `createClient()` de `src/infra/services/server.ts`. La URL de Supabase viene de `process.env.NEXT_PUBLIC_SUPABASE_URL`.
6. **Estética Neon-Glass**: `TimelineView` usa `bg-black/60 backdrop-blur-2xl border border-white/10`. Los íconos de tipo usan color `accent` para eventos en blanco y `primary` para presentaciones.
7. **Aislamiento de Semestre**: Todo `INSERT`/`SELECT` sobre `muestra_presentaciones` incluye filtro `semester = '2026-1'` (o el semestre activo en runtime).

---

## 📦 Recursos Disponibles

- `src/infra/utils/timeline.ts` — Módulo con `hhmmssToSeconds`, `secondsToHHMMSS`, `calculateTimeline`, `getTotalRecitalDuration` (crear si no existe).
- `src/infra/types/muestras.ts` — Tipo `MuestraPresentacion` y `TimelineEntry` (crear si no existe).
- `src/infra/services/server.ts` — Factory de cliente Supabase con URL dinámica.
- Tabla fuente: `muestra_presentaciones` (campos: `id`, `sort_order`, `duration_text`, `duration_seconds`, `is_blank_event`, `blank_event_label`, `semester`).
- Función SQL requerida: `shift_sort_order(p_semester TEXT, p_from_order INT)` — incrementa `sort_order` en +1 para todos los registros del semestre donde `sort_order >= p_from_order`.

### Migración SQL de referencia

```sql
-- Función para desplazar sort_order (requerida por insertBlankEvent)
CREATE OR REPLACE FUNCTION shift_sort_order(p_semester TEXT, p_from_order INT)
RETURNS VOID AS $$
BEGIN
  UPDATE muestra_presentaciones
  SET sort_order = sort_order + 1
  WHERE semester = p_semester
    AND sort_order >= p_from_order
  ORDER BY sort_order DESC; -- Orden DESC para evitar colisiones
END;
$$ LANGUAGE plpgsql;
```
