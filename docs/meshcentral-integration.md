# MeshCentral Remote Control Foundation

N-SCOPE uses MeshCentral for remote desktop, terminal, and file manager sessions. N-SCOPE does not implement its own remote desktop engine and does not expose RDP directly.

## Architecture

- N-SCOPE Dashboard: `https://rmm.nscope.xyz`
- N-SCOPE API: `https://api.nscope.xyz/api`
- MeshCentral: `https://mesh.nscope.xyz`

The N-SCOPE Agent and MeshAgent are separate endpoint components:

- N-SCOPE Agent handles monitoring, inventory, heartbeat, and tasks.
- MeshAgent handles remote desktop, terminal, and file manager sessions.
- N-SCOPE stores MeshCentral node IDs against devices/agents.
- The dashboard opens a MeshCentral session URL when an operator clicks Take Control.

## Network Requirements

Public inbound:

```text
TCP 443 -> reverse proxy -> MeshCentral
```

Endpoint outbound:

```text
TCP 443 -> https://mesh.nscope.xyz
```

Endpoints do not need inbound ports. Do not expose endpoint RDP/VNC directly.

## Reverse Proxy

MeshCentral must run behind `https://mesh.nscope.xyz`.

The reverse proxy must support:

- HTTPS termination
- WebSocket upgrade headers
- Long-lived connections
- Large enough request/body limits for MeshCentral file operations

Required forwarded headers:

```text
Host
X-Forwarded-For
X-Forwarded-Host
X-Forwarded-Proto
Upgrade
Connection
```

Nginx overview:

```nginx
server {
  listen 443 ssl http2;
  server_name mesh.nscope.xyz;

  location / {
    proxy_pass http://127.0.0.1:4433;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

Use the actual internal MeshCentral port from your server.

## Backend Environment

Configure these on the backend server:

```bash
MESHCENTRAL_URL="https://mesh.nscope.xyz"
MESHCENTRAL_API_URL="https://mesh.nscope.xyz"
MESHCENTRAL_API_KEY="<secret-api-key>"
MESHCENTRAL_DOMAIN_ID=""
MESHCENTRAL_DEVICE_GROUP_ID="<mesh-device-group-id>"
```

`MESHCENTRAL_URL` is enough for dashboard launch URLs. API key based provisioning is intentionally not implemented yet.

Do not commit API keys or MeshCentral admin credentials.

## Backend API

Remote control status:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.nscope.xyz/api/remote-control/status
```

Get a device remote launch URL:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.nscope.xyz/api/devices/<DEVICE_ID>/remote-control
```

Link a MeshCentral node to a device:

```bash
curl -X POST https://api.nscope.xyz/api/devices/<DEVICE_ID>/mesh-node \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"meshNodeId":"<MESH_NODE_ID>"}'
```

When a device has no linked Mesh node, the API returns:

```json
{ "message": "Remote control not linked yet" }
```

When MeshCentral is not configured, the API returns:

```json
{ "message": "MeshCentral not configured" }
```

## Dashboard Flow

1. Operator opens Devices.
2. Operator clicks Take Control, Remote Terminal, or File Manager.
3. Dashboard asks N-SCOPE API for the MeshCentral launch URL.
4. API verifies the authenticated operator can access the device.
5. API returns a MeshCentral URL for the stored Mesh node ID.
6. Dashboard opens the MeshCentral session in a new tab.

## Consent Policy

N-SCOPE stores remote-control policy hints on each device:

```text
deviceType: Workstation | Server
remoteConsentRequired: boolean
```

Default behavior:

- Workstation: `remoteConsentRequired=true`
- Server: `remoteConsentRequired=false`

The N-SCOPE Device Detail Remote Control tab displays whether consent is required and shows the operator message:

- `User consent required on workstation`
- `Server remote control allowed`

N-SCOPE does not implement a custom remote desktop or consent popup. MeshCentral and MeshAgent policy must enforce the actual consent prompt/session behavior.

## Current Scope

Implemented:

- MeshCentral env support
- Configuration status endpoint
- Device remote URL endpoint
- Mesh node linkage endpoint
- Device and Agent Mesh node storage
- Dashboard foundation buttons

Not implemented yet:

- Credential push
- MeshAgent automatic installation
- MeshCentral API provisioning
- Direct RDP/VNC
- Plaintext admin credential storage
