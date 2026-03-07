# Senior Data Engineer Skill

## Overview
Production-grade data pipeline design covering ETL/ELT, batch processing, data quality, and architecture decisions for scalable data systems.

## Core Competencies
- ETL/ELT pipeline design (extract, transform, load)
- Batch vs. streaming architecture selection
- Data quality frameworks and validation
- Schema evolution and drift handling
- Orchestration (cron, Airflow, serverless triggers)

## Architecture Decision Framework

### Batch vs. Streaming
| Factor | Batch | Streaming |
|--------|-------|-----------|
| Latency need | Hours/daily OK | Sub-minute required |
| Data volume | Any | Continuous high-volume |
| Complexity | Lower | Higher |
| Cost | Lower | Higher |
| **Dubai communities use case** | ✅ Batch | Not needed |

### Warehouse vs. Lakehouse
| | Warehouse (Supabase/Postgres) | Lakehouse (S3 + Athena) |
|--|---|--|
| SQL analytics | Excellent | Good |
| Raw file storage | No | Yes |
| Cost at small scale | Low | Low |
| Operational complexity | Low | High |
| **Recommendation** | ✅ Start here | Migrate if >100GB |

## ETL Pipeline Patterns

### Extract
- REST API polling with pagination handling
- Rate limit management with exponential backoff
- Incremental extraction (fetch only new/changed records using `updated_at` cursors)
- Dead letter queues for failed records

### Transform
- Data normalisation and deduplication
- Derived metric calculation (yield, ROI, price/sqft)
- Null handling and default values
- Type coercion and validation

### Load
- Upsert pattern (INSERT ... ON CONFLICT DO UPDATE) to avoid duplicates
- Batch inserts for performance
- Transaction wrapping for atomicity
- Post-load aggregation refresh (update summary tables)

## Data Quality Framework

### Validation Checks
- Completeness: required fields non-null
- Uniqueness: no duplicate community+period records
- Freshness: data updated within expected window
- Range: prices within realistic bounds (AED 50K–500M)
- Referential integrity: community names match master list

### Schema Drift Handling
- Version API responses — log raw JSON before transformation
- Alert on unexpected new/missing fields
- Fail gracefully: partial load is better than no load

## Orchestration for Next.js Projects

Since this is a Next.js/Vercel project without Airflow:
- **cron-job.org** → POST to `/api/cron/refresh-communities` every 6 hours
- Next.js Route Handler performs the ETL
- Supabase as the target store
- Telegram alert on pipeline failure (already built)

## Tech Stack (Lightweight for this project)
- **Orchestration**: cron-job.org (external) + Next.js API routes
- **Transform**: TypeScript utility functions
- **Store**: Supabase PostgreSQL
- **Quality**: Zod schema validation on API responses
- **Monitoring**: Telegram alerts for failures, Vercel logs
