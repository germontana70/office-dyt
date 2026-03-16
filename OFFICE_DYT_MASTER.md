# OFFICE DYT — MASTER CONTEXT (ADN Arquitectónico)

> **Versión**: 1.1.0  
> **Generado**: 2026-03-16  
> **Última actualización**: 2026-03-16 — Motor financiero: tasa de incremento por programa (eliminado supuesto global 5.4%)  
> **Propósito**: Única Fuente de Verdad (Single Source of Truth) para entrenar agentes de IA, minimizar consumo de tokens y evitar regresiones en el código.

---

## 1. Resumen Ejecutivo y Stack Tecnológico

**Office DYT** es el sistema de gestión académica y financiera de la escuela de música artes **Dones y Talentos** (Bogotá, Colombia), calle 95 #49A-08 piso 2. Reemplaza progresivamente al legado **SIA 2.0** (Python/Streamlit) con una arquitectura moderna basada en Next.js (App Router) y Supabase. El sistema administra matrículas de estudiantes, programas musicales/artísticos, planes de pago con cuotas, sincronización con Google Sheets (formularios de inscripción), integración con Google Calendar (clases y horarios de profesores), y generación de reportes PDF. El aislamiento de datos está gobernado por **semestre** (`2026-1`, `2026-2`, etc.) como frontera inviolable de contexto (ver `DYT_FINANCE_MANIFESTO.md`).

### Stack Principal

| Capa              | Tecnología                                          |
| :---------------- | :-------------------------------------------------- |
| **Lenguaje**      | TypeScript (strict)                                 |
| **Framework**     | Next.js (App Router, Server Components/Actions)     |
| **Estilos**       | Tailwind CSS v4 (`@tailwindcss/postcss`)            |
| **Base de Datos** | Supabase (PostgreSQL + Auth + Storage + RLS)        |
| **Validación**    | Zod v4                                              |
| **Formularios**   | react-hook-form v7 + @hookform/resolvers            |
| **APIs Google**   | googleapis (Calendar API v3, Sheets vía CSV export) |
| **PDF**           | jsPDF + jspdf-autotable                             |
| **Iconos**        | lucide-react                                        |
| **Utilidades**    | clsx, tailwind-merge, date-fns, use-debounce        |
| **Deploy**        | Docker + VPS Hostinger (producción)                 |

---

## 2. Topología del Proyecto (Directory Structure)

