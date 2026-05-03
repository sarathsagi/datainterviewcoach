-- Practice listing parity with MockQuestion: companyTags filter.
-- Test-case payload for the in-browser executor (Phase 4 — Pyodide / PGlite).
--
-- companyTags defaults to empty array (matches existing tags column pattern).
-- testCases is nullable — backfilled progressively as we author test
-- harnesses per problem.

-- AlterTable
ALTER TABLE "PracticeQuestion"
  ADD COLUMN "companyTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "testCases" JSONB;

-- CreateIndex
-- GIN-indexed array contains for `where: { companyTags: { has: "Meta" } }`.
CREATE INDEX "PracticeQuestion_companyTags_idx" ON "PracticeQuestion" USING GIN ("companyTags");
