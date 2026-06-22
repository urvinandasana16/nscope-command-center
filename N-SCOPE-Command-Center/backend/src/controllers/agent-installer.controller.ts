import fs from "fs/promises";
import path from "path";
import type { Request, Response } from "express";
import { env } from "../config/env";

const windowsInstallerPath = path.resolve(__dirname, "../../storage/installers/windows/nscope-agent.exe");
const windowsBaseInstallerPath = path.resolve(__dirname, "../../storage/installers/windows/nscope-agent-base.exe");

export async function agentInstallerConfig(_req: Request, res: Response) {
  return res.json({
    agentPublicApiUrl: env.agentPublicApiUrl.replace(/\/+$/, ""),
    frontendPublicUrl: env.frontendPublicUrl,
  });
}

export async function downloadLatestWindowsInstaller(_req: Request, res: Response) {
  const installerPath = await existingInstallerPath();
  if (!installerPath) {
    return res.status(404).json({
      message: "Base Windows agent is not built yet. Build it on server first.",
    });
  }

  return res.download(installerPath, "nscope-agent.exe");
}

async function existingInstallerPath() {
  try {
    await fs.access(windowsInstallerPath);
    return windowsInstallerPath;
  } catch {
  }

  try {
    await fs.access(windowsBaseInstallerPath);
    return windowsBaseInstallerPath;
  } catch {
    return undefined;
  }
}