```
office-dyt/
├── .agent/                    # Skills de IA y workflows del agente
│   ├── skills/                # Habilidades especializadas (7 skills)
│   └── workflows/             # Workflows automatizados
├── google-credentials/        # OAuth2 credentials.json + token.json (🔐 CRÍTICO)
├── Logos/                     # Assets de marca (logos PNG)
├── public/logos/              # Logos servidos estáticamente
├── supabase/                  # Configuración de Supabase local
├── src/
│   ├── app/                   # 🔹 Next.js App Router (rutas y Server Actions)
│   │   ├── actions/           # 🔸 SERVER ACTIONS (8 archivos — lógica de negocio)
│   │   │   ├── audit-finance.ts       # Legalización y sync de programas
│   │   │   ├── finance.ts             # Motor financiero (planes + transacciones)
│   │   │   ├── migration.ts           # Migración SIA 2.0 → Bóveda DYT
│   │   │   ├── pricing.ts            # Cálculo de cuotas + redondeo 10k
│   │   │   ├── settings.ts           # Config global (fees, instrumentos, precios)
│   │   │   ├── students.ts           # CRUD básico de estudiantes
│   │   │   ├── sync-calendar-events.ts # Google Calendar → Supabase
│   │   │   └── syncActions.ts        # Google Sheets → Supabase (motor principal)
│   │   ├── auth/              # Página de login (/auth)
│   │   ├── dashboard/         # 🔸 RUTAS PROTEGIDAS
│   │   │   ├── page.tsx               # Centro de Mandos (dashboard principal)
│   │   │   ├── layout.tsx             # Layout con sidebar, tema, partículas
│   │   │   ├── audit-finance/         # Auditoría financiera + legalización
│   │   │   ├── configuracion/         # Config semestres, precios, instrumentos
│   │   │   ├── debug-vault/           # Herramientas internas de debug
│   │   │   ├── maestros/              # Gestión de docentes
│   │   │   ├── matriculas/            # Matrículas (CRUD + perfil estudiante)
│   │   │   ├── payments/              # Pagos a maestros
│   │   │   └── programacion/          # Timetable (clases del calendario)
│   │   └── layout.tsx         # Root layout (providers, fuentes, metadata)
│   ├── components/            # Componentes dashboard-level
│   │   └── dashboard/
│   │       ├── MigrationCard.tsx      # Botón migración SIA→DYT
│   │       └── SyncEngineButton.tsx   # Botón sync Google Sheets
│   ├── core/                  # 🔹 NÚCLEO DE DOMINIO (puro, sin dependencias de infra)
│   │   ├── domain/
│   │   │   └── finance.ts            # Tipos: PaymentPlan, Transaction
│   │   ├── schemas/
│   │   │   ├── enrollment.ts         # Zod: EnrollmentSchema, ProgramSchema
│   │   │   └── pricing.ts            # Zod: ProgramPriceSchema
│   │   └── utils/
│   │       └── calendarParser.ts     # Parser inteligente de eventos Calendar
│   ├── infra/                 # 🔹 INFRAESTRUCTURA (Supabase, Google, APIs)
│   │   ├── repositories/
│   │   │   └── base.repository.ts    # Repositorio base abstracto
│   │   ├── services/
│   │   │   ├── auth.ts               # Helpers de autenticación
│   │   │   ├── client.ts             # Supabase Browser Client
│   │   │   ├── server.ts             # Supabase Server Client (cookies SSR)
│   │   │   ├── data.ts               # Servicios de datos generales
│   │   │   ├── googleCalendarService.ts # Cliente Google Calendar (15 calendarios)
│   │   │   ├── payments.ts           # Servicio de pagos a docentes
│   │   │   └── reports.ts            # Generación de reportes
│   │   ├── types/
│   │   │   └── database.ts           # Tipado completo de Supabase (auto-gen)
│   │   └── utils/
│   │       └── supabase/             # Utilidades auxiliares de Supabase
│   ├── middleware.ts          # 🔸 AUTH GUARD (protección de /dashboard/*)
│   ├── modules/               # 🔹 MÓDULOS DE FEATURE (Clean Architecture)
│   │   ├── audit-finance/     # Auditoría y legalización financiera
│   │   │   └── components/
│   │   │       ├── AuditSyncButton.tsx
│   │   │       ├── LegalizeClientView.tsx  # Consola de legalización + PDF
│   │   │       └── LegalizeConsole.tsx     # Tabla tipo Excel de legalización
│   │   ├── configuracion/     # Gestión de semestres, settings
│   │   │   ├── actions/
│   │   │   │   ├── create-semester.ts
│   │   │   │   ├── set-active-semester.ts
│   │   │   │   └── sync-google-sheet.ts
│   │   │   ├── components/
│   │   │   │   ├── ChangeSemesterCard.tsx
│   │   │   │   ├── CreateSemesterCard.tsx
│   │   │   │   ├── GlobalSettingsCard.tsx
│   │   │   │   └── InstrumentManagerCard.tsx
│   │   │   └── repository/
│   │   │       ├── pricing-repo.ts
│   │   │       └── semester-repo.ts
│   │   ├── forms/             # Respuestas de formulario (staging)
│   │   │   ├── repositories/
│   │   │   └── schemas/
│   │   ├── legacy/            # Repositorios del sistema legado
│   │   │   ├── repositories/
│   │   │   └── schemas/
│   │   ├── maestros/          # Gestión de docentes
│   │   │   ├── actions/       # create-teacher.ts, update-teacher.ts
│   │   │   ├── components/    # TeacherFormModal, TeacherGrid, TeacherGridCard
│   │   │   └── repository/    # teacher-repo.ts
│   │   ├── matriculas/        # 🔸 MÓDULO PRINCIPAL: Matrículas
│   │   │   ├── actions/
│   │   │   │   ├── update-personal-data.ts
│   │   │   │   ├── update-student-finances.ts
│   │   │   │   ├── update-student-program.ts
│   │   │   │   ├── upload-student-photo.ts
│   │   │   │   └── withdraw-student.ts
│   │   │   ├── components/
│   │   │   │   ├── EnrollmentAuditCard.tsx
│   │   │   │   ├── EnrollmentStats.tsx
│   │   │   │   ├── MatriculasClientView.tsx
│   │   │   │   ├── StudentSearchSelect.tsx
│   │   │   │   ├── WithdrawStudentModal.tsx
│   │   │   │   ├── enrollment-vault/    # EnrollmentForm, GlobalCostsSection, StudentPicker
│   │   │   │   └── profile/             # FinancialTab, PersonalDataTab, ProgramsAndSchedulesTab, StudentProfileHeader/Tabs
│   │   │   ├── models/
│   │   │   │   └── student.schema.ts
│   │   │   └── repository/
│   │   │       ├── current-student-repo.ts
│   │   │       ├── student-repo.ts
│   │   │       └── truth-table-repo.ts
│   │   ├── programacion/      # Timetable / Horarios
│   │   │   ├── actions/       # schedule-class.ts
│   │   │   ├── components/    # ClassCard, ScheduleClassModal, TimetableDashboard
│   │   │   └── repository/    # calendar-event-repo.ts
│   │   └── students/          # Repositorio genérico de estudiantes
│   │       └── repositories/
│   ├── ui/                    # 🔹 SISTEMA DE DISEÑO (Design System)
│   │   ├── components/modules/
│   │   │   ├── auth.module.css            # Estilos del módulo auth
│   │   │   ├── buttons/PremiumButton.tsx  # Botón premium reutilizable
│   │   │   ├── enrollment/EnrollmentForm.tsx
│   │   │   ├── layout/
│   │   │   │   ├── GlassCard.tsx          # Tarjeta glassmorphic base
│   │   │   │   ├── ParticleBackground.tsx # Partículas cinematográficas
│   │   │   │   ├── SidebarNav.tsx         # Sidebar de navegación
│   │   │   │   └── ThemeToggle.tsx        # Toggle claro/oscuro
│   │   │   ├── payments/PaymentClientWrapper.tsx
│   │   │   ├── pricing/PricingTable.tsx
│   │   │   └── typography/GradientText.tsx # Texto con gradiente premium
│   │   ├── providers/
│   │   │   └── ThemeProvider.tsx           # next-themes provider
│   │   └── styles/
│   │       └── globals.css                # 🔸 Tokens CSS + Neon-Glass utilities
│   └── utils/
│       └── supabase/                      # Utilidades auxiliares
├── CONTEXT_SNAPSHOT_FINANCE.md            # Snapshot de contexto financiero
├── DYT_FINANCE_MANIFESTO.md              # Manifiesto de aislamiento por semestre
├── HANDOVER_SIA_TO_NEXTJS.md             # Documento de traspaso SIA 2.0 → Next.js
├── Dockerfile                             # Docker para producción
├── docker-compose.yml                     # Docker Compose producción
├── docker-compose.dev.yml                 # Docker Compose desarrollo
├── package.json                           # Dependencias del proyecto
├── next.config.js                         # Configuración de Next.js
├── tsconfig.json                          # Configuración TypeScript
└── postcss.config.mjs                     # PostCSS (Tailwind v4)
```

---

## 3. Base de Datos y Supabase (Schema & Relations)

### 3.1 Tablas Principales

#### `students` — Fuente de Verdad del Estudiante (por semestre)

