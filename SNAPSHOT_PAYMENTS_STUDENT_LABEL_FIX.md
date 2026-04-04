# INFORME TÉCNICO DE INGENIERÍA — OFFICE DYT
## Módulo: Motor de Liquidación de Honorarios (Payments)

**Fecha:** 4 de Abril de 2026  
**Rama:** `office-dyt-20260324`  
**Commits de esta sesión:** `f4094cc` → `99a8077` → `a135157`  
**Ingeniero IA:** Antigravity — BackendArchitect Mode  
**Modelo:** Claude Sonnet 4.6 (Thinking)  
**Directiva base:** Cero Impacto DDL / Corrección exclusiva en capa TypeScript  

---

## 1. Contexto de la Regresión

Al integrar el soporte para **Clases Grupales** en el módulo de Liquidación de Honorarios, se introdujeron tres regresiones críticas silenciosas que afectaron la exactitud de los reportes para docentes:

| # | Síntoma | Impacto |
|---|---|---|
| R-01 | Columna "Estudiante" muestra nombre del programa (ej. `Semestre Personalizado`) | Reporte de liquidación ilegible / erróneo |
| R-02 | Clases grupales muestran "Estudiante No Registrado" en lugar del nombre del programa | Identidad de clase grupal perdida en UI y PDF |
| R-03 | El sistema ignoraba el período seleccionado y mostraba eventos de otros meses | Liquidación calculada con horas del mes incorrecto |

---

## 2. Análisis Forense de Causas Raíz

### R-01: `program_name` como fallback universal

**Archivos afectados:** `PaymentClientWrapper.tsx` (L.556–594), `reports.ts` (L.65–99)

La lógica duplicada de resolución del nombre de estudiante usaba `s.program_name` como fallback de **último recurso** sin discriminar si la clase era individual (1a1) o grupal:

```typescript
// CÓDIGO ROTO — activo en ambos archivos
if (!studentName) {
    studentName = s.program_name || ''; // ← Para 1a1, esto es INCORRECTO
}
```

Esta rama se activaba siempre que el `student_id` de la BD no cruzaba con la tabla `students` (relación NULL), que es el caso más frecuente cuando la sincronización no logra hacer match por nombre.

---

### R-02: Clasificación incorrecta de clases grupales

**Archivo afectado:** `resolveStudentLabel.ts`

El clasificador `isProgramaGrupal(programName)` verificaba el campo `program_name` de la tabla `calendar_events`. Sin embargo, en Google Calendar, los eventos de clases grupales (ej. Aprestamiento) viven en calendarios de sala (ej. "SALÓN 206"). El sistema almacena:

```
calendar_events.program_name = "SALÓN 206"   ← nombre del calendario GCal
calendar_events.notes        = "[GRUPO: Aprestamiento Musical (01)]..."  ← info real
```

La función `isProgramaGrupal("SALÓN 206")` retornaba `false`, jamás encontraba el fragmento "aprestamiento", y caía en la cascada 1a1 donde no hay alumno registrado → **"Estudiante No Registrado"**.

La información correcta ya existía en `notes` — era un problema de orden de prioridades en la cascada.

---

### R-03: Estado React stale entre navegaciones

**Archivo afectado:** `payments/page.tsx` + `PaymentClientWrapper.tsx`

Este fue el bug más sutil. La arquitectura es:
- `payments/page.tsx` → **Server Component** — carga datos desde Supabase según `searchParams` (URL)
- `PaymentClientWrapper.tsx` → **Client Component** — recibe `initialPayments` como prop e inicializa `useState(initialPayments)`

**El comportamiento roto:**

