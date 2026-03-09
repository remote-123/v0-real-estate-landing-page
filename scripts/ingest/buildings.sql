-- Run this in Supabase SQL Editor before running the ingestion script

create table if not exists buildings (
  building_id         text primary key,
  construction_year   integer,
  completion_date     date,
  community_name      text,
  community_no        text,
  building_type       text,
  building_usages     text,
  building_status     text,
  no_of_lifts         integer,
  typical_floors      integer,
  total_area          numeric,
  building_height     numeric,
  plot_area           numeric,
  is_green_building   boolean,
  parcel_id           text,
  permit_no           text,
  project_no          text,
  ingested_at         timestamptz default now()
);

create index if not exists buildings_community_name_idx on buildings(community_name);
create index if not exists buildings_construction_year_idx on buildings(construction_year);
create index if not exists buildings_community_no_idx on buildings(community_no);
