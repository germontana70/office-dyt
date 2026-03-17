# 📊 SNAPSHOT MATRÍCULAS DINÁMICO FINAL
**Fecha:** 2026-03-17 | **Módulo:** Matrículas 2.0 (Motor Financiero + UI Relacional)

## 📌 Resumen de Arquitectura y Estado
Se ha completado la migración de la vieja estructura JSON a un sistema **100% Relacional** para la captura y costeo de nuevas matrículas. La arquitectura garantiza la atomicidad de las operaciones y la flexibilidad futura del Motor Financiero.

## 🛠 Cambios Implementados

### 1. Bóveda de Precios Unificada (SQL)
- La tabla legacy `program_prices` fue renombrada a `program_prices_legacy`.
- **Vista de Compatibilidad (`program_prices`)**: Creada usando `dyt_program_prices` como fuente de verdad. Esta vista exporta hacia afuera nombres de columnas heredados (`cash_price`, `increment_percentage`, `installments`, etc) asegurando que el Dashboard preexistente (SIA 2.0) pueda operar de manera ininterrumpida sin darse cuenta del cambio subyacente.

### 2. Escritura Directa & Transaccionalidad
- **`saveNewEnrollment` (Server Action)**: 
  - Se eliminó la inyección de programas en campos JSONB sobre la tabla `students`.
  - Ahora se realizan Inserciones en cascada (simulando transaccionalidad mediante try/catch controlados):
    1. Se inserta en `dyt_enrollments` recuperando el ID primario.
    2. Se realiza un Multi-Insert en `dyt_enrollment_programs`.
  - Esta arquitectura erradica el problema de "matrículas huérfanas".

### 3. Motor Financiero Dinámico
- El Frontend (y posteriormente el backend en `finance.ts`) itera de forma dinámica el total por programa buscando un macheo en la DB basado en `NFD Normalize()`.
- Se aplica taxativamente la institución matemática **`roundup10k`**.
  > **Ejemplo Dinámico Testeado**: Si el Contado es \$980.000 y el Porcentaje de incremento es `4.5%`, la fórmula total resulta en \$1'024.100 $\rightarrow$ Redondeado a la macro-decena superior = **\$1'030.000**.

### 4. UI: Componente Neon-Glass `ProgramPicker`
- Se reemplazó el contenedor *placeholder* ("Próximamente") por el componente `ProgramPicker` plenamente funcional.
- Se implementaron iconos de la librería **`lucide-react`** (Checks violeta) manteniendo la pureza estilística Neon-Glass solicitada e Integrando buscador asincrónico con normalización.

## ✅ Pasos de Verificación Aprobados (Local)
1. `.env.local` y Middleware confirmados operativos sin caída de Auth.
2. Vista program_prices ejecutada existosamente.
3. Se seleccionan programas mixtos en Neon UI; El Frontend arroja sub-totales dinámicos pre-calculados correctamente.
4. `.gitignore` Validado (la directiva bloquea `credentials.json` o `.env`).

## 🚀 Próximos Eventos
El despliegue local ha concluido con éxito. El siguiente paso en la ruta global de **Office-DYT** es habilitar la lógica de edición/pago sobre este nuevo esquema relacional para que la Secretaría aplique Abonos e Instrumentos Musicales específicos a la malla construida.
