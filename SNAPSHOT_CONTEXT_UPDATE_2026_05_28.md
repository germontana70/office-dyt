# SNAPSHOT_CONTEXT_UPDATE_2026_05_28

## Resumen de la Corrección (Calendar Sync Fix)
Se resolvió un fallo crítico en el motor de sincronización de Google Calendar que impedía la reconciliación de clases y pagos debido a un error de autenticación (`ENOENT: no such file or directory, open '...\google-credentials\credentials.json'`).

### Causa Raíz
El módulo `googleCalendarService.ts` utilizaba un mecanismo de autenticación **OAuth2 delegado (Admin Bypass)** que dependía de archivos locales estáticos (`credentials.json` y `token.json` generados manualmente) que no se encontraban en el entorno actual.

### Refactorización Arquitectónica
- **Unificación de Identidad**: Se migró el servicio `GoogleCalendarService.getAuthClient()` para utilizar la **Service Account Robot** (`credenciales/credenciales_robot.json`), alineando su arquitectura con el resto de los conectores de Google del proyecto (`drive.ts`, `muestras.ts`, `audit-legacy-payments.ts`).
- **Eliminación de Deuda Técnica**: Se removió el flujo OAuth2 manual (script `generate-token.js` y escuchas de refresco de tokens `tokens.refresh_token`).
- **Estabilidad**: El sistema ahora se autentica silenciosamente usando `google.auth.GoogleAuth` y los scopes `calendar.readonly` / `calendar.events`.

### Archivos Modificados
- `src/infra/services/googleCalendarService.ts`

### Prerrequisitos de Infraestructura
Al utilizar el Robot (`dyt-drive-robot@office-dyt.iam.gserviceaccount.com`), **cada calendario a sincronizar debe estar explícitamente compartido con este correo** otorgando permisos de visualización.

## Estado de Estabilidad
El módulo de "Liquidación Docentes" vuelve a estar 100% operativo, recuperando el flujo de matching en cascada (Regla 1 y Regla 2) que había sido estabilizado en el reporte `INFORME_TECNICO_LIQUIDACION.md`.