```
1. Página carga con URL?: start=2026-03-26&end=2026-04-25 (default)
   → useState(initialPayments) = [eventos de Abril] ✓

2. Usuario cambia inputs a 2026-02-26 / 2026-03-25

3. Usuario hace clic en "Sincronizar"
   → sync corre correctamente con Feb-Mar ✓
   → router.push('?start=2026-02-26&end=2026-03-25') ✓

4. Servidor re-renderiza con datos de Feb-Mar ✓
   → initialPayments (prop) = [eventos de Feb-Mar] ✓

5. React recibe nuevas props PERO...
   → useState() NO re-ejecuta su inicializador en actualizaciones de props
   → payments (estado) sigue siendo [eventos de Abril] ✗
   → La UI muestra datos del mes equivocado ✗
```

**Primera corrección (parcial):** se cambió `router.refresh()` por `router.push()` con las fechas locales. Esto aseguró que la URL reflejara el período correcto, pero no resolvía el estado React stale.

**Corrección definitiva:** prop `key` en el Server Component.

```tsx
// React destruye y recrea PaymentClientWrapper cuando key cambia
<PaymentClientWrapper
    key={`${start}-${end}`}   // ← Remount forzado
    initialPayments={teacherPayments}
    ...
/>
```

Con `key` diferente, React **desmonta** el componente anterior y **monta** uno nuevo desde cero, re-ejecutando `useState(initialPayments)` con los datos frescos del servidor.

---

## 3. Solución Implementada

### 3.1 Nuevo Módulo: `resolveStudentLabel.ts`

**Ruta:** `src/core/utils/resolveStudentLabel.ts`  
**Tipo:** Función pura, zero side-effects, tipado estricto TypeScript  
**Propósito:** Fuente única de verdad para la columna "Estudiante" en UI y PDF

#### Algoritmo de resolución (cascada en orden de prioridad)

```
┌─ PASO -1: ¿notes contiene [GRUPO: ...] ? ──────────────────────────────────┐
│   SÍ → "Clase Grupal - {nombre del grupo}"  (fin)                          │
│   Cubre: Aprestamiento, Piano Iniciación, etc. cuyos eventos viven en      │
│          calendarios de sala ("SALÓN 206") y no en calendarios de programa  │
└──────────────────────────────────────────────────────────────────────────────┘
         ↓ NO
┌─ PASO 0: ¿isProgramaGrupal(program_name) ? ─────────────────────────────────┐
│   SÍ → "Clase Grupal - {program_name}"  (fin)                               │
│   Cubre: Casos donde program_name SÍ es el nombre canónico del programa     │
└──────────────────────────────────────────────────────────────────────────────┘
         ↓ NO (Cascada 1a1)
┌─ 1. s.students.first_name + last_name  (JOIN SQL directo)                   │
├─ 2. [STUDENT_HINT: nombre] en notes  (watermark de sincronización)          │
├─ 3. student_name_hint  (campo extendido, retrocompatibilidad)                │
├─ 4. Regex "Estudiante:" en notes  (descripción original de GCal)            │
├─ 5. Regex alerta sincro en notes  (ESTUDIANTE NO ENCONTRADO EN BD)          │
└─ 6. "Estudiante No Registrado"  (NUNCA program_name para clases 1a1)        │
```

#### Clasificador de programas grupales

```typescript
const GRUPO_PROGRAM_FRAGMENTS = [
    'aprestamiento',
    'piano iniciación',
    'piano iniciacion',
    'piano ukelele',
    'danza y expresión',
    'danza y expresion',
];
```

Matching parcial e insensible a tildes, para cubrir variantes como `"Piano Iniciación (Grupo A)"`.

---

### 3.2 Refactorización: Eliminación de Lógica Duplicada

| Archivo | Líneas eliminadas | Reemplazo |
|---|---|---|
| `src/infra/services/reports.ts` | 35 líneas | `const studentName = resolveStudentLabel(s);` |
| `src/ui/components/modules/payments/PaymentClientWrapper.tsx` | 37 líneas | `const studentName = resolveStudentLabel(s);` |

**Deuda técnica liquidada:** 72 líneas de lógica duplicada con comportamiento divergente.

---

### 3.3 Fix de Rango de Fechas

