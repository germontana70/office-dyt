# SNAPSHOT: Re-ubicación de fotos en subcarpeta /2026-1/ completada. Alineación total con el DNA de Producción.

**Fecha:** 2026-04-25
**Estado:** ✅ RESUELTO Y ALINEADO

## Operaciones Ejecutadas

1. **Re-ubicación de Archivos:** Las fotos relativas que antes se cargaban a la raíz de `student-photos` (como la de ABBY) ahora fueron subidas exitosamente a la subcarpeta `2026-1/` usando la Storage API, logrando alineación total con la estructura (DNA) que usa producción.
2. **Corrección de Código (`EnrollmentAuditCard.tsx`):**
   - La función `resolvePhotoUrl` fue ajustada para aceptar un argumento opcional `semester`.
   - Ante la presencia de una foto con ruta relativa, automáticamente construye la URL inyectando el semestre (ej. `2026-1/`) para coincidir con la ubicación real en Storage.
3. **Validación RLS:** Confirmada la existencia de políticas de lectura que otorgan acceso público (SELECT) en el bucket local para `student-photos`.
4. **Limpieza y Reinicio:** Se vació la carpeta caché `.next` y se reinició el servidor de Next.js. Las rutas de imágenes se regeneraron desde cero.

### URL Final de Verificación
`http://192.168.0.20:54321/storage/v1/object/public/student-photos/2026-1/profile_763d0d8c-df43-45a9-ac0b-07d352c39205_1773592019115.jpg` responde un **HTTP 200**.

Todo el ecosistema de fotos de perfil opera ahora bajo reglas idénticas entre Desarrollo (Local) y Nube.
