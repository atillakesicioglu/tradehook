-- CreateEnum
CREATE TYPE "SlTpMode" AS ENUM ('PERCENT', 'USDT');

-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "stopLossEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stopLossMode" "SlTpMode",
ADD COLUMN     "stopLossValue" DECIMAL(18,8),
ADD COLUMN     "takeProfitEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "takeProfitMode" "SlTpMode",
ADD COLUMN     "takeProfitValue" DECIMAL(18,8);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "balanceBeforeUsdt" DECIMAL(28,12),
ADD COLUMN     "balanceAfterUsdt" DECIMAL(28,12);
