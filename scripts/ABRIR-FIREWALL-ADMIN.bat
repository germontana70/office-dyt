@echo off
:: Abre el firewall para los puertos de Office DYT
:: Este archivo debe ejecutarse como Administrador

echo.
echo  =====================================================
echo   OFFICE DYT - Configuracion de Firewall
echo   Abriendo puertos 3000 y 54321 en Windows Firewall
echo  =====================================================
echo.

netsh advfirewall firewall delete rule name="Office DYT - Puerto 3000" >nul 2>&1
netsh advfirewall firewall add rule name="Office DYT - Puerto 3000" protocol=TCP dir=in localport=3000 action=allow
echo.
netsh advfirewall firewall delete rule name="Office DYT - Puerto 54321" >nul 2>&1
netsh advfirewall firewall add rule name="Office DYT - Puerto 54321" protocol=TCP dir=in localport=54321 action=allow

echo.
echo  =====================================================
echo   Verificando reglas creadas:
echo  =====================================================
netsh advfirewall firewall show rule name="Office DYT - Puerto 3000" | findstr /i "puerto\|port\|accion\|action\|habilitado\|enabled"
netsh advfirewall firewall show rule name="Office DYT - Puerto 54321" | findstr /i "puerto\|port\|accion\|action\|habilitado\|enabled"

echo.
echo  [OK] Firewall configurado. La secretaria ya puede acceder.
echo.
pause
