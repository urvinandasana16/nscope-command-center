$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AgentDir = Resolve-Path (Join-Path $ScriptDir "..")
$RepoDir = Resolve-Path (Join-Path $AgentDir "..\..")
$Output = Join-Path $RepoDir "backend\storage\installers\windows\nscope-agent-base.exe"

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Output) | Out-Null
Set-Location $AgentDir

$env:GOOS = "windows"
$env:GOARCH = "amd64"
go build -o $Output .\cmd\nscope-agent

Write-Host "Built $Output"
