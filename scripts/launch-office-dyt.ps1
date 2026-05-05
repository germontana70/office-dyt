# OFFICE DYT - MASTER LAUNCHER v1.5 (Intranet Smart Mode)
# Auto-detecta la IP de la red local y configura el entorno.
# Equipo Antigravity

$PROJECT_ROOT  = "C:\Users\Usuario\OneDrive\Documents\Antigravity Proyectos\office-dyt"
$ENV_FILE      = "$PROJECT_ROOT\.env.local"
$NEXT_PORT     = 3000
$SUPABASE_API  = 54321
$SUPABASE_STUDIO_PORT = 54323

$VSCODE_PATH   = "C:\Users\Usuario\AppData\Local\Programs\Microsoft VS Code\Code.exe"
$DOCKER_PATH   = "C:\Program Files\Docker\Docker\Docker Desktop.exe"

function Wait-ForPort {
    param([string]$H, [int]$P, [int]$Sec = 120)
    $i = 0
    while ($i -lt $Sec) {
        try {
            $c = New-Object System.Net.Sockets.TcpClient
            $r = $c.BeginConnect($H, $P, $null, $null)
            if ($r.AsyncWaitHandle.WaitOne(1500) -and $c.Connected) { $c.Close(); return $true }
            $c.Close()
        } catch {}
        Start-Sleep 2; $i += 2
    }
    return $false
}

function Is-Running([string]$N) { return $null -ne (Get-Process -Name $N -ErrorAction SilentlyContinue) }

function Get-LanIP {
    $ips = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue) |
           Where-Object { $_.PrefixOrigin -eq "Dhcp" -or $_.PrefixOrigin -eq "Manual" } |
           Where-Object { $_.IPAddress -match "^192\.168\." -or $_.IPAddress -match "^10\." } |
           Select-Object -ExpandProperty IPAddress
    if ($ips) { return ($ips | Select-Object -First 1) }
    $all = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue) |
           Where-Object { $_.IPAddress -notmatch "^127\." -and $_.IPAddress -notmatch "^169\." -and $_.IPAddress -match "^(192|10|172)\." } |
           Select-Object -ExpandProperty IPAddress
    if ($all) { return ($all | Select-Object -First 1) }
    return "127.0.0.1"
}

Clear-Host
Write-Host ""
Write-Host "====================================================" -ForegroundColor DarkYellow
Write-Host "  OFFICE DYT  |  MASTER LAUNCHER  v1.5 (Smart IP)" -ForegroundColor Yellow
Write-Host "  Equipo Antigravity - Dones y Talentos" -ForegroundColor Gray
Write-Host "====================================================" -ForegroundColor DarkYellow
Write-Host ""

Write-Host "[IP] Detectando IP de la red local..." -ForegroundColor Magenta
$LAN_IP = Get-LanIP
Write-Host "     IP detectada: $LAN_IP" -ForegroundColor Cyan

$SUPABASE_URL  = "http://${LAN_IP}:${SUPABASE_API}"
$URL_APP       = "http://${LAN_IP}:${NEXT_PORT}"
$URL_LOCAL     = "http://localhost:${NEXT_PORT}"
$URL_STUDIO    = "http://localhost:${SUPABASE_STUDIO_PORT}"

