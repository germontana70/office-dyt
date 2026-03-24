# SNAPSHOT: Fase 2 - Erradicación del JSONB Ghost

**Fecha:** 2026-03-24
**Rama:** `office-dyt-20260324`
**Arquitecto:** @RefactorEngine

## Resumen Ejecutivo
Se ha completado con éxito la **Fase 2 del Plan de Independencia SIA 2.0**. Hemos cortado absolutamente todos los vínculos funcionales del sistema Next.js respecto a la columna heredada `students.programs` (JSONB) y sus campos escalares dependientes (program, instrument, class_day, class_time, etc.).

La carga académica ahora se gestiona de manera puramente relacional usando la bóveda `dyt_enrollments` (Cabecera) y `dyt_enrollment_programs` (Detalle).

## Cumplimiento de Reglas Críticas
✅ **Zero-DDL Respetado:** Las columnas primitivas de PostgreSQL no fueron eliminadas. El sistema SIA 2.0 legacy puede seguir leyendo y escribiendo si es necesario. La desconexión es estricta a nivel de aplicación (Next.js TypeScript, Zod, y UI).

## Cambios Implementados

### 1. Modelado TS / Zod
**Archivo:** `src/modules/matriculas/models/student.schema.ts`
Las propiedades redundantes fueron aisladas mediante TSDoc y relajadas para prevenir bloqueos por hidatración de DB.
- Se agregó el flag `/** @deprecated Legacy JSONB - Usar dyt_enrollment_programs */`.
- Se flexibilizó el schema cambiando los campos a `z.any().optional().catch(null)`.

### 2. Auditoría Write Path
**Archivo:** `src/app/actions/enrollment.ts`
Se comprobó que el flujo base `saveNewEnrollment` ya obedecía estructuralmente el estándar aislando la inserción en cascada `dyt_enrollments -> dyt_enrollment_programs` y sin afectar a la tabla principal `students`.

Se extendió el motor incorporando la capa de Server Actions de soporte para hidratar la UI de perfil:
- `getActiveEnrollmentPrograms(studentId)`
- `updateEnrollmentProgramDetails(programId, updates)`
- `updateEnrollmentGlobalObservations(enrollmentId, observations)`

### 3. Deep UI Refactor
**Archivo:** `src/modules/matriculas/components/profile/ProgramsAndSchedulesTab.tsx`
Se detruyó exitosamente el vínculo `debouncedSave` que mutaba escalarmente la tabla de estudiantes, y se reemplazó el componente entero:
- Ahora el componente es asíncrono-reactivo: realiza un fetch on-mount contra la **bóveda relacional**.
- La carga académica extrae tanto las observaciones (de `dyt_enrollments`) como los detalles operativos (de `dyt_enrollment_programs`).
- Las mutaciones en tiempo real (selectores) guardan sus cambios sobre su origen relacional.

### 4. UX y Hotfixes (`EnrollmentAuditCard.tsx`)
Se resolvieron vulnerabilidades de estado, UX relacional y del ciclo de vida de React (VDOM):
- **Aislamiento de Estado Matemático:** Prevención de fugas de memoria y cruce de datos migrando la UI a diccionarios locales (`Record<string, PaymentPlanState>`).
- **Regla del "Lienzo Académico":** Las consultas y asignaciones financieras ahora respetan estrictamente el aislamiento por `semester` en curso.
- **Combobox Evolutivo:** Implementación de `FloatingSearchSelect` para profesores, tolerando asignaciones heredadas (String Crudo) y nuevas resoluciones referenciales (UUIDs).
- **Botón de Guardado Parcial:** Creación de `saveProgramDataPartial` para desacoplar mutaciones de horarios/maestro del costoso flujo de "Sellar Acuerdo Financiero". Bloqueo asíncrono sobre IDs efímeros (`new-xxx`).
- **React VDOM Crash Fix:** Erradicación del patrón anti-React (`btn.innerHTML` mutación vanilla) que causaba errores `removeChild NotFoundError`. Reemplazado por purismo reactivo asíncrono (`successProgramId` state).

## Estado Post-Ejecución
El módulo `matriculas` ahora es libre del *JSONB Ghost* y procesa todas sus dependencias de programación vía Relaciones Normales en base de datos. Ha superado con éxito las pruebas de estrés transaccional y validación del DOM.

> Listo para avanzar hacia la **Fase 3: Transaccional**.
