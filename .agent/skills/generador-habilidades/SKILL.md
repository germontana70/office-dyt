---
name: Generador de Habilidades
description: Capacidad para crear, estandarizar y documentar nuevas habilidades (skills) en español para el proyecto.
---

# 🤖 Habilidad: Generador de Habilidades (Skills)

Esta habilidad permite la creación estructurada de nuevas capacidades dentro del ecosistema `.agent/skills/`. Sigue estos estándares para asegurar la consistencia y la "Escalabilidad por Responsabilidad Segregada" (Protocolo Orchestrator-X).

## 📋 Estructura de una Skill
Cada nueva habilidad debe vivir en su propio directorio dentro de `.agent/skills/` con la siguiente estructura mínima:

```
📂 .agent/skills/[nombre-de-la-skill]/
├── SKILL.md             # (Requerido) Instrucciones y metadatos en español.
├── scripts/             # (Opcional) Scripts de automatización (Python/Bash).
├── examples/            # (Opcional) Ejemplos de uso o snippets.
└── resources/           # (Opcional) Plantillas, JSONs de configuración, etc.
```

## 📝 Estándares de Documentación (SKILL.md)
El archivo `SKILL.md` debe comenzar con un frontmatter YAML y seguir este esquema en español:

1. **Nombre**: Conciso y descriptivo.
2. **Descripción**: Propósito claro de la habilidad.
3. **Secciones de Contenido**:
   - `# 🚀 Propósito`: Por qué existe esta habilidad.
   - `# 🛠️ Instrucciones de Uso`: Cómo debe actuar la IA cuando esta habilidad esté activa.
   - `# 🏛️ Reglas Arquitectónicas`: Restricciones específicas (seguridad, modularidad).
   - `# 📦 Recursos Disponibles`: Lista de archivos en `scripts/` o `resources/`.

## 🛠️ Instrucciones para la Generación
Cuando se te pida crear una nueva habilidad:
1. **Investiga**: Entiende el dominio técnico (ej: "Integración con API de Calendario").
2. **Diseña**: Define qué procesos serán atómicos.
3. **Implementa**: Crea la carpeta y el `SKILL.md` usando la plantilla en `resources/template.md.txt`.
4. **Registra**: Asegúrate de que el usuario sea notificado de la nueva capacidad.

> [!IMPORTANT]
> Toda habilidad creada para el SIA 2.0 debe respetar la matriz de roles de Orchestrator-X. Las habilidades son conectores atómicos, no aplicaciones completas.
