-- schema_v2.sql
-- Consolidated schema script for Supabase.
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/evxxymkctwhwhkqcpyao/sql/new)

-- 1. Drop existing tables if they exist
drop table if exists documents cascade;
drop table if exists spreadsheets cascade;
drop table if exists customers cascade;
drop table if exists plan_distribution cascade;
drop table if exists monthly_metrics cascade;
drop table if exists kpis cascade;

-- 2. Create KPIs Table
create table kpis (
  id serial primary key,
  label text not null unique,
  value text not null,
  change text not null,
  up boolean not null
);

-- 3. Create Monthly Metrics Table
create table monthly_metrics (
  id serial primary key,
  month text not null unique,
  revenue numeric not null,
  mrr numeric not null,
  sort_order integer not null
);

-- 4. Create Plan Distribution Table
create table plan_distribution (
  id serial primary key,
  plan text not null unique,
  pct integer not null,
  color text not null
);

-- 5. Create Customers Table
create table customers (
  id text primary key,
  name text not null,
  email text,
  plan text not null,
  mrr numeric not null,
  status text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Create Spreadsheets Table (Foreign key references removed for robustness)
create table spreadsheets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  filename text not null,
  headers text[] not null,
  columns_metadata jsonb not null,
  rows jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Create Documents Table (Foreign key references removed for robustness)
create table documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  filename text not null,
  text text not null,
  parsed_data text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row-Level Security (RLS)
alter table spreadsheets enable row level security;
alter table documents enable row level security;

-- Row security policies for Spreadsheets
drop policy if exists "Users can view their own spreadsheets" on spreadsheets;
drop policy if exists "Users can insert their own spreadsheets" on spreadsheets;
drop policy if exists "Users can delete their own spreadsheets" on spreadsheets;

create policy "Users can view their own spreadsheets"
  on spreadsheets for select
  using (auth.uid() = user_id);

create policy "Users can insert their own spreadsheets"
  on spreadsheets for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own spreadsheets"
  on spreadsheets for delete
  using (auth.uid() = user_id);

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

-- 8. Seed Initial Data
insert into kpis (label, value, change, up) values
  ('Total Revenue', '$84,320', '+12.4%', true),
  ('Active Users', '2,841', '+8.1%', true),
  ('Churn Rate', '3.2%', '-0.4%', false),
  ('Avg. Rev / User', '$29.68', '+2.1%', true);

insert into monthly_metrics (month, revenue, mrr, sort_order) values
  ('Jan', 52000, 38000, 1),
  ('Feb', 58000, 47000, 2),
  ('Mar', 55000, 44000, 3),
  ('Apr', 67000, 56000, 4),
  ('May', 74000, 61000, 5),
  ('Jun', 84320, 72000, 6);

insert into plan_distribution (plan, pct, color) values
  ('Pro', 60, 'var(--accent)'),
  ('Team', 30, 'var(--teal)'),
  ('Enterprise', 10, 'var(--amber)');

insert into customers (id, name, plan, mrr, status) values
  ('1', 'Acme Corp', 'Enterprise', 4200, 'Active'),
  ('2', 'TechFlow', 'Team', 1800, 'Active'),
  ('3', 'Bright Labs', 'Pro', 890, 'Active'),
  ('4', 'Nova Inc', 'Team', 720, 'Pending'),
  ('5', 'Apex Systems', 'Pro', 290, 'Churned');
