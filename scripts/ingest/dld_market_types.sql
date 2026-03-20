-- Run in Supabase SQL Editor before running dld_market_types.ts

create table if not exists dld_market_types (
  market_type_id  integer primary key,
  name_ar         text,
  name_en         text,
  ingested_at     timestamptz default now()
);
