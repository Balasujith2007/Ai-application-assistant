-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RewardTriggerType" ADD VALUE 'MONTHLY_GOLD_CHAMPION';
ALTER TYPE "RewardTriggerType" ADD VALUE 'MONTHLY_SILVER_CHAMPION';
ALTER TYPE "RewardTriggerType" ADD VALUE 'MONTHLY_BRONZE_CHAMPION';
ALTER TYPE "RewardTriggerType" ADD VALUE 'MONTHLY_CAREER_EXCELLENCE';
ALTER TYPE "RewardTriggerType" ADD VALUE 'MONTHLY_CONSISTENT_PERFORMER';
ALTER TYPE "RewardTriggerType" ADD VALUE 'MONTHLY_RISING_STAR';

-- AlterTable
ALTER TABLE "student_badges" ADD COLUMN     "awardSource" TEXT NOT NULL DEFAULT 'ENGINE',
ADD COLUMN     "awardedById" TEXT,
ADD COLUMN     "credentialId" TEXT,
ADD COLUMN     "credentialStatus" TEXT NOT NULL DEFAULT 'VALID',
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "revokedReason" TEXT;

-- CreateTable
CREATE TABLE "badge_catalog" (
    "badgeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'BRONZE',
    "description" TEXT NOT NULL,
    "criteria" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "threshold" DOUBLE PRECISION NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "rarity" TEXT NOT NULL DEFAULT 'COMMON',
    "awardSource" TEXT NOT NULL DEFAULT 'ENGINE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "artworkKey" TEXT,
    "monthlyRule" JSONB,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badge_catalog_pkey" PRIMARY KEY ("badgeId")
);

-- CreateTable
CREATE TABLE "monthly_performance_snapshots" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "weightedScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "careerBreakdown" JSONB,
    "weeksActive" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_performance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_recognition_runs" (
    "id" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "evaluationStart" TIMESTAMP(3) NOT NULL,
    "evaluationEnd" TIMESTAMP(3) NOT NULL,
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "championsAwarded" INTEGER NOT NULL DEFAULT 0,
    "badgesAwarded" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resultSummary" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_recognition_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badge_award_audits" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ENGINE',
    "reason" TEXT NOT NULL,
    "actorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badge_award_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "badge_catalog_category_active_idx" ON "badge_catalog"("category", "active");

-- CreateIndex
CREATE INDEX "monthly_performance_snapshots_monthKey_weightedScore_idx" ON "monthly_performance_snapshots"("monthKey", "weightedScore");

-- CreateIndex
CREATE INDEX "monthly_performance_snapshots_studentId_monthKey_idx" ON "monthly_performance_snapshots"("studentId", "monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_performance_snapshots_studentId_monthKey_key" ON "monthly_performance_snapshots"("studentId", "monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_recognition_runs_monthKey_key" ON "monthly_recognition_runs"("monthKey");

-- CreateIndex
CREATE INDEX "monthly_recognition_runs_status_idx" ON "monthly_recognition_runs"("status");

-- CreateIndex
CREATE INDEX "badge_award_audits_studentId_createdAt_idx" ON "badge_award_audits"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "badge_award_audits_badgeId_createdAt_idx" ON "badge_award_audits"("badgeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "student_badges_credentialId_key" ON "student_badges"("credentialId");
