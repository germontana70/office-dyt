@echo off
chcp 65001 >nul 2>&1

:: Verificar si ya tenemos permisos de Administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    :: Ya somos admin, ejecutar directamente
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch-office-dyt.ps1"
) else (
    :: Pedir elevacion a Administrador y relanzar
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
        "Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""%~dp0launch-office-dyt.ps1""' -Verb RunAs"
)