| Campo                      | Tipo         | Descripción                                          |
| :------------------------- | :----------- | :--------------------------------------------------- |
| `id`                       | UUID (PK)    | Identificador único                                  |
| `document_number`          | TEXT (UNIQUE) | Número de identificación (sanitizado, sin puntos)   |
| `document_type`            | TEXT          | Tipo de documento (CC, TI, etc.)                     |
| `first_name`, `last_name`  | TEXT          | Nombre y apellido (UPPERCASE)                        |
| `email`, `phone`           | TEXT          | Contacto                                             |
| `semester`                 | TEXT          | Semestre al que pertenece el registro                |
| `is_active`                | BOOLEAN       | Estado de activación                                 |
| `programs`                 | JSONB         | Array de programas (estructura legada SIA 2.0)       |
| `payments`                 | JSONB         | Array de pagos (estructura legada)                   |
| `birth_date`               | DATE          | Fecha de nacimiento (ISO `YYYY-MM-DD`)               |
| `age`                      | INTEGER       | Edad (parseada del formulario)                       |
| `photo_url`                | TEXT          | Ruta en Supabase Storage (`student-photos` bucket)   |
| `gender`, `address`, `neighborhood` | TEXT | Datos demográficos                           |
| `blood_type`, `rh_factor`, `health_insurance` | TEXT | Datos médicos                      |
| `parent_names`, `parent_phones`, `parent_emails` | TEXT | Info de padres (concatenada)      |
| `father_info`, `mother_info`, `guardian_info_detailed` | JSONB | Info familiar detallada   |
| `form_response_id`         | UUID (FK)     | Referencia a la respuesta de formulario original     |

**Restricción UNIQUE**: `(semester, document_number)` — Un estudiante sólo puede existir una vez por semestre.

---

#### `semesters` — Configuración de Semestres

| Campo       | Tipo    | Descripción                                    |
| :---------- | :------ | :--------------------------------------------- |
| `id`        | UUID    | PK                                             |
| `name`      | TEXT    | Nombre del semestre (ej. `2026-1`)             |
| `is_active` | BOOLEAN | Sólo uno debe estar activo a la vez           |
| `sheet_url` | TEXT    | URL de Google Sheets de inscripciones          |
| `sheet_id`  | TEXT    | ID extraído de la URL de Google Sheets         |

---

#### `dyt_enrollments` — Matrículas (Nueva Arquitectura DYT)

| Campo             | Tipo     | Descripción                                         |
| :---------------- | :------- | :-------------------------------------------------- |
| `id`              | UUID     | PK                                                  |
| `student_id`      | UUID (FK)| Referencia a `students.id`                           |
| `semester`         | TEXT    | Semestre (filtro obligatorio)                        |
| `status`           | TEXT    | Estado (`Activa`, `Retirada`, etc.)                  |
| `program_name`     | TEXT    | Programa principal asignado                          |
| `total_calculated` | NUMERIC | Total calculado de la matrícula                      |
| `enrollment_fee_enabled` | BOOLEAN | Si cobra cuota de inscripción               |

**Restricción UNIQUE**: `(student_id, semester)` — Un estudiante → una matrícula por semestre.

---

#### `dyt_enrollment_programs` — Programas por Matrícula

| Campo              | Tipo     | Descripción                                   |
| :----------------- | :------- | :--------------------------------------------- |
| `id`               | UUID     | PK                                             |
| `enrollment_id`    | UUID (FK)| Referencia a `dyt_enrollments.id`               |
| `program_name`     | TEXT     | Nombre del programa                            |
| `instrument_id`    | UUID (FK)| Referencia a `dyt_instruments.id`               |
| `teacher_id`       | UUID (FK)| Referencia a `teachers.id`                      |
| `day_1`, `time_1`  | TEXT     | Horario asignado                               |
| `agreed_price`     | NUMERIC  | Precio pactado                                 |
| `number_of_classes`| INTEGER  | Número de clases                               |
| `group_class_id`   | UUID (FK)| Referencia a clase grupal (si aplica)           |

---

#### `dyt_payment_plans` — Planes de Pago (Bóveda Financiera)

| Campo                  | Tipo     | Descripción                                      |
| :--------------------- | :------- | :------------------------------------------------ |
| `id`                   | UUID     | PK                                                |
| `enrollment_id`        | UUID (FK)| Referencia a `dyt_enrollments.id`                  |
| `plan_type`            | ENUM     | `contado` o `cuotas`                              |
| `base_amount`          | NUMERIC  | Costo base de programas seleccionados             |
| `enrollment_fee`       | NUMERIC  | Valor de inscripción                              |
| `uniform_fee`          | NUMERIC  | Valor de camiseta                                 |
| `total_amount`         | NUMERIC  | `base_amount + enrollment_fee + uniform_fee`      |
| `status`               | ENUM     | `pending`, `partial`, `paid`                      |
| `discount_percentage`  | NUMERIC  | Porcentaje de descuento aplicado                  |
| `installments_details` | JSONB    | Detalle por cuotas (array de montos y fechas)     |
| `needs_audit`          | BOOLEAN  | Si requiere revisión manual de auditores          |

---

#### `dyt_transactions` — Registro de Pagos

| Campo              | Tipo     | Descripción                          |
| :----------------- | :------- | :----------------------------------- |
| `id`               | UUID     | PK                                   |
| `payment_plan_id`  | UUID (FK)| Referencia a `dyt_payment_plans.id`   |
| `amount_paid`      | NUMERIC  | Monto pagado                         |
| `payment_date`     | TIMESTAMP| Fecha del pago                       |
| `payment_method`   | TEXT     | Método (Efectivo, Nequi, etc.)       |
| `reference_code`   | TEXT     | Código de referencia                 |
| `notes`            | TEXT     | Notas adicionales                    |

---

#### `program_prices` / `dyt_program_prices` — Precios de Programas

Existen **dos tablas de precios** (migración en curso):

