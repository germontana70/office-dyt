# SNAPSHOT_CONTEXT_UPDATE_FINANCE_LOOKUP

## Resolución del "Lookup Fallido" (Payment Plan Initialization)
Se documenta la corrección crítica para evitar el error de "PLAN DE PAGOS PENDIENTE DE INICIALIZACIÓN (LOOKUP FALLIDO)" que causaba que la auditoría financiera iniciara con un `base_amount` de 0 y marcara el plan en estado pendiente de revisión manual (`needs_audit = true`).

## 1. Normalización NFD Absoluta de Strings
El punto de falla residía en el cruce de cadenas entre los nombres de los programas almacenados en la matrícula (`dyt_enrollment_programs`) y el catálogo de precios.

Para garantizar cruces exitosos a pesar de tildes o múltiples espacios invisibles, SE DEBE usar esta función en todos los flujos de lookups:
```typescript
const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
```

## 2. Estrategia de Búsqueda de Precios (Dual-Source)
Como el catálogo actual puede estar transicionando de la arquitectura legacy a la estructura `dyt`, la consulta de precios durante la inicialización debe ser resiliente:
- **Intento 1**: Consultar en `dyt_program_prices`.
- **Intento 2 (Fallback)**: Si no hay resultados, consultar en `program_prices` (legacy).
- En ambos casos es mandatorio usar la restricción estricta de aislamiento `eq('semester', enrollment.semester)`.

## 3. Formato Financiado y Redondeo Estricto
Al cruzar los precios exitosamente, el plan se inicializa tomando en cuenta el precio `cash` (contado). Adicionalmente, se consolida la función y regla estética e innegociable institucional:
- **Fórmula**: `const roundup10k = (val: number) => Math.ceil(val / 10000) * 10000;`
- **Explicación**: Todo financiamiento se redondea "siempre hacia arriba a la decena de mil más cercana".

La aplicación estricta de esta normalización previene la generación de perfiles financieros fantasmas (Sueldo base en $0 por cruces fallidos de tildes como `SEMESTRE PERSONALIZADO` vs `Semestre Personalizado`).
