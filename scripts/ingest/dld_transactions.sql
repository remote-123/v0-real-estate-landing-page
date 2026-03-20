-- Run in Supabase SQL Editor before running dld_transactions.ts
-- Source CSV: dubai_transactions.csv (1,665,112 rows)
-- instance_date is DD-MM-YYYY → stored as date

create table if not exists dld_transactions (
  transaction_id          text primary key,
  procedure_id            integer,
  trans_group_id          integer,
  trans_group_en          text,
  procedure_name_en       text,
  instance_date           date,
  property_type_en        text,
  property_sub_type_en    text,
  property_usage_en       text,
  reg_type_en             text,
  area_id                 integer,
  area_name_en            text,
  building_name_en        text,
  project_number          text,
  project_name_en         text,
  master_project_en       text,
  nearest_landmark_en     text,
  nearest_metro_en        text,
  nearest_mall_en         text,
  rooms_en                text,
  has_parking             boolean,
  procedure_area          numeric,
  actual_worth            numeric,
  meter_sale_price        numeric,
  rent_value              numeric,
  meter_rent_price        numeric,
  no_of_parties_role_1    integer,
  no_of_parties_role_2    integer,
  no_of_parties_role_3    integer,
  ingested_at             timestamptz default now()
);

create index if not exists dld_transactions_instance_date_idx on dld_transactions(instance_date desc);
create index if not exists dld_transactions_area_id_idx on dld_transactions(area_id);
create index if not exists dld_transactions_trans_group_en_idx on dld_transactions(trans_group_en);
create index if not exists dld_transactions_procedure_id_idx on dld_transactions(procedure_id);
create index if not exists dld_transactions_meter_sale_price_idx on dld_transactions(meter_sale_price);
