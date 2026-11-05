-- CreateTable
CREATE TABLE "administrators" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "administrators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floor_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "image_url" TEXT NOT NULL,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "floor_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "network_devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "onos_device_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "device_type" VARCHAR(50) NOT NULL,
    "ip_address" INET,
    "mac_address" VARCHAR(50),
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "network_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_ports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "device_id" UUID NOT NULL,
    "port_number" VARCHAR(50) NOT NULL,
    "mac_address" VARCHAR(50),
    "ip_address" INET,
    "speed_mbps" INTEGER,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_ports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spatial_coordinates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "device_id" UUID NOT NULL,
    "floor_plan_id" UUID NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spatial_coordinates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "network_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "onos_link_id" VARCHAR(255),
    "source_port_id" UUID NOT NULL,
    "destination_port_id" UUID NOT NULL,
    "floor_plan_id" UUID NOT NULL,
    "waypoints" JSONB NOT NULL DEFAULT '[]',
    "cable_type" VARCHAR(50) NOT NULL DEFAULT 'COPPER',
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "network_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "intent_key" VARCHAR(255),
    "intent_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "is_applied" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routing_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "administrators_email_key" ON "administrators"("email");

-- CreateIndex
CREATE UNIQUE INDEX "network_devices_onos_device_id_key" ON "network_devices"("onos_device_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_device_port" ON "device_ports"("device_id", "port_number");

-- CreateIndex
CREATE UNIQUE INDEX "uq_device_floor_plan" ON "spatial_coordinates"("device_id", "floor_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "routing_policies_intent_key_key" ON "routing_policies"("intent_key");

-- AddForeignKey
ALTER TABLE "floor_plans" ADD CONSTRAINT "fk_floor_plans_admin" FOREIGN KEY ("created_by") REFERENCES "administrators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_ports" ADD CONSTRAINT "fk_device_ports_device" FOREIGN KEY ("device_id") REFERENCES "network_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spatial_coordinates" ADD CONSTRAINT "fk_spatial_device" FOREIGN KEY ("device_id") REFERENCES "network_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spatial_coordinates" ADD CONSTRAINT "fk_spatial_floor_plan" FOREIGN KEY ("floor_plan_id") REFERENCES "floor_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_links" ADD CONSTRAINT "fk_links_source_port" FOREIGN KEY ("source_port_id") REFERENCES "device_ports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_links" ADD CONSTRAINT "fk_links_destination_port" FOREIGN KEY ("destination_port_id") REFERENCES "device_ports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_links" ADD CONSTRAINT "fk_links_floor_plan" FOREIGN KEY ("floor_plan_id") REFERENCES "floor_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_policies" ADD CONSTRAINT "fk_policies_admin" FOREIGN KEY ("created_by") REFERENCES "administrators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

