CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'NOC_ENGINEER', 'SUPPORT_ENGINEER', 'CLIENT_ADMIN', 'CLIENT_VIEWER');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "ClientStatus" AS ENUM ('HEALTHY', 'WARNING', 'CRITICAL', 'INACTIVE');
CREATE TYPE "SiteStatus" AS ENUM ('HEALTHY', 'WARNING', 'CRITICAL', 'INACTIVE');
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'WARNING', 'CRITICAL', 'RETIRED');
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'AT_RISK', 'SERVICE_DUE', 'RETIRED');
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "NetworkDeviceStatus" AS ENUM ('NEW', 'KNOWN', 'IGNORED');

CREATE TABLE "clients" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contact_person" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address" TEXT,
  "status" "ClientStatus" NOT NULL DEFAULT 'HEALTHY',
  "sla_plan" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "client_id" TEXT,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "last_login" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sites" (
  "id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "network_range" TEXT NOT NULL,
  "status" "SiteStatus" NOT NULL DEFAULT 'HEALTHY',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "devices" (
  "id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "site_id" TEXT NOT NULL,
  "hostname" TEXT NOT NULL,
  "os" TEXT NOT NULL,
  "ip_address" TEXT NOT NULL,
  "mac_address" TEXT NOT NULL,
  "status" "DeviceStatus" NOT NULL DEFAULT 'ONLINE',
  "last_seen" TIMESTAMP(3),
  "agent_version" TEXT,
  "assigned_user" TEXT,
  "device_type" TEXT NOT NULL,
  "serial_number" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assets" (
  "id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "site_id" TEXT NOT NULL,
  "device_id" TEXT,
  "asset_tag" TEXT NOT NULL,
  "serial_number" TEXT NOT NULL,
  "device_type" TEXT NOT NULL,
  "assigned_user" TEXT,
  "location" TEXT NOT NULL,
  "purchase_date" TIMESTAMP(3),
  "warranty_expiry" TIMESTAMP(3),
  "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tickets" (
  "id" TEXT NOT NULL,
  "ticket_number" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "site_id" TEXT,
  "device_id" TEXT,
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priority" "TicketPriority" NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
  "assigned_engineer_id" TEXT,
  "created_by_id" TEXT NOT NULL,
  "sla_due" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ticket_comments" (
  "id" TEXT NOT NULL,
  "ticket_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "comment" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "network_devices" (
  "id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "site_id" TEXT NOT NULL,
  "ip_address" TEXT NOT NULL,
  "hostname" TEXT NOT NULL,
  "mac_address" TEXT,
  "vendor" TEXT,
  "device_type" TEXT NOT NULL,
  "open_ports" TEXT,
  "status" "NetworkDeviceStatus" NOT NULL DEFAULT 'NEW',
  "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "network_devices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "action" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "ip_address" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "assets_asset_tag_key" ON "assets"("asset_tag");
CREATE UNIQUE INDEX "tickets_ticket_number_key" ON "tickets"("ticket_number");

ALTER TABLE "users" ADD CONSTRAINT "users_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sites" ADD CONSTRAINT "sites_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devices" ADD CONSTRAINT "devices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devices" ADD CONSTRAINT "devices_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_engineer_id_fkey" FOREIGN KEY ("assigned_engineer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "network_devices" ADD CONSTRAINT "network_devices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "network_devices" ADD CONSTRAINT "network_devices_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
