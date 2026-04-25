# SNAPSHOT: Fotos de estudiantes sincronizadas y validadas.
# Corregido descalce de rutas entre Storage API y Componente React.

**Fecha:** 2026-04-25
**Estado:** ✅ RESUELTO

## Hallazgo Definitivo (Última Milla)

### Anatomía del Bucket `student-photos` Local

El bucket tiene **dos zonas de almacenamiento**:

| Zona | Ruta | Archivos | Descripción |
|---|---|---|---|
| **Raíz** | `/student-photos/` | `profile_*.jpg` | Fotos subidas desde el app web (ruta relativa, bug heredado) |
| **Subfolder** | `/student-photos/2026-1/` | `NOMBRE_APELLIDO_hash.jpg` | Fotos subidas desde interfaz de matrícula (ruta correcta) |

### URL Funcional de ABBY (Prueba de Fuego)
```
http://192.168.0.20:54321/storage/v1/object/public/student-photos/profile_763d0d8c-df43-45a9-ac0b-07d352c39205_1773592019115.jpg
→ HTTP 200 ✅
```

### Acciones Ejecutadas

1. **Archivos físicos subidos** vía Storage API (JWT legacy local):
   - `profile_763d0d8c...jpg` (ABBY REDONDO SABOGAL) — 40KB
   - `profile_b3e41f11...jpg` (ABIGAIL RODRIGUEZ ACUÑA) — 35KB

2. **resolvePhotoUrl()** implementado en `EnrollmentAuditCard.tsx`:
   - Detecta rutas relativas y las convierte a URLs absolutas con `NEXT_PUBLIC_SUPABASE_URL`

3. **RLS Policies** activas en Storage local:
   - `Public Access for student-photos` (SELECT, bucket_id = 'student-photos')
   - `Acceso Publico` (SELECT, bucket_id = 'student-photos')

4. **Caché `.next`** eliminado y servidor reiniciado limpiamente.

## Conclusión Arquitectónica

El Storage local es un **espejo fiel** del de producción.
El único bug pendiente es a nivel de UX: el componente de subida de fotos
debe guardar siempre la URL absoluta para evitar futuros `profile_*.jpg`
sin URL base en la base de datos.
