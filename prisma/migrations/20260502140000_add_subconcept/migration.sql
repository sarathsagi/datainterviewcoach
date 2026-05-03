-- Add subConcept tagging to QuizQuestion. Powers the "concepts you keep
-- missing" weakness map on /progress. Optional for backwards-compat with
-- existing rows; the seed script will fill these in.

-- AlterTable
ALTER TABLE "QuizQuestion" ADD COLUMN "subConcept" TEXT;

-- CreateIndex
CREATE INDEX "QuizQuestion_topicSlug_subConcept_idx" ON "QuizQuestion"("topicSlug", "subConcept");
