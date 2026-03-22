/**
 * Creates rental_listings, reddit_seen_posts, and reddit_voice_samples in Neon.
 * Run: npx tsx --env-file=.env.local scripts/migrate-remaining-to-neon.ts
 */
import { sql } from './ingest/neon-client'

async function run() {
  // Drop and recreate rental_listings — old schema had wrong columns (area_name/beds/price/fetched_at)
  await sql.unsafe(`
    DROP TABLE IF EXISTS rental_listings;
    CREATE TABLE rental_listings (
      id                text primary key,
      source            text not null,
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
      raw               jsonb,
      ingested_at       timestamptz default now()
    );
    CREATE INDEX rental_listings_listed_at_idx ON rental_listings(listed_at desc);
    CREATE INDEX rental_listings_area_idx ON rental_listings(area);
    CREATE INDEX rental_listings_cluster_idx ON rental_listings(cluster);
    CREATE INDEX rental_listings_source_idx ON rental_listings(source);

    CREATE TABLE IF NOT EXISTS reddit_seen_posts (
      id              bigint generated always as identity primary key,
      post_id         text unique not null,
      subreddit       text,
      post_title      text,
      post_url        text,
      post_body       text,
      generated_reply text,
      telegram_sent   boolean default false,
      created_at      timestamptz default now()
    );

    CREATE TABLE IF NOT EXISTS reddit_voice_samples (
      id           bigint generated always as identity primary key,
      comment_body text,
      score        integer,
      subreddit    text,
      created_at   timestamptz default now()
    );
  `)

  console.log('✅ rental_listings, reddit_seen_posts, reddit_voice_samples created in Neon')
  await sql.end()
}

run().catch((err) => { console.error(err); process.exit(1) })
