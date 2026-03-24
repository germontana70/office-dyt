# SNAPSHOT: Fase 1 - Desacoplamiento de Precios y Hotfix (Pricing Decoupled)

**Fecha de Ejecución:** 2026-03-24
**Plan Estratégico:** Independencia de SIA 2.0 (Fase 1)
**Rol:** @BackendArchitect

## 🛠️ Resumen de Acciones
Se ha completado satisfactoriamente la Fase 1: migración y desacoplamiento de la base de datos financiera, confirmada por el éxito operacional en el Panóptico Global.

### 1. Recableado Táctico de Next.js (Zero Debt)
Se barrieron exhaustivamente los archivos y se eliminaron los fallbacks (Dual-Source) a la tabla heredada `program_prices`.
* **`src/app/actions/finance.ts`:**
  - `initializePaymentPlan`: Apunta EXCLUSIVAMENTE a `dyt_program_prices` filtrando a nivel Query.
  - La normalización `NFD` del algoritmo de emparejamiento (matching) de nombres de programa se ha mantenido nativa sin alteraciones.
* **`src/app/actions/settings.ts`:**
  - `getProgramPricesBySemester`: El bloque `try/catch` que iteraba sobre a tabla vieja fue erradicado. La consulta ahora lleva anclado obligatoriamente `.eq('semester', '2026-1')`.
* **`src/app/actions/pricing.ts`:**
  - `updatePricingVault`: El Server Action que escribe y calcula iteraciones inversas de valores ahora apunta la mutación de registro directo a la Bóveda DYT.

### 2. Hotfix: React State en Panóptico Global
- **Problema Detectado:** Al mutar de tabla en el Dropdown del `DBExplorerClient.tsx`, los checkboxes se desvinculaban o congelaban.
- **Resolución Técnica:** Se alteró el event-listener de React (el `useEffect` que carga la data base) implementando un condicional lógico `keys.join(',') !== allColumns.join(',')`. Esto asegura que al renderizar un nuevo set de datos, el framework resetea el array dinámico de las primeras 8 llaves.

## 🔒 Auditoría de Seguridad Final
No existe rastro de `program_prices` ejecutándose en ningún origen de lectura ni escritura (`grep` audit ejecutado). Todo el flujo de entrada de ingresos a nivel de matrícula es 100% derivado de la nueva matriz inyectada en `dyt_program_prices`.
