-- Run in Supabase SQL Editor before running dld_price_index.ts
-- Source CSV: dld_residential.csv (first_date_of_month is DD-MM-YYYY → stored as date PK)

create table if not exists dld_price_index (
  period                          date primary key,
  all_monthly_index               numeric,
  all_quarterly_index             numeric,
  all_yearly_index                numeric,
  flat_monthly_index              numeric,
  flat_quarterly_index            numeric,
  flat_yearly_index               numeric,
  villa_monthly_index             numeric,
  villa_quarterly_index           numeric,
  villa_yearly_index              numeric,
  all_monthly_price_index         numeric,
  all_quarterly_price_index       numeric,
  all_yearly_price_index          numeric,
  flat_monthly_price_index        numeric,
  flat_quarterly_price_index      numeric,
  flat_yearly_price_index         numeric,
  villa_monthly_price_index       numeric,
  villa_quarterly_price_index     numeric,
  villa_yearly_price_index        numeric,
  ingested_at                     timestamptz default now()
);

create index if not exists dld_price_index_period_idx on dld_price_index(period desc);
