---
name: db-data-mapper
description: Arquitecto de datos, mapeo de tablas existentes y tipado estricto para Office DYT.
---

# 🗄️ Habilidad: db-data-mapper

## 🚀 Propósito
Esta habilidad actúa como el puente de datos inteligente entre las tablas heredadas de Supabase (procedentes del ecosistema original en Python) y la nueva arquitectura en Next.js. Su misión es garantizar que la información fluya de manera segura, estructurada y con tipado estricto hacia el frontend de **Office DYT**, respetando en todo momento la integridad y las políticas de acceso del motor PostgreSQL.

## 🛠️ Instrucciones de Uso
- **Mapeo Existente**: Al interactuar con la base de datos, debe identificar y reutilizar las tablas actuales (ej: `students`, `professors`, `payments`). No debe sugerir migraciones destructivas.
- **Tipado TypeScript**: Generar y mantener interfaces/tipos que reflejen exactamente el esquema de la base de datos en `src/infra/types/database.ts`.
- **Respeto a RLS**: Toda consulta generada debe diseñarse para funcionar bajo **Row Level Security** (RLS), utilizando el cliente de Supabase con la sesión del usuario autenticado.

## 🏛️ Reglas Arquitectónicas
- **Integridad**: Prohibido el uso de la `Service Role Key` en el cliente. Solo se permiten operaciones permitidas por las políticas RLS actuales o mediante RPCs seguros.
- **Tipado Estricto**: Cero uso de `any`. Cada respuesta de la base de datos debe ser validada o tipada explícitamente.
- **Estructura**: La lógica de acceso a datos reside en `office-dyt/src/infra/repositories/` y los tipos en `office-dyt/src/infra/types/`.
- **Protocolo**: Esta habilidad sigue el Protocolo Orchestrator-X, asegurando que el dominio de datos sea independiente de la lógica de UI.

## 📦 Recursos y Scripts
- `scripts/sync-supabase-types.sh`: Script para ejecutar la generación automática de tipos desde la CLI de Supabase.
- `resources/table-mappings.json`: Catálogo descriptivo de las tablas existentes y sus relaciones para facilitar el descubrimiento de datos.

---
*Generado automáticamente por la habilidad `generador-habilidades` en el entorno local de `office-dyt`*
