-- Multi-turn mock interview: store the candidate's answer to the AI-generated
-- follow-up question + the AI's evaluation of that answer. The follow-up
-- question itself lives inside `evaluation.follow_up` (already populated by
-- existing prompts) — these columns just close the loop.

ALTER TABLE "MockInterviewSession"
  ADD COLUMN "followUpAnswer" TEXT,
  ADD COLUMN "followUpEvaluation" JSONB;
