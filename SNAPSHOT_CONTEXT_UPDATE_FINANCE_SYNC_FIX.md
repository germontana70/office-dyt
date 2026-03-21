# SNAPSHOT: CONTEXT UPDATE - FINANCE SYNC FIX (2026-03-21)

## Contexto del Desajuste Resuelto
Durante la sesión de depuración del motor financiero, se identificaron y corrigieron tres fallos críticos que impedían la persistencia correcta de los acuerdos de pago y la carga académica:

### 1. Schema Mismatch de UUIDs (IDs Provisionales)
- **Problema:** El frontend generaba IDs temporales con el prefijo `new-` para programas agregados dinámicamente. Al intentar actualizar instrumentos en PostgreSQL, estos IDs fallaban el cast a `UUID`, abortando la transacción completa.
- **Solución:** Se implementó una guardia en `finance.ts` que omite el update de registros con prefijo `new-`, permitiendo que se inserten correctamente en el bloque de creación posterior.

### 2. Restauración del Mapeo de Schedules
- **Problema:** La data de horarios se perdía al guardar porque no se estaban mapeando a las columnas clásicas de la base de datos (`day_1`, `time_1`, etc.).
- **Solución:** Se restauró y expandió el mapeo en `finance.ts` para cubrir hasta 3 slots de horario, incluyendo `room_n` y `duration_n` (columnas añadidas mediante migración SQL).

### 3. Sincronización de `number_of_installments`
- **Problema:** El cambio en el número de cuotas (ej: de 4 a 6) no persistía porque el payload de `sealPaymentPlan` no actualizaba explícitamente la columna `number_of_installments` en `dyt_payment_plans`.
- **Solución:** Se forzó la actualización de esta columna basándose en la longitud del array de detalles de cuotas.

## Archivos Afectados
- `src/app/actions/finance.ts`: Lógica de sellado y mapeo de horarios.
- `src/modules/matriculas/components/EnrollmentAuditCard.tsx`: Reconstrucción de horarios desde DB.
- `src/app/actions/persist-audit-payments.ts`: Inyección de cuotas en planes nuevos.
- Base de Datos: Adición de columnas de salón y duración.

---
*Este snapshot sirve como punto de referencia para la estabilidad del motor financiero en la versión `office-dyt-20260321`.*
