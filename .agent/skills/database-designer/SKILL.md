# Database Designer — POWERFUL Tier Skill

## Overview
Expert-level database design for scalable, performant, maintainable schemas. Covers schema design, indexing, migrations, partitioning, and database selection.

## Core Competencies

### Schema Design & Analysis
- Normalization (1NF–BCNF) and strategic denormalization for read-heavy workloads
- Data type optimization and constraint validation (FKs, unique, not-null)
- Materialized aggregates for pre-computed summaries
- ERD generation via Mermaid diagrams

### Index Optimization
- B-tree (range/sort), Hash (equality), Partial (filtered), Covering (avoid table lookups), Composite (column order by selectivity)
- Gap analysis: missing FK indexes, query pattern coverage
- Redundancy detection: overlapping/unused indexes

### Migration Management
- Zero-downtime expand-contract pattern
- Batch backfills, rollback scripts, dependency-ordered execution

## Key Design Patterns

### Star Schema (analytical/read-heavy)
Central fact table + dimension tables. Use for pre-aggregated community metrics.

### Materialized Aggregates
Pre-compute expensive calculations (avg price/sqft, yield) into summary tables. Refresh on schedule rather than computing on every request.

### JSONB Document Fields
Store flexible/sparse attributes in JSONB with GIN indexes. Useful for community metadata that varies by type.

### Partitioning
Range partition time-series data (transactions) by year/month. Dramatically improves query speed on large tables.

## Database Selection

| Need | Recommendation |
|------|----------------|
| ACID + complex queries + JSON | PostgreSQL (Supabase/Neon) |
| Global scale + horizontal | CockroachDB / PlanetScale |
| Cache / session | Redis |
| Flexible schema | MongoDB |

**For this project**: Supabase (PostgreSQL) — integrates with Next.js/Vercel, has REST + realtime, free tier sufficient for start.

## Performance Principles
1. Index foreign keys on both sides of joins
2. Composite index: most selective column first
3. Covering indexes eliminate table lookups for hot queries
4. Connection pooling: Supabase has built-in pgBouncer
5. Read replicas for analytics queries vs. write-heavy OLTP

## Security
- Row-Level Security (RLS) in Supabase for multi-tenant data isolation
- Least privilege: separate read-only role for public API queries
- Encrypt sensitive fields at rest
