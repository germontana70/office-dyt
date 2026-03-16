ESTADO DEL SEMESTRE
- 2026-1 activo.

ESQUEMA DB ACTUAL
- Tabla principal de precios: program_prices.
  - Columnas clave usadas: program_name, cash_price, increment_percentage, installments, semester.
  - Discrepancias halladas: en entornos previos se intentaba leer total_financed (no existe en program_prices).
- Tabla de matriculas: dyt_enrollments.
  - Columnas clave usadas: id, student_id, semester.
  - Discrepancias halladas: al inicializar planes, dyt_payment_plans no tiene base_amount en el esquema cache; se activo fallback de contingencia.

REGLA DE ORO MATEMATICA
- Financiamiento: precio base * (1 + increment_percentage/100).
- Redondeo: a miles (COP) en calculos de financiado.
- Cuotas: residuo en la ultima cuota si el total no divide exacto.

CATEGORIZACION DE PROGRAMAS
- 1a1 (Personalizados / Cursos Libres):
  - Semestre Personalizado
  - Semestre Semipersonalizado
  - Curso Libre - Instrumento
  - Curso Libre - Artes
  - Requieren maestro/horario individual.
- GRUPALES (sin maestro individual en ficha):
  - Aprestamiento
  - Piano Iniciacion
  - Piano Ukelele
  - Danza y Expresion

LOGROS
- Consola de Auditoria (Alineacion de Programas).
- Consola de Legalizacion con export PDF (reporte de campo).
- Fix de Isabella: selector de programa con fallback y soporte de categorias (portal/z-index estable).

TAREA PENDIENTE
- Implementar logica de horarios grupales.
- Corregir error de carga de programas primarios (fuente de datos/compatibilidad).
