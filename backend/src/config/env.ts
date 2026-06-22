import dotenv from "dotenv";

dotenv.config();

function envValue(...values: Array<string | undefined>) {
  for (const value of values) {
    const cleaned = value?.trim().replace(/^['"]|['"]$/g, "");
    if (cleaned) return cleaned;
  }
  return undefined;
}

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "replace-me-in-production",
  port: Number(process.env.PORT ?? 5000),
  frontendUrl: envValue(process.env.FRONTEND_URL, process.env.FRONTEND_PUBLIC_URL) ?? "http://localhost:3000",
  frontendPublicUrl: envValue(process.env.FRONTEND_PUBLIC_URL, process.env.FRONTEND_URL) ?? "http://localhost:3000",
  corsOrigin: envValue(process.env.CORS_ORIGIN) ?? "",
  agentPublicApiUrl: envValue(process.env.AGENT_PUBLIC_API_URL, process.env.API_BASE_URL, process.env.NEXT_PUBLIC_API_URL) ?? `http://localhost:${process.env.PORT ?? 5000}/api`,
  agentTokenEncryptionKey: process.env.AGENT_TOKEN_ENCRYPTION_KEY ?? process.env.JWT_SECRET ?? "replace-me-in-production",
  meshCentralUrl: envValue(process.env.MESHCENTRAL_URL),
  meshCentralApiUrl: envValue(process.env.MESHCENTRAL_API_URL),
  meshCentralApiKey: envValue(process.env.MESHCENTRAL_API_KEY),
  meshCentralDomainId: envValue(process.env.MESHCENTRAL_DOMAIN_ID),
  meshCentralDeviceGroupId: envValue(process.env.MESHCENTRAL_DEVICE_GROUP_ID),
};
