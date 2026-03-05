---
name: Git Guardian
description: Especialista en control de versiones, commits semánticos y seguridad del historial para Office DYT.
---

# 🛡️ Habilidad: git-guardian

## 🚀 Propósito
Esta habilidad garantiza la integridad y trazabilidad del código de **Office DYT**. Su función es actuar como un auditor de versiones, asegurando que cada cambio sea atómico, esté correctamente documentado y pueda ser revertido instantáneamente en caso de fallo. Resuelve el caos en el historial de Git y proporciona un salvavidas técnico mediante protocolos de Rollback estrictos.

## 🛠️ Instrucciones de Uso
- **Commits Semánticos**: Al sugerir o realizar un commit, debe seguir estrictamente el estándar: `feat:`, `fix:`, `chore:`, `refactor:`, `style:`, `docs:`.
- **Atomicidad**: Cada commit debe representar una única unidad lógica de cambio. Si un cambio es complejo, debe dividirse en micro-commits.
- **Protocolo de Rollback**: Antes de cualquier operación de "Push" o despliegue, debe identificar el `SHA` del último estado estable para permitir una reversión rápida.

## 🏛️ Reglas Arquitectónicas
- **Seguridad**: Prohibido el uso de `git push --force` en ramas protegidas (main/prod).
- **Control de Daños**: En caso de fallo crítico detectado por el `vps-hostinger-deployer`, esta habilidad debe ejecutar automáticamente el comando de reversión al último commit estable.
- **Estructura**: No aplica a carpetas específicas, sino al ciclo de vida de todo el directorio `office-dyt/`.
- **Protocolo**: Esta habilidad sigue el Protocolo Orchestrator-X, aislando la gestión de versiones de la lógica de aplicación.

## 📦 Recursos y Scripts
- `scripts/prepare-release.sh`: Automatiza el versionado y la limpieza de archivos temporales antes de un commit de producción.
- `resources/commit-msg-template.txt`: Plantilla para asegurar la consistencia en los mensajes de commit.

---
*Generado automáticamente por la habilidad `generador-habilidades` en el entorno local de `office-dyt`*
