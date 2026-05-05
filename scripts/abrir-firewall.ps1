# Abrir puertos 3000 y 54321 en el Firewall de Windows
# Requiere Administrador

$ports = @(3000, 54321)
foreach ($p in $ports) {
    $name = "Office DYT - Puerto $p"
    $existing = Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
    if ($null -eq $existing) {
        New-NetFirewallRule -DisplayName $name -Direction Inbound `
            -Protocol TCP -LocalPort $p -Action Allow -Profile Any | Out-Null
        Write-Host "CREADA: Regla para puerto $p" -ForegroundColor Green
    } else {
        Write-Host "YA EXISTE: Puerto $p" -ForegroundColor Yellow
    }
}
Write-Host ""
Write-Host "Firewall configurado. La secretaria puede acceder via intranet." -ForegroundColor Cyan
