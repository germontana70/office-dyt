# MANIFIESTO FINANCIERO DYT

## DIRECTIVA PRIMARIA: AISLAMIENTO ABSOLUTO POR SEMESTRE

Toda la data académica y financiera del sistema DYT es EFÍMERA respecto a la aplicación,
y PERMANENTE respecto a su semestre. El semestre es la frontera inviolable de contexto.

### REGLA OPERATIVA OBLIGATORIA
Todo flujo de lectura o escritura en Supabase (SELECT, INSERT, UPDATE, DELETE) debe
estar SIEMPRE anclado a un semestre explícito, validado y consistente. La fuente
de verdad del semestre es:

- `dyt_enrollments.semester` para cualquier dato académico/financiero asociado a una matrícula.
- `dyt_global_settings.semester` para configuraciones globales del periodo.

### CONSECUENCIA
No se permite mezclar flujos, pagos, horarios o cálculos entre semestres distintos.
Si el usuario cambia el semestre activo (ej. `2026-1` a `2026-2`), la UI y la lógica
de datos deben mutar de forma inmediata para reflejar SOLO la información de ese
semestre.

### OBLIGACIÓN PARA AGENTES DE IA Y DESARROLLADORES
Cualquier agente o desarrollador que trabaje en este proyecto DEBE leer este archivo
antes de implementar lógica financiera. Toda consulta a Supabase debe incluir filtros
por `semester` a través de `dyt_enrollments` o `dyt_global_settings`.