| Campo                  | Tipo    | Descripción                                    |
| :--------------------- | :------ | :--------------------------------------------- |
| `program_name`         | TEXT    | Nombre del programa                            |
| `semester`             | TEXT    | Semestre                                       |
| `cash_price` / `valor_contado` | NUMERIC | Precio de contado                     |
| `increment_percentage` | NUMERIC | Porcentaje de incremento para financiación     |
| `total_financed`       | NUMERIC | Total financiado (calculado con redondeo 10k)  |
| `installments`         | JSONB   | Detalle de cuotas por modalidad (2 a 6 cuotas) |

**Prioridad de lectura**: El sistema intenta primero `dyt_program_prices`; si está vacía, recurre a `program_prices` (legado).

---

#### `dyt_global_settings` — Configuración Global por Semestre

| Campo            | Tipo    | Descripción                                |
| :--------------- | :------ | :----------------------------------------- |
| `semester`       | TEXT    | Semestre (PK lógico)                        |
| `enrollment_fee` | NUMERIC | Valor de inscripción global                |
| `tshirt_fee`     | NUMERIC | Valor de camiseta global                   |

---

#### `teachers` — Docentes

| Campo         | Tipo    | Descripción                        |
| :------------ | :------ | :--------------------------------- |
| `id`          | UUID    | PK                                 |
| `name`        | TEXT    | Nombre completo                    |
| `email`       | TEXT    | Correo                            |
| `phone`       | TEXT    | Teléfono                          |
| `instrument`  | TEXT    | Instrumento que enseña            |
| `is_active`   | BOOLEAN | Estado activo                     |
| `hourly_rate` | NUMERIC | Tarifa por hora (COP)             |

---

#### `dyt_instruments` — Catálogo de Instrumentos

| Campo       | Tipo    | Descripción          |
| :---------- | :------ | :------------------- |
| `id`        | UUID    | PK                   |
| `name`      | TEXT    | Nombre (UNIQUE)      |
| `is_active` | BOOLEAN | Estado activo        |

---

#### `calendar_events` — Eventos de Calendario Sincronizados

| Campo              | Tipo     | Descripción                                |
| :----------------- | :------- | :----------------------------------------- |
| `id`               | UUID     | PK                                         |
| `google_event_id`  | TEXT     | ID del evento de Google Calendar           |
| `google_calendar_id`| TEXT    | Nombre del calendario (salón)              |
| `teacher_name`     | TEXT     | Nombre del docente (fuzzy-matched)         |
| `student_id`       | UUID (FK)| Referencia a `students.id` (nullable)       |
| `program_name`     | TEXT     | Programa / salón                           |
| `event_date`       | TIMESTAMP| Fecha/hora inicio                          |
| `event_end_time`   | TIMESTAMP| Fecha/hora fin                             |
| `status`           | TEXT     | `scheduled`, `completed`, `cancelled`, etc.|
| `class_number`     | INTEGER  | Número de clase (altura)                   |
| `semester`         | TEXT     | Semestre                                   |

---

#### `form_responses` — Staging de Formularios

Recibe datos crudos del Google Sheet. Incluye `row_hash` (SHA-256) para detectar filas ya procesadas.

#### `Tabla_Verdad_Estudiantes` — CRM Histórico (Legacy)

Consolida estudiantes de todos los semestres por su número de documento. Campos en español.

#### `profiles` — Perfiles de Usuarios del Sistema

Vinculados al `auth.users` de Supabase. Campos: `role`, `instrument`, `full_name`, `phone`, `nequi`, `daviplata`, etc.

#### `group_classes` — Clases Grupales

Catálogo de clases grupales por semestre. Referenciable desde `dyt_enrollment_programs.group_class_id`.

---

### 3.2 Diagrama de Relaciones (Simplificado)

```
semesters (is_active) ──→ [Filtra TODO]
     │
     ├── students ←─── form_responses (staging)
     │     │
     │     └── dyt_enrollments (student_id + semester) UNIQUE
     │           │
     │           ├── dyt_enrollment_programs (enrollment_id)
     │           │     ├── → dyt_instruments (instrument_id)
     │           │     ├── → teachers (teacher_id)
     │           │     └── → group_classes (group_class_id)
     │           │
     │           └── dyt_payment_plans (enrollment_id)
     │                 │
     │                 └── dyt_transactions (payment_plan_id)
     │
     ├── calendar_events (student_id, teacher_name, semester)
     │
     └── program_prices / dyt_program_prices (semester)

dyt_global_settings (semester) ←── enrollment_fee, tshirt_fee
Tabla_Verdad_Estudiantes ←── CRM histórico (sin FK directo)
profiles ←── auth.users (id)
```

---

### 3.3 Políticas de Seguridad (RLS)

- **Middleware de Auth** (`src/middleware.ts`): Todo `/dashboard/*` requiere sesión activa de Supabase. Si no hay sesión, redirige a `/auth`. Si hay sesión y el usuario visita `/auth`, redirige a `/dashboard`.
- **Supabase Auth**: Se utiliza `@supabase/ssr` con cookies para SSR. Dos clientes:
  - `server.ts` → Server Components / Server Actions (usa cookies)
  - `client.ts` → Client Components (browser client)
- **RBAC**: El sistema original usaba roles Admin/Assistant basado en el email. El campo `profiles.role` está disponible pero la implementación de filtrado por rol aún no está activa en el middleware.

---

## 4. Integraciones Externas (Microservicios y APIs)

### 4.1 Google Sheets → Supabase (Motor de Sincronización)

**Archivo**: `src/app/actions/syncActions.ts` (747 líneas — el Server Action más largo)

**Flujo completo**:

