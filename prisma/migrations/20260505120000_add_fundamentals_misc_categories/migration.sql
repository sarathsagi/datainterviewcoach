-- Restructure Learn IA: add a foundational "Fundamentals" track at the
-- top and a "Misc" catch-all at the bottom. Existing categories keep
-- their slugs unchanged so user progress (UserPathProgress, UserModuleProgress)
-- carries over without touching path/module rows.
--
-- ESSENTIAL_SKILLS is preserved (don't drop enum values that paths still
-- reference). Future migration can drop it once the last path moves out.

ALTER TYPE "ContentCategory" ADD VALUE 'DATA_ENGINEERING_FUNDAMENTALS';
ALTER TYPE "ContentCategory" ADD VALUE 'MISC';
