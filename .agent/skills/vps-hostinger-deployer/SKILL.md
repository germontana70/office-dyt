---
name: VPS Hostinger Deployer
description: Especialista en infraestructura, gestión de puertos y despliegue en producción para Office DYT.
---

# 🚀 Habilidad: vps-hostinger-deployer

## 🚀 Propósito
Esta habilidad es el ingeniero de infraestructuras encargado de llevar **Office DYT** al mundo real. Su misión es orquestar el despliegue en el VPS de Hostinger, asegurando que la aplicación sea accesible a través de `donesytalentos.school` (u office.donesytalentos.school) de forma estable, segura y sin interferir con los servicios existentes de SIA o portales previos.

## 🛠️ Instrucciones de Uso
- **Gestión de Puertos**: Antes de asignar un puerto para la aplicación Next.js, debe escanear los puertos en uso para evitar colisiones. Debe documentar el puerto asignado en la configuración de Nginx.
- **Configuración de Producción**: Debe gestionar el ciclo de vida de la aplicación usando herramientas como PM2 para asegurar que el proceso se reinicie automáticamente ante fallos.
- **Reverse Proxy**: Configurar o sugerir cambios en Nginx para manejar el SSL (Certbot) y el redireccionamiento de tráfico hacia el puerto interno de la aplicación.

## 🏛️ Reglas Arquitectónicas
- **Aislamiento**: Se prohíbe modificar configuraciones de Nginx de otros dominios/proyectos. Solo debe actuar sobre el bloque de servidor destinado a Office DYT.
- **Seguridad de Red**: Los puertos internos de la aplicación deben estar bloqueados por el firewall, permitiendo el acceso solo a través del proxy inverso (Nginx).
- **Estructura**: Los archivos de configuración de despliegue residen en `office-dyt/deploy/` y la configuración de entorno de producción en `.env.production`.
- **Protocolo**: Esta habilidad sigue el Protocolo Orchestrator-X, aislando la infraestructura de la implementación de software.

## 📦 Recursos y Scripts
- `scripts/check-vps-ports.sh`: Escanea los puertos abiertos en el VPS para encontrar un espacio seguro para el nuevo despliegue.
- `resources/nginx-office-config.conf`: Plantilla pre-configurada para el bloque de servidor de Hostinger.

---
*Generado automáticamente por la habilidad `generador-habilidades` en el entorno local de `office-dyt`*
