<#
.SYNOPSIS
  Set up (and optionally start) the Velina game-server + RCCService inside the Windows VM.

.DESCRIPTION
  The game-server runs NATIVELY in the Windows VM (not Docker) because it spawns the proprietary
  RCCService.exe as a local child process (plan §6). This script writes game-server/config.json,
  installs + builds the game-server, and can launch RCCService.exe and the game-server together.

  Getting the files onto the VM first (pick one):
    A) git clone the repo on the VM:   git clone <repo-url> C:\velina
    B) copy just these two folders from your dev box (SMB/RDP/scp):
         services\game-server\   and   services\RCCService\
  RCCService.exe is committed in the repo, so a clone already includes it.

.PARAMETER RepoRoot
  Path to the checked-out repo on the VM (default: two levels up from this script).

.PARAMETER BackendUrl
  LAN-reachable backend callback URL, e.g. http://192.168.1.50:5000  (NOT the public velina.lol —
  the /gs/* + thumbnail-upload callbacks should stay on the LAN, plan §2.5).

.PARAMETER RenderRccSecret
  Must equal the backend's Render:Authorization == RccAuthorization (RENDER_RCC_SECRET from
  generate-secrets.sh). This is the game-server "authorization".

.PARAMETER BotSecret
  Must equal the backend's BotAuthorization (BOT_SECRET). This is "websiteBotAuth".

.PARAMETER Start
  After setup, launch RCCService.exe and the game-server.

.EXAMPLE
  .\setup-gameserver.ps1 -BackendUrl http://192.168.1.50:5000 -RenderRccSecret <hex> -BotSecret <hex>
  .\setup-gameserver.ps1 -Start
#>
param(
  [string]$RepoRoot = (Resolve-Path "$PSScriptRoot\..\..").Path,
  [string]$BackendUrl = "http://CHANGE_ME_BACKEND_LAN_IP:5000",
  [string]$RenderRccSecret = "CHANGE_ME",
  [string]$BotSecret = "CHANGE_ME",
  [int]$Port = 3040,                 # game-server HTTP
  [int]$ThumbnailWebsocketPort = 3189, # backend connects here (Render:BaseUrl = ws://<vm-ip>:3189)
  [int]$RccPort = 64989,             # RCCService SOAP port
  [switch]$Start
)
$ErrorActionPreference = "Stop"

$gs  = Join-Path $RepoRoot "services\game-server"
$rcc = Join-Path $RepoRoot "services\RCCService"
$rccExe = Join-Path $rcc "RCCService.exe"

Write-Host "Repo root   : $RepoRoot"
Write-Host "game-server : $gs"
Write-Host "RCCService  : $rcc"

if (-not (Test-Path $gs))     { throw "game-server folder not found at $gs (clone/copy the repo first)" }
if (-not (Test-Path $rccExe)) { throw "RCCService.exe not found at $rccExe (copy services\RCCService\ to the VM)" }

# 1) Node check (need Node 22). Install from https://nodejs.org if missing.
try { $nodeV = (node --version) } catch { throw "Node.js not found. Install Node 22 LTS from https://nodejs.org, then re-run." }
Write-Host "Node version: $nodeV"
if ($nodeV -notmatch "^v2[2-9]\.") { Write-Warning "Node $nodeV detected; Node 22 LTS is recommended (Phase 6)." }

# 2) Write config.json (plan §1/§6 field meanings).
$config = [ordered]@{
  authorization         = $RenderRccSecret              # == backend Render:Authorization / RccAuthorization
  websiteBotAuth        = $BotSecret                    # == backend BotAuthorization
  baseUrl               = $BackendUrl                   # LAN callback URL, not the public domain
  port                  = $Port
  thumbnailWebsocketPort= $ThumbnailWebsocketPort
  rccPort               = $RccPort
  rcc                   = $rcc                          # RCCService dir
  content               = (Join-Path $rcc "content")    # RCC content dir
  dockerDisabled        = $true                         # native, no per-job docker sandbox (VM IS the sandbox, §6)
}
$configPath = Join-Path $gs "config.json"
($config | ConvertTo-Json -Depth 4) | Set-Content -Path $configPath -Encoding UTF8
Write-Host "Wrote $configPath"
if ($RenderRccSecret -eq "CHANGE_ME" -or $BotSecret -eq "CHANGE_ME" -or $BackendUrl -match "CHANGE_ME") {
  Write-Warning "Placeholders remain in config.json — re-run with -BackendUrl/-RenderRccSecret/-BotSecret, or edit it by hand."
}

# 3) Install + build the game-server.
Push-Location $gs
Write-Host "==> npm ci"
if (Test-Path (Join-Path $gs "package-lock.json")) { npm ci } else { npm install }
Write-Host "==> npm run build"
npm run build
Pop-Location

if ($Start) {
  Write-Host "==> starting RCCService.exe (placeid 1818)"
  Start-Process -FilePath $rccExe -ArgumentList "-console","-placeid:1818" -WorkingDirectory $rcc
  Start-Sleep -Seconds 3
  Write-Host "==> starting game-server (npm start)"
  Push-Location $gs
  npm start
  Pop-Location
} else {
  Write-Host ""
  Write-Host "Setup complete. To run:"
  Write-Host "  Start-Process '$rccExe' -ArgumentList '-console','-placeid:1818' -WorkingDirectory '$rcc'"
  Write-Host "  cd '$gs'; npm start"
  Write-Host ""
  Write-Host "Then on the backend appsettings.json set Render:BaseUrl = ws://<this-vm-ip>:$ThumbnailWebsocketPort"
  Write-Host "NOTE: thumbnails (backend<->VM) work over the LAN. LIVE GAMES from the public internet are the"
  Write-Host "      open RISK-GAMEWS item — they only work if game transport is WebSocket-over-HTTPS via a"
  Write-Host "      cloudflared 'game.velina.lol' route. Verify before relying on live games."
}
