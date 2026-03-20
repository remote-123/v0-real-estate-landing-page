-- Materialised view: monthly transaction aggregates by area
-- Required for Phase 2 terminal pages (Transaction Pulse, Yield Map, Community Screener)
-- Apply AFTER dld_transactions ingestion is complete.
--
-- Refresh manually: SELECT refresh_mv_txn_monthly();
-- Or schedule via pg_cron: SELECT cron.schedule('0 2 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_txn_monthly');

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_txn_monthly AS
SELECT
  date_trunc('month', instance_date)::date                    AS txn_month,
  area_id,
  area_name_en,
  property_type_en,
  property_usage_en,
  trans_group_en,
  rooms_en,
  count(*)                                                    AS txn_count,
  round(avg(meter_sale_price)::numeric, 2)                    AS avg_psf,
  round(percentile_cont(0.5) WITHIN GROUP (ORDER BY meter_sale_price)::numeric, 2) AS median_psf,
  round(avg(actual_worth)::numeric, 0)                        AS avg_value,
  round(sum(actual_worth)::numeric, 0)                        AS total_value,
  round(avg(procedure_area)::numeric, 1)                      AS avg_area_sqft,
  round(avg(meter_rent_price)::numeric, 2)                    AS avg_rent_psf,
  round(avg(rent_value)::numeric, 0)                          AS avg_rent_value
FROM dld_transactions
WHERE
  instance_date IS NOT NULL
  AND meter_sale_price > 0
GROUP BY 1, 2, 3, 4, 5, 6, 7
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS mv_txn_monthly_pk
  ON mv_txn_monthly (txn_month, area_id, property_type_en, property_usage_en, trans_group_en, rooms_en);

CREATE INDEX IF NOT EXISTS mv_txn_monthly_month_idx ON mv_txn_monthly (txn_month DESC);
CREATE INDEX IF NOT EXISTS mv_txn_monthly_area_idx   ON mv_txn_monthly (area_id);

-- Helper: refresh without locking reads
CREATE OR REPLACE FUNCTION refresh_mv_txn_monthly()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_txn_monthly;
$$;
