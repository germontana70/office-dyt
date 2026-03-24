# Plan Estratégico: Independencia Quirúrgica de SIA 2.0

**Fecha de Inicio Recomendada:** Inmediata (tras asegurar el Panóptico)
**Objetivo:** Consolidar "Office DYT" como un sistema autónomo, eliminando dependencias del legado sin interrumpir la operación actual.

---

## 🏛️ Fase 1: Independencia de Tablas y Recableado
**Meta:** Establecer un almacenamiento de configuración moderno y seguro.

1. **Creación de `dyt_program_prices`:** 
   - Generar la tabla con columnas: `id (UUID)`, `program_id`, `semester`, `price`, `active (boolean)`.
   - Implementar RLS restrictivo.
2. **Migración de Datos Semilla:** 
   - Extraer precios actuales de `program_prices` (SIA) y volcarlos en `dyt_program_prices`.
3. **Recableado de Lógica:** 
   - Modificar `src/app/actions/finance.ts` para que la consulta primaria apunte a `dyt_program_prices`. 
   - Mantener `program_prices` solo como fallback de emergencia (LOGGED).
4. **Auditoría Visual:** Verificar la carga de precios en el **Panóptico Global** filtrando por la nueva tabla.

---

## 👻 Fase 2: Eliminación del "Fantasma del JSONB"
**Meta:** Normalizar la relación Estudiante-Programa eliminando la duplicidad en `students.programs`.

1. **Auditoría de Inconsistencias:** Comparar `dyt_enrollment_programs` contra el campo JSONB `programs` de la tabla `students`.
2. **Consolidación de CRUD:** 
   - Actualizar server actions de matrícula para que **solo** escriban en `dyt_enrollments` y `dyt_enrollment_programs`.
   - Limpiar el campo JSONB en `students` (sustituirlo por un puntero o dejarlo vacío).
3. **Refactorización de Vistas:** Actualizar los componentes UI para consumir datos exclusivamente de las tablas transaccionales `dyt_`.
4. **Auditoría Visual:** Confirmar en el Panóptico que al matricular un estudiante, la tabla `dyt_enrollments` crece mientras `students.programs` permanece estático.

---

## ⛓️ Fase 3: Resolución del Cuello de Botella Transaccional
**Meta:** Extraer los abonos del JSONB `installments_details` hacia una estructura relacional pura.

1. **Análisis de `installments_details`:** Identificar la estructura de los abonos guardados dentro del JSONB en `dyt_payment_plans`.
2. **Mapeo a `dyt_transactions`:** Asegurar que cada entrada en el JSONB tenga un espejo exacto en la tabla `dyt_transactions`.
3. **Auditoría de Reconciliación:** Refinar la función `reconcileTransactionsToPaymentPlan` para que la **Fuente de Verdad** sea la tabla de transacciones, y el JSONB sea solo una "Vista Materializada" para rendimiento de carga inicial.
4. **Auditoría Visual:** Comparar sumatorias de `dyt_transactions` contra el balance mostrado en el Panóptico para `dyt_payment_plans`.

---

## 💰 Fase 4: Pago de Deuda Técnica (Dual-Source)
**Meta:** Apagado definitivo de lecturas a SIA 2.0 y blindaje de tipos.

1. **Remoción de Fallbacks:** Eliminar los bloques `catch` o condicionales que consultan `Tabla_Verdad_Estudiantes` o `program_prices`.
2. **Sincronización de Tipos:** Ejecutar `supabase gen types typescript` (o actualizar manualmente `database.ts`) para incluir todas las tablas `dyt_` identificadas.
3. **Cierre de Perímetro:** Deshabilitar permisos de servicio para las tablas legadas en las API keys de la Bóveda 2026-1.
4. **Auditoría Visual Final:** Comprobar que el Panóptico solo muestra actividad en tablas con prefijo `dyt_` y la tabla moderna `students`.

---

## 🛡️ Reglas de Oro (ADN Office DYT)
1. **Zero-DDL en SIA 2.0:** Prohibido alterar el esquema legado.
2. **Cero Pérdida de Datos:** `Tabla_Verdad_Estudiantes` se conserva como bóveda histórica inmutable.
3. **Escalabilidad Neon:** Mantener el uso de fondos translúcidos y diseño Glassmorphism en toda nueva interfaz de auditoría.
