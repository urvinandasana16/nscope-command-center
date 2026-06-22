# N-SCOPE Agent Architecture

## Agent v1

N-SCOPE Agent v1 will be written in Go as a single Windows executable. It will run as a Windows service and will not require Python or .NET on the endpoint.

The first build target is Modern Windows for Windows 10, Windows 11, and Windows Server 2016 or newer. A Legacy Windows build can be added later for Windows 7 SP1, Windows Server 2008 R2, and Windows Server 2012.

## Install Command

```powershell
nscope-agent.exe install --server <API_URL> --token <INSTALL_TOKEN>
```

The backend generates this command from `AGENT_PUBLIC_API_URL`.

Local test environment:

```text
AGENT_PUBLIC_API_URL="http://192.168.200.13:5000/api"
```

Production later:

```text
AGENT_PUBLIC_API_URL="https://api.nscope.xyz/api"
```

Do not use `localhost` in generated install commands for endpoint installation. On an endpoint device, `localhost` means that endpoint, not the N-SCOPE server.

## Installer Download

Final website workflow:

1. Admin opens `http://192.168.200.13:3000`.
2. Admin goes to Agent Deployment.
3. Admin selects Client and Site.
4. Admin clicks Download Windows Agent.
5. The website creates an install token.
6. The backend generates a client/site-specific EXE.
7. The browser downloads the EXE.
8. Admin copies the EXE to the target Windows machine.
9. User right-clicks the EXE and chooses Run as Administrator.
10. Device registers, starts heartbeat/inventory, and appears Online.

The browser only downloads the EXE. It does not auto-run it.

The generated EXE is self-contained. No .NET, Python, or Node.js is required on the endpoint. Only Administrator permission is required.

Build the base agent on the server:

```bash
cd /var/www/nscope-command-center
bash scripts/build-windows-agent.sh
```

The backend uses a base Windows agent binary:

```text
/var/www/nscope-command-center/backend/storage/installers/windows/nscope-agent-base.exe
```

The dashboard generates a client/site-specific Windows agent download from:

```text
GET /api/agent-install-tokens/:id/download/windows
```

The generated EXE appends embedded config markers:

```text
__NSCOPE_CONFIG_START__
base64(json)
__NSCOPE_CONFIG_END__
```

The config includes:

- `serverUrl` from `AGENT_PUBLIC_API_URL`
- raw install token
- token ID
- client ID
- site ID
- device type
- agent type

The browser only downloads the EXE. It does not run the EXE.

When the generated EXE is run on Windows, it requests UAC elevation if needed, installs the N-SCOPE Agent service, registers with the backend, saves config, starts heartbeat, and sends inventory.

If the base binary is missing, the API returns:

```json
{
  "message": "Windows agent base binary is not available yet. Build and upload nscope-agent-base.exe to backend/storage/installers/windows/nscope-agent-base.exe"
}
```

## Windows Paths

Install path:

```text
C:\Program Files\N-SCOPE Agent\nscope-agent.exe
```

Config:

```text
C:\ProgramData\N-SCOPE\Agent\config.json
```

Logs:

```text
C:\ProgramData\N-SCOPE\Agent\logs\agent.log
```

Windows service:

```text
Name: NScopeAgent
Startup: Automatic
Run as: LocalSystem
```

## Agent Flow

1. Install with a client/site scoped install token.
2. Register with the backend using the install token.
3. Receive a unique agent token.
4. Store server URL, device ID, agent ID, and agent token in local config.
5. Start the heartbeat loop.
6. Send inventory on the configured interval.
7. Poll pending tasks.
8. Send task results.

## Protocols

Agent to backend uses HTTP/HTTPS REST JSON.

Local testing uses:

```text
http://192.168.200.13:5000/api
```

Production later uses:

```text
https://api.nscope.xyz/api
```

Remote control will be handled later through MeshCentral.

MeshCentral protocol will use HTTPS, WebSocket, and WebRTC through:

```text
mesh.nscope.xyz
```

No inbound port is required on endpoint devices.

## Remote Control Plan

Do not build a remote desktop engine in v1.

N-SCOPE Agent and MeshAgent are separate components:

- N-SCOPE Agent handles monitoring, inventory, heartbeat, and task polling.
- MeshAgent handles remote desktop, terminal, and file manager.

