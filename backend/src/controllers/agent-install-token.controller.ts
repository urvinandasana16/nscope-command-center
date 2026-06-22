import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import type { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { writeAuditLog } from "../services/audit.service";
import { agentInstallTokenCreateSchema } from "../validators/common";
import { env } from "../config/env";
import { AppError } from "../utils/http";

const db = prisma as any;
const embeddedPayloadStart = "__NSCOPE_CONFIG_START__";
const embeddedPayloadEnd = "__NSCOPE_CONFIG_END__";
const baseWindowsAgentPath = path.resolve(__dirname, "../../storage/installers/windows/nscope-agent-base.exe");

function hashToken(token: string) {
  return `sha256:${crypto.createHash("sha256").update(token).digest("hex")}`;
}

function encryptionKey() {
  return crypto.createHash("sha256").update(env.agentTokenEncryptionKey).digest();
}

function encryptToken(token: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${Buffer.concat([iv, tag, encrypted]).toString("base64")}`;
}

function decryptToken(cipherText?: string | null) {
  if (!cipherText?.startsWith("v1:")) return undefined;
  const packed = Buffer.from(cipherText.slice(3), "base64");
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const encrypted = packed.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function normalizedApiUrl() {
  return env.agentPublicApiUrl.replace(/\/+$/, "");
}

function canAccessClient(req: Request, clientId: string) {
  if (!req.user) throw new AppError(401, "Authentication required");
  if (req.user.role === "SUPER_ADMIN" || req.user.role === "NOC_ENGINEER") return true;
  return req.user.role === "CLIENT_ADMIN" && req.user.clientId === clientId;
}

function tokenListWhere(req: Request) {
  if (!req.user) throw new AppError(401, "Authentication required");
  if (req.user.role === "SUPER_ADMIN" || req.user.role === "NOC_ENGINEER") return {};
  if (req.user.role === "CLIENT_ADMIN" && req.user.clientId) return { clientId: req.user.clientId };
  throw new AppError(403, "Insufficient permissions");
}

export async function createAgentInstallToken(req: Request, res: Response) {
  const payload = agentInstallTokenCreateSchema.parse(req.body);
  if (!canAccessClient(req, payload.clientId)) {
    throw new AppError(403, "Cannot create installer tokens for another client");
  }

  const client = await db.client.findUnique({ where: { id: payload.clientId } });
  if (!client) throw new AppError(404, "Client not found");

  const site = await db.site.findFirst({ where: { id: payload.siteId, clientId: payload.clientId } });
  if (!site) throw new AppError(422, "Site does not belong to the selected client");

  const rawToken = generateToken();
  const expiresAt = new Date(Date.now() + payload.expiresInHours * 60 * 60 * 1000);
  const token = await db.agentInstallToken.create({
    data: {
      tokenHash: hashToken(rawToken),
      tokenCipher: encryptToken(rawToken),
      clientId: payload.clientId,
      siteId: payload.siteId,
      os: payload.os,
      agentType: payload.agentType,
      deviceType: payload.deviceType,
      expiresAt,
      maxUses: payload.maxUses,
      createdById: req.user?.id,
    },
    include: { client: true, site: true },
  });

  await writeAuditLog(req, "CREATE", "agent-install-tokens", `Created installer token ${token.id} for ${client.name} / ${site.name}`);

  return res.status(201).json({
    id: token.id,
    rawToken,
    clientId: token.clientId,
    siteId: token.siteId,
    os: token.os,
    agentType: token.agentType,
    deviceType: token.deviceType,
    expiresAt: token.expiresAt,
    maxUses: token.maxUses,
    usedCount: token.usedCount,
    isRevoked: token.isRevoked,
    installCommand: `nscope-agent.exe install --server ${normalizedApiUrl()} --token ${rawToken}`,
    downloadUrl: `/api/agent-install-tokens/${token.id}/download/windows`,
  });
}

export async function listAgentInstallTokens(req: Request, res: Response) {
  const tokens = await db.agentInstallToken.findMany({
    where: tokenListWhere(req),
    include: { client: true, site: true },
    orderBy: { createdAt: "desc" },
  });

  return res.json(tokens.map((token: any) => ({
    id: token.id,
    clientId: token.clientId,
    siteId: token.siteId,
    client: token.client,
    site: token.site,
    os: token.os,
    agentType: token.agentType,
    deviceType: token.deviceType,
    expiresAt: token.expiresAt,
    maxUses: token.maxUses,
    usedCount: token.usedCount,
    isRevoked: token.isRevoked,
    createdAt: token.createdAt,
  })));
}

export async function revokeAgentInstallToken(req: Request, res: Response) {
  const token = await db.agentInstallToken.findFirst({
    where: { id: req.params.id, ...tokenListWhere(req) },
    include: { client: true, site: true },
  });
  if (!token) throw new AppError(404, "Installer token not found");

  const revoked = await db.agentInstallToken.update({
    where: { id: token.id },
    data: { isRevoked: true },
    include: { client: true, site: true },
  });

  await writeAuditLog(req, "REVOKE", "agent-install-tokens", `Revoked installer token ${token.id}`);

  return res.json({
    id: revoked.id,
    clientId: revoked.clientId,
    siteId: revoked.siteId,
    client: revoked.client,
    site: revoked.site,
    os: revoked.os,
    agentType: revoked.agentType,
    deviceType: revoked.deviceType,
    expiresAt: revoked.expiresAt,
    maxUses: revoked.maxUses,
    usedCount: revoked.usedCount,
    isRevoked: revoked.isRevoked,
    createdAt: revoked.createdAt,
  });
}

export async function downloadWindowsAgentForToken(req: Request, res: Response) {
  const token = await db.agentInstallToken.findFirst({
    where: { id: req.params.id, ...tokenListWhere(req) },
    include: { client: true, site: true },
  });
  if (!token) throw new AppError(404, "Installer token not found");
  if (token.isRevoked) throw new AppError(403, "Installer token has been revoked");
  if (new Date(token.expiresAt).getTime() <= Date.now()) throw new AppError(403, "Installer token has expired");
  if (token.usedCount >= token.maxUses) throw new AppError(403, "Installer token usage limit reached");

  const rawToken = decryptToken(token.tokenCipher);
  if (!rawToken) {
    throw new AppError(409, "This token cannot be packaged because it was created before EXE packaging was enabled. Generate a new Windows agent token.");
  }

  let baseExe: Buffer;
  try {
    baseExe = await fs.readFile(baseWindowsAgentPath);
  } catch {
    return res.status(404).json({
      message: "Base Windows agent binary is not available. Build nscope-agent-base.exe first.",
    });
  }

  const generatedExe = appendEmbeddedPayload(baseExe, {
    serverUrl: normalizedApiUrl(),
    installToken: rawToken,
    tokenId: token.id,
    clientId: token.clientId,
    siteId: token.siteId,
    deviceType: token.deviceType,
    agentType: token.agentType,
  });
  const fileName = safeFileName(`nscope-agent-${token.client?.name ?? "client"}-${token.site?.name ?? "site"}.exe`);

  await writeAuditLog(req, "DOWNLOAD", "agent-install-tokens", `Downloaded Windows agent package for installer token ${token.id}`);

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  return res.send(generatedExe);
}

function appendEmbeddedPayload(baseExe: Buffer, payload: Record<string, string>) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  const suffix = Buffer.from(`\n${embeddedPayloadStart}\n${encoded}\n${embeddedPayloadEnd}\n`, "utf8");
  return Buffer.concat([baseExe, suffix]);
}

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}
