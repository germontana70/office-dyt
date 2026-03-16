# Bitácora Módulo Matrícula: Migración Táctica JSONB a SQL

**Fecha de Operación:** Lunes, 16 de Marzo de 2026

## Extracto Técnico del Problema
Previamente, los datos de programas, horarios, nivel de instrumento y asignación profesoral de los ~98 estudiantes migrados persistían atrapados en una sola columna pseudo-noSQL tipo `JSONB` bajo el alias `programs` dentro de la tabla raíz `students`.
Dicho bloque monolítico era incompatible con el motor de Auditoría Financiera que opera modularmente iterando sobre tablas relacionales cruzadas (joins funcionales).

## Reestructuración del Server Action (`migrateSiaToDyt()`)
El backend module en `src/app/actions/migration.ts` ha sido recableado en su totalidad:
1. **Fallback Cabecera (UPSERT Manual)**:
   Si el cruce detecta un payload existente para (`student_id`, y semester `'2026-1'`), no colapsará. Actualizará cediendo un state de `status: 'Migrada'` con su peso fiscal saneado (`total_calculated: 0`).
2. **Aplanamiento Desestructurado** (`students.programs` JSONB → `dyt_enrollment_programs` Relacional):
   El bucle interno ahora fracciona cada iteración del array y escribe directamente sobre la pasarela de programas vinculados.
3. **Conversión Estricta a UUID (NFD)**:
   Strings heredados (ej., `"Técnica Vocal "` o `"Danza y Expresión"`) corrían grave riesgo de romper el motor relacional de claves por acentuación o espacios al chocar contra `<dyt_instruments>` o `<teachers>`.
   Se inyectó una unificadora léxica `normalizeStr(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase()` la cual garantiza un match exacto a la *Primary Key UUID* estricta en el Lookup.
4. **Resiliencia (No abort upon error)**:
   Errores específicos como UUID nulos solo omitirán el cruce puntual dejando los valores subyacentes legados sueltos, pero procesando la fila entera y al resto de 97 alumnos de forma contundente en el hilo `console`.

Esta arquitectura es ahora la espina dorsal para el rescate y transición pacífica de records in inactivos o suspendidos sin romper el sistema *Finance Engine* 2.0.
