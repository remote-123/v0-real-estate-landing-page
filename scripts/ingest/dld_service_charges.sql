-- Run in Supabase SQL Editor before running dld_service_charges.ts

create table if not exists dld_service_charges (
  id                          bigint generated always as identity primary key,
  master_community_id         integer,
  master_community_name_en    text,
  master_community_name_ar    text,
  property_group_id           integer,
  property_group_name_en      text,
  property_group_name_ar      text,
  project_id                  integer,
  project_name                text,
  usage_id                    integer,
  usage_name_en               text,
  usage_name_ar               text,
  budget_year                 integer,
  service_cost                numeric,
  service_category_id         integer,
  service_category_name_en    text,
  service_category_name_ar    text,
  management_company_id       integer,
  management_company_name_en  text,
  management_company_name_ar  text,
  ingested_at                 timestamptz default now(),
  unique (project_id, budget_year, service_category_id, usage_id, management_company_id)
);

create index if not exists dld_service_charges_master_community_idx on dld_service_charges(master_community_id);
create index if not exists dld_service_charges_project_id_idx on dld_service_charges(project_id);
create index if not exists dld_service_charges_budget_year_idx on dld_service_charges(budget_year);
