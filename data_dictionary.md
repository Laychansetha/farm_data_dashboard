# Production Data Dictionary (PostgreSQL Schema)

This data dictionary documents the structure, column types, relationships, and metadata for the 10 normalized tables inside the dashboard database.

---

## 1. Dimension Tables

### Table: `dim_site`
Stores the operations site coordinates and names.
- **Primary Key**: `site_id` (INT)
- **Columns**:
  - `site_id` (INT): Unique identifier for the site.
  - `site_name` (VARCHAR): Human-readable name of the site (e.g., *Preah Vihear*).
  - `lat` (DECIMAL): Latitude coordinate for geography maps.
  - `lng` (DECIMAL): Longitude coordinate for geography maps.

### Table: `dim_irpg`
Stores the Ibis Rice Producer Groups.
- **Primary Key**: `irpg_id` (INT)
- **Columns**:
  - `irpg_id` (INT): Unique identifier for the producer group.
  - `irpg_name` (VARCHAR): Alphanumeric code of the group (e.g., *IRPG01*).

### Table: `dim_village`
Stores village-level geographical divisions.
- **Primary Key**: `village_id` (INT)
- **Foreign Keys**:
  - `site_id` (INT) references `dim_site(site_id)`
  - `irpg_id` (INT) references `dim_irpg(irpg_id)`
- **Columns**:
  - `village_id` (INT): Unique identifier for the village.
  - `village_name` (VARCHAR): Name of the village in English (e.g., *Prey Veng*).
  - `site_id` (INT): Site relationship.
  - `irpg_id` (INT): IRPG relationship.

### Table: `dim_farmer`
Stores the master profiles of all registered farmers.
- **Primary Key**: `farmer_uid` (VARCHAR)
- **Foreign Keys**:
  - `village_id` (INT) references `dim_village(village_id)`
- **Columns**:
  - `farmer_uid` (VARCHAR): Unique alphanumeric identifier for each farmer (e.g., *BRA|BR002*).
  - `family_id` (VARCHAR): Alphanumeric code grouping family book households.
  - `village_id` (INT): Residence village key.
  - `farmer_name` (VARCHAR): Full name in Khmer script.
  - `husband_name` (VARCHAR): Name of husband (where applicable).
  - `wife_name` (VARCHAR): Name of wife (where applicable).
  - `gender` (VARCHAR): Gender of primary registrant (e.g., *F*, *M*).

### Table: `dim_crop_variety`
Stores rice and crop varieties.
- **Primary Key**: `variety_id` (INT)
- **Columns**:
  - `variety_id` (INT): Unique variety ID.
  - `variety_name` (VARCHAR): Variety name (e.g., *Phka Rumduol*).
  - `category` (VARCHAR): General crop category (e.g., *Rice*).

---

## 2. Fact and Survey Tables

### Table: `fact_farmer_annual_survey`
Stores socio-economic and demographic data collected during annual surveys.
- **Primary Key**: `survey_id` (INT / SERIAL)
- **Foreign Keys**:
  - `farmer_uid` (VARCHAR) references `dim_farmer(farmer_uid)`
- **Columns**:
  - `survey_id` (INT): Unique survey log ID.
  - `farmer_uid` (VARCHAR): Farmer identifier.
  - `data_year` (INT): Calendar year the survey was conducted.
  - `age` (INT): Age of the respondent.
  - `education` (VARCHAR): Highest education level attained.
  - `household_member` (INT): Number of members in the household.
  - `women` (INT): Number of female members in the household.
  - `total_income_riel` (BIGINT): Total household annual income (in Cambodian Riel).
  - `spend_riel` (BIGINT): Total household annual expenditures (in Cambodian Riel).
  - `homestead` (BOOLEAN): True if the household has a homestead garden.
  - `cattle` (INT): Number of cows/cattle owned.
  - `buffalo` (INT): Number of water buffaloes owned.

