-- schema_v4.sql
-- Run this in your Supabase SQL Editor to support separate trials and questions counts.

ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS questions_used integer DEFAULT 0;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS questions_remaining integer DEFAULT 15;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS trials_limit integer DEFAULT 10;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS questions_limit integer DEFAULT 15;
