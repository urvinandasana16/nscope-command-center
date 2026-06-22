import { env } from "../config/env";
import { prisma } from "../prisma/client";

const db = prisma as any;

type RemoteMode = "desktop" | "terminal" | "files";

function normalizedUrl(value?: string) {
  return value?.replace(/\/+$/, "");
}

function meshUrl() {
  return normalizedUrl(env.meshCentralUrl);
}

function isConfigured() {
  return Boolean(meshUrl());
}

function meshSessionUrl(meshNodeId: string, mode: RemoteMode) {
  const baseUrl = meshUrl();
  if (!baseUrl) return undefined;

  try {
    const url = new URL(baseUrl);
    url.searchParams.set("nodeid", meshNodeId);
    url.searchParams.set("viewmode", mode);
    return url.toString();
  } catch {
    return undefined;
  }
}

export function getMeshStatus() {
  const configured = isConfigured();
  return {
    configured,
    message: configured ? "MeshCentral configured" : "MeshCentral not configured",
    meshCentralUrl: meshUrl(),
    meshCentralApiUrl: normalizedUrl(env.meshCentralApiUrl),
    apiEnabled: Boolean(env.meshCentralApiUrl && env.meshCentralApiKey),
    domainId: env.meshCentralDomainId,
    deviceGroupId: env.meshCentralDeviceGroupId,
  };
}

export function getDeviceRemoteUrl(meshNodeId: string) {
  if (!isConfigured()) {
    return {
      configured: false,
      message: "MeshCentral not configured",
    };
  }

  const remoteUrl = meshSessionUrl(meshNodeId, "desktop");
  const terminalUrl = meshSessionUrl(meshNodeId, "terminal");
  const fileManagerUrl = meshSessionUrl(meshNodeId, "files");
  if (!remoteUrl || !terminalUrl || !fileManagerUrl) {
    return {
      configured: false,
      message: "MeshCentral URL is invalid",
    };
  }

  return {
    configured: true,
    meshNodeId,
    remoteUrl,
    terminalUrl,
    fileManagerUrl,
  };
}

export async function createOrResolveDeviceGroup(client: { id: string; name?: string }, site: { id: string; name?: string }) {
  if (!isConfigured()) {
    return {
      configured: false,
      message: "MeshCentral not configured",
    };
  }

  return {
    configured: true,
    groupId: env.meshCentralDeviceGroupId ?? `nscope-${client.id}-${site.id}`,
    groupName: [client.name, site.name].filter(Boolean).join(" / ") || "N-SCOPE Devices",
    apiReady: Boolean(env.meshCentralApiUrl && env.meshCentralApiKey),
  };
}

export async function syncMeshNode(deviceId: string, meshNodeId: string) {
  const meshGroupId = env.meshCentralDeviceGroupId;
  const device = await db.device.update({
    where: { id: deviceId },
    data: {
      meshNodeId,
      remoteControlEnabled: true,
    },
  });

  await db.agent.updateMany({
    where: { deviceId },
    data: {
      meshNodeId,
      ...(meshGroupId ? { meshGroupId } : {}),
    },
  });

  return {
    deviceId: device.id,
    meshNodeId,
    meshGroupId,
    remoteControlEnabled: true,
  };
}