### Table: `fact_plot_inspection`
Stores specific plot-level crop inspections.
- **Primary Key**: `inspection_id` (INT / SERIAL)
- **Foreign Keys**:
  - `farmer_uid` (VARCHAR) references `dim_farmer(farmer_uid)`
- **Columns**:
  - `inspection_id` (INT): Unique inspection event key.
  - `farmer_uid` (VARCHAR): Farmer identifier.
  - `data_year` (INT): Inspection harvest season year.
  - `inspection_date` (DATE): Calendar date of the inspection.
  - `parcel_id` (VARCHAR): Cadastral parcel ID.
  - `plot_code` (VARCHAR): Code representing sub-plots within the parcel.
  - `variety` (VARCHAR): Name of the crop variety planted.
  - `planting_method` (VARCHAR): Planting method (e.g., *broadcast*, *transplanting*).
  - `status_harvest` (VARCHAR): Organic crop certification status (e.g., *Organic*, *New Organic*, *WF*).
  - `planted_area_ha` (DECIMAL): Planted area in Hectares.
  - `fallow_area_ha` (DECIMAL): Fallow area in Hectares.
  - `other_area_ha` (DECIMAL): Other non-agricultural area in Hectares (forest, roads, ponds).
  - `expected_production_kg` (DECIMAL): Expected paddy yield in Kilograms.
  - `expected_sell_kg` (DECIMAL): Expected sale quantity in Kilograms.
  - `land_situation` (VARCHAR): Topographical situation of the plot (e.g., *Lowland*, *Highland*).
  - `land_ownership` (VARCHAR): Land tenure/ownership type (e.g., *Private*, *Communal*).
  - `irrigation_system` (VARCHAR): System of irrigation (e.g., *Rainfed*, *Canal*).
  - `compliant` (BOOLEAN): True if the plot conforms to compliance guidelines.
  - `farmer_status` (VARCHAR): Classification of farmer status for the year (e.g., *New*, *Existing*, *Rejoin*).

### Table: `fact_purchase`
Stores purchase transactions of paddy rice.
- **Primary Key**: `purchase_id` (INT / SERIAL)
- **Foreign Keys**:
  - `farmer_uid` (VARCHAR) references `dim_farmer(farmer_uid)`
- **Columns**:
  - `purchase_id` (INT): Unique purchase ticket key.
  - `farmer_uid` (VARCHAR): Selling farmer identifier.
  - `data_year` (INT): Purchase crop season year.
  - `purchase_date` (DATE): Calendar date of purchase.
  - `variety` (VARCHAR): Purchased crop variety.
  - `status` (VARCHAR): Quality certification status (e.g., *Organic*).
  - `unit_price_riel` (INT): Unit price per Kilogram (in Riel).
  - `quantity_kg` (DECIMAL): Weight of the purchase (in Kilograms).
  - `number_of_sacks` (INT): Total sacks sold.
  - `total_amount_riel` (BIGINT): Gross transaction amount before reductions (in Riel).
  - `total_payment_riel` (BIGINT): Net payment received by farmer after seed loan deductions (in Riel).
  - `borrowed_seed_kg` (DECIMAL): Weight of seeds lent to farmer (in Kilograms).
  - `returned_seed_kg` (DECIMAL): Weight of seed loan repaid during transaction (in Kilograms).

### Table: `fact_threshing`
Stores threshing volume logs.
- **Primary Key**: `threshing_id` (INT / SERIAL)
- **Foreign Keys**:
  - `farmer_uid` (VARCHAR) references `dim_farmer(farmer_uid)`
