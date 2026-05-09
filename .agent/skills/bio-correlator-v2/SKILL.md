---
name: bio-correlator-v2
description: Correlación de identidad y biometría para el módulo de Muestras. Normaliza nombres NFD, busca student_id en la tabla students y calcula la edad real del estudiante.
---

# 🧬 SKILL: Bio-Correlator v2

## 🚀 Propósito

Cuando se importa un registro desde un Google Sheet, el nombre del estudiante viene como texto libre y puede contener tildes, mayúsculas inconsistentes o espacios extra. Esta skill es el **motor de identidad** del módulo de Muestras: normaliza el nombre con **NFD absoluto**, lo correlaciona contra la tabla `students` local de Supabase, obtiene el `student_id` real y calcula la **edad exacta en años enteros** a partir de la `birth_date`.

La URL de Supabase se resuelve dinámicamente desde `process.env.NEXT_PUBLIC_SUPABASE_URL`. **Cero puertos hardcodeados.**

---

## 🛠️ Instrucciones de Uso

### 1. Función Core: `normalizeNFD`

Normalización absoluta NFD para comparación de identidad:

```typescript
// src/infra/utils/normalize.ts

/**
 * Normalización NFD absoluta.
 * Convierte a NFD, elimina diacríticos (tildes, etc.),
 * colapsa espacios y pasa a minúsculas.
 * Ejemplo: "María José Gómez " → "maria jose gomez"
 */
export function normalizeNFD(text: string): string {
  return text
    .normalize('NFD')                          // Descompone caracteres con diacríticos
    .replace(/[\u0300-\u036f]/g, '')           // Elimina marcas de diacríticos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');                     // Colapsa múltiples espacios en uno
}

/**
 * Genera todas las variantes de búsqueda para un nombre dado.
 * Incluye el nombre completo y cada token individual.
 */
export function getNameSearchTokens(fullName: string): string[] {
  const normalized = normalizeNFD(fullName);
  const tokens = normalized.split(' ').filter(t => t.length > 2);
  return [normalized, ...tokens];
}
```

### 2. Server Action: `correlateStudentIdentity`

Ubicación: `src/app/actions/muestras.ts` (añadir al archivo existente)

```typescript
'use server';

import { createClient } from '@/infra/services/server';
import { normalizeNFD, getNameSearchTokens } from '@/infra/utils/normalize';

export interface CorrelationResult {
  inputName: string;
  studentId: string | null;
  fullName: string | null;
  birthDate: string | null;
  ageYears: number | null;          // Edad real como entero
  confidence: 'exact' | 'fuzzy' | 'none';
  matchedOn: string | null;         // Qué campo/token hizo match
}

/**
 * Calcula la edad exacta en años enteros a partir de una fecha de nacimiento.
 * @param birthDate - ISO string o "YYYY-MM-DD"
 * @returns número entero de años cumplidos, o null si la fecha es inválida
 */
function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  // Restar 1 si aún no ha llegado el cumpleaños este año
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * Motor de correlación de identidad v2.
 * Estrategia multi-fase:
 *   1. Match exacto sobre nombre normalizado completo.
 *   2. Match por token (apellido o nombre).
 *   3. Sin match → reporta 'none'.
 *
 * La URL de Supabase se resuelve dinámicamente vía process.env.
 */
export async function correlateStudentIdentity(
  rawName: string,
  semester: string = '2026-1'
): Promise<CorrelationResult> {
  const result: CorrelationResult = {
    inputName: rawName,
    studentId: null,
    fullName: null,
    birthDate: null,
    ageYears: null,
    confidence: 'none',
    matchedOn: null,
  };

  try {
    const supabase = await createClient(); // URL dinámica desde .env.local
    const normalizedInput = normalizeNFD(rawName);
    const tokens = getNameSearchTokens(rawName);

    // FASE 1: Cargar candidatos activos del semestre
    const { data: students, error } = await supabase
      .from('students')
      .select('id, first_name, last_name, birth_date')
      .eq('status', 'active');

    if (error) throw new Error(error.message);
    if (!students || students.length === 0) return result;

    // FASE 2: Match exacto — nombre completo normalizado
    for (const student of students) {
      const dbFullName = normalizeNFD(`${student.first_name} ${student.last_name}`);
      if (dbFullName === normalizedInput) {
        result.studentId = student.id;
        result.fullName = `${student.first_name} ${student.last_name}`;
        result.birthDate = student.birth_date;
        result.ageYears = calculateAge(student.birth_date);
        result.confidence = 'exact';
        result.matchedOn = 'full_name';
        return result;
      }
    }

    // FASE 3: Match fuzzy — por tokens individuales (apellido o nombre)
    for (const token of tokens) {
      for (const student of students) {
        const dbFirst = normalizeNFD(student.first_name);
        const dbLast = normalizeNFD(student.last_name);

        if (dbFirst.includes(token) || dbLast.includes(token)) {
          result.studentId = student.id;
          result.fullName = `${student.first_name} ${student.last_name}`;
          result.birthDate = student.birth_date;
          result.ageYears = calculateAge(student.birth_date);
          result.confidence = 'fuzzy';
          result.matchedOn = `token:${token}`;
          return result;
        }
      }
    }

    // FASE 4: Sin match
    return result;

  } catch (error: any) {
    console.error('[BIO-CORRELATOR] Error de correlación:', error);
    return result;
  }
}

/**
 * Correlación masiva para un array de nombres (importación desde Sheet).
 * Retorna resultados en el mismo orden de entrada.
 */
export async function correlateBatch(
  rawNames: string[],
  semester: string = '2026-1'
): Promise<CorrelationResult[]> {
  const results: CorrelationResult[] = [];
  for (const name of rawNames) {
    const result = await correlateStudentIdentity(name, semester);
    results.push(result);
  }
  return results;
}
```

