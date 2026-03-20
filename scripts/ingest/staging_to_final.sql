-- Run this in Supabase SQL Editor AFTER importing CSVs into staging tables.
-- Step 1: Import dubai_transactions.csv → dld_transactions_staging (Table Editor > Import)
-- Step 2: Import dld_units.csv        → dld_units_staging         (Table Editor > Import)
-- Step 3: Run this file in the SQL Editor

-- ── Transactions: staging → final ───────────────────────────────────────────
INSERT INTO dld_transactions (
  transaction_id, procedure_id, trans_group_id, trans_group_en, procedure_name_en,
  instance_date, property_type_en, property_sub_type_en, property_usage_en, reg_type_en,
  area_id, area_name_en, building_name_en, project_number, project_name_en,
  master_project_en, nearest_landmark_en, nearest_metro_en, nearest_mall_en,
  rooms_en, has_parking, procedure_area, actual_worth, meter_sale_price,
  rent_value, meter_rent_price,
  no_of_parties_role_1, no_of_parties_role_2, no_of_parties_role_3
)
SELECT
  transaction_id,
  nullif(procedure_id,'')::integer,
  nullif(trans_group_id,'')::integer,
  nullif(trans_group_en,''),
  nullif(procedure_name_en,''),
  CASE
    WHEN instance_date ~ '^\d{2}-\d{2}-\d{4}$'
      THEN to_date(instance_date, 'DD-MM-YYYY')
    WHEN instance_date ~ '^\d{4}-\d{2}-\d{2}$'
      THEN instance_date::date
    ELSE NULL
  END,
  nullif(property_type_en,''),
  nullif(property_sub_type_en,''),
  nullif(property_usage_en,''),
  nullif(reg_type_en,''),
  nullif(area_id,'')::integer,
  nullif(area_name_en,''),
  nullif(building_name_en,''),
  nullif(project_number,''),
  nullif(project_name_en,''),
  nullif(master_project_en,''),
  nullif(nearest_landmark_en,''),
  nullif(nearest_metro_en,''),
  nullif(nearest_mall_en,''),
  nullif(rooms_en,''),
  CASE WHEN lower(has_parking) IN ('true','yes','1') THEN true
       WHEN lower(has_parking) IN ('false','no','0') THEN false
       ELSE NULL END,
  nullif(procedure_area,'')::numeric,
  nullif(actual_worth,'')::numeric,
  nullif(meter_sale_price,'')::numeric,
  nullif(rent_value,'')::numeric,
  nullif(meter_rent_price,'')::numeric,
  nullif(no_of_parties_role_1,'')::integer,
  nullif(no_of_parties_role_2,'')::integer,
  nullif(no_of_parties_role_3,'')::integer
FROM dld_transactions_staging
WHERE transaction_id IS NOT NULL AND transaction_id <> ''
ON CONFLICT (transaction_id) DO NOTHING;

-- ── Units: staging → final ───────────────────────────────────────────────────
INSERT INTO dld_units (
  property_id, area_id, zone_id, area_name_en,
  land_number, land_sub_number, building_number, unit_number,
  unit_balcony_area, unit_parking_number, parking_allocation_type_en,
  common_area, actual_common_area, floor, rooms_en, actual_area,
  property_type_en, property_sub_type_en,
  parent_property_id, grandparent_property_id, creation_date,
  munc_zip_code, munc_number, parcel_id,
  is_free_hold, is_lease_hold, is_registered, pre_registration_number,
  master_project_id, master_project_en, project_id, project_name_en, land_type_en
)
SELECT
  property_id,
  nullif(area_id,'')::integer,
  nullif(zone_id,'')::integer,
  nullif(area_name_en,''),
  nullif(land_number,''), nullif(land_sub_number,''),
  nullif(building_number,''), nullif(unit_number,''),
  nullif(unit_balcony_area,'')::numeric,
  nullif(unit_parking_number,''),
  nullif(parking_allocation_type_en,''),
  nullif(common_area,'')::numeric,
  nullif(actual_common_area,'')::numeric,
  nullif(floor,'')::integer,
  nullif(rooms_en,''),
  nullif(actual_area,'')::numeric,
  nullif(property_type_en,''),
  nullif(property_sub_type_en,''),
  nullif(parent_property_id,''),
  nullif(grandparent_property_id,''),
  CASE
    WHEN creation_date ~ '^\d{2}-\d{2}-\d{4}$'
      THEN to_date(creation_date, 'DD-MM-YYYY')
    WHEN creation_date ~ '^\d{4}-\d{2}-\d{2}$'
      THEN creation_date::date
    ELSE NULL
  END,
  nullif(munc_zip_code,''), nullif(munc_number,''), nullif(parcel_id,''),
  CASE WHEN lower(is_free_hold) IN ('true','yes','1') THEN true
       WHEN lower(is_free_hold) IN ('false','no','0') THEN false ELSE NULL END,
  CASE WHEN lower(is_lease_hold) IN ('true','yes','1') THEN true
       WHEN lower(is_lease_hold) IN ('false','no','0') THEN false ELSE NULL END,
  CASE WHEN lower(is_registered) IN ('true','yes','1') THEN true
       WHEN lower(is_registered) IN ('false','no','0') THEN false ELSE NULL END,
  nullif(pre_registration_number,''),
  nullif(master_project_id,'')::integer,
  nullif(master_project_en,''),
  nullif(project_id,'')::integer,
  nullif(project_name_en,''),
  nullif(land_type_en,'')
FROM dld_units_staging
WHERE property_id IS NOT NULL AND property_id <> ''
ON CONFLICT (property_id) DO NOTHING;
