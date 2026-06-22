ALTER TABLE "devices" ADD COLUMN "bios_serial_number" TEXT;
ALTER TABLE "devices" ADD COLUMN "motherboard_serial_number" TEXT;
ALTER TABLE "devices" ADD COLUMN "os_name" TEXT;
ALTER TABLE "devices" ADD COLUMN "os_version" TEXT;
ALTER TABLE "devices" ADD COLUMN "os_build" TEXT;
ALTER TABLE "devices" ADD COLUMN "cpu" TEXT;
ALTER TABLE "devices" ADD COLUMN "cpu_cores" INTEGER;
ALTER TABLE "devices" ADD COLUMN "ram_bytes" BIGINT;
ALTER TABLE "devices" ADD COLUMN "disk_bytes" BIGINT;
ALTER TABLE "devices" ADD COLUMN "disk_free_bytes" BIGINT;
ALTER TABLE "devices" ADD COLUMN "disk_model" TEXT;
ALTER TABLE "devices" ADD COLUMN "remote_consent_required" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "devices" ADD COLUMN "last_uninstalled_at" TIMESTAMP(3);

ALTER TABLE "agents" ADD COLUMN "last_uninstalled_at" TIMESTAMP(3);

CREATE TABLE "device_services" (
  "id" TEXT NOT NULL,
  "device_id" TEXT NOT NULL,
  "service_name" TEXT NOT NULL,
  "display_name" TEXT,
  "status" TEXT NOT NULL,
  "start_type" TEXT,
  "path_name" TEXT,
  "account_name" TEXT,
  "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "device_services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "device_processes" (
  "id" TEXT NOT NULL,
  "device_id" TEXT NOT NULL,
  "pid" INTEGER NOT NULL,
  "process_name" TEXT NOT NULL,
  "executable_path" TEXT,
  "username" TEXT,
  "cpu_usage" DOUBLE PRECISION,
  "memory_bytes" BIGINT,
  "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "device_processes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "device_services_device_id_idx" ON "device_services"("device_id");
CREATE INDEX "device_processes_device_id_idx" ON "device_processes"("device_id");

ALTER TABLE "device_services" ADD CONSTRAINT "device_services_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "device_processes" ADD CONSTRAINT "device_processes_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