- **Columns**:
  - `threshing_id` (INT): Unique threshing record ID.
  - `farmer_uid` (VARCHAR): Farmer identifier.
  - `data_year` (INT): Threshing crop season year.
  - `threshing_date` (DATE): Threshing date.
  - `planting_method` (VARCHAR): Sowing method.
  - `rice_type` (VARCHAR): Category of rice threshed.
  - `threshing_method` (VARCHAR): Harvest method (e.g., *Machine*, *Hand*).
  - `actual_total_rice_production_kg` (DECIMAL): Total threshed volume (in Kilograms).
  - `paddy_prepare_for_sell_kg` (DECIMAL): Volume prepared for sale (in Kilograms).
  - `paddy_keep_for_consumption_kg` (DECIMAL): Volume reserved for eating (in Kilograms).
  - `paddy_keep_for_seeds_kg` (DECIMAL): Volume reserved for next year's seed (in Kilograms).

### Table: `fact_quality_spec`
Stores quality grading evaluations.
- **Primary Key**: `spec_id` (INT / SERIAL)
- **Foreign Keys**:
  - `farmer_uid` (VARCHAR) references `dim_farmer(farmer_uid)`
- **Columns**:
  - `spec_id` (INT): Unique grading record key.
  - `farmer_uid` (VARCHAR): Farmer identifier.
  - `data_year` (INT): Testing crop season year.
  - `moisture` (DECIMAL): Grain moisture content percentage.
  - `color` (VARCHAR): Grain color rating.
  - `rice_impurity` (DECIMAL): Foreign matter percentage.
  - `rice_husk` (DECIMAL): Husk percentage.
  - `good_grain_pct` (DECIMAL): Premium seed grade percentage.
  - `broken_grain_pct` (DECIMAL): Broken grain percentage.
  - `grade` (VARCHAR): Resulting crop grade (e.g., *Grade A*, *Grade B*).
  - `variety` (VARCHAR): Tested variety.
  - `status` (VARCHAR): Quality certification class (e.g., *Organic*).
  - `price_riel` (INT): Offered price in Riel/Kg.


---

## 3. Dashboard Component Data Requirements & Mapping

This section defines the exact data fields and calculation rules required by each view of the dashboard application:

