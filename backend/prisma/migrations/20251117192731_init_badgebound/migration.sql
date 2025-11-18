-- CreateEnum
CREATE TYPE "QuestType" AS ENUM ('ONBOARDING', 'DAILY', 'WEEKLY', 'SEASONAL', 'ACHIEVEMENT');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('LOCKED', 'IN_PROGRESS', 'COMPLETED', 'CLAIMED', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "wallet" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("wallet")
);

-- CreateTable
CREATE TABLE "Protocol" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "config" JSONB,

    CONSTRAINT "Protocol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" SERIAL NOT NULL,
    "protocolId" INTEGER,
    "type" "QuestType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "requirement" JSONB NOT NULL,
    "reward" JSONB NOT NULL,
    "seasonId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQuest" (
    "id" SERIAL NOT NULL,
    "userWallet" TEXT NOT NULL,
    "questId" INTEGER NOT NULL,
    "status" "QuestStatus" NOT NULL DEFAULT 'LOCKED',
    "progressData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "UserQuest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Protocol_slug_key" ON "Protocol"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuest_userWallet_questId_key" ON "UserQuest"("userWallet", "questId");

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "Protocol"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuest" ADD CONSTRAINT "UserQuest_userWallet_fkey" FOREIGN KEY ("userWallet") REFERENCES "User"("wallet") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuest" ADD CONSTRAINT "UserQuest_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
