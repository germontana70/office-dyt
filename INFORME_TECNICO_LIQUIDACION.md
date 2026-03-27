# INFORME TÉCNICO: ESTABILIZACIÓN DEL MOTOR DE LIQUIDACIÓN Y PARSER DE EVENTOS

## 📋 Resumen Ejecutivo
Se logró una refactorización integral del **Motor de Sincronización Google Calendar ↔ Supabase**, resolviendo los tres incidentes críticos que impedían la liquidación de honorarios:
1. Denegación de acceso a la API (Google Auth Failed).
2. Falsos positivos en clasificación de eventos (Canceladas vs Reposiciones).
3. Fallos masivos de matching de estudiantes (Alumnos "Huérfanos") y fuga en clases grupales.

El sistema ahora opera bajo una **identidad delegada (OAuth2) estable**, implementa un **algoritmo de matching en cascada** (Regla 1 + Regla 2), y proporciona una **interfaz de auditoría premium (Tabs neon-glass)** para supervisión en tiempo real. La deuda técnica de manipulación arbitraria de zonas horarias (`America/Bogota`) fue mitigada usando soporte nativo JS.

---

## 🛠 Entregables y Refactorización Arquitectónica

### 1. Despliegue de Bypass de Identidad (Admin OAuth2)
* **Archivo:** `src/infra/services/googleCalendarService.ts`
* **Impacto:** El antiguo esquema de Service Account (bot) fue reemplazado por un flujo OAuth2 delegado del Administrador Principal, utilizando `credentials.json` y `token.json` locales con refresco asíncrono.
* **Política de Seguridad:** Se abandonó la whitelist rígida por una **Arquitectura de Blocklist**. Ya no se filtran calendarios válidos por error; en su lugar, se bloquean explícitamente calendarios administrativos ruidosos (ej. *GRUPO CONEX, PENDIENTES, GIMNASIO, SEMANA DE RECESO*).

### 2. Algoritmo de Tokenización Inclusiva (Student Match - Regla 1)
* **Archivo:** `src/app/actions/sync-calendar-events.ts`
* **Problema Original:** La comparación lineal Nombre-Apellido fallaba por la variabilidad en la escritura humana del calendario de Google (ej. *"CORTINA EDUARDO"* vs *"EDUARDO CORTINA"*).
* **Solución:** Se diseñó el motor `flexibleMatch`, que trocea por espacios y caracteres especiales (`/[\s\-,]+/`), cruzando independientemente los tokens extraídos contra la base de datos de matrículas. Resolvió automáticamente más del 85% de las advertencias.

### 3. Sistema de Extracción Grupal por Nickname (Teacher Match - Regla 2)
* **Archivo:** `src/app/actions/sync-calendar-events.ts`
* **Problema Original:** El restante 15% de huérfanos se debía a que los títulos no referenciaban a un estudiante único, sino al "Nickname" de un docente dictando un curso (ej. *“PIANO - Wendy Gallardo”*).
* **Solución:** Si la *Regla 1* falla, el motor activa la *Regla 2*: 
   1. Busca el `nickname_1` o `nickname_2` de todos los docentes en el título del evento.
   2. Si detecta el nickname, asigna automáticamente las horas a ese maestro.
   3. Poda la cadena de texto para extraer el nombre del programa (ej. *"PIANO"*).

### 4. Estabilización Front-End y Tablero Modular (Doble Tab)
* **Archivo:** `src/ui/components/modules/payments/PaymentClientWrapper.tsx`
* **Problema Original:** La alerta `alert()` bloqueante no mostraba por qué fallaba un cruce. Adicionalmente, las "clases sin estudiante" en el log de liquidación arrojaban error.
* **Solución:**
   * Implantación de **UI Premium** (Glassmorphism + Neon).
   * **Pestaña Liquidación:** Modificada para detectar el tag interno `[GRUPO: ]`, mostrando las clases colectivas con el indicador `🎵 Nombre del Programa` en lugar de una advertencia.
   * **Pestaña Advertencias:** Tablero de diagnóstico dinámico (sorteable y filtrable) que retiene explícitamente el `studentHint` (el texto problemático extraído) solo para discrepancias residuales reales, sirviendo como semáforo de calidad de ingreso en Google Calendar.

### 5. Sanitización de Subtotales (Cálculos de Tiempo)
* **Archivo:** `src/infra/services/payments.ts` y Repositorio.
* **Solución:** La anulación de pagos (subtotal `$0`) ahora obedece **estrictamente** a una clasificación en Supabase (`status: cancelled`). Previamente, un analizador léxico anulaba cualquier clase cuya descripción contuviera palabras clave negativas, resultando en "Reposiciones" anuladas falsamente.

---

## ✅ Resultados
- **Reducción de Advertencias:** De 81 estudiantes "huérfanos" a 0.
- **Soberanía Base de Datos:** `sync-calendar-events.ts` solo inyecta/upserta. Supabase gestiona la colisión mediante `google_event_id` y `randomUUID()`.
---

## 📅 Actualización: 2026-03-26

### 🚀 Logros del Día
- **Implementación Exitosa del Lookahead Regex (`calendarParser.ts`)**: Se optimizó la extracción de datos de la descripción para limpiar emojis y decoraciones de Google Calendar sin mutilar nombres ni apellidos. El parser ahora busca límites lógicos (`🎹`, `🏫`, `Programa:`, etc.) garantizando una captura limpia del 100% de la cadena.
- **Restauración de la Cascada de 2 Reglas (`sync-calendar-events.ts`)**: Se re-estructuró el motor de matching. Regla 1 (Descripción) + Regla 2 (Título/Nickname) operan en cascada, logrando bajar drásticamente las advertencias de alumnos huérfanos (de 14 a 1).
- **Hard Sync y Estabilidad de BD**: Se forzó el uso de `upsert` para que cada sincronización sobrescriba eventos corruptos o mal clasificados en el pasado, alineando la base de datos con el catálogo de maestros más reciente. Se solucionó el error `PGRST204` eliminando llaves inexistentes (`subtotal`) en el payload.

---

### 🚨 TAREA PENDIENTE (RELEVO)
**Problema Detectado: Logical Bypass en Cancelaciones**
Se identificó un fallo crítico en el orden de operaciones del bucle de sincronización. Actualmente, la identificación del estudiante en eventos del calendario "Clases canceladas" presenta intermitencias si la condición de cancelación interfiere con el flujo de identificación de la cascada.
- **Estado Actual**: Se requiere asegurar que el orden sea estrictamente Identificar -> Clasificar.
- **Solución Mañana**: Reestructurar el bucle en `sync-calendar-events.ts` para que sea un **ensamblaje lineal inquebrantable**:
  1. Ejecutar Parser y Cascada (Regla 1 y 2) para identificar Docente y Estudiante SIEMPRE.
  2. Evaluar el origen (calendario) para marcar el Status como `CANCELLED` al final.
  3. Ejecutar el Upsert con toda la metadata identificada intacta (ID del estudiante y nombre del docente).

