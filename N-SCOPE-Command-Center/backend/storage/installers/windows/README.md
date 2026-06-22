# Windows Agent Installer Storage

Place the Windows base agent binary on the server at:

```text
/var/www/nscope-command-center/backend/storage/installers/windows/nscope-agent-base.exe
```

The backend uses this base binary to generate client/site-specific downloads from:

```text
GET /api/agent-install-tokens/:id/download/windows
```

Generated `.exe` files are intentionally ignored by Git and must not be committed.
