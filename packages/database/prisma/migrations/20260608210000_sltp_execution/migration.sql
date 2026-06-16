-- CreateEnum
CREATE TYPE "PositionCloseReason" AS ENUM ('STOP_LOSS', 'TAKE_PROFIT');
CREATE TYPE "OrderTrigger" AS ENUM ('WEBHOOK', 'STOP_LOSS', 'TAKE_PROFIT');

-- AlterTable Order
ALTER TABLE "Order" ADD COLUMN "trigger" "OrderTrigger" NOT NULL DEFAULT 'WEBHOOK',
ADD COLUMN "positionId" TEXT;

CREATE INDEX "Order_positionId_idx" ON "Order"("positionId");

-- AlterTable Position
ALTER TABLE "Position" ADD COLUMN "alertId" TEXT,
ADD COLUMN "entryOrderId" TEXT,
ADD COLUMN "stopLossPrice" DECIMAL(28,12),
ADD COLUMN "takeProfitPrice" DECIMAL(28,12),
ADD COLUMN "closeReason" "PositionCloseReason",
ADD COLUMN "exitOrderId" TEXT,
ADD COLUMN "closedAt" TIMESTAMP(3);

CREATE INDEX "Position_alertId_idx" ON "Position"("alertId");
CREATE INDEX "Position_status_idx" ON "Position"("status");

ALTER TABLE "Position" ADD CONSTRAINT "Position_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE SET NULL ON UPDATE CASCADE;
