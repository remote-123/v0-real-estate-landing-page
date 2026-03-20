-- Run in Supabase SQL Editor before running dld_buildings_registry.ts
-- Source CSV: dld_buildings.csv (243,824 rows)
-- PK: property_id (text) — uniquely identifies a building unit record

create table if not exists dld_buildings_registry (
  property_id             text primary key,
  area_id                 integer,
  zone_id                 integer,
  area_name_ar            text,
  area_name_en            text,
  land_number             text,
  land_sub_number         text,
  building_number         text,
  common_area             numeric,
  actual_common_area      numeric,
  floors                  integer,
  rooms                   text,
  rooms_ar                text,
  rooms_en                text,
  car_parks               integer,
  built_up_area           numeric,
  bld_levels              integer,
  shops                   integer,
  flats                   integer,
  offices                 integer,
  swimming_pools          integer,
  elevators               integer,
  actual_area             numeric,
  property_type_id        integer,
  property_type_ar        text,
  property_type_en        text,
  property_sub_type_id    integer,
  property_sub_type_ar    text,
  property_sub_type_en    text,
  parent_property_id      text,
  creation_date           date,
  parcel_id               text,
  is_free_hold            boolean,
  is_lease_hold           boolean,
  is_registered           boolean,
  pre_registration_number text,
  master_project_id       integer,
  master_project_en       text,
  master_project_ar       text,
  project_id              integer,
  project_name_ar         text,
  project_name_en         text,
  land_type_id            integer,
  land_type_ar            text,
  land_type_en            text,
  ingested_at             timestamptz default now()
);

create index if not exists dld_buildings_registry_area_id_idx on dld_buildings_registry(area_id);
create index if not exists dld_buildings_registry_project_id_idx on dld_buildings_registry(project_id);
create index if not exists dld_buildings_registry_area_name_en_idx on dld_buildings_registry(area_name_en);
create index if not exists dld_buildings_registry_project_name_en_idx on dld_buildings_registry(project_name_en);
create index if not exists dld_buildings_registry_property_type_en_idx on dld_buildings_registry(property_type_en);
