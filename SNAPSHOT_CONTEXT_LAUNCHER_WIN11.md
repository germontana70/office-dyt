# SNAPSHOT: Office DYT Launcher & Setup (Windows 11)

**Fecha:** 2026-03-18 | **Sesión:** Dev-Ops & Automation

---

## 🏗️ Objetivo Logrado

Se ha automatizado el flujo de arranque del proyecto mediante un script de consola `.bat` con estética **Neon-Glass** (Cyan/Violeta), validación de variables de entorno y gestión inteligente de dependencias.

---

## 🛠️ Archivo Creado

- **Nombre:** `launch_dyt.bat`
- **Ubicación:** Raíz del proyecto.
- **ADN Visual:** Banner ASCII en color `0B` (Cyan).
- **ADN Lógica:** 
    -   Valida la existencia de `.env.local` (Llaves de Supabase).
    -   Instala dependencias automáticas si falta `node_modules`.
    -   Muestra el contexto comercial del semestre activo (`2026-1`).

---

## ⚙️ Instrucciones de Uso: "Doble Clic & Shortcut"

Para convertir este script en una aplicación profesional en tu escritorio, sigue estos pasos:

1.  **Crear el Acceso Directo**:
    *   Haz clic derecho sobre el archivo `launch_dyt.bat` en la carpeta del proyecto.
    *   Selecciona: `Mostrar más opciones` -> `Enviar a` -> `Escritorio (crear acceso directo)`.

2.  **Configurar el Icono de la Escuela**:
    *   Haz clic derecho en el nuevo icono del escritorio y selecciona **Propiedades**.
    *   Ve a la pestaña **Acceso directo** y haz clic en el botón **Cambiar icono...**.
    *   Haz clic en **Examinar...** y busca el logo oficial en:
        `c:\Users\Usuario\OneDrive\Documents\Antigravity Proyectos\office-dyt\Logos\Icono_DYT.ico`
        *(Si tienes un archivo .png, primero cámbialo a .ico online o elige uno similar del sistema).*
    *   Presiona "Aceptar".

3.  **Ejecución**: 
    *   Simplemente haz doble clic en el icono del escritorio. 
    *   Si falta el entorno, el script te lanzará una alerta roja explicativa. 
    *   Si todo está bien, arrancará el servidor y te indicará la ruta local.

---

## 🛡️ Beneficios del Lanzador

-   **Autonomía**: No necesitas abrir VS Code o una terminal manualmente para arrancar el sistema.
-   **Prevención de Errores**: Verificación automática de secretos de Supabase antes de intentar el renderizado de Next.js.
-   **Ahorro de Contexto**: En futuras sesiones con agentes de IA, el "estatus de arranque" estará encapsulado en este snapshot.

---

> **Nota Crítica:** El script está configurado para **evitar** la apertura automática del navegador para ahorrar recursos de sistema y tokens de contexto, enfocándose en la estabilidad del servidor.
