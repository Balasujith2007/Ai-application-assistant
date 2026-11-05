-- AlterEnum
ALTER TYPE "RewardType" ADD VALUE 'PROFILE_TITLE';

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "equippedBadgeId" TEXT,
ADD COLUMN     "equippedFrameRewardId" TEXT,
ADD COLUMN     "equippedTitleRewardId" TEXT,
ADD COLUMN     "showcaseBadgeIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "reward_definitions" ADD COLUMN     "coinPrice" INTEGER,
ADD COLUMN     "isShopItem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "purchaseLimit" INTEGER DEFAULT 1,
ADD COLUMN     "shopCategory" TEXT;

-- CreateTable
CREATE TABLE "shop_purchases" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "rewardDefId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemValue" TEXT NOT NULL,
    "coinPrice" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refundTransactionId" TEXT,
    "refundedAt" TIMESTAMP(3),
    "refundedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "shop_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_purchases_idempotencyKey_key" ON "shop_purchases"("idempotencyKey");

-- CreateIndex
CREATE INDEX "shop_purchases_studentId_itemType_idx" ON "shop_purchases"("studentId", "itemType");

-- CreateIndex
CREATE INDEX "shop_purchases_studentId_rewardDefId_idx" ON "shop_purchases"("studentId", "rewardDefId");

-- CreateIndex
CREATE INDEX "shop_purchases_status_idx" ON "shop_purchases"("status");

-- CreateIndex
CREATE UNIQUE INDEX "shop_purchases_studentId_rewardDefId_key" ON "shop_purchases"("studentId", "rewardDefId");

-- AddForeignKey
ALTER TABLE "shop_purchases" ADD CONSTRAINT "shop_purchases_rewardDefId_fkey" FOREIGN KEY ("rewardDefId") REFERENCES "reward_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_purchases" ADD CONSTRAINT "shop_purchases_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

