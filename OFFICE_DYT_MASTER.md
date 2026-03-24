# 🏛️ REGLA DE ORO ARQUITECTÓNICA: EL LIENZO ACADÉMICO (AISLAMIENTO POR SEMESTRE)

**Concepto Core:** Office DYT opera bajo un modelo de "Lienzos Aislados". Un Lienzo es un período académico específico (ej. `2026-1`, `2026-2`). **ABSOLUTAMENTE TODA** la lógica transaccional, académica y financiera nace y muere dentro de su respectivo Lienzo.

Un estudiante NO tiene un "programa global" ni un "precio global". Un estudiante tiene un estado específico, programas específicos, cuotas específicas y acuerdos de pago específicos **DENTRO de un semestre específico**. Al cambiar de semestre, el estudiante inicia un Lienzo en blanco (una nueva Matrícula).

**Mandatos Técnicos Obligatorios (Zero-Exceptions):**

1. **Nivel Base de Datos (Esquema y Relaciones):**
   - Tablas como `dyt_enrollments` (Matrículas Cabecera), `dyt_program_prices` (Bóveda), recibos, pagos, y horarios **DEBEN** incluir la columna `semester`.
   - La unicidad y los constraints deben ser combinados (ej. `UNIQUE (program_name, semester)` o `UNIQUE (student_id, semester)`).

2. **Nivel Backend (Server Actions y Consultas SQL/Supabase):**
   - NINGUNA consulta de lectura (`SELECT`) o escritura (`UPDATE`/`UPSERT`) sobre datos académicos o financieros puede ejecutarse sin un filtro explícito de semestre (`.eq('semester', activeSemester)`).
   - Omitir el filtro de semestre se considera un **Bug Crítico de Nivel 1 (Fuga de Datos)**.

3. **Nivel Frontend (Estado y UI):**
   - El "Lienzo Activo" (Semestre seleccionado en el Dashboard) debe ser la fuente de verdad inmutable que se pasa a todos los componentes hijos y Server Actions.
