-- Run in Supabase SQL Editor before running dld_units.ts
-- Source CSV: dld_units.csv (2,376,922 rows)

create table if not exists dld_units (
  property_id             text primary key,
  area_id                 integer,
  zone_id                 integer,
  area_name_en            text,
  land_number             text,
  land_sub_number         text,
  building_number         text,
  unit_number             text,
  unit_balcony_area       numeric,
  unit_parking_number     text,
  parking_allocation_type_en text,
  common_area             numeric,
  actual_common_area      numeric,
  floor                   integer,
  rooms_en                text,
  actual_area             numeric,
  property_type_en        text,
  property_sub_type_en    text,
  parent_property_id      text,
  grandparent_property_id text,
  creation_date           date,
  munc_zip_code           text,
  munc_number             text,
  parcel_id               text,
  is_free_hold            boolean,
  is_lease_hold           boolean,
  is_registered           boolean,
  pre_registration_number text,
  master_project_id       integer,
  master_project_en       text,
  project_id              integer,
  project_name_en         text,
  land_type_en            text,
  ingested_at             timestamptz default now()
);

create index if not exists dld_units_area_id_idx on dld_units(area_id);
create index if not exists dld_units_project_id_idx on dld_units(project_id);
create index if not exists dld_units_property_type_en_idx on dld_units(property_type_en);
create index if not exists dld_units_rooms_en_idx on dld_units(rooms_en);
create index if not exists dld_units_actual_area_idx on dld_units(actual_area);
