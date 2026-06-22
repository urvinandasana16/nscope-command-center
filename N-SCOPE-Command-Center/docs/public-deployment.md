# N-SCOPE Public Agent Communication

This guide prepares N-SCOPE Command Center for agents that communicate over public HTTPS while keeping the local LAN flow available for testing.

## Planned Public URLs

- Dashboard: `https://rmm.nscope.xyz`
- Backend API: `https://api.nscope.xyz/api`
- MeshCentral: `https://mesh.nscope.xyz`

Do not hard-code these URLs in source files. Configure them with environment variables on the deployed server.

## DNS Records

Create DNS records that point to the public IP address of the server or load balancer:

```text
rmm.nscope.xyz    A or CNAME    <PUBLIC_SERVER>
api.nscope.xyz    A or CNAME    <PUBLIC_SERVER>
mesh.nscope.xyz   A or CNAME    <PUBLIC_SERVER>
```

If IPv6 is used, add matching `AAAA` records. Keep DNS TTL low during the first cutover, then raise it after validation.

## Firewall And NAT

Allow inbound public traffic only for required services:

```text
TCP 80     HTTP certificate issuance and redirect
TCP 443    HTTPS dashboard, API, and MeshCentral reverse proxy
```

The backend application can continue listening privately on `5000`, the dashboard on `3000`, and MeshCentral on its internal port. Do not expose those internal ports directly to the internet when a reverse proxy is in front.

Windows agents make outbound HTTPS requests to the backend API. No inbound port is required on agent endpoints.

## Required Environment Variables

Backend local LAN example:

```bash
AGENT_PUBLIC_API_URL="http://192.168.200.13:5000/api"
FRONTEND_PUBLIC_URL="http://192.168.200.13:3000"
CORS_ORIGIN="http://192.168.200.13:3000"
```

Backend production example:

```bash
AGENT_PUBLIC_API_URL="https://api.nscope.xyz/api"
FRONTEND_PUBLIC_URL="https://rmm.nscope.xyz"
CORS_ORIGIN="https://rmm.nscope.xyz,https://command.nscope.xyz"
```

Frontend local LAN example:

```bash
NEXT_PUBLIC_API_URL="http://192.168.200.13:5000/api"
```

Frontend production example:

```bash
NEXT_PUBLIC_API_URL="https://api.nscope.xyz/api"
```

Keep `.env` files and secrets out of git.

## Reverse Proxy Overview

Terminate TLS at Apache or Nginx and proxy by hostname:

```text
https://rmm.nscope.xyz   -> http://127.0.0.1:3000
https://api.nscope.xyz   -> http://127.0.0.1:5000
https://mesh.nscope.xyz  -> http://127.0.0.1:<MESHCENTRAL_PORT>
```

Forward standard headers so the applications can identify the original host and protocol:

```text
X-Forwarded-For
X-Forwarded-Host
X-Forwarded-Proto
Host
```

Use a valid public certificate for each hostname, or a wildcard certificate for the domain.

## Agent Public Communication Flow

1. Admin opens the dashboard.
2. Admin selects Client and Site in Agent Deployment.
3. Backend creates an install token.
4. Backend generates the Windows EXE by appending embedded config markers to `nscope-agent-base.exe`.
5. The embedded `serverUrl` comes from `AGENT_PUBLIC_API_URL`.
6. The Windows endpoint runs the EXE as Administrator.
7. Agent registers at `POST /api/agent/register`.
8. Agent saves `C:\ProgramData\N-SCOPE\Agent\config.json`.
9. Agent service starts heartbeat and inventory to the configured API URL.

When production env is set, newly generated EXEs must embed `https://api.nscope.xyz/api`, not localhost or the LAN IP.

## Existing Installed Agents

Installed agents read their server URL from:

```text
C:\ProgramData\N-SCOPE\Agent\config.json
```

To move an already installed agent from LAN to public API:

1. Stop the service:

   ```powershell
   Stop-Service NScopeAgent
   ```

2. Edit `serverUrl` in `config.json`:

   ```json
   {
     "serverUrl": "https://api.nscope.xyz/api"
   }
   ```

3. Start the service:

   ```powershell
   Start-Service NScopeAgent
   ```

4. Check logs:

   ```powershell
   Get-Content "C:\ProgramData\N-SCOPE\Agent\logs\agent.log" -Tail 50
   ```

Do not change `agentToken`, `agentId`, or `deviceId` unless re-registering the agent.

## Server Rebuild Commands

After changing backend production env, rebuild the base Windows agent and restart services on the server:

```bash
cd /var/www/nscope-command-center
git pull origin main
bash scripts/build-windows-agent.sh
pm2 restart nscope-backend --update-env
pm2 restart nscope-command-center --update-env
```

Download a fresh EXE after the rebuild. Existing downloaded EXEs keep their old embedded config.

## Testing Commands

Backend health:

```bash
curl -i https://api.nscope.xyz/health
```

API CORS preflight:

```bash
curl -i -X OPTIONS https://api.nscope.xyz/api/auth/login \
  -H "Origin: https://rmm.nscope.xyz" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

Expected CORS headers:

```text
Access-Control-Allow-Origin: https://rmm.nscope.xyz
Access-Control-Allow-Credentials: true
```

Inspect a generated Windows agent:

```powershell
.\nscope-agent.exe inspect-embed
```

Expected public output shape:

```text
embeddedConfigFound true
serverUrl https://api.nscope.xyz/api
tokenId <TOKEN_ID>
clientId <CLIENT_ID>
siteId <SITE_ID>
deviceType Workstation
agentType MODERN_WINDOWS
```

Run the generated agent:

```powershell
Start-Process ".\nscope-agent.exe" -Verb RunAs -Wait
```

Then verify the device appears online in the dashboard and the agent log shows heartbeat success.
