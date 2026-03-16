# SNAPSHOT_CONTEXT_UPDATE_MATRICULAS_UI

## Resumen de la Refactorización
Se ha ejecutado una limpieza estética profunda en el módulo de Matrículas para eliminar fragmentos de la UI que no cumplían con el estándar translúcido de Office DYT.

## Cambios Realizados
1. **Estandarización Glass**:
   - Tarjetas de "Reintegrar" y "Retirar" ahora usan la utilidad `.glass-panel`.
   - El módulo de estadísticas (`EnrollmentStats`) fue purgado de fondos blancos y sombras sólidas.
2. **Refactorización de Inputs**:
   - El buscador de estudiantes ya no presenta el fondo blanco regresivo.
   - Nuevo diseño: `bg-white/5` con `backdrop-blur-md` y bordes sutiles `border-white/10`.
   - Placeholder ajustado a `text-gray-500` para legibilidad en modo oscuro.
3. **Manejo de Estados Vacíos**:
   - El contenedor "No hay registros..." ahora utiliza un fondo oscuro profundo `#0a0a0a`, manteniendo el borde punteado sutil.

## Reglas de Diseño Reforzadas
- **Inputs en Modo Oscuro**: Nunca usar blanco sólido (`bg-white`). Preferir `bg-white/5` o `bg-transparent`.
- **Contenedores de Tarjetas**: Usar siempre `.glass-panel` para heredar la lógica de `bg-black/60` y `backdrop-blur-2xl`.
- **Sombras**: Evitar sombras negras sólidas; heredar las sombras HSL del sistema primaria/accent.

## Continuidad Técnica
Este cambio es puramente visual y no altera los Server Actions de migración ni las consultas a Supabase.
