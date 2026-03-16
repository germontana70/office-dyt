# SNAPSHOT_CONTEXT_UPDATE_UI_FIX

## Resumen de la Corrección
Se ha ejecutado una restauración estética crítica en el Dashboard de Office DYT para corregir una regresión visual que introdujo fondos grises sólidos (`zinc`, `gray`, `slate`) en componentes clave.

## Cambios Realizados
1. **Recalibración de `.glass-panel`**: En `globals.css`, se eliminaron las clases `bg-white/70`, `border-slate-200` y el selector `dark:bg-black/60`. Ahora la clase es universalmente translúcida con `bg-black/60` y `backdrop-blur-2xl`.
2. **Purga de Componentes**:
   - `SyncEngineButton.tsx`: Eliminado `bg-white/80` y bordes de color cian opacos.
   - `MigrationCard.tsx`: Eliminado `bg-red-50/80` y bordes rojos opacos.
3. **Estandarización**: Todos los contenedores de tarjetas ahora utilizan exclusivamente `bg-black/60` con `backdrop-blur-md` (o superior) y `border-white/10`.

## Lógica Reforzada (ADN Office DYT)
- **PROHIBIDO**: Grises sólidos en el Dashboard. Rompen la profundidad y la estética Neon-Glass.
- **ESTÁNDAR**: Usar siempre la utilidad `.glass-panel`.
- **TOKENS HSL**: Mantener coherencia con `--primary` y `--accent` para sombras y resplandores.

## Riesgos y Cuidados
Los desarrolladores deben verificar siempre el renderizado en un entorno con fondos radiales complejos, ya que la transparencia de las tarjetas depende de la visibilidad de los gradientes del `body`.
