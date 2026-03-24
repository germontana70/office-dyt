# 🗺️ OFFICE_DYT_DB_MAP: Única Fuente de Verdad (Bóveda 2026-1)

Este documento es el mapa maestro de la base de datos de **Office DYT**. Sirve como referencia técnica para agentes de IA y desarrolladores para evitar colisiones de contexto y errores de unión de tablas.

## 🏛️ Categorización de Entidades

### 1. Bóveda DYT (Prefijo `dyt_` y Tablas Modernas)
Son las tablas dinámicas que gestionan la lógica de negocio actual del semestre 2026-1 en adelante.

| Tabla | Propósito Principal | Aislamiento por `semester` |
| :--- | :--- | :--- |
| `students` | Perfiles de estudiantes consolidados. | **SÍ** |
| `dyt_enrollments` | Cabecera de matrícula por estudiante y semestre. | **SÍ** |
| `dyt_enrollment_programs` | Detalle de programas (instrumento/clase) por matrícula. | indirecto via enrollment |
| `dyt_payment_plans` | Acuerdo financiero (contado/cuotas) por matrícula. | indirecto via enrollment |
| `dyt_transactions` | Recibos de pago reales vinculados a un plan. | indirecto via enrollment |
| `dyt_global_settings` | Configuración de costos (matrícula, uniformes) por semestre. | **SÍ** |
| `dyt_program_prices` | Catálogo de precios vigentes por programa. | **SÍ** |
| `dyt_instruments` | Catálogo de instrumentos disponibles. | No |
| `dyt_group_classes` | Definición de horarios y salones para clases grupales. | **SÍ** |
| `dyt_group_program_names` | Catálogo de etiquetas para programas grupales. | **SÍ** |
| `semesters` | Entidades de tiempo que particionan el sistema. | PK |
| `teachers` | Directorio de instructores activos. | No |
| `form_responses` | Datos crudos capturados desde formularios de inscripción. | **SÍ** |
| `profiles` | Perfiles de acceso al sistema (Admin, Staff). | No |

### 2. SIA 2.0 Legacy (Herencia)
Tablas de solo lectura o sincronización que provienen del sistema anterior en Python.

| Tabla | Estado | Propósito |
| :--- | :--- | :--- |
| `Tabla_Verdad_Estudiantes` | Activa (Legacy) | Fuente de identidad para reintegración. |
| `program_prices` | Fallback | Precios antiguos usados si no hay dato en `dyt_program_prices`. |

---

## 🔗 Diagrama Entidad-Relación (ERD)

```mermaid
erDiagram
    SEMESTERS ||--o{ STUDENTS : "gobierna"
    SEMESTERS ||--o{ DYT_ENROLLMENTS : "particiona"
    SEMESTERS ||--o{ DYT_GLOBAL_SETTINGS : "configura"
    SEMESTERS ||--o{ DYT_PROGRAM_PRICES : "precifica"
    
    STUDENTS ||--o{ DYT_ENROLLMENTS : "tiene"
    LEGACY_TRUTH_TABLE |o--|| STUDENTS : "reintegra_a"
    
    DYT_ENROLLMENTS ||--o{ DYT_ENROLLMENT_PROGRAMS : "contiene"
    DYT_ENROLLMENTS ||--|| DYT_PAYMENT_PLANS : "genera"
    
    DYT_PAYMENT_PLANS ||--o{ DYT_TRANSACTIONS : "registra"
    DYT_ENROLLMENTS ||--o{ DYT_TRANSACTIONS : "vincula_pagos"
    
    DYT_ENROLLMENT_PROGRAMS }|--|| DYT_INSTRUMENTS : "usa"
    DYT_ENROLLMENT_PROGRAMS }|--|| TEACHERS : "dictado_por"
    DYT_ENROLLMENT_PROGRAMS }|--|| DYT_GROUP_CLASSES : "pertenece_a"
    
    DYT_GROUP_CLASSES }|--|| TEACHERS : "asignado_a"
    DYT_GROUP_CLASSES }|--|| SEMESTERS : "ocurre_en"

    STUDENTS {
        uuid id PK
        string document_number UK
        string semester FK
        boolean is_active
        jsonb programs
    }

    DYT_ENROLLMENTS {
        uuid id PK
        uuid student_id FK
        string semester FK
        boolean is_active
    }

    DYT_ENROLLMENT_PROGRAMS {
        uuid id PK
        uuid enrollment_id FK
        string program_name
        uuid instrument_id FK
        uuid teacher_id FK
        uuid group_class_id FK
        string day_1
        string time_1
    }

    DYT_PAYMENT_PLANS {
        uuid id PK
        uuid enrollment_id FK
        string plan_type "contado | cuotas"
        decimal total_amount
        string status
        jsonb installments_details
    }

    DYT_TRANSACTIONS {
        uuid id PK
        uuid payment_plan_id FK
        uuid enrollment_id FK
        decimal amount_paid
        string payment_method
    }

    LEGACY_TRUTH_TABLE {
        string numero_de_identificacion PK
        string nombres_del_estudiante
    }
```

---

## 🛡️ Protocolo de Coexistencia y Aislamiento

### Política de Aislamiento del Campo `semester`
El campo `semester` **NO es opcional**. Cualquier consulta a la Bóveda DYT debe incluir un filtro explícito por semestre (actualmente `2026-1`) para evitar la mezcla de datos históricos.

- **Filtro Obligatorio**: `supabase.from('table').select('*').eq('semester', '2026-1')`
- **Tablas Críticas**: `students`, `dyt_enrollments`, `dyt_global_settings`, `dyt_program_prices`.

### Flujo de Sincronización Finance-Audit
1. Los pagos se detectan en `dyt_transactions` (o se migran desde `Tabla_Verdad_Estudiantes`).
2. Se asocian al `enrollment_id`.
3. El motor `finance.ts` reconcilia estas transacciones en el JSONB `installments_details` de `dyt_payment_plans`.
4. La visibilidad en UI depende de que el `program_id` esté vinculado en el detalle de la cuota.

### Integridad de Referencias
- Se debe usar `student_id` (UUID) para conectar con la tabla moderna `students`.
- El `document_number` solo debe usarse para búsquedas iniciales o cruces con `Tabla_Verdad_Estudiantes`.
