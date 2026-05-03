-- Mastery Snapshot: per-user × per-topic × per-day record of cardsKnown/Total
-- so the Progress page can show week-over-week mastery deltas.

-- CreateTable
CREATE TABLE "MasterySnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicSlug" TEXT NOT NULL,
    "cardsKnown" INTEGER NOT NULL,
    "cardsTotal" INTEGER NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MasterySnapshot_userId_topicSlug_snapshotDate_key" ON "MasterySnapshot"("userId", "topicSlug", "snapshotDate");

-- CreateIndex
CREATE INDEX "MasterySnapshot_userId_snapshotDate_idx" ON "MasterySnapshot"("userId", "snapshotDate" DESC);

-- AddForeignKey
ALTER TABLE "MasterySnapshot" ADD CONSTRAINT "MasterySnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
