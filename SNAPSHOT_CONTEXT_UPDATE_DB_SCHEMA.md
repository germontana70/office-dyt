# ⚡ SNAPSHOT: CONTEXT_UPDATE_DB_SCHEMA (Bóveda 2026-1)
**Fecha:** 24 de marzo de 2026
**Autor:** @DataMapper

## 🎯 Resumen Ejecutivo
Se ha mapeado la arquitectura híbrida de **Office DYT** para el semestre 2026-1, identificando la coexistencia de la nueva **Bóveda DYT** (prefijo `dyt_`) y el sistema legado **SIA 2.0** (`Tabla_Verdad_Estudiantes`).

## 📊 Relaciones Descubiertas
1.  **Eje Central (Aislamiento):** El campo `semester` actúa como clave de partición lógica en las tablas principales (`students`, `dyt_enrollments`, `dyt_global_settings`, `dyt_program_prices`).
2.  **Cascada Financiera:**
    *   `dyt_enrollments` -> `dyt_payment_plans` (1:1)
    *   `dyt_payment_plans` -> `dyt_transactions` (1:N)
    *   `dyt_enrollments` -> `dyt_enrollment_programs` (1:N)
3.  **Vínculo Académico:** `dyt_enrollment_programs` conecta matrículas con `teachers`, `dyt_instruments` y `dyt_group_classes`.

## ⚠️ Riesgos de Cruce de Datos (Nuevos vs. Legacy)
| Riesgo | Descripción | Mitigación |
| :--- | :--- | :--- |
| **Colisión de IDs** | Uso de `document_number` como PK puede fallar si hay duplicados históricos. | Usar siempre `student_id` (UUID) de la tabla moderna `students`. |
| **Drift de Precios** | Desconexión entre `dyt_program_prices` y la tabla legacy `program_prices`. | Implementar lógica de fallback estricta priorizando `dyt_`. |
| **Mezcla de Semestres** | Consultas sin filtro `semester` pueden retornar datos de 2025 o anteriores. | **CRÍTICO:** Filtro `eq('semester', '2026-1')` obligatorio en toda query. |
| **UUIDs Inválidos** | Intentos de insertar strings vacíos o IDs provisionales (`new-xxx`) en campos FK. | Sanitización estricta de UUIDs antes de cada `insert`/`update`. |

## 🔗 Dependencias Críticas
- **Motor Financiero (`finance.ts`):** Depende de que el `enrollment_id` exista y esté activo para inicializar planes de pago.
- **Auditoría de Bóveda:** La visibilidad de pagos en la UI depende de la reconciliación del JSONB `installments_details` contra `dyt_transactions`.

---
*Este snapshot está optimizado para su ingesta en NotebookLM como base de conocimiento para futuros procesos de razonamiento de IA.*
