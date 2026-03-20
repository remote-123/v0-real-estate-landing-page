-- Run in Supabase SQL Editor before running dld_transaction_procedures.ts

create table if not exists dld_transaction_procedures (
  group_id             integer not null,
  procedure_id         integer not null,
  is_pre_registration  boolean,
  name_ar              text,
  name_en              text,
  ingested_at          timestamptz default now(),
  primary key (group_id, procedure_id)
);

create index if not exists dld_transaction_procedures_group_idx on dld_transaction_procedures(group_id);
