-- CreateEnum
CREATE TYPE "BinanceExchange" AS ENUM ('GLOBAL', 'TR');

-- AlterTable
ALTER TABLE "BinanceAccount" ADD COLUMN "exchange" "BinanceExchange" NOT NULL DEFAULT 'GLOBAL';
