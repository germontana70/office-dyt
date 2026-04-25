# SNAPSHOT: Context Update (2026-04-25 FINAL)

**Hito Alcanzado:** Migración exitosa de Supabase Cloud a Local con autonomía total.

## Lógica Financiera
Implementación de `getSanitizedProgramName()` para resolver el vacío de precios en grupos operativos. El motor financiero ahora normaliza los nombres de programas eliminando sufijos numéricos, garantizando el enlace exacto con la bóveda de precios (`dyt_program_prices`).

## Solución de Imagen (Renderizado y Storage)
- **Bypass de Caché:** Inyección de `unoptimized={true}` en el componente `<Image>` en `EnrollmentAuditCard.tsx`. Esto fuerza al navegador a consumir la imagen directamente del contenedor local de Docker de Supabase, evadiendo fallos de proxy y caché (timeout/404) del servidor Node.js.
- **Parche de Rutas Dinámicas:** Refactorización de `resolvePhotoUrl()` para que intercepte URLs relativas y absolutas por igual, forzando la base activa (`http://192.168.0.20:54321`) e inyectando la carpeta obligatoria del semestre (e.g. `2026-1/`).

## Riesgos y Cuidados
Se debe mantener la estructura física de carpetas `/2026-1/` en el volumen de Docker para futuras sincronizaciones o nuevas migraciones. Cualquier imagen huérfana descargada de la nube deberá ubicarse siempre dentro de la subcarpeta del semestre correspondiente para no romper el DNA de Producción.
