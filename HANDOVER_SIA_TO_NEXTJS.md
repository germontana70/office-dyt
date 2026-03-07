# DOCUMENTO DE TRASPASO TÉCNICO (HANDOVER)
## Migración SIA 2.0 (Streamlit/Python) a Office DYT (Next.js 14+)

Este documento fue generado tras una auditoría técnica profunda al código fuente de **SIA 2.0**. Su objetivo es servir como mapa de ruta definitivo y fuente de verdad para el equipo de arquitectos de Next.js que construirá la versión "office-dyt".

---

### 1. 🗺️ Arquitectura actual y Flujos (Microprocesos)
La aplicación actual está construida en **Python 3 con Streamlit**, estructurada bajo un patrón modular.

**Módulos Principales (Layouts en Streamlit)**:
- **`app_new.py`**: Entry point principal. Maneja el estado de la sesión, la autenticación y carga un Service Worker / Thread en segundo plano que sincroniza inscripciones automáticamente cada 20 segundos.
- **Autenticación (RBAC)**: Basada en roles (Admin vs Assistant). Si el correo es `info@donesytalentos.org`, se asignan permisos de Admin. Los componentes de UI son filtrados dependiendo de este rol.
- **Vistas UI (`ui/layouts/`)**:
  - `teacher_payment_layout.py`: Módulo de pagos a maestros. Altamente complejo.
  - `data_entry_layout.py` / `academic_layout.py`: Gestión de estudiantes y clases.
  - Vistas de reportes y corrección rápida de datos (`Corrector de Duplicados`, `Corrección de Datos`).

**Flujo Critico a Migrar**: El sistema actual mantiene un hilo en *background* (`sync_thread`) que hace polling continuo. En Next.js, esto **debe migrarse a una arquitectura basada en Serverless Webhooks** (vía Next.js API Routes o Server Actions) invocado idealmente por Google Apps Script cuando haya una nueva respuesta, en lugar de un polling constante.

---

### 2. 🗄️ Conexión a Base de Datos (Supabase)
Todo el estado de la aplicación reside en Supabase. El cliente se inicializa utilizando un enfoque híbrido (`anon_key` para lecturas estándar y `service_role_key` para bypass de políticas administrativas).

**Tablas Identificadas y su Rol**:
1. `students`: Fuente primaria (Source of Truth) de los datos del estudiante en un semestre dado.
2. `form_responses`: Actúa como una tabla de "Staging" o memoria intermedia. Recibe los datos crudos del Google Sheet e incluye un `row_hash` (MD5) para evitar duplicados.
3. `Tabla_Verdad_Estudiantes`: Tabla legacy/global que consolida estudiantes de todos los semestres por su número de documento (actúa como CRM histórico).

**Manejo de Autenticación actual**:
- Utiliza la sesión de Streamlit y las funciones nativas de `supabase-py` para el logueo (`auth.sign_in()`, etc.).
- **Acción para el equipo de Next.js**: Deberán implementar `@supabase/ssr` o `next-auth` en modo Server Components para garantizar la persistencia de cookies segura y tipar los modelos de la base de datos con las utilidades de generación de tipos de Supabase.

**Requisito de RLS (Row Level Security)**:
- Se requiere tipar estrictamente en Next.js. Las políticas deben configurarse en Supabase para proteger:
  - `SELECT/UPDATE` sobre `students` restringido únicamente a usuarios autenticados con los roles apropiados (RBAC definido en una tabla `users`).

---

### 3. 🔌 Integraciones Externas (Google APIs)
SIA 2.0 depende fuertemente de Google Workspace (formularios, sheets, y calendario).

**Google Sheets (Inscripciones)**:
- **Lectura**: El sistema lee hojas como `Formulario de Inscripción Dones y Talentos 2026-1 (Respuestas)` usando `gspread`.
- **Formato esperado**: 42 columnas que son mapeadas en caliente a nuestro modelo SQL (ver `SupabaseStudentRepository.create_from_form_response`).

**Google Calendar (Programación y Pagos)**:
- **Lectura/Agregación**: Busca eventos en rangos de fechas mediante la API de Google (`google-api-python-client`).
- **Lógica de Parseo de Título**: El sistema extrae el número de clase ("Clase #8") y al profesor buscando iterativamente variaciones del nombre y nicknames en el *Título* y *Descripción* del evento.
- **Reglas de Estado**: Detecta clases "Canceladas" si el calendario dice `CLASES CANCELADAS` o si el título incluye la palabra "CANCELAD". Detecta clases de "Reposición" explícitamente y calcula la duración comparando horas de inicio/fin en zona horaria `America/Bogota`.

---

### 4. 🔐 Inventario de Secretos y Entorno
El sistema maneja un `.env` fundamental para la operatividad local y despliegue.

| Nombre de Variable / Archivo | Propósito General en Producción | Consideración de Seguridad |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Endpoint de la base de datos y API REST de Supabase. | Pública, pero requiere key para acceso. |
| `SUPABASE_KEY` | Llave anónima (`anon key`) para clientes. | Segura para exponer al frontend (con RLS activo). |
| `SUPABASE_SERVICE_KEY` | Llave maestra administrativa. Bypass de seguridad RLS. | **CRÍTICO**. NUNCA exponer en Next.js cliente. Solo usar en Server Actions o Edge Functions. |
| `STREAMLIT_SERVER_...`| Configuraciones de exposición de red de UI. | Obsoleto para Next.js. Se descartará. |
| `credentials.json` | JSON de credenciales de Google OAuth / Service Account. | **CRÍTICO**. Identidad pura. Debe integrarse como variables de entorno seguras (`GCP_SERVICE_ACCOUNT`) en Vercel/VPS. |
| `token.json` | Token renovable OAuth para la persistencia sin reingreso de Google. | **CRÍTICO**. Da acceso a leer y editar calendarios y hojas. Debería persistirse en una BD segura o usarse un Service Account en lugar de OAuth si es posible. |

---

### 5. 🧠 Lógica Crítica a Refactorizar
Estas son las piezas de código más desafiantes (escritas en Python) que los ingenieros Full-Stack tendrán que convertir en utilidades Type-Safe (TypeScript) o Endpoints en Next.js:

1. **Calculadora de Pagos a Maestros (`core/teacher_payment_logic.py`)**:
   - Incluye funciones clave como `get_default_pay_period` (regla financiera estricta: cierres de pago van del 26 de un mes al 25 del siguiente).
   - Lógica de conciliación profunda: `reconcile_calendar_vs_supabase()` compara eventos por fecha, duración y estado usando hash dicts, escupiendo "Inconsistencias".

2. **Normalizador y Sincronizador de Datos Crudos (`services/supabase_student_repo.py`)**:
   - Existen adaptadores muy frágiles como `convert_birth_date` y `clean_document_number` y agrupamiento de información familiar (`build_family_member`) que manejan nulos, NAN y saltos de línea procedentes de los formularios de Google sin tipado estricto. **Esto debe convertirse en esquemas de `Zod` rigurosos**.
   - **Upserts Inteligentes**: La lógica `upsert_truth_record` que maneja el cruce entre estudiantes nuevos de la tabla de staging a la tabla final `students`.

3. **Background Sync (`services/sync_service.py` asociado a `app_new.py`)**:
   - Convertir la automatización de hilos ("Background Thread de 20 segundos") por un **Webhook Listener Next.js API Route**.

---
**FIRMADO:**
*Director SIA* - Protocolo Orchestrator-X
