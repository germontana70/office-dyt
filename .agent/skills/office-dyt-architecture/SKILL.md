---
name: Office DYT Architecture
description: Arquitectura Next.js Premium para el ecosistema de Dones y Talentos.
---
# 🏛️ Office DYT: Arquitectura Maestría

Este Skill define las reglas de oro para la construcción de **Office DYT** utilizando **Next.js** y **Supabase**.

## 🧬 Principios Fundamentales
1. **Premium First**: Cada componente interactivo debe tener micro-animaciones y una estética visual de alto nivel.
2. **Microservicios Lógicos**: Desarrollo modular por dominios de negocio (Contextos Delimitados).
3. **Arquitectura Hexagonal**: Separación estricta entre Dominios (`core`), Infraestructura (`infra`) y Presentatación (`ui`).
4. **Professional Assets**: Organización segregada de multimedia (`/public/assets/images`, `/public/assets/videos`).
5. **Clean Code & Typings**: Cero código basura, tipado estricto y commits semánticos.

## 📁 Estructura Maestro de Microservicios
- `/public/assets/`: Imágenes y videos organizados profesionalmente.
- `/src/core/`: Dominios y Casos de Uso (Lógica de Negocio Pura).
- `/src/infra/`: Repositorios y Servicios (Conectores Supabase/Externos).
- `/src/ui/`: Components (Atomic/Modules), Layouts y Estilos Premium.
- `/src/app/`: Enrutamiento y puntos de entrada de Next.js.

## 🛡️ Protocolo de Seguridad
- Validar siempre la sesión con Middleware de Next.js.
- Utilizar `Server Actions` para mutaciones de datos pesadas.
- Sincronización en tiempo real vía Suscripciones de Supabase.

> **"Construyendo el futuro de Dones y Talentos sobre cimientos sólidos de Next.js."**