1. **Descubrimiento del Semestre Activo**: Lee `semesters` WHERE `is_active = true` y extrae `sheet_url`.
2. **Extracción del Sheet ID**: Regex `/spreadsheets/d/([a-zA-Z0-9-_]+)/` sobre la URL.
3. **Descarga CSV**: Construye URL `https://docs.google.com/spreadsheets/d/{ID}/gviz/tq?tqx=out:csv` y hace `fetch` sin OAuth (la hoja debe ser pública o compartida con "Cualquier persona con el enlace").
4. **Parseo CSV**: Parser propio (`parseCsvLine`) que respeta campos entre comillas.
5. **Mapeo de Columnas**: Diccionario `FIELD_MAPPING` que traduce 42 headers en español → campos en inglés (paridad con `sync_service.py` de SIA 2.0).
6. **Sanitización**:
   - `cleanDocumentNumber`: Elimina puntos y comas (ej. `1.147.489.612` → `1147489612`)
   - `cleanPhone`: Igual tratamiento para teléfonos
   - `toUpperOrEmpty`: Normalización a UPPERCASE
   - `convertBirthDate`: Soporta **6 formatos de fecha** (`DD/MM/YYYY`, `YYYY-MM-DD`, `DD-MM-YYYY`, `YYYY/MM/DD`, `DD/MM/YY`, `DD.MM.YYYY`)
   - `convertTimestamp`: `DD/M/YYYY HH:MM:SS` → ISO date
   - `parseAge`: Extrae entero de strings como `"12 años"`
   - `emptyToNull`: Convierte strings vacíos a `null`
7. **Construcción del Registro**: `buildStudentRecord` monta el objeto completo incluyendo info familiar (padre, madre, acudiente) en formato JSONB.
8. **Hash de Fila**: SHA-256 del contenido de la fila (excluyendo timestamp) para tracking de cambios.
9. **Upsert Multi-Etapa** (lotes de 50):
   - **Etapa 1**: Upsert a `students` con `onConflict: 'semester,document_number'`
   - **Etapa 2**: Upsert a `dyt_enrollments` con `onConflict: 'student_id,semester'` (crea el "slot" transaccional)

> **IMPORTANTE**: No se modifica la sanitización sin cross-referencia con SIA 2.0 (comment en línea 15).

---

### 4.2 Google Calendar → Supabase (Sincronización de Eventos)

**Archivos**:
- `src/infra/services/googleCalendarService.ts` — Cliente OAuth2 (15 calendarios)
- `src/app/actions/sync-calendar-events.ts` — Server Action de sincronización
- `src/core/utils/calendarParser.ts` — Parser de eventos

**Calendarios configurados** (15 salones + virtual):

| Nombre                      | ID de Calendar                                             |
| :-------------------------- | :-------------------------------------------------------- |
| SALÓN 201                   | `c_r0uj5cebh514i56g3nkasput5k@group.calendar.google.com` |
| SALÓN 202                   | `c_5r7ujkaspdc61r0g6ruooe1p7s@group.calendar.google.com` |
| SALÓN 203A                  | `c_hlucr39r25519v48fu1ok9a12c@group.calendar.google.com` |
| SALÓN 203B                  | `c_got3fo3i6ohbrl4somnojfctfo@group.calendar.google.com` |
| SALÓN 204A - M.A            | `c_fadbeb72...@group.calendar.google.com`                 |
| SALÓN 204B - J.P            | `c_42c5d9n1c037h1imocbpckdojo@group.calendar.google.com` |
| SALÓN 205-A, 205-B, 205-C  | (3 IDs separados)                                         |
| SALÓN 206, 207, 208, 209   | (4 IDs separados)                                         |
| GIMNASIO                    | `1a478eee...@group.calendar.google.com`                   |
| CLASES VIRTUALES - SALA 1   | `donesytalentos.org_cik30npi...@group.calendar.google.com`|

**Flujo de sincronización**:

1. OAuth2 con `credentials.json` + `token.json` desde `/google-credentials/`.
2. Fetch secuencial de cada calendario (`calendar.events.list` con `singleEvents: true`, `maxResults: 2500`).
3. **Parseo del título del evento** (formato típico: `"JUAN PEREZ - SEBAS - CLASE 8"`):
   - Parte antes del primer `-` → hint de nombre del estudiante
   - Parte después del primer `-` → hint del profesor (nickname)
   - Regex `CLASE\s*#?\s*(\d+)` → número de clase
   - Detección de `CANCELAD`, `NO ASISTIO`, `REPOSICION`, `COMPLETAD` → status
4. **Fuzzy Matching** contra tablas `teachers` y `students` (normalización NFD + uppercase).
5. **Upsert** en `calendar_events` (chunks de 500).

**Cálculo de horas de docente** (`infra/services/payments.ts`):
- `diffHours = (end - start) / (1000 * 60 * 60)` — si el resultado es ≤ 0, se asume 1 hora.
- Solo se pagan sesiones con status `scheduled`, `Asistio` o que incluyan `Reposición`.
- `totalPayment = totalHours * hourlyRate`

---

## 5. Reglas de Negocio Innegociables (Business Logic)

### 5.1 Motor Financiero (Pricing + Cuotas)

**Archivo**: `src/app/actions/pricing.ts`

#### Regla de Redondeo

```typescript
const roundUp10k = (val: number) => Math.ceil(val / 10000) * 10000;
```

- **Todo total financiado** se redondea **siempre hacia arriba** a la decena de mil más cercana.
- Ejemplo: `976.500 → 980.000 COP`

#### Cálculo del Total Financiado

```
total_financiado = roundUp10k(cash_price × (1 + increment_percentage / 100))
```

> ⚠️ **DIRECTIVA INNEGOCIABLE**: `increment_percentage` es **exclusivo de cada programa** y se lee siempre desde la tabla `program_prices` (columna `increment_percentage`) en la Bóveda. **NO existe una tasa global por defecto**. Cada programa tiene su propio porcentaje configurado explícitamente en `/dashboard/configuracion/precios`. Si no existe dato en la Bóveda, se usa `0%` (precio de contado sin incremento) para evitar cargos arbitrarios.