Write-Host "     Actualizando .env.local..." -ForegroundColor DarkGray
if (Test-Path $ENV_FILE) {
    $envContent = Get-Content $ENV_FILE -Raw
    $envContent = $envContent -replace '(?m)^NEXT_PUBLIC_SUPABASE_URL=.*$', "NEXT_PUBLIC_SUPABASE_URL=`"$SUPABASE_URL`""
    Set-Content $ENV_FILE -Value $envContent -NoNewline
    Write-Host "     .env.local actualizado correctamente." -ForegroundColor Green
}
Write-Host ""

Write-Host "[1/4] VS Code..." -ForegroundColor White
if (Is-Running "Code") { Write-Host "      Ya esta abierto." -ForegroundColor Gray }
else {
    $ok = $false
    if (Test-Path $VSCODE_PATH) { Start-Process $VSCODE_PATH -ArgumentList "`"$PROJECT_ROOT`""; $ok = $true }
    else { try { Start-Process "code" -ArgumentList "`"$PROJECT_ROOT`"" -ErrorAction Stop; $ok = $true } catch {} }
    if ($ok) { Write-Host "      Iniciado." -ForegroundColor Green } else { Write-Host "      No encontrado." -ForegroundColor Red }
}
Start-Sleep -Milliseconds 600
Write-Host ""

Write-Host "[2/4] Docker Desktop..." -ForegroundColor White
if (Is-Running "Docker Desktop") { Write-Host "      Ya esta activo." -ForegroundColor Gray }
else {
    if (Test-Path $DOCKER_PATH) {
        Start-Process $DOCKER_PATH
        Write-Host "      Esperando Docker Engine (max 90s)..." -ForegroundColor Yellow
        $waited = 0
        while (-not (Is-Running "dockerd") -and $waited -lt 90) { Start-Sleep 3; $waited += 3 }
        if (Is-Running "dockerd") { Write-Host "      Docker Engine listo. Estabilizando..." -ForegroundColor Green; Start-Sleep 5 }
        else { Write-Host "      Docker no respondio a tiempo." -ForegroundColor Red }
    } else { Write-Host "      Docker Desktop no encontrado." -ForegroundColor Red }
}
Write-Host ""

Write-Host "[3/4] Supabase Local..." -ForegroundColor White
$supOk = Wait-ForPort -H "127.0.0.1" -P $SUPABASE_API -Sec 5
if ($supOk) { Write-Host "      Ya esta corriendo." -ForegroundColor Gray }
else {
    Write-Host "      Iniciando Supabase..." -ForegroundColor Yellow
    $supCLI = $null
    foreach ($c in @("$env:USERPROFILE\.supabase\bin\supabase.exe","C:\Users\Usuario\scoop\shims\supabase.exe","C:\ProgramData\chocolatey\bin\supabase.exe")) {
        if (Test-Path $c) { $supCLI = $c; break }
    }
    $cmd = if ($supCLI) { "& '$supCLI' start" } else { "npx supabase start" }
    Start-Process "powershell.exe" -ArgumentList "-NoProfile -NoExit -Command `"cd '$PROJECT_ROOT'; $cmd`"" -WindowStyle Normal
    $supReady = Wait-ForPort -H "127.0.0.1" -P $SUPABASE_API -Sec 120
    if ($supReady) { Write-Host "      Supabase listo." -ForegroundColor Green; Wait-ForPort -H "127.0.0.1" -P $SUPABASE_STUDIO_PORT -Sec 20 | Out-Null }
    else { Write-Host "      Supabase no respondio. Revisa su ventana." -ForegroundColor Red }
}
Write-Host ""

Write-Host "[4/4] Next.js..." -ForegroundColor White
$nextOk = Wait-ForPort -H "127.0.0.1" -P $NEXT_PORT -Sec 5
if ($nextOk) { Write-Host "      Ya esta corriendo." -ForegroundColor Gray }
else {
    Write-Host "      Iniciando: npm run dev..." -ForegroundColor Yellow
    Start-Process "powershell.exe" -ArgumentList "-NoProfile -NoExit -Command `"cd '$PROJECT_ROOT'; npm run dev`"" -WindowStyle Normal
    $nextReady = Wait-ForPort -H "127.0.0.1" -P $NEXT_PORT -Sec 120
    if ($nextReady) { Write-Host "      Next.js listo!" -ForegroundColor Green } else { Write-Host "      Next.js no respondio." -ForegroundColor Red }
}
Write-Host ""

Write-Host "====================================================" -ForegroundColor DarkYellow
Write-Host "  SISTEMA ENCENDIDO - MODO SMART (AUTO-IP)" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor DarkYellow
Write-Host "  Tu acceso    : $URL_LOCAL" -ForegroundColor Cyan
Write-Host ""
Write-Host "  SECRETARIA DEBE USAR ESTE LINK HOY:" -ForegroundColor Yellow
Write-Host "  ->  $URL_APP  <-" -ForegroundColor Green
Write-Host ""
Write-Host "  Credenciales:" -ForegroundColor Gray
Write-Host "  Usuario  : secretaria@donesytalentos.org" -ForegroundColor White
Write-Host "  Password : 88885555" -ForegroundColor White
Write-Host "====================================================" -ForegroundColor DarkYellow
Write-Host ""

Start-Sleep 1
Start-Process $URL_LOCAL
Start-Sleep 1
Start-Process $URL_STUDIO

Write-Host "  Presiona ENTER para cerrar..." -ForegroundColor DarkGray
Read-Host
