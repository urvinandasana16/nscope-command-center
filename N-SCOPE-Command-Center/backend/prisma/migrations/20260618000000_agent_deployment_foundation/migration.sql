ALTER TABLE "devices" ADD COLUMN "manufacturer" TEXT;
ALTER TABLE "devices" ADD COLUMN "model" TEXT;

CREATE TABLE "agent_install_tokens" (
  "id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "site_id" TEXT NOT NULL,
  "os" TEXT NOT NULL DEFAULT 'WINDOWS',
  "agent_type" TEXT NOT NULL DEFAULT 'MODERN_WINDOWS',
  "device_type" TEXT NOT NULL DEFAULT 'Workstation',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "max_uses" INTEGER NOT NULL DEFAULT 1,
  "used_count" INTEGER NOT NULL DEFAULT 0,
  "is_revoked" BOOLEAN NOT NULL DEFAULT false,
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agent_install_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agents" (
  "id" TEXT NOT NULL,
  "device_id" TEXT NOT NULL,
  "agent_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "install_token_id" TEXT,
  "version" TEXT NOT NULL,
  "os" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ONLINE',
  "mesh_node_id" TEXT,
  "mesh_group_id" TEXT,
  "last_seen" TIMESTAMP(3),
  "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_heartbeats" (
  "id" TEXT NOT NULL,
  "agent_id" TEXT NOT NULL,
  "device_id" TEXT NOT NULL,
  "cpu_usage" DOUBLE PRECISION,
  "memory_usage" DOUBLE PRECISION,
  "disk_usage" DOUBLE PRECISION,
  "uptime" TEXT,
  "logged_in_user" TEXT,
  "ip_address" TEXT,
  "mac_address" TEXT,
  "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_heartbeats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "device_metrics" (
  "id" TEXT NOT NULL,
  "device_id" TEXT NOT NULL,
  "cpu_usage" DOUBLE PRECISION,
  "memory_usage" DOUBLE PRECISION,
  "disk_usage" DOUBLE PRECISION,
  "uptime" TEXT,
  "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "device_metrics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "installed_software" (
  "id" TEXT NOT NULL,
  "device_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" TEXT,
  "publisher" TEXT,
  "install_date" TEXT,
  "source" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "installed_software_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_tasks" (
  "id" TEXT NOT NULL,
  "agent_id" TEXT,
  "device_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "command" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "output" TEXT,
  "error_output" TEXT,
  "exit_code" INTEGER,
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  CONSTRAINT "agent_tasks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_install_tokens_token_hash_key" ON "agent_install_tokens"("token_hash");
CREATE UNIQUE INDEX "agents_device_id_key" ON "agents"("device_id");
CREATE UNIQUE INDEX "agents_agent_id_key" ON "agents"("agent_id");

ALTER TABLE "agent_install_tokens" ADD CONSTRAINT "agent_install_tokens_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_install_tokens" ADD CONSTRAINT "agent_install_tokens_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_install_tokens" ADD CONSTRAINT "agent_install_tokens_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agents" ADD CONSTRAINT "agents_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agents" ADD CONSTRAINT "agents_install_token_id_fkey" FOREIGN KEY ("install_token_id") REFERENCES "agent_install_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agent_heartbeats" ADD CONSTRAINT "agent_heartbeats_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("agent_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_heartbeats" ADD CONSTRAINT "agent_heartbeats_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "device_metrics" ADD CONSTRAINT "device_metrics_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "installed_software" ADD CONSTRAINT "installed_software_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("agent_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
