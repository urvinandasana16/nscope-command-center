#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT_DIR="${ROOT_DIR}/agent/windows-go"
INSTALLER_DIR="${ROOT_DIR}/backend/storage/installers/windows"

cd "${AGENT_DIR}"
go mod tidy
GOOS=windows GOARCH=amd64 go build -o nscope-agent-base.exe ./cmd/nscope-agent

mkdir -p "${INSTALLER_DIR}"
cp "${AGENT_DIR}/nscope-agent-base.exe" "${INSTALLER_DIR}/nscope-agent-base.exe"
cp "${AGENT_DIR}/nscope-agent-base.exe" "${INSTALLER_DIR}/nscope-agent.exe"

echo "Base Windows agent built successfully."