**Archivos con esta lógica**:
- `src/app/actions/finance.ts` → `initializePaymentPlan`: lee `program_name, cash_price, valor_contado, increment_percentage` por semestre.
- `src/modules/matriculas/components/EnrollmentAuditCard.tsx` → `programBaseAmount`: aplica `pricing.increment` de la Bóveda por programa seleccionado.
- `src/app/actions/pricing.ts` → `updatePricingVault`: persiste el `increment_percentage` que viene del formulario de configuración (sin fallback arbitrario).
- `src/core/schemas/pricing.ts` → Schema Zod: `default(0)` — sin tasa asumida.

#### Sistema de Cuotas "Espejo y Residuo"

Para cada modalidad de `n` cuotas (n = 2 a 6):

1. **Cuotas C₁ a C_{n-1}**: `roundUp10k(total_financiado / n)` — redondeo hacia arriba.
2. **Cuota final C_n**: `total_financiado - Σ(C₁..C_{n-1})` — **residuo absoluto** (puede ser menor que las anteriores).

```typescript
for (let n = 2; n <= 6; n++) {
    const monthlyInstallment = roundUp10k(realTotal / n);
    const sumOfFirstNMinus1 = monthlyInstallment * (n - 1);
    const finalInstallment = realTotal - sumOfFirstNMinus1;
    // ...
}
```

#### Lo que NO se financia

- **Inscripción** (`enrollment_fee`) y **Camiseta** (`tshirt_fee`) son costos globales fijos por semestre configurados en `dyt_global_settings`.
- Se suman al total pero **no entran en el cálculo de cuotas** del plan financiado.

#### Inicialización del Plan de Pago (`initializePaymentPlan`)

1. Busca programas del enrollment en `dyt_enrollment_programs`.
2. Cruza nombres de programas con `program_prices` (o `dyt_program_prices`) usando **normalización NFD + lowercase**.
3. Si un precio no se encuentra, marca `needsAudit = true`.
4. Crea registro en `dyt_payment_plans` con status `pending`.
5. Tiene **fallback de contingencia** si la inserción primaria falla (intenta esquema simplificado).

#### Sellado del Plan (`sealPaymentPlan`)

Actualiza el plan con montos definitivos, registra la transacción inicial si `initialPayment > 0`, y calcula el status (`pending` → `partial` → `paid`).

---

### 5.2 Biometría (Cálculo de Edad)

**Regla de oro**: La edad se parsea desde el campo `age` del formulario de Google Sheets como un entero (`parseAge("12 años") → 12`).

**Cálculo alternativo** (cuando se muestra en el perfil del estudiante):

```typescript
const ageMsPerYear = 365.25 * 24 * 60 * 60 * 1000;
const age = Math.floor((Date.now() - new Date(birth_date).getTime()) / ageMsPerYear);
```

**Acceso a programas**: **SIN RESTRICCIONES**. Todo estudiante activo (desde 1 año en adelante) recibe su slot de programa. El bloqueo de menores de 7 años fue **eliminado** (ver Sección 7 — Battle Log). El sistema hace auto-seed de un programa si la matrícula tiene 0 programas (ver `migration.ts:190`).

---

### 5.3 Aislamiento por Semestre (Directiva Primaria)

Establecido en `DYT_FINANCE_MANIFESTO.md`:

> Toda la data académica y financiera es **EFÍMERA** respecto a la aplicación y **PERMANENTE** respecto a su semestre.

- **Toda consulta** a Supabase **debe** incluir filtro `WHERE semester = ?`.
- Si el usuario cambia el semestre activo, UI y datos mutan inmediatamente.
- Fuente de verdad del semestre: `dyt_enrollments.semester` (académico/financiero) y `dyt_global_settings.semester` (config global).

---

### 5.4 Categorización de Programas

| Tipo                     | Programas                                              | Características              |
| :----------------------- | :----------------------------------------------------- | :--------------------------- |
| **1a1 (Personalizado)**  | Semestre Personalizado, Semipersonalizado, Curso Libre | Requieren maestro/horario    |
| **Grupal**               | Aprestamiento, Piano Iniciación, Piano Ukelele, Danza y Expresión | Sin maestro individual en ficha |

---

## 6. Sistema de Diseño (UI/UX Guidelines)

### 6.1 Estética "Neon-Glass"

**Archivo CSS**: `src/ui/styles/globals.css`

#### Tokens de Color (Dark Mode — modo principal)

| Token             | Valor HSL                | Uso                         |
| :---------------- | :----------------------- | :-------------------------- |
| `--background`    | `240 10% 4%`            | Fondo base (casi negro)     |
| `--primary`       | `280 85% 60%`           | Violeta profundo DYT        |
| `--accent`        | `185 100% 50%`          | Cyan neón (acentos, ring)   |
| `--card`          | `240 10% 7%`            | Fondo de tarjetas           |
| `--muted`         | `240 10% 12%`           | Fondos secundarios          |
| `--border`        | `280 30% 15%`           | Bordes sutiles              |

#### Reglas Estrictas

1. **Fondos**: Usar `bg-black/60` con `backdrop-blur-md` (o `backdrop-blur-2xl`). Clase utilitaria: `.glass-panel`.
2. **PROHIBIDO**: Grises sólidos (`bg-zinc-900`, `bg-gray-800`, `bg-slate-800`). Estos rompen la estética translúcida.
3. **Bordes**: `border-white/10` o `border-primary/10` — nunca opacos.
4. **Sombras**: `box-shadow` con `hsl(var(--primary)/0.08)` o `hsl(var(--accent)/0.2)`.
5. **Hover**: `.glass-panel-hover` — sube `-translate-y-1.5` + borde accent.

#### Animación "Neon Pulse"

```css
.neon-pulse {
    animation: neon-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    /* Oscila opacidad + drop-shadow con color accent */
}
```

