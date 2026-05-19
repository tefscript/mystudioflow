-- CreateTable
CREATE TABLE "appointment_services" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,

    CONSTRAINT "appointment_services_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_appointment_id_fkey"
    FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UniqueConstraint
CREATE UNIQUE INDEX "appointment_services_appointment_id_service_id_key"
    ON "appointment_services"("appointment_id", "service_id");

-- Migrate existing data: copy current service_id to junction table
INSERT INTO "appointment_services" ("id", "appointment_id", "service_id")
SELECT gen_random_uuid()::text, "id", "service_id"
FROM "appointments"
WHERE "service_id" IS NOT NULL;

-- DropColumn
ALTER TABLE "appointments" DROP COLUMN "service_id";
