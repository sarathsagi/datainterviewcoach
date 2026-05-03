-- Rename existing PYTHON value to PYTHON_DE (Python for Data Engineers)
-- and add a new ALGORITHMS value for the LeetCode-style Python Core 40 track.
--
-- Postgres 12+ supports ALTER TYPE RENAME VALUE and ALTER TYPE ADD VALUE
-- within a single transaction as long as the new values aren't referenced
-- in the same transaction. This migration only redefines the enum — data
-- rows referencing the old PYTHON value are automatically pointed at
-- PYTHON_DE by the RENAME.

ALTER TYPE "PracticeCategory" RENAME VALUE 'PYTHON' TO 'PYTHON_DE';
ALTER TYPE "PracticeCategory" ADD VALUE 'ALGORITHMS';