| Dashboard Component | Target Metrics & Visuals | Source Tables & Key Columns | Calculation / Derivation Rule |
| :--- | :--- | :--- | :--- |
| **Overview Tab: KPIs** | Active Farmers, Production, Revenue, Compliance Rate | `fact_plot_inspection` (`farmer_uid`, `compliant`), `fact_threshing` (`actual_total_rice_production_kg`), `fact_purchase` (`total_payment_riel`) | Active Farmers: Distinct count of `farmer_uid` in year.<br>Revenue: Sum of `total_payment_riel` / 4,000 for USD.<br>Compliance: `(Count of compliant plots / Total plots) * 100`. |
| **Overview: Participation Growth** | Stacked Bar: New, Existing, Rejoin | `fact_plot_inspection` (`farmer_status`, `farmer_uid`, `data_year`) | Sum of distinct farmers classified under `New`, `Existing`, `Rejoin` per season. |
| **Overview: Production & Yield** | Dual Axis: Production (MT) & Yield (Kg/Ha) | `fact_threshing` (`actual_total_rice_production_kg`), `fact_plot_inspection` (`planted_area_ha`) | Production: `SUM(kg) / 1000`.<br>Yield: `SUM(actual_total_rice_production_kg) / SUM(planted_area_ha)`. |
| **Overview: Purchase & Revenue** | Dual Axis: Volume (MT) & Net Revenue ($M) | `fact_purchase` (`quantity_kg`, `total_payment_riel`) | Volume: `SUM(quantity_kg) / 1000`.<br>Revenue: `SUM(total_payment_riel) / 4,000,000,000`. |
| **Overview: Certification Status** | Doughnut: Organic, New Organic, Ibis I, Ibis II, WF | `fact_plot_inspection` (`status_harvest`, `data_year`) | Count of inspection records grouped by normalized certification status for the latest selected period. |
| **Overview: Site Performance** | 5-Axis Radar: Farmers, Production, Land, Revenue, Compliance | Dimensions + All Fact Tables grouped by `dim_village.site_id` | Scaled 0-100% normalized across sites relative to the cohort maximum. |
| **Farmers: Cohort Retention Matrix** | Heatmap Matrix: Join Cohort Year vs Active Year Retention % | `dim_farmer` (`farmer_uid`), `fact_plot_inspection` (`data_year`), `fact_threshing`, `fact_purchase` | Join Year: Minimum `data_year` across all activities.<br>Retention %: `(Active in Year Y / Cohort Size) * 100`. |
| **Farmers: Top Villages** | Ranked Horizontal Bar (Top 15 Villages) | `dim_village`, `dim_farmer`, `fact_plot_inspection` | Count of unique active farmers grouped by `village_name` and filtered by `site_name`. |
| **Farmers: Gender Distribution** | Doughnut: Female vs Male | `dim_farmer` (`gender`), `fact_plot_inspection` | Active farmers filtered by `gender` for active site/year selection. |
| **Production: Land vs Production** | Dual Axis: Production (MT) vs Farmland Area (Ha) | `fact_threshing` (`actual_total_rice_production_kg`), `fact_plot_inspection` (`planted_area_ha`, `fallow_area_ha`, `other_area_ha`) | Farmland Area: `SUM(planted_area_ha + fallow_area_ha + other_area_ha)`. |
| **Production: Yield by Site** | Multi-Line Chart (Kg/Ha per Site) | `fact_threshing`, `fact_plot_inspection`, `dim_village.site_id` | `SUM(production_kg) / SUM(planted_area_ha)` calculated independently per site and year. |
| **Production: Paddy Allocation** | Stacked Bar: Sold, Consumed, Seeds Kept | `fact_threshing` (`paddy_prepare_for_sell_kg`, `paddy_keep_for_consumption_kg`, `paddy_keep_for_seeds_kg`) | Volume in Metric Tons (`Kg / 1000`). |
| **Production: Threshing Method** | Doughnut: Machine vs Hand | `fact_threshing` (`threshing_method`) | Count of records normalized into `Machine`, `Hand`, or `Unknown`. |
| **Market: Average Price Trend** | Trend Line: Avg Price (KHR/Kg) | `fact_purchase` (`total_amount_riel`, `quantity_kg`) | `SUM(total_amount_riel) / SUM(quantity_kg)` gross market price. |
| **Market: Variety Breakdown** | Stacked Bar: Rice Variety Purchase Volume | `fact_purchase` (`variety`, `quantity_kg`) | Volume in MT for top varieties across selected sites. |
| **Quality: Grade Distribution** | Stacked 100% Bar: A1, A, A2, B1, B2, B | `fact_quality_spec` (`grade`, `data_year`) | Count of inspected sacks/lots per grade category. |
| **Quality: Grain Quality Trends** | Multi-Line: Good Grain %, Broken Grain %, Impurity % | `fact_quality_spec` (`good_grain_pct`, `broken_grain_pct`, `rice_impurity`) | Yearly arithmetic mean of evaluations. |
| **Quality: Moisture Content** | Trend Line: Average Moisture % | `fact_quality_spec` (`moisture`) | Yearly arithmetic mean of grain moisture (ideal target: < 14%). |
| **Geography: Leaflet Map & Sidebar** | Interactive coordinates, bubble sizes, site stats, villages list | `dim_site` (`lat`, `lng`), all operational tables | Bubble radius scaled by active farmer volume; click updates sidebar breakdown of planted/fallow/other area and village directory. |
| **Land: Area Trend & Situation** | Stacked Bar: Planted, Fallow, Other; Doughnuts: Situation & Ownership | `fact_plot_inspection` (`planted_area_ha`, `fallow_area_ha`, `other_area_ha`, `land_situation`, `land_ownership`, `irrigation_system`) | Aggregated farmland distribution and tenure classifications. |
| **Farmer Records Table & Modal** | Searchable directory, sorting, pagination, CSV export, profile modal | `dim_farmer`, `dim_village`, `dim_site`, all operational logs | Individual farmer dossier showing cumulative metrics, varieties, and year-by-year history cards. |
