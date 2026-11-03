sql

-- ── 1. DIMENSION TABLES ──────────────────────────────────────────
CREATE TABLE dim_site (
    site_id INT PRIMARY KEY,
    site_name VARCHAR(100) NOT NULL UNIQUE,
    lat DECIMAL(9,6),
    lng DECIMAL(9,6)
);
CREATE TABLE dim_irpg (
    irpg_id INT PRIMARY KEY,
    irpg_name VARCHAR(100) NOT NULL UNIQUE
);
CREATE TABLE dim_village (
    village_id INT PRIMARY KEY,
    village_name VARCHAR(150) NOT NULL,
    site_id INT REFERENCES dim_site(site_id),
    irpg_id INT REFERENCES dim_irpg(irpg_id)
);
CREATE TABLE dim_farmer (
    farmer_uid VARCHAR(50) PRIMARY KEY,
    family_id VARCHAR(50),
    village_id INT REFERENCES dim_village(village_id),
    text_farmer_name VARCHAR(200),
    gender VARCHAR(20)
);
-- ── 2. ANNUAL SURVEY FACT TABLE ──────────────────────────────────
CREATE TABLE fact_farmer_annual_survey (
    survey_id SERIAL PRIMARY KEY,
    farmer_uid VARCHAR(50) REFERENCES dim_farmer(farmer_uid) ON DELETE CASCADE,
    data_year INT NOT NULL,
    age INT,
    education VARCHAR(100),
    household_member INT,
    women INT,
    total_income_riel BIGINT,
    spend_riel BIGINT,
    homestead BOOLEAN,
    cattle INT,
    buffalo INT,
    UNIQUE (farmer_uid, data_year)
);
-- ── 3. TRANSACTIONAL FACT TABLES ────────────────────────────────
CREATE TABLE fact_plot_inspection (
    inspection_id SERIAL PRIMARY KEY,
    farmer_uid VARCHAR(50) REFERENCES dim_farmer(farmer_uid),
    data_year INT NOT NULL,
    inspection_date DATE,
    parcel_id VARCHAR(50),
    plot_code VARCHAR(50),
    variety VARCHAR(100),
    planting_method VARCHAR(50),
    status_harvest VARCHAR(50), -- Organic, New Organic, WF, etc.
    planted_area_ha DECIMAL(10,4) DEFAULT 0.0,
    fallow_area_ha DECIMAL(10,4) DEFAULT 0.0,
    other_area_ha DECIMAL(10,4) DEFAULT 0.0,
    expected_production_kg DECIMAL(12,2) DEFAULT 0.0,
    expected_sell_kg DECIMAL(12,2) DEFAULT 0.0,
    land_situation VARCHAR(50),
    land_ownership VARCHAR(50),
    irrigation_system VARCHAR(50),
    compliant BOOLEAN DEFAULT TRUE
);
CREATE TABLE fact_purchase (
    purchase_id SERIAL PRIMARY KEY,
    farmer_uid VARCHAR(50) REFERENCES dim_farmer(farmer_uid),
    data_year INT NOT NULL,
    purchase_date DATE,
    variety VARCHAR(100),
    status VARCHAR(50),
    unit_price_riel INT,
    quantity_kg DECIMAL(12,2) DEFAULT 0.0,
    number_of_sacks INT,
    total_amount_riel BIGINT,
    total_payment_riel BIGINT,
    borrowed_seed_kg DECIMAL(10,2) DEFAULT 0.0,
    returned_seed_kg DECIMAL(10,2) DEFAULT 0.0
);
CREATE TABLE fact_threshing (
    threshing_id SERIAL PRIMARY KEY,
    farmer_uid VARCHAR(50) REFERENCES dim_farmer(farmer_uid),
    data_year INT NOT NULL,
    threshing_date DATE,
    planting_method VARCHAR(50),
    rice_type VARCHAR(100),
    threshing_method VARCHAR(50),
    actual_total_rice_production_kg DECIMAL(12,2) DEFAULT 0.0,
    paddy_prepare_for_sell_kg DECIMAL(12,2) DEFAULT 0.0,
    paddy_keep_for_consumption_kg DECIMAL(12,2) DEFAULT 0.0,
    paddy_keep_for_seeds_kg DECIMAL(12,2) DEFAULT 0.0
);
CREATE TABLE fact_quality_spec (
    spec_id SERIAL PRIMARY KEY,
    farmer_uid VARCHAR(50) REFERENCES dim_farmer(farmer_uid),
    data_year INT NOT NULL,
    moisture DECIMAL(5,2),
    color VARCHAR(30),
    good_grain_pct DECIMAL(5,2),
    broken_grain_pct DECIMAL(5,2),
    grade VARCHAR(20),
    variety VARCHAR(100),
    status VARCHAR(50),
    price_riel INT
);
-- ── 4. INDEXES FOR PERFORMANCE ──────────────────────────────────
-- Indexes on foreign keys for fast joins
CREATE INDEX idx_village_site ON dim_village(site_id);
CREATE INDEX idx_farmer_village ON dim_farmer(village_id);
-- Indexes on data_year and farmer_uid for dashboard aggregations
CREATE INDEX idx_survey_year_farmer ON fact_farmer_annual_survey(data_year, farmer_uid);
CREATE INDEX idx_insp_year_farmer ON fact_plot_inspection(data_year, farmer_uid);
CREATE INDEX idx_purch_year_farmer ON fact_purchase(data_year, farmer_uid);
CREATE INDEX idx_thresh_year_farmer ON fact_threshing(data_year, farmer_uid);
CREATE INDEX idx_spec_year_farmer ON fact_quality_spec(data_year, farmer_uid);
5. DYNAMIC ANALYTIC VIEWS (Eliminating Manual Updates)
Rather than storing derived values on the static dim_farmer table, we create standard PostgreSQL views to calculate them dynamically. When you add a new year, these views update instantly.

