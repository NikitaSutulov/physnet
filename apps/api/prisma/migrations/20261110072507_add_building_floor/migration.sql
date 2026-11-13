-- AlterTable
ALTER TABLE "floor_plans" ADD COLUMN     "building" VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN     "floor_level" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "idx_floor_plans_building_floor" ON "floor_plans"("building", "floor_level");
