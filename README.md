# Ibis Rice Farm Data — Field Operations Dashboard

This repository contains the interactive client-side operations dashboard for the **Ibis Rice Program**. The dashboard visualizes agricultural metrics such as farmer participation, production volumes, crop quality, market pricing, and organic compliance rates across multiple field sites in Cambodia.

---

## 📂 Folder Structure

```
farm_data_dashboard/
├── .gitignore                      # Specifies intentionally untracked files to ignore
├── package.json                    # Project scripts and configuration
├── README.md                       # Comprehensive documentation
├── data_dictionary.md              # Relational schema dictionary and component mapping
├── import_order.md                 # PostgreSQL relational import order guide
├── pgadmin.md                      # PostgreSQL DDL tables, views, and indexes
├── index.html                      # Main dashboard HTML shell (entry point)
├── data/
│   └── dashboard_data.js           # Compiled JSON database wrapped in a window object
├── schema/
│   └── interfaces.ts               # Complete TypeScript data model & dashboard contracts
├── data_sources/                   # Normalized relational CSV tables
│   ├── dim_site.csv                # Program field site definitions and map coordinates
│   ├── dim_village.csv             # Village names, site references, and IRPG links
│   ├── dim_irpg.csv                # Local farmer producer group IDs
│   ├── dim_crop_variety.csv        # Mappings of crop varieties
│   ├── dim_farmer.csv              # Master farmer registry profiles
│   ├── fact_plot_inspection.csv    # Plot crop inspections, status, and land area
│   ├── fact_purchase.csv           # Commercial purchase transactions and net payouts
│   ├── fact_threshing.csv          # Threshing production yields and split allocations
│   ├── fact_quality_spec.csv       # Grain testing evaluations (moisture, purity, grade)
│   └── fact_farmer_annual_survey.csv # Socio-economic household demographic records
├── preprocess/
│   ├── build_data.py               # Preprocessor compiler for dashboard_data.js
│   └── normalize_data.py           # Historical migration & relational normalization tool
└── src/
    ├── css/
    │   └── dashboard.css           # Glassmorphism UI design system, themes, and layout
    ├── js/
    │   ├── data.js                 # Reactive data access, dynamic slicing, and aggregations
    │   ├── charts.js               # Chart.js visualizations, palettes, and canvas renderers
    │   ├── views.js                # Dynamic tab views, KPI grids, insights, and tables
    │   └── app.js                  # App router, filter controller, Leaflet map, and modal
    └── lib/                        # Local vendor dependencies (zero external CDN needed)
        ├── chart.umd.min.js        # Chart.js v4 (UMD)
        ├── leaflet.js              # Leaflet Map library
        └── leaflet.css             # Leaflet Map styles
```

---

## 🛠️ Installation & Setup

1. **Prerequisites**:
   - A modern web browser.
   - Python 3.7+ (for local HTTP server and running the preprocessor).

2. **Starting the Development Server**:
   Because Leaflet tile layers and local file sandboxes require HTTP serving, launch the built-in development server:
   ```bash
   npm run dev
   ```
   Or directly:
   ```bash
   python -m http.server 8000
   ```
   Then navigate to `http://localhost:8000` in your web browser.

3. **Running the Preprocessor**:
   To ingest data from `data_sources/` and recompile `data/dashboard_data.js`:
   ```bash
   npm run preprocess
   ```

---

## 💾 Relational Data Model

The database is organized into 5 dimension tables and 5 fact tables:

### Dimension Tables
- **`dim_site`**: Primary field sites (`Preah Vihear`, `Prey Lang`, `Siem Pang`, `Ratanakiri`, `Mondolkiri`) with exact latitude/longitude coordinates.
- **`dim_village`**: Village directory mapped to parent site IDs and IRPG group IDs.
- **`dim_irpg`**: Ibis Rice Producer Groups.
- **`dim_farmer`**: Master farmer registry (`farmer_uid`, `family_id`, `village_id`, `gender`).
- **`dim_crop_variety`**: Master catalog of seed and paddy varieties.

### Fact Tables
- **`fact_plot_inspection`**: Plot inspections tracking harvest certification (`Organic`, `New Organic`, `Ibis I`, `Ibis II`, `WF`), land situation (`Lowland`, `Highland`, `Flooded`), land ownership, irrigation, and area breakdown (`planted_area_ha`, `fallow_area_ha`, `other_area_ha`).
- **`fact_threshing`**: Threshing yield logs (`actual_total_rice_production_kg`) and split allocations (sold, consumed, seeds kept), plus threshing method (`Machine`, `Hand`).
- **`fact_purchase`**: Transaction logs recording purchase date, crop variety, quantity (`quantity_kg`), unit price, gross amount (`total_amount_riel`), and net payout (`total_payment_riel`).
- **`fact_quality_spec`**: Quality evaluations measuring moisture content %, purity %, broken grain %, color, and grade classification (`A1`, `A`, `A2`, `B1`, `B2`, `B`).
- **`fact_farmer_annual_survey`**: Household survey records with demographics, members, livestock, and income.

