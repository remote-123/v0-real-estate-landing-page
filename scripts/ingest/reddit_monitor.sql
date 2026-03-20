-- Run in Supabase SQL Editor before deploying the Reddit monitor API
-- Tracks which Reddit posts we've already seen + what reply was generated

create table if not exists reddit_seen_posts (
  post_id         text primary key,           -- Reddit post fullname e.g. "t3_abc123"
  subreddit       text not null,
  post_title      text,
  post_url        text,                        -- Reddit thread URL
  post_body       text,                        -- Post text content
  generated_reply text,                        -- The Gemini-generated reply draft
  telegram_sent   boolean default false,
  user_posted     boolean default false,       -- Mark true after you actually post it
  created_at      timestamptz default now()
);

-- Stores your Reddit comment history for voice training
-- Run the voice extraction script once, it populates this table
create table if not exists reddit_voice_samples (
  id              text primary key,            -- Reddit comment fullname
  subreddit       text,
  post_title      text,                        -- Title of post being replied to
  comment_body    text not null,               -- Your actual comment text
  score           int default 0,               -- Upvotes (used to filter quality samples)
  created_utc     timestamptz,
  ingested_at     timestamptz default now()
);

create index if not exists reddit_seen_posts_created_idx on reddit_seen_posts(created_at desc);
create index if not exists reddit_voice_samples_score_idx on reddit_voice_samples(score desc);
