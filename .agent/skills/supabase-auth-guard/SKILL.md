---
name: Supabase Auth Guard
description: Especialista en seguridad, autenticación y protección de rutas para Office DYT.
---

# 🛡️ Habilidad: supabase-auth-guard

## 🚀 Propósito
Esta habilidad es el escudo de seguridad de **Office DYT**. Su función es gestionar de forma centralizada y segura todo el ciclo de vida de la autenticación de usuarios utilizando **Supabase Auth**. Resuelve la protección de rutas privadas mediante Middleware de Next.js y garantiza que los secretos de conexión se manejen bajo el principio de "mínimo privilegio" en el entorno del VPS.

## 🛠️ Instrucciones de Uso
- **Protección de Rutas**: Al detectar una nueva ruta en `app/`, esta habilidad debe verificar si requiere sesión y actualizar el `middleware.ts` si es necesario.
- **Lógica de Autenticación**: Toda función de Login, Logout o recuperación debe implementarse en `src/infra/services/auth.ts` utilizando `@supabase/ssr`.
- **Validación de Sesión**: Debe priorizar la validación del lado del servidor (Server Components) para evitar "flashes" de contenido no autorizado.

## 🏛️ Reglas Arquitectónicas
- **Seguridad**: Prohibido hardcodear llaves de API. Debe leer `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` de `.env.local`. Las credenciales administrativas (Service Role) NUNCA deben exponerse al cliente.
- **Estructura**: El código de infraestructura de este agente reside en `office-dyt/src/infra/services/auth.ts` y el protector de rutas en `office-dyt/src/middleware.ts`.
- **Protocolo**: Esta habilidad sigue el Protocolo Orchestrator-X, operando de forma aislada para el dominio de seguridad de office-dyt.

## 📦 Recursos y Scripts
- `scripts/check-auth-health.py`: Verifica la conectividad con Supabase Auth y la validez de las variables de entorno actuales.
- `resources/auth-flows.json`: Mapa lógico de redirecciones (p. ej: `/auth` -> `/dashboard` si hay sesión).

---
*Generado automáticamente por la habilidad `generador-habilidades` en el entorno local de `office-dyt`*
