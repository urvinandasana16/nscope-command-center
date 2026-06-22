ALTER TABLE "devices" ADD COLUMN "mesh_node_id" TEXT;
ALTER TABLE "devices" ADD COLUMN "remote_control_enabled" BOOLEAN NOT NULL DEFAULT false;
