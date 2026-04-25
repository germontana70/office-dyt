# Auditoría de Verdad: Reporte de Cableado Producción vs Local

**Fecha de Auditoría:** 25 de Abril de 2026
**Entorno de Verdad:** Supabase Cloud (`jhduncasbfiikrtxirun.supabase.co`)

---

## 1. Relación Matrícula-Bóveda (El Misterio de los Huérfanos)

He introspeccionado los esquemas de Producción para las tablas `dyt_enrollment_programs`, `dyt_program_prices` y `dyt_group_classes`.

**Hallazgo Crítico:** 
No existe **ningún campo de mapeo físico** (como `master_program_id` o `slug_contrato`) en el entorno de la Nube que vincule "DANZAS 01" con "SEMESTRE DE DANZA" en la bóveda de precios. 
La tabla `dyt_group_classes` simplemente guarda el nombre con el sufijo (ej. "DANZAS 01") y este se inyecta directamente en la tabla de matrículas (`dyt_enrollment_programs.program_name`).

*Por qué fallaba en Local (y falla en Nube también):*
El diseño actual de la Base de Datos asume que cada Grupo (ej. "DANZAS 01") debería tener una entrada explícita en `dyt_program_prices`, o confía en que el Frontend aplique una limpieza de strings (`.replace(/\s\d+$/, '')`) antes de calcular el precio, pero a nivel SQL estricto, son entidades desconectadas. **No falta ningún constraint en local**, el problema es un vacío arquitectónico heredado de producción.

## 2. Storage DNA (Estructura de las Fotos)

He extraído el árbol de directorios del Bucket `student-photos` directamente de la Nube. La ruta absoluta sigue este patrón estructural:

\`\`\`
https://[PROYECTO].supabase.co/storage/v1/object/public/student-photos/[SEMESTRE]/[NOMBRES_APELLIDOS]_[HASH_ID].jpg
\`\`\`

**Ejemplo Real:**
`student-photos/2026-1/NOEMI_SUAREZ_SUAREZ_LENIS_8ee117e81c2f48b3b03d0c847576e21f.jpg`

*Morfología de la ruta:*
1. Carpeta raíz agrupada por semestre: `/2026-1/`
2. Nombre del estudiante normalizado y unido por guiones bajos.
3. Un hash hexadecimal o UUID sin guiones adjunto al final para prevenir colisiones.

*(Nota: En producción también se confirmó la presencia del bug de la ruta relativa `profile_...jpg` para al menos un registro, lo cual corrobora que el error de ABBY es una falla de guardado del cliente web y no un problema de sincronización).*

## 3. Gap Analysis (Diferencias Cloud vs Local)

Tras cruzar los constraints y el `information_schema` de ambos ecosistemas:

| Componente | Estado en Nube | Estado en Local | Veredicto |
| :--- | :--- | :--- | :--- |
| **Tablas Generales** | 36 Tablas | 36 Tablas | 🟢 Sincronizado |
| **Foreign Keys `dyt_enrollment_programs`** | `enrollment_id`, `group_class_id`, `instrument_id` | Idéntico | 🟢 Sincronizado |
| **Bóveda de Precios (`dyt_program_prices`)** | Sin llave foránea hacia programas master | Idéntico | 🟡 Mismo vacío arquitectónico |
| **Storage Bucket** | `student-photos` (Público) | Creado manualmente en Fase 3 | 🟢 Resuelto |
| **Sincronización de Encoding** | Errores heredados de exportación CSV/SQL (`├í`, `├▒`) | Saneamiento SQL ejecutado en `teachers` y `dyt_group_classes` | 🟢 Exitosa (Fase 2) |

### Conclusión y Plan de Acción
El entorno local (192.168.0.20) es ahora mismo **un clon perfecto a nivel de esquema SQL** de Producción. Las fallas financieras y de fotos que detectamos en el sistema local no eran un problema de mala migración, sino **bugs de lógica de negocio que ya existen en producción** (Deuda Técnica heredada).

Para que el sistema sea 100% resiliente, el verdadero parche debe hacerse a nivel de TypeScript en Next.js:
1. Crear una función sanitizadora que remueva los sufijos numéricos de grupo (`"DANZAS 01" -> "Danzas"`) antes de consultar la bóveda.
2. Forzar que el componente de Subida de Fotos retorne siempre la `URL Absoluta` resolviendo contra la variable de entorno activa, previniendo el error de la ruta relativa.
