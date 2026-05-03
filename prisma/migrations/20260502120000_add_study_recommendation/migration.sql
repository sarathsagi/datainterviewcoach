-- Study Recommendation: AI-generated "what to study next" plan, cached
-- per user with a content-hash key to keep LLM costs bounded.

-- CreateTable
CREATE TABLE "StudyRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contextHash" TEXT NOT NULL,
    "recommendation" JSONB NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyRecommendation_userId_createdAt_idx" ON "StudyRecommendation"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "StudyRecommendation_userId_contextHash_idx" ON "StudyRecommendation"("userId", "contextHash");

-- AddForeignKey
ALTER TABLE "StudyRecommendation" ADD CONSTRAINT "StudyRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