---

## 📐 Formulas, Calculations & Logic

Below is the verified documentation for all core calculations:

### 1. Active Farmers
$$\text{Active Farmers} = \text{Count of unique } (\text{farmer\_uid}) \text{ active in selected period}$$
- **Source**: `fact_plot_inspection.csv` & transaction logs.
- Dynamic cross-filtering prevents duplicate counting across multi-plot farmers.

### 2. Total Production Volume
$$\text{Production (MT)} = \frac{\sum \text{actual\_total\_rice\_production\_kg}}{1000}$$
- **Source**: `fact_threshing.csv`.

### 3. Program Revenue (Net Farmer Payout)
$$\text{Revenue (USD \$)} = \frac{\sum \text{total\_payment\_riel}}{4000}$$
- **Source**: `fact_purchase.csv` (Net payout received by farmers after loan deductions). Fixed exchange rate of `1 USD = 4,000 KHR`.

### 4. Average Paddy Yield
$$\text{Yield (Kg/Ha)} = \frac{\sum \text{actual\_total\_rice\_production\_kg}}{\sum \text{planted\_area\_ha}}$$
- **Source**: `fact_threshing.csv` & `fact_plot_inspection.csv`. Calculated across matching site and cohort selections.

### 5. Average Market Unit Price
$$\text{Average Price (KHR/Kg)} = \frac{\sum \text{total\_amount\_riel}}{\sum \text{quantity\_kg}}$$
- **Source**: `fact_purchase.csv`. Gross value divided by total purchase weight.

### 6. Program Compliance Rate
$$\text{Compliance Rate (\%)} = \left( \frac{\sum \text{Compliant Plots}}{\sum \text{Total Plots Inspected}} \right) \times 100$$
- **Source**: `fact_plot_inspection.csv`. Plots verified under certified organic harvest protocols (`Organic`, `New Organic`, `Ibis I`, `Ibis II`, `WF`).

### 7. Farmland Area Breakdown
$$\text{Total Area (Ha)} = \sum \text{planted\_area\_ha} + \sum \text{fallow\_area\_ha} + \sum \text{other\_area\_ha}$$
- **Source**: `fact_plot_inspection.csv`.

### 8. Cohort Retention Rate
$$\text{Retention Rate (Cohort } C\text{, Year } Y\text{)} = \left( \frac{\text{Active Farmers in Year } Y}{\text{Total Cohort Size in Join Year } C} \right) \times 100$$
- **Source**: Master registry join year and operational activity records. Dynamically recalculates when filtering by site.

---

## 🗺️ Rebuilt Features & Interactive Capabilities

1. **Fully Reactive Topbar Filters**:
   - Multi-select Year, Site, and Certification dropdowns with instant visual badge status (`All`, `None`, count).
   - Entire filter row is clickable for effortless toggling.
   - Built-in "Select All" and "Clear" header actions in every dropdown.
   - Global Certification filter dynamically updates records and views.

2. **Farmer Cohort Retention Heatmap**:
   - Rebuilt dynamic cohort matrix tracking farmer retention percentages across all seasons from 2019 to 2025.
   - Slices dynamically when filtering by site.

3. **Interactive Leaflet Geography Map**:
   - Scaled circle markers indicating site size.
   - Auto-resizing with `invalidateSize()` to prevent distorted tiles.
   - Dynamic site detail panel with area progress bar, village directory, and historical farmer sparkline.

4. **Farmer Records Directory & Modal Dossier**:
   - Instant text search across Farmer UID, Family ID, Site, Village, and Certifications.
   - Sortable columns (ascending/descending) with pagination.
   - Rich Profile Modal displaying cumulative production, payout, land breakdown, varieties, and a detailed year-by-year inspection history timeline.
   - Closes with the 'X' button, by clicking the backdrop overlay, or by pressing `Escape`.
   - Export to CSV with UTF-8 BOM encoding.

5. **Fixed Charts & Indicators**:
   - **Paddy Split**: Stacked bars displaying Sold vs Consumed vs Seeds Kept in Metric Tons.
   - **Threshing Method**: Clean doughnut chart of Machine vs Hand harvesting with percentage tooltips.
   - **Quality Analytics**: Grade distributions, grain quality trends, average moisture trend, and cleaned grain color labels.