The backend stores `meshNodeId` and `meshGroupId` on the agent record for later MeshCentral linking.

## Security

- Use a unique install token per client/site deployment.
- Show the raw install token only once.
- Store only install token hashes in the database.
- Generate a unique agent token per installed device.
- Store only agent token hashes in the database.
- Require HTTPS in production.
- Do not add arbitrary remote command execution in v1.
- Write audit logs for token generation, token revocation, and agent registration.

## Local API Test Commands

Replace values such as `CLIENT_ID`, `SITE_ID`, `ADMIN_TOKEN`, `RAW_INSTALL_TOKEN`, `AGENT_ID`, and `AGENT_TOKEN` with real values from your server. Do not paste placeholder text into actual commands.

Login admin:

```bash
curl -X POST http://192.168.200.13:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nscope.local","password":"Admin@123"}'
```

List clients:

```bash
curl http://192.168.200.13:5000/api/clients \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

List sites:

```bash
curl http://192.168.200.13:5000/api/sites \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

Generate install token:

```bash
curl -X POST http://192.168.200.13:5000/api/agent-install-tokens \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "clientId":"CLIENT_ID",
    "siteId":"SITE_ID",
    "os":"WINDOWS",
    "agentType":"MODERN_WINDOWS",
    "deviceType":"Workstation",
    "expiresInHours":24,
    "maxUses":1
  }'
```

Download generated Windows agent:

```bash
curl -OJ http://192.168.200.13:5000/api/agent-install-tokens/TOKEN_ID/download/windows \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

Fake agent register:

```bash
curl -X POST http://192.168.200.13:5000/api/agent/register \
  -H "Content-Type: application/json" \
  -d '{
    "installToken":"RAW_INSTALL_TOKEN",
    "hostname":"TEST-WIN-01",
    "os":"Windows 11 Pro",
    "serialNumber":"TEST123",
    "macAddress":"AA:BB:CC:DD:EE:FF",
    "ipAddress":"192.168.200.50",
    "deviceType":"Workstation",
    "agentVersion":"1.0.0",
    "manufacturer":"Dell",
    "model":"OptiPlex"
  }'
```

Heartbeat:

```bash
curl -X POST http://192.168.200.13:5000/api/agent/heartbeat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer AGENT_TOKEN" \
  -d '{
    "agentId":"AGENT_ID",
    "hostname":"TEST-WIN-01",
    "cpuUsage":15,
    "memoryUsage":55,
    "diskUsage":70,
    "uptime":"1 day",
    "loggedInUser":"Administrator",
    "ipAddress":"192.168.200.50",
    "macAddress":"AA:BB:CC:DD:EE:FF",
    "agentVersion":"1.0.0"
  }'
```

Inventory:

```bash
curl -X POST http://192.168.200.13:5000/api/agent/inventory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer AGENT_TOKEN" \
  -d '{
    "agentId":"AGENT_ID",
    "hostname":"TEST-WIN-01",
    "os":"Windows 11 Pro",
    "serialNumber":"TEST123",
    "manufacturer":"Dell",
    "model":"OptiPlex",
    "ipAddress":"192.168.200.50",
    "macAddress":"AA:BB:CC:DD:EE:FF",
    "installedSoftware":[
      {
        "name":"Google Chrome",
        "version":"126.0",
        "publisher":"Google LLC",
        "installDate":"20260618",
        "source":"registry"
      }
    ]
  }'
```

List devices:

```bash
curl http://192.168.200.13:5000/api/devices \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

List assets:

```bash
curl http://192.168.200.13:5000/api/assets \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

Confirm ticketing readiness:

```bash
curl http://192.168.200.13:5000/api/tickets \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

After registration, the device should appear in the Devices page, the linked asset should appear in the Assets page, and both should be selectable when creating a ticket.

## Demo Data Cleanup

Future Prisma seed runs create only the required admin user and no longer recreate demo clients/devices/tickets.

Manual cleanup command:

```bash
cd /var/www/nscope-command-center/backend
npm run cleanup:demo
```

The cleanup script targets only known demo client IDs:

```text
abc-pvt-ltd
dc-jewellers
techpontis
white-canvas-tech
```

It does not target `nscope.biz`, `ahemdabad`, `Pushpendra-AHM`, or `admin@nscope.local`.
