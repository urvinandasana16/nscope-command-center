# N-SCOPE Windows Agent

N-SCOPE Windows Agent is a Go-based endpoint agent for registration, heartbeat, and inventory. It makes only outbound HTTP/HTTPS requests to the N-SCOPE backend and does not expose any local HTTP server.

Agent version: `1.0.0`

## Requirements

- Go installed on the build machine
- Windows administrator rights for install, start, stop, and uninstall
- Backend reachable from the endpoint
- A valid install token generated from N-SCOPE Command Center

## Paths

Install path:

```text
C:\Program Files\N-SCOPE Agent\nscope-agent.exe
```

Config path:

```text
C:\ProgramData\N-SCOPE\Agent\config.json
```

Log path:

```text
C:\ProgramData\N-SCOPE\Agent\logs\agent.log
```

Windows service:

```text
Service Name: NScopeAgent
Display Name: N-SCOPE Agent
Description: N-SCOPE endpoint monitoring and management agent
Startup Type: Automatic
Run as: LocalSystem
```

## Final Website Download Flow

1. Build the base agent on the server.
2. Open `http://192.168.200.13:3000`.
3. Go to Agent Deployment.
4. Select Client and Site.
5. Click Download Windows Agent.
6. Copy the downloaded EXE to the target Windows machine.
7. Right click the EXE and choose Run as administrator.
8. Check service and logs.
9. The dashboard device should show Online.

The browser only downloads the EXE. It cannot and should not auto-run it.

The generated EXE is self-contained. No .NET, Python, or Node.js is required on the endpoint. Only Administrator permission is required.

## Build Base Agent

Build the base Windows agent on Linux server from the repo root:

```bash
cd /var/www/nscope-command-center
bash scripts/build-windows-agent.sh
```

Manual build from the agent folder:

```bash
cd /var/www/nscope-command-center/agent/windows-go
GOOS=windows GOARCH=amd64 go build -o nscope-agent-base.exe ./cmd/nscope-agent
```

Build the base agent on Windows PowerShell:

```powershell
cd agent\windows-go
.\scripts\build-base.ps1
```

Do not commit generated `.exe` files.

## Backend Storage

The base binary must exist at:

```text
/var/www/nscope-command-center/backend/storage/installers/windows/nscope-agent-base.exe
```

The Command Center generates client/site-specific EXE downloads from:

```text
GET /api/agent-install-tokens/:id/download/windows
```

## Download From Windows

Use the Agent Deployment page to generate a Windows agent for a selected client/site. The website creates an install token, embeds it into the downloaded EXE, and downloads a ready-to-run file.

Direct PowerShell download is also possible after copying the generated download URL from the browser/API:

```powershell
Invoke-WebRequest -Uri "http://192.168.200.13:5000/api/agent-install-tokens/<TOKEN_ID>/download/windows" -Headers @{ Authorization = "Bearer <ADMIN_TOKEN>" } -OutFile "$env:TEMP\nscope-agent.exe"
```

## Install On Windows As Admin

For generated client/site EXEs, no manual token copy/paste is needed. Right-click the downloaded EXE and choose **Run as administrator**, or run:

```powershell
Start-Process "$env:TEMP\nscope-agent.exe" -Wait -Verb RunAs
```

The generated EXE reads its embedded config markers, then:

- Creates required folders
- Copies the running binary to `C:\Program Files\N-SCOPE Agent\nscope-agent.exe`
- Registers with the backend using the embedded install token
- Saves `config.json`
- Installs the `NScopeAgent` Windows service
- Starts the service automatically
- Sends heartbeat and inventory

## Commands

Install:

```powershell
nscope-agent.exe install --server http://192.168.200.13:5000/api --token <TOKEN>
```

This manual install command remains available for debugging and base-agent testing. Normal dashboard downloads use the embedded token and can be run with no command-line arguments.

Run foreground debug:

```powershell
.\nscope-agent.exe run
```

Start service:

```powershell
.\nscope-agent.exe start
```

Stop service:

```powershell
.\nscope-agent.exe stop
```

Uninstall:

```powershell
.\nscope-agent.exe uninstall
```

Status:

```powershell
.\nscope-agent.exe status
```

Inspect embedded website-generated config:

```powershell
.\nscope-agent.exe inspect-embed
```

Expected generated-agent output:

```text
embeddedConfigFound true
serverUrl http://192.168.200.13:5000/api
tokenId <TOKEN_ID>
clientId <CLIENT_ID>
siteId <SITE_ID>
deviceType Workstation
agentType MODERN_WINDOWS
```

This command never prints the embedded install token.

## Check Service And Logs

Check service:

```powershell
Get-Service NScopeAgent
```

Check logs:

```powershell
Get-Content "C:\ProgramData\N-SCOPE\Agent\logs\agent.log" -Tail 50
```

## Backend Test

On server:

```bash
curl -s http://192.168.200.13:5000/api/devices -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool
```

Expected:

- Windows hostname appears in Devices page
- Device status is `ONLINE`
- `lastSeen` updates every heartbeat
- Inventory sends installed software
- No endpoint inbound port is required

## API Endpoints Used

- `POST /api/agent/register`
- `POST /api/agent/heartbeat`
- `POST /api/agent/inventory`

## Safety Scope

Implemented:

- Register
- Heartbeat
- Inventory
- Windows service lifecycle

Not implemented in v1:

- Remote command execution
- PowerShell script execution
- File download execution
- Remote shell
- Remote desktop
- Credential collection
- Browser password collection
