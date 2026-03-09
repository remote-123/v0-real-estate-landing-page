-- Run in Supabase SQL Editor before deploying the cron job

create table if not exists rental_listings (
  id                text primary key,       -- e.g. "bayut-14394097"
  source            text not null,          -- "bayut" | "pf"
  title             text,
  cluster           text,
  area              text,
  type              text,
  bedrooms          text,
  size_sqft         numeric,
  annual_price      numeric,
  monthly_price     numeric,
  price_per_sqft    numeric,
  external_url      text,
  listed_at         timestamptz,
  raw               jsonb,                  -- full Apify record for future use
  ingested_at       timestamptz default now()
);

create index if not exists rental_listings_listed_at_idx on rental_listings(listed_at desc);
create index if not exists rental_listings_area_idx on rental_listings(area);
create index if not exists rental_listings_source_idx on rental_listings(source);
