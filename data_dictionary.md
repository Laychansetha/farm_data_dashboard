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