#### Componentes Clave del Design System

| Componente             | Ruta                                          | Responsabilidad                                  |
| :--------------------- | :-------------------------------------------- | :----------------------------------------------- |
| `GlassCard`            | `ui/components/modules/layout/`                | Tarjeta glassmorphic base (borde, blur, sombra)  |
| `PremiumButton`        | `ui/components/modules/buttons/`               | Botón con variantes `primary`, `outline`         |
| `GradientText`         | `ui/components/modules/typography/`            | Texto con gradiente (primary → accent)           |
| `ParticleBackground`   | `ui/components/modules/layout/`                | Fondo de partículas cinematográfico              |
| `SidebarNav`           | `ui/components/modules/layout/`                | Sidebar de navegación con links glassmorphic     |
| `ThemeToggle`          | `ui/components/modules/layout/`                | Toggle claro/oscuro (next-themes)                |
| `ThemeProvider`        | `ui/providers/`                                | Provider de next-themes                          |

#### Estados de Carga

- Spinner SVG animado con `animate-spin` (visible en `LegalizeClientView.tsx:364`).
- Barra de progreso nativa con `transition-all duration-300` para procesos batch.
- Placeholders en **negro profundo** (`#0a0a0a` / `bg-black/60`).

#### Foto de Perfil

- Drag & drop para subir fotos (componente `upload-student-photo.ts`).
- Se almacenan en Supabase Storage bucket `student-photos`.
- Display: Circular/rounded, 100x100px, borde 2px violeta (`border-primary`).
- Fallback: Icono genérico de usuario si `photo_url` es null.

---

## 7. Registro de Batalla (Bugs Históricos y Soluciones)

### 🔴 Bug #1: White Screen of Death (WSOD) — Variables fuera de scope

**Síntoma**: Pantalla blanca sin errores visibles en consola del navegador.  
**Causa raíz**: Variable `isMinor` referenciada fuera de su scope (bloque condicional). En React/Next.js, una variable no definida causa un crash silencioso del renderizado.  
**Solución**: Mover la declaración de `isMinor` al scope correcto (nivel de componente) y asignar valor por defecto.  
**Lección**: Siempre declarar variables de estado derivadas al inicio del componente.

---

### 🔴 Bug #2: "Invalid Date" de JavaScript

**Síntoma**: Fechas mostrando `"Invalid Date"` o `"NaN"` en la UI cuando `birth_date` tenía formatos inesperados provenientes de Google Sheets.  
**Causa raíz**: `new Date("DD/MM/YYYY")` no es un formato válido ISO; JavaScript interpreta `DD` como mes, generando fechas inválidas o `NaN`.  
**Solución**: Implementar `convertBirthDate()` con 6 regex de parseo y retorno seguro `null` para formatos no reconocidos, más una función display que retorna `"(N/A)"` si la fecha es nula.  
**Lección**: Nunca confiar en `new Date()` con strings de usuario. Siempre usar parser explícito.

---

### 🔴 Bug #3: Bloqueo Fantasma de Programas para Menores de 7 Años

**Síntoma**: Estudiantes menores de 7 años no podían ver programas asignados.  
**Causa raíz**: Un filtro condicional por edad (herencia del sistema legado) bloqueaba el renderizado de programas para menores. La lógica no tenía justificación de negocio.  
**Solución**: Eliminado completamente en `LegalizeClientView.tsx`. El auto-seed de programas en `migration.ts:190` ahora aplica a **todo estudiante activo** sin filtro de edad.  
**Lección**: Validar reglas de negocio antes de implementar filtros. "TODO estudiante activo recibe su slot".

---

### 🔴 Bug #4: Next.js "Body exceeded 1 MB limit"

**Síntoma**: Error 413 al enviar Server Actions con payloads grandes (particularmente al subir fotos de estudiantes).  
**Causa raíz**: Next.js Server Actions tienen un límite de 1 MB por defecto en el body de la request.  
**Solución**: Validación **Client-Side** antes del envío — comprimir imágenes, limitar tamaño máximo del archivo, y enviar directamente a Supabase Storage desde el cliente (bypass del Server Action para uploads binarios).  
**Lección**: Para archivos grandes, usar Supabase Storage directamente desde el browser client, no pasar por Server Actions.

---

### 🟡 Bug #5: Duplicación de Google Sheets (Teacher Payments)

**Síntoma**: El sistema creaba múltiples hojas de Google Sheets nuevas con el mismo nombre repetidamente.  
**Causa raíz**: La lógica de "Calendar to Sheet" no verificaba la existencia previa de la hoja antes de crearla.  
**Solución**: Verificación de hoja existente por nombre antes de crear una nueva; si existe, se reutiliza.  
**Lección**: Todo creación de recurso externo debe ser idempotente.

---

### 🔴 Bug #6: Tasa de Incremento Global Hardcodeada (Motor Financiero)

**Síntoma**: El motor financiero asumía una tasa de incremento global genérica (5% en `pricing.ts`, 5.4% en el schema Zod y `PricingTable.tsx`, 5% en `EnrollmentAuditCard.tsx`) independientemente del programa del estudiante.  
**Causa raíz**: Los fallbacks `?? 5`, `?? 5.4`, y `|| 5` en múltiples archivos aplicaban una tasa arbitraria cuando no se encontraba el valor en la Bóveda, o incluso como valor por defecto para nuevos registros.  
**Archivos corregidos**:
- `src/app/actions/finance.ts` → `initializePaymentPlan`: ahora consulta `increment_percentage` por programa desde `program_prices`.
- `src/app/actions/pricing.ts` → fallback cambiado de `?? 5` a `?? 0`.
- `src/core/schemas/pricing.ts` → `default(5.4)` cambiado a `default(0)`.
- `src/ui/components/modules/pricing/PricingTable.tsx` → nuevo programa inicia con `increment_percentage: 0`.
- `src/modules/matriculas/components/EnrollmentAuditCard.tsx` → fallback `|| 5` eliminado, usa `0` cuando la Bóveda no tiene dato.  
**Solución**: Cada programa define su propio % de incremento en la Bóveda de Precios. El sistema lo lee por programa. Si no existe, usa `0%` (más seguro que un valor incorrecto).  
**Lección**: Nunca hardcodear tasas financieras como fallbacks. Si el dato no existe en la Bóveda, la ausencia de cargo es mejor que un cargo incorrecto. El administrador debe configurar la tasa explícitamente.

