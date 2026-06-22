#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${AGENT_DIR}/../.." && pwd)"
OUTPUT="${REPO_DIR}/backend/storage/installers/windows/nscope-agent-base.exe"

mkdir -p "$(dirname "${OUTPUT}")"
cd "${AGENT_DIR}"

GOOS=windows GOARCH=amd64 go build -o "${OUTPUT}" ./cmd/nscope-agent

echo "Built ${OUTPUT}"
