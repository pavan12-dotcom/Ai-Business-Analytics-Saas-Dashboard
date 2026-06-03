-- schema_document_table.sql
-- Run this script in your Supabase SQL Editor to initialize the documents table.

create table if not exists documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  filename text not null,
  text text not null,
  parsed_data text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row-Level Security (RLS) on Documents
alter table documents enable row-level security;

-- Row security policies for Documents
drop policy if exists "Users can view their own documents" on documents;
drop policy if exists "Users can insert their own documents" on documents;
drop policy if exists "Users can delete their own documents" on documents;

create policy "Users can view their own documents"
  on documents for select
  using (auth.uid() = user_id);

create policy "Users can insert their own documents"
  on documents for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own documents"
  on documents for delete
  using (auth.uid() = user_id);
