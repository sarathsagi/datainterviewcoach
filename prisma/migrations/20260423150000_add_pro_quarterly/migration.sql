-- Add PRO_QUARTERLY value to SubscriptionPlan enum.
-- Placed BEFORE PRO_YEARLY so the enum order (monthly < quarterly < yearly)
-- matches the pricing ladder semantically. This has no functional impact on
-- existing rows — it's purely for logical ordering when listing enum values.
--
-- Postgres 12+ allows ALTER TYPE ADD VALUE in a transaction as long as the
-- new value isn't referenced in the same transaction. This migration only
-- extends the enum; application code is updated in a separate deploy.

ALTER TYPE "SubscriptionPlan" ADD VALUE 'PRO_QUARTERLY' BEFORE 'PRO_YEARLY';
