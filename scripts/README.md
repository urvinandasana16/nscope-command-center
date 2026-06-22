# Scripts

## Build Windows Agent Base Binary

Run this on the deployment server after pulling the latest code:

```bash
cd /var/www/nscope-command-center
bash scripts/build-windows-agent.sh
```

The script builds:

```text
agent/windows-go/nscope-agent-base.exe
```

Then copies it to:

```text
backend/storage/installers/windows/nscope-agent-base.exe
backend/storage/installers/windows/nscope-agent.exe
```

Generated `.exe` files are ignored by Git and must not be committed.

## Cleanup Demo Data

Run this manually only after review:

```bash
cd /var/www/nscope-command-center/backend
npm run cleanup:demo
```

The cleanup script targets only known demo client IDs and does not target `nscope.biz`, `ahemdabad`, `Pushpendra-AHM`, or `admin@nscope.local`.
