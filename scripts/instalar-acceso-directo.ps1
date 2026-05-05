# Limpiar shortcuts viejos y crear el correcto

$desktop = [Environment]::GetFolderPath("Desktop")
$bat = "C:\Users\Usuario\OneDrive\Documents\Antigravity Proyectos\office-dyt\scripts\launch-office-dyt.bat"

Write-Host ""
Write-Host "Shortcuts actuales:" -ForegroundColor Yellow
Get-ChildItem $desktop -Filter "*.lnk" | Select-Object -ExpandProperty Name | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
Write-Host ""

# Eliminar todos los shortcuts de DYT/Office anteriores
$removed = 0
Get-ChildItem $desktop -Filter "*.lnk" | Where-Object {
    $_.Name -like "*DYT*" -or $_.Name -like "*dyt*" -or $_.Name -like "*Office*"
} | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Host "Eliminado: $($_.Name)" -ForegroundColor Red
    $removed++
}
Write-Host "Total eliminados: $removed" -ForegroundColor DarkGray
Write-Host ""

# Crear el nuevo shortcut
$linkPath = "$desktop\Office DYT - Encender Sistema.lnk"
$WS = New-Object -ComObject WScript.Shell
$sc = $WS.CreateShortcut($linkPath)
$sc.TargetPath       = $bat
$sc.WorkingDirectory = "C:\Users\Usuario\OneDrive\Documents\Antigravity Proyectos\office-dyt\scripts"
$sc.Description      = "Encender el ecosistema completo de Office DYT"
$sc.WindowStyle      = 1

$icoPath = "C:\Users\Usuario\AppData\Local\Programs\Microsoft VS Code\Code.exe"
if (Test-Path $icoPath) { $sc.IconLocation = "$icoPath,0" }
$sc.Save()

Write-Host "Shortcut creado:" -ForegroundColor Green
Write-Host "  $linkPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verifica que aparece en el escritorio y usa SOLO ese icono." -ForegroundColor Yellow
Write-Host ""
Read-Host "Presiona ENTER para cerrar"
