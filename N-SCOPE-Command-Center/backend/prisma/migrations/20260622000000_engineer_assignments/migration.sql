ALTER TABLE "clients" ADD COLUMN "assigned_engineer_id" TEXT;
ALTER TABLE "sites" ADD COLUMN "assigned_engineer_id" TEXT;

CREATE INDEX "clients_assigned_engineer_id_idx" ON "clients"("assigned_engineer_id");
CREATE INDEX "sites_assigned_engineer_id_idx" ON "sites"("assigned_engineer_id");

ALTER TABLE "clients"
ADD CONSTRAINT "clients_assigned_engineer_id_fkey"
FOREIGN KEY ("assigned_engineer_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sites"
ADD CONSTRAINT "sites_assigned_engineer_id_fkey"
FOREIGN KEY ("assigned_engineer_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
