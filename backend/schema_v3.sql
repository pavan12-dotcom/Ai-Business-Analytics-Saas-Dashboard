-- schema_v3.sql
-- Create user_subscriptions table to track SaaS Subscription status.
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/evxxymkctwhwhkqcpyao/sql/new)

CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  analyses_used integer DEFAULT 0,
  analyses_remaining integer DEFAULT 5,
  subscription_status text DEFAULT 'trial', -- 'demo', 'trial', 'active', 'expired', 'trial_exhausted'
  subscription_start timestamp with time zone DEFAULT timezone('utc'::text, now()),
  subscription_end timestamp with time zone DEFAULT timezone('utc'::text, now() + interval '1 month'),
  plan_type text DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) not null
);

-- Enable Row-Level Security (RLS)
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON user_subscriptions;

-- Row security policies for user_subscriptions
CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
  ON user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);