### 3. Componente UI: `BioCorrelatorBadge`

Muestra el resultado de la correlación junto con la edad en la tabla de presentaciones:

```typescript
// src/modules/muestras/components/BioCorrelatorBadge.tsx
'use client';

import { CorrelationResult } from '@/app/actions/muestras';
import { UserCheck, UserX, AlertTriangle } from 'lucide-react';

interface Props {
  result: CorrelationResult;
}

export function BioCorrelatorBadge({ result }: Props) {
  const icons = {
    exact:  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />,
    fuzzy:  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
    none:   <UserX className="w-3.5 h-3.5 text-rose-400" />,
  };

  const colors = {
    exact: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    fuzzy: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    none:  'bg-rose-500/10 border-rose-500/30 text-rose-300',
  };

  const labels = {
    exact: 'Identificado',
    fuzzy: 'Aproximado',
    none:  'Sin Match',
  };

  return (
    // Neon-Glass ADN: micro-componente inline
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium ${colors[result.confidence]}`}>
      {icons[result.confidence]}
      <span>{labels[result.confidence]}</span>
      {result.ageYears !== null && (
        <span className="ml-1 opacity-70">· {result.ageYears} años</span>
      )}
    </div>
  );
}
```

---

## 🏛️ Reglas Arquitectónicas

1. **NFD Absoluto**: Toda comparación de nombres DEBE pasar por `normalizeNFD()`. Nunca comparar strings crudos.
2. **Edad como entero**: `ageYears` siempre es `number | null`. Nunca devolver decimales ni strings como "12.5".
3. **Confianza en 3 niveles**: `exact` → `fuzzy` → `none`. El consumer (UI o importador) decide qué hacer con cada nivel.
4. **Port-Agnostic**: El cliente Supabase se crea vía `createClient()` de `src/infra/services/server.ts`. Nunca instanciar `createClient` con URLs manuales.
5. **Aislamiento de Semestre**: La carga de candidatos puede filtrarse por semestre activo para mejorar la precisión en corpora grandes.
6. **Estética Neon-Glass**: `BioCorrelatorBadge` usa clases glassmorphism. No usar `bg-white` ni colores planos.

---

## 📦 Recursos Disponibles

- `src/infra/utils/normalize.ts` — Módulo utilitario `normalizeNFD` y `getNameSearchTokens` (crear si no existe).
- `src/infra/services/server.ts` — Factory de cliente Supabase con URL dinámica.
- Tabla fuente: `students` (campos: `id`, `first_name`, `last_name`, `birth_date`, `status`).
- Tabla destino enriquecida: `muestra_presentaciones.student_id` + `muestra_presentaciones.age_at_recital`.
