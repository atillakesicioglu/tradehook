-- AlterEnum
ALTER TYPE "RiskType" ADD VALUE 'COMPOUND_USDT';
ALTER TYPE "RiskType" ADD VALUE 'FULL_POSITION';

-- CreateTable
CREATE TABLE "AlertPair" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "initialUsdt" DECIMAL(18,8) NOT NULL,
    "compoundUsdt" DECIMAL(18,8),
    "heldQuantity" DECIMAL(28,12),
    "buyAlertId" TEXT NOT NULL,
    "sellAlertId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertPair_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlertPair_buyAlertId_key" ON "AlertPair"("buyAlertId");
CREATE UNIQUE INDEX "AlertPair_sellAlertId_key" ON "AlertPair"("sellAlertId");
CREATE INDEX "AlertPair_userId_idx" ON "AlertPair"("userId");

-- AddForeignKey
ALTER TABLE "AlertPair" ADD CONSTRAINT "AlertPair_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlertPair" ADD CONSTRAINT "AlertPair_buyAlertId_fkey" FOREIGN KEY ("buyAlertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlertPair" ADD CONSTRAINT "AlertPair_sellAlertId_fkey" FOREIGN KEY ("sellAlertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
