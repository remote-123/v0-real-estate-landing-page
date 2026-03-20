-- Run in Supabase SQL Editor before running dld_areas.ts

create table if not exists dld_areas (
  area_id             integer primary key,
  name_en             text,
  name_ar             text,
  municipality_number text,
  ingested_at         timestamptz default now()
);

create index if not exists dld_areas_name_en_idx on dld_areas(name_en);
