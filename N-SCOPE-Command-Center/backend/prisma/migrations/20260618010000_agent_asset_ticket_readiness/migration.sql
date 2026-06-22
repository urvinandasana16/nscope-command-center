ALTER TABLE "assets" ADD COLUMN "name" TEXT;
ALTER TABLE "tickets" ADD COLUMN "asset_id" TEXT;

CREATE INDEX "assets_device_id_idx" ON "assets"("device_id");
CREATE INDEX "tickets_asset_id_idx" ON "tickets"("asset_id");

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
