# SNAPSHOT: Data Pipeline Fix & Magazine-Style Enrollment View
**Fecha:** 2026-03-17 | **Sesión:** Office DYT — Sprint Matrículas

---

## Objetivo Logrado

Rediseño completo de la vista de Matrículas a un layout **"Magazine-Style"** con sistema de pestañas full-width, y reparación de la tubería de datos que impedía leer los campos JSONB heredados de SIA 2.0.

---

## 1. Rediseño UI — Magazine-Style Tabs

**Archivo modificado:** `src/modules/matriculas/components/MatriculasClientView.tsx`

Se eliminó el antiguo grid de 4+8 columnas. La nueva arquitectura es:

```
w-full flex flex-col gap-6
├── <StudentSearchSelect />
├── Hero Section (GlassCard full-width)
│   ├── Avatar • Nombre • Documento • Edad • Badge ACTIVA
│   └── SequentialNavigator
├── Tab Nav Bar (3 pestañas con border-b-2 neon)
│   ├── 🎓 Auditoría Académica → <EnrollmentAuditCard />
│   ├── 👨‍👩‍👧 Ficha Familiar      → grid 3-cols + acordeones JSONB
│   └── 🩺 Ficha Médica         → Grupo Sanguíneo + EPS + Formulario editable
└── Transición: animate-in fade-in slide-in-from-bottom-2 por pestaña
```

---

## 2. El Problema Detectado — Zod Silent Strip

**Síntoma:** Los campos `health_insurance`, `father_info`, `mother_info`, `guardian_info_detailed`, `blood_type`, `rh_factor` y `phone` siempre mostraban "No registrado" en el panel, aunque la base de datos sí los contenía.

**Root Cause:** El repositorio `CurrentStudentRepository` hace `SELECT *` (correcto) pero luego pasa los datos por `CurrentStudentSchema.safeParse()`. Zod por defecto descarta silenciosamente todos los campos no declarados en el schema (`z.object()` en modo strip). Los campos JSONB y médicos no estaban declarados → Zod los borraba antes de llegar a React.

```
Supabase → SELECT * → ✅ todos los campos
     ↓
CurrentStudentSchema.safeParse(row) → ❌ strip silencioso
     ↓
React recibe: { first_name, last_name... } — sin JSONB, sin EPS
```

---

## 3. La Solución Implementada

**Archivo modificado:** `src/modules/matriculas/models/student.schema.ts`

Se inyectaron los campos faltantes en `CurrentStudentSchema`:

```typescript
// Médicos (strings planos)
blood_type: emptyToNull,
rh_factor: emptyToNull,
health_insurance: emptyToNull,   // STRING plano. Ej: "SANITAS"

// Contacto (alias real de la BD)
phone: emptyToNull,
document_expedition_place: emptyToNull,

// Académico
current_grade: emptyToNull,
current_school: emptyToNull,

// JSONB Familia — z.any() intencional: llaves variables por registro SIA 2.0
father_info: z.any().optional().nullable().default(null),
mother_info: z.any().optional().nullable().default(null),
guardian_info_detailed: z.any().optional().nullable().default(null),
```

Se usa `z.any()` para los JSONB porque la estructura de llaves varía entre registros migrados de SIA 2.0. El parseo estricto se delega al componente UI mediante `safeParseJsonb()` (con `try/catch`).

---

## 4. Data Profiling — Mención Honorífica al JSONB Mapper

La herramienta de diagnóstico **Auditoría JSONB / Mapper** (`/dashboard/auditoria/json-mapper`) fue clave para descubrir que:

- `health_insurance` **NO es un JSON** — es un `STRING` plano (ej: `"SANITAS"`, `"COMPENSAR"`). El UI no debe intentar `JSON.parse()` sobre él.
- Los JSONB de familia (`father_info`, `mother_info`, `guardian_info_detailed`) sí son objetos con llaves en inglés: `full_name`, `document_type`, `document_number`, `mobile`, `landline`, `email`, `address`.
- El campo teléfono del acudiente puede venir como `mobile` **o** como `phone` — se implementó un fallback: `member?.mobile || member?.phone`.

---

## 5. Nueva Herramienta de Auditoría

- **Ruta:** `/dashboard/auditoria/json-mapper`
- **Propósito:** Diagnóstico de integridad JSONB — muestra llaves y payload crudo de cada registro.
- **Sidebar:** Enlace añadido bajo el acordeón "AUDITORIA".

---

## 6. Ficha Médica Ampliada — Formulario UI

Se creó un formulario "revista" en `TabMedicaPanel` (UI only, sin Server Action conectada aún):

| Campo | Tipo | Propósito |
|---|---|---|
| Medicamentos Actuales | Textarea | Registro de medicación |
| Alergias Documentadas | Textarea | Alergias conocidas |
| Condiciones Especiales | Textarea | Diagnósticos / TDAH / etc |
| Contacto de Emergencia | Input | Nombre del contacto |
| Teléfono de Emergencia | Input | Tel de emergencia |
| Parentesco | Input | Relación con el estudiante |

Botón **💾 Guardar Ficha Médica** — pendiente de conexión con Server Action.

---

## Estado del Build

```
✓ Generating static pages (7/7)
✓ Finalizing page optimization
Exit code: 0  ← BUILD VERDE
```
