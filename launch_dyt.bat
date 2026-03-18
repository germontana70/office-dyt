@echo off
TITLE Office DYT - Launcher 2026-1
CHCP 65001 > nul
SETLOCAL

:: ADN Visual Neon-Glass (Cyan)
color 0B
echo.
echo   ____  ______ ______ _____ _____ ______   _____  __     _______ 
echo  / __ ^|  ____^|  ____^|_   _/ ____^|  ____^| ^|  __ \ \ \   / /_   _^|
echo ^| ^|  ^| ^| ^|__  ^| ^|__    ^| ^|^| ^|    ^| ^|__    ^| ^|  ^| ^| \ \_/ /  ^| ^|  
echo ^| ^|  ^| ^|  __^| ^|  __^|   ^| ^|^| ^|    ^|  __^|   ^| ^|  ^| ^|  \   /   ^| ^|  
echo ^| ^|__^| ^| ^|    ^| ^|     _^| ^|^| ^|____^| ^|____  ^| ^|__^| ^|   ^| ^|   _^| ^|_ 
echo  \____/^|_^|    ^|_^|    ^|_____\_____^|______^| ^|_____/    ^|_^|  ^|_____^|
echo.
echo ──────────────────────────────────────────────────────────────────
echo           SISTEMA DE GESTIÓN ACADÉMICA Y FINANCIERA
echo ──────────────────────────────────────────────────────────────────
echo.

:: Business Context
echo [CONTEXTO] Semestre Activo: 2026-1
echo [ESTADO] Verificando integridad del entorno...
echo.

:: Validación de Integridad: .env.local
if not exist ".env.local" (
    color 0C
    echo ❌ [ERROR] Llaves de Supabase ausentes.
    echo ⚠️ Falta el archivo .env.local en la raíz del proyecto.
    echo El sistema no puede arrancar sin las credenciales de base de datos.
    echo.
    pause
    exit /b
)

:: Validación de Integridad: node_modules
if not exist "node_modules" (
    color 0D
    echo 📦 [SISTEMA] No se detectó la carpeta node_modules.
    echo Ejecutando instalación de dependencias...
    call npm install
    echo.
    color 0B
    echo ✅ Instalación completada.
)

:: Arranque
echo 🚀 Iniciando Servidor de Desarrollo...
echo 🚀 Servidor en espera en http://localhost:3000
echo.
npm run dev

ENDLOCAL