Farmer Active Status & Timeline View
sql

CREATE OR REPLACE VIEW view_farmer_active_status AS
WITH farmer_activity AS (
    SELECT farmer_uid, MIN(data_year) as first_year, MAX(data_year) as last_year
    FROM (
        SELECT farmer_uid, data_year FROM fact_plot_inspection
        UNION
        SELECT farmer_uid, data_year FROM fact_purchase
        UNION
        SELECT farmer_uid, data_year FROM fact_threshing
    ) combined_activity
    GROUP BY farmer_uid
)
SELECT
    f.farmer_uid,
    f.family_id,
    f.text_farmer_name,
    f.gender,
    v.village_name,
    s.site_name,
    a.first_year,
    a.last_year,
    -- If they were active in the latest system year, they are active
    CASE
        WHEN a.last_year >= (SELECT MAX(data_year) FROM fact_plot_inspection) THEN 'Yes'
        ELSE 'No'
    END as current_status
FROM dim_farmer f
JOIN dim_village v ON f.village_id = v.village_id
JOIN dim_site s ON v.site_id = s.site_id
LEFT JOIN farmer_activity a ON f.farmer_uid = a.farmer_uid;
6. Migration and Update Workflows
How to Import Existing Data
Load dim_site, dim_irpg, and dim_village from their respective dimension CSVs (removing redundant string names from the village table).
Load dim_farmer from dim_farmer.csv (excluding first_year_seen, last_year_seen, and current_status).
Split the inspections CSV (fact_afl_inspection.csv):
Group by (farmer_uid, data_year) and write the first occurrence of demographics into fact_farmer_annual_survey.
Write the inspection logs (plot areas, expectation values) into fact_plot_inspection.
Load the remaining fact tables (fact_ppr_purchase.csv, fact_thr_threshing.csv, fact_ppr_spec_record.csv) directly into their respective tables, omitting the location IDs (site_id, village_id, irpg_id) because they are resolved by joining the farmer table.
Annual Update Process (No Dashboard Code Changes)
To add a new year (e.g. 2026):

Insert new farmer profiles to dim_farmer only if new farmers joined.
Append the new records to the transactional tables:
fact_farmer_annual_survey (demographics for the year)
fact_plot_inspection (plot calculations)
fact_purchase, fact_threshing, fact_quality_spec (transactions)
Result: The dashboard will automatically reflect the year 2026 across all views, calculate the updated active status, adjust yield ratios, and populate trends immediately.
