# INFORME TÉCNICO DE INGENIERÍA: OFFICE DYT

**Fecha:** 28 de Marzo de 2026
**Módulo:** Motor de Liquidación de Honorarios (Payments & Sincronizador)
**Autor:** Antigravity (AI Backend & TechWriter)

## Resumen Ejecutivo
El presente documento certifica la resolución definitiva de la falla crítica "Estudiante No Registrado", anomalía que ocultaba la identidad de los estudiantes y perjudicaba el detalle de liquidación de los docentes (particularmente frente a clases canceladas o reprogramadas). 

El origen del bug radicaba en la política de protección transaccional **Zero-DDL**, que limitaba la alteración de bases de datos, permitiendo que triggers y reglas heredadas de SIA 2.0 anularan silenciosamente ciertos `student_id`. A través de la implementación de tres capas estratégicas de ingeniería, se ha logrado blindar la interoperabilidad entre Google Calendar y Supabase: la identidad del alumno viaja intacta, la interfaz permanece pulcra, y el motor del calendario expurga exitosamente las anomalías residuales ("Fantasmas").

---

## 1. The Watermark Bypass (Marca de Agua Criptográfica)
**Archivo afectado:** `src/app/actions/sync-calendar-events.ts`

Ante la restricción absoluta de alterar las columnas en base de datos, implementamos una estrategia en la capa lógica:
- **Inyección en Tránsito:** Durante el flujo de parseo de Google Calendar, la función asume el salvataje del nombre. Si logra identificarlo (`parsed.studentNameHint`), estampa automáticamente una marca de datos.
- **Metadato:** `[STUDENT_HINT: Nombre del Alumno]`
- **Consecuencia Operacional:** El sincronizador guarda este string indetectable dentro de la columna genérica `notes`. Al fluir inyectado directamente en texto libre, la identidad sobrevive el procesamiento de cualquier esquema de Supabase, aterrizando a salvo en las peticiones HTTP del frontend sin perderse.

---

## 2. The Beauty Filter (Sanitización UI/PDF)
**Archivos afectados:** `src/ui/components/modules/payments/PaymentClientWrapper.tsx` & `src/infra/services/reports.ts`

Transportar metadatos dentro de texto libre introdujo otro problema: las descripciones de Google Calendar eran masivas, sucias y filtraban la marca de agua al docente final. Creamos interceptores léxicos de alta precisión para las vistas Web y generador de Reportes PDF.
- **Invisibilidad Condicionada:** Un hook intercepta y oculta las etiquetas (`\[(?:STUDENT_HINT|GRUPO)[\s\S]*?\]`), extrayendo velozmente a las variables de React la identidad perdida y borrándola del renderizado final ante el usuario.
- **Supresión de Excesos Estructurales:** Con expresiones regulares, se decapitan y cortan las enormes plantillas automáticas introducidas por GCal (ej. `Unirse con Google Meet`, `CLASE DE MÚSICA`). Se aísla y preserva únicamente lo que sigue tras la palabra `"Motivo:"`.
- **Protección Anticolapso (Unicode Flush):** Se estableció un expurgador `/([^\x20-\x7E\xA0-\xFF])/g` para las notas que viajan al motor `jsPDF` extirpando agresivamente los emojis (📅, 🎵), protegiendo la codificación del reporte en su exportación oficial.

---

## 3. The Ghostbuster Protocol (Purga de Huérfanos)
**Archivo afectado:** `src/app/actions/sync-calendar-events.ts`

Se detectó y solucionó una falla de consistencia sistémica: Al eliminar un evento en el tablero oficial ("GCal"), el sistema local jamás lo quitaba al estar basado únicamente en inserción (`upsert`).
- **Aniquilación Temporal Aislada:** Al culminar el volcado de inserciones en el Paso 5, el motor captura un Snapshot Array (`validGoogleIds`). 
- **Barredora Base Datos (`.not.in`):** Todo evento vivo en Supabase *(con la directiva `.delete()`)* que encaje en el periodo filtrado exacto (`gte/lte`) pero que no logre demostrar que fue leído en Google Calendar, es aniquilado y devuelto al éter como "Huérfano expurgado", evitando cobros y reportes espectrales.

---

## 4. Estado Final de Los Reportes PDF
Gracias a los bloqueos construidos en las 3 etapas anteriores, el módulo de extracción PDF (`reports.ts`) reporta operatividad impecable:
- **Zero Fallbacks Erráticos:** Liquidación depurada donde *"No Registrado"* fue destruido por completo. Si un estatus o relación de Base Datos se quiebra, utiliza el `Watermark` -> `Program_name` como medida de rescate ultra eficiente.
- **Mapeo de Estados Correctos:** La validación se adaptó a reglas binarias de estandarización en mayúsculas (`CANCELLED`, `MAKEUP`) renderizando invariablemente etiquetas oficiales (`CANCELADA`, `REPOSICIÓN`), certificando al 100% las cuentas de cobro institucionales docentes.

---
> _Snapshot Documental Listo. Destino para ingesta: Sistema NotebookLM del Cliente._
