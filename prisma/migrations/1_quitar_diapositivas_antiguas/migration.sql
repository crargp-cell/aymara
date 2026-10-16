-- ANTES de aplicar esta migración en una base con datos, ejecuta una vez:
--   npx tsx prisma/migrar-diapositivas.ts
-- Convierte las diapositivas del formulario antiguo (layout/body/image_id) en lienzos;
-- las columnas se borran aquí y lo que no se haya convertido se perdería.

-- DropForeignKey
ALTER TABLE "topic_slides" DROP CONSTRAINT "topic_slides_image_id_fkey";

-- AlterTable
ALTER TABLE "topic_slides" DROP COLUMN "body",
DROP COLUMN "image_id",
DROP COLUMN "layout";