---

## 8. Roadmap y Tareas Pendientes

### 8.1 TODOs Detectados en el Código

| Archivo                              | Línea | Descripción                                                  |
| :----------------------------------- | :---- | :----------------------------------------------------------- |
| `ScheduleClassModal.tsx`             | 8     | `// TODO: Replace with real student type when available`     |
| `sync-google-sheet.ts`              | 19    | `// TODO: Módulo de extracción y transformación de datos (Python/Streamlit migration logic)` |

### 8.2 Módulos y Funcionalidades Pendientes

1. **Horarios Grupales**: Implementar la lógica de asignación de horarios para clases grupales (Aprestamiento, Piano Iniciación, etc.). El catálogo `group_classes` existe pero la UI de asignación está incompleta.
2. **Webhook de Google Forms**: Reemplazar el polling manual (botón "Sincronizar") por un **Webhook** disparado automáticamente desde Google Apps Script cuando hay nuevas respuestas. El handover (`HANDOVER_SIA_TO_NEXTJS.md`) lo documenta como crítico.
3. **RBAC Completo**: El campo `profiles.role` existe pero el middleware no filtra por rol. Se necesita implementar filtrado de rutas y componentes según `Admin` vs `Assistant`.
4. **Pagos a Maestros (Completo)**: La vista `/dashboard/payments` y el servicio `payments.ts` existen pero la UX de conciliación (comparar calendario vs. pagos realizados) está incompleta. Se necesita replicar `reconcile_calendar_vs_supabase()` de SIA 2.0.
5. **RLS en Supabase**: Las políticas de Row Level Security están definidas conceptualmente pero no todas están implementadas activamente en la base de datos. Se necesita auditar y activar.
6. **Compatibilidad de Fuente de Precios**: Unificar `program_prices` (legado) y `dyt_program_prices` en una sola tabla. El dual-source actual en `settings.ts:55-96` es frágil.
7. **Reportes Avanzados**: El módulo de reportes (`infra/services/reports.ts`) y la generación PDF de legalización están funcionales, pero faltan reportes financieros consolidados (ingresos por semestre, cartera pendiente, etc.).
8. **Debug Vault**: La ruta `/dashboard/debug-vault` existe pero su contenido y funcionalidad no están documentados.
9. **Migración Service Account**: Actualmente se usa OAuth2 con `token.json` (requiere renovación). Se recomienda migrar a **Google Service Account** para automatización sin intervención humana (documentado en `HANDOVER_SIA_TO_NEXTJS.md:65`).

---

## Apéndice A: Inventario de Server Actions

| Action                         | Archivo                        | Función Principal                                    |
| :----------------------------- | :----------------------------- | :--------------------------------------------------- |
| `syncGoogleSheetToStudents`    | `syncActions.ts`               | Google Sheets → students + dyt_enrollments           |
| `initializePaymentPlan`       | `finance.ts`                   | Crea plan de pago para una matrícula                 |
| `sealPaymentPlan`             | `finance.ts`                   | Sella plan con montos definitivos + transacción      |
| `updatePricingVault`          | `pricing.ts`                   | Upsert de tabla de precios con cálculo de cuotas    |
| `syncProgramNames`            | `audit-finance.ts`             | Sincroniza nombre de programa en enrollment          |
| `legalizeEnrollmentProgram`   | `audit-finance.ts`             | Legaliza matrícula + inicializa plan financiero      |
| `refreshAuditData`            | `audit-finance.ts`             | Revalida cache de auditoría                          |
| `syncCalendarEventsAction`    | `sync-calendar-events.ts`      | Google Calendar → calendar_events                    |
| `migrateSiaToDyt`             | `migration.ts`                 | Migración masiva SIA legacy → Bóveda DYT            |
| `getEnrollmentAudit`          | `migration.ts`                 | Auditoría completa de matrícula + programas + student|
| `getGlobalSettings`           | `settings.ts`                  | Lee config global por semestre                       |
| `upsertGlobalSettings`       | `settings.ts`                  | Upsert de enrollment_fee + tshirt_fee                |
| `getInstruments`              | `settings.ts`                  | Lista catálogo de instrumentos                       |
| `upsertInstrument`           | `settings.ts`                  | CRUD de instrumentos                                 |
| `deleteInstrument`           | `settings.ts`                  | Elimina instrumento del catálogo                     |
| `getProgramPricesBySemester` | `settings.ts`                  | Lee precios (dual source: dyt → legacy)              |
| `getGroupClassesBySemester`  | `settings.ts`                  | Lista clases grupales por semestre                   |

---

## Apéndice B: Variables de Entorno Requeridas

| Variable                            | Tipo     | Descripción                                         |
| :---------------------------------- | :------- | :-------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`          | Pública  | URL del proyecto Supabase                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Pública  | Anon key (segura con RLS)                           |
| `SUPABASE_SERVICE_ROLE_KEY`         | 🔐 Secreta | Service key (bypass RLS — solo server-side)       |
| `google-credentials/credentials.json`| 🔐 Archivo | OAuth2 credentials de Google                     |
| `google-credentials/token.json`     | 🔐 Archivo | Token renovable OAuth2                           |

---

> **Documento generado automáticamente mediante inspección profunda (Deep Scan) del repositorio local.**  
> **No editar manualmente sin aprobar cambios con el equipo de arquitectura.**
