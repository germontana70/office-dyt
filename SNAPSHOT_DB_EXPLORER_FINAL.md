# SNAPSHOT: Global DB Explorer (Panóptico Global)

**Fecha:** 2026-03-24
**Estado:** Operativo / Auditado
**Rol Responsable:** @FullStackArchitect

## 👁️ Resumen del Componente
Se ha construido una herramienta de inspección de datos crudos (RAW) dentro del módulo de Auditoría para permitir la observancia técnica sin riesgo de escritura.

## 🛡️ Medidas de Seguridad
- **Whitelist Estricta:** El Server Action solo permite consultas a tablas pre-aprobadas:
  - `students`, `Tabla_Verdad_Estudiantes`, `form_responses`
  - `dyt_enrollments`, `dyt_enrollment_programs`, `dyt_payment_plans`, `dyt_transactions`
  - `dyt_global_settings`, `dyt_program_prices`
- **Solo Lectura:** Implementado mediante `supabase.from().select('*')` sin handlers de mutación.

## 🏗️ Innovaciones Técnicas
- **Grid-Hack Anti-Colapso:** Envoltorio `grid-cols-1` con `overflow-x-auto` para manejar tablas con decenas de columnas sin romper el layout Flexbox del dashboard.
- **Selector de Columnas Condicional:** Sistema de pre-renderizado que detecta si una tabla tiene >8 columnas y solicita al usuario seleccionar las columnas de interés para optimizar el DOM.
- **Sticky Header Excel-Style:** Encabezado con `sticky top-0` y fondo sólido `#0a0a0a` para navegación fluida en datasets grandes.
- **Fail-Loud UI:** Los errores de Supabase (ej. `PGRST205` - Missing Table) se inyectan directamente en la UI en rojo neón para diagnóstico inmediato.

## 🐛 Bugfix Aplicado (Parche Táctico)
- **Problema:** Los checkboxes del selector de columnas estaban desconectados del estado (Set) de React.
- **Solución:** Corrección del binding en `DBExplorerClient.tsx`, implementando `handleToggleColumn` y vinculando el evento `onChange` de un `input` oculto para garantizar reactividad total.

## ⚠️ Hallazgo Crítico
Durante la auditoría se detectó que la tabla `dyt_program_prices` reporta error de "No encontrada", lo que valida la necesidad de la Fase 1 del Plan de Independencia.