**Archivo:** `src/app/dashboard/payments/page.tsx`

```tsx
// Antes (datos stale en estado React)
<PaymentClientWrapper
    initialPayments={teacherPayments}
    startDate={start}
    endDate={end}
/>

// Después (remount garantizado en cambio de período)
<PaymentClientWrapper
    key={`${start}-${end}`}
    initialPayments={teacherPayments}
    startDate={start}
    endDate={end}
/>
```

**Archivo:** `PaymentClientWrapper.tsx`

```typescript
// Antes: recargaba con URL params anteriores
router.refresh();

// Después: navega con las fechas que el usuario seleccionó
router.push(`/dashboard/payments?start=${localStart}&end=${localEnd}`);
```

```typescript
// Antes: PDF con período del servidor (stale)
reportService.generateTeacherPDF(selectedTeacher, startDate, endDate)

// Después: PDF con período activo en la UI
reportService.generateTeacherPDF(selectedTeacher, localStart, localEnd)
```

---

## 4. Resumen de Commits

| SHA | Tipo | Descripción |
|---|---|---|
| `f4094cc` | `fix` | Corregir regresión columna 'Estudiante' muestra program_name en clases 1a1. Crear `resolveStudentLabel.ts`, parchear `reports.ts` y `PaymentClientWrapper.tsx` |
| `99a8077` | `fix` | Label grupal (formato `Clase Grupal - X`) + `router.push` post-sync + PDF con fechas locales |
| `a135157` | `fix` | Nuevo PASO -1 en `resolveStudentLabel` detecta `[GRUPO:]` en notes + `key` prop en page.tsx para remount correcto |

**Archivos modificados en la sesión:**

```
src/core/utils/resolveStudentLabel.ts              [NUEVO]  120 líneas
src/app/dashboard/payments/page.tsx                [+1 línea]
src/infra/services/reports.ts                      [-34 líneas]
src/ui/components/modules/payments/
  PaymentClientWrapper.tsx                         [-36 líneas + 2 correcciones]

Total: 131 inserciones / 76 eliminaciones
```

---

## 5. Casos de Prueba Validados

| Programa | Fuente de identidad | Resultado esperado | Estado |
|---|---|---|---|
| `Semestre Personalizado` | JOIN SQL (`students`) | `ANA GÓMEZ PÉREZ` | ✅ |
| `Semestre Personalizado` | Watermark `[STUDENT_HINT]` | `JUAN RODRÍGUEZ` | ✅ |
| `Semestre Personalizado` | Sin cruce posible | `Estudiante No Registrado` | ✅ |
| `SALÓN 206` + notes `[GRUPO: Aprestamiento Musical (01)]` | Tag GRUPO en notes | `Clase Grupal - Aprestamiento Musical (01)` | ✅ |
| `Piano Ukelele` (directo en program_name) | Clasificador canónico | `Clase Grupal - Piano Ukelele` | ✅ |
| Período Feb 26–Mar 25 | Servidor + key prop | 0 eventos de Abril visibles | ✅ |
| PDF "Deta." generado | localStart/localEnd | Encabezado muestra período correcto | ✅ |

---

## 6. Garantías Arquitectónicas

- ✅ **Zero DDL**: Ninguna migración, ninguna tabla, ninguna columna alterada
- ✅ **Zero regresión financiera**: La matemática de horas (`event_date`/`event_end_time`) no fue tocada
- ✅ **TypeScript estricto**: `tsc --noEmit` → EXIT:0 en todas las iteraciones
- ✅ **Single source of truth**: `resolveStudentLabel.ts` es la única función que decide el label del estudiante
- ✅ **Escalabilidad**: Añadir nuevos programas grupales = agregar 1 string a `GRUPO_PROGRAM_FRAGMENTS`

---

> _Snapshot Documental — Sesión de Ingeniería 2026-04-04_  
> _Generado por Antigravity · BackendArchitect Mode · Office DYT SIA 2.0_
