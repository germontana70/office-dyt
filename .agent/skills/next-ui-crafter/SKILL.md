---
name: Next UI Crafter
description: Artífice de interfaces premium con estética de autor para Office DYT.
---

# 🎨 Habilidad: next-ui-crafter

## 🚀 Propósito
Esta habilidad es el corazón estético de **Office DYT**. Su misión es transformar componentes funcionales en experiencias visuales de lujo, elevando la percepción de la marca "Dones y Talentos". Se especializa en el diseño de interfaces modernas basadas en el "Wow factor", utilizando técnicas avanzadas de Glassmorphism, sistemas de color dinámicos HSL y micro-animaciones fluidas que proporcionan feedback instantáneo y placentero al usuario.

## 🛠️ Instrucciones de Uso
- **Diseño de Autor**: Al crear componentes, debe evitar estilos genéricos. Debe aplicar gradientes radiales, sombras suaves (drop-shadows) y bordes translúcidos.
- **Micro-interacciones**: Todo elemento clicable o interactivo debe poseer transiciones suaves (ease-in-out) y efectos de hover que inviten a la interacción.
- **Jerarquía Visual**: Utilizar tipografías modernas (ej: Outfit o Inter) y espaciados generosos para mantener una interfaz limpia y profesional.

## 🏛️ Reglas Arquitectónicas
- **Estética Premium**: Implementación obligatoria de:
    - **Glassmorphism**: Fondos con `backdrop-filter: blur()` y bordes con opacidad reducida.
    - **HSL System**: Uso exclusivo de variables HSL para facilitar el modo oscuro y la consistencia tonal.
    - **Animaciones**: Priorizar CSS transitions y animaciones nativas para máxima performance.
- **Estructura**: Los estilos globales residen en `office-dyt/src/ui/styles/` y los módulos por componente en `office-dyt/src/ui/components/modules/`.
- **Protocolo**: Esta habilidad sigue el Protocolo Orchestrator-X, aislando la capa de presentación de la lógica de negocio.

## 📦 Recursos y Scripts
- `scripts/generate-theme-tokens.py`: Genera la paleta de colores HSL y variables CSS basadas en el branding de Dones y Talentos.
- `resources/ui-kit-tokens.json`: Repositorio de sombras, radios de borde y constantes de animación premium.

---
*Generado automáticamente por la habilidad `generador-habilidades` en el entorno local de `office-dyt`*
