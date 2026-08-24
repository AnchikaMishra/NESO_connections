$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path.TrimEnd("\")
$listenerPattern = '^\s*TCP\s+127\.0\.0\.1:3000\s+\S+\s+LISTENING\s+(\d+)\s*$'
$processIds = @(
  netstat -ano -p tcp |
    ForEach-Object {
      if ($_ -match $listenerPattern) { [int]$Matches[1] }
    } |
    Sort-Object -Unique
)

if ($processIds.Count -eq 0) {
  Write-Host "No local demo server is running on http://127.0.0.1:3000."
  exit 0
}

foreach ($processId in $processIds) {
  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $processId"
  $commandLine = [string]$processInfo.CommandLine
  $normalizedCommandLine = $commandLine.Replace("/", "\")

  if (-not $normalizedCommandLine.Contains($projectRoot) -or $normalizedCommandLine -notmatch 'next') {
    Write-Error "Port 3000 is owned by PID $processId, but it was not started from $projectRoot. It was not stopped."
  }

  Stop-Process -Id $processId -Force
  Write-Host "Stopped the local NESO demo server (PID $processId)."
}
