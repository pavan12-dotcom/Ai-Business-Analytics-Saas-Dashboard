-- SQL Migration Script: Create spreadsheets table
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/evxxymkctwhwhkqcpyao/sql/new)

create table if not exists spreadsheets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  filename text not null,
  headers text[] not null,
  columns_metadata jsonb not null,
  rows jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable row-level security
alter table spreadsheets enable row-level security;

-- Drop existing policies if they exist to avoid duplication errors
drop policy if exists "Users can view their own spreadsheets" on spreadsheets;
drop policy if exists "Users can insert their own spreadsheets" on spreadsheets;
drop policy if exists "Users can delete their own spreadsheets" on spreadsheets;

-- Row security policies
create policy "Users can view their own spreadsheets"
  on spreadsheets for select
  using (auth.uid() = user_id);

create policy "Users can insert their own spreadsheets"
  on spreadsheets for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own spreadsheets"
  on spreadsheets for delete
  using (auth.uid() = user_id);
