# Ibis Rice Farm Data — Field Data Dashboard

This repository contains the interactive client-side operations dashboard for the **Ibis Rice Program**. The dashboard visualizes agricultural metrics such as farmer participation, production volumes, crop quality, market pricing, and organic compliance rates across multiple field sites in Cambodia.

---

## 📂 Folder Structure

```
farm_data_dashboard/
├── .git/                      # Git repository files
├── .gitignore                 # Specifies intentionally untracked files to ignore
├── package.json               # Project scripts and configuration [NEW]
├── README.md                  # Developer documentation (this file) [UPDATED]
├── index.html                 # Main dashboard HTML shell (entry point)
├── data/
│   └── dashboard_data.js      # Compiled JSON database wrapped in a window object
├── data_sources/              # Source CSV databases (dimensions and facts)
│   ├── dim_crop_variety.csv   # Mappings of crop varieties
│   ├── dim_farmer.csv         # Detailed farmer registry profiles
│   ├── dim_irpg.csv           # Local farmer producer group IDs
│   ├── dim_site.csv           # Program field site definitions
│   ├── dim_village.csv        # Village names and associated field sites
│   ├── fact_afl_inspection.csv # Organic compliance, land situation, and plot sizes
│   ├── fact_ppr_purchase.csv  # Transaction records (gross/net sums and weights)
│   ├── fact_ppr_spec_record.csv # Crop quality and moisture records
│   └── fact_thr_threshing.csv # Paddy threshing yields and split allocations
├── preprocess/
│   └── build_data.py          # Python preprocessor script
└── src/
    ├── css/
    │   └── dashboard.css      # Core styles (glassmorphism UI, grid, responsiveness)
    ├── js/
    │   ├── data.js            # Frontend data filtering, aggregation, and formatting layer
    │   ├── charts.js          # Chart.js configuration and drawing layer
    │   ├── views.js           # Dynamic view builders and tab rendering
    │   └── app.js             # Navigation router, Leaflet map handler, and controller
    └── lib/                   # Third-party local dependencies
        ├── chart.umd.min.js   # Chart.js library (local)
        ├── leaflet.js         # Leaflet Map library (local)
        └── leaflet.css        # Leaflet Map styles (local)
```

---

## 🛠️ Installation & Setup

1. **Prerequisites**:
   - A modern web browser.
   - Python 3.7+ (only required if updating or regenerating data).

2. **Starting the Development Server**:
   Because Leaflet and Ajax components require local asset serving and can be blocked by browser security sandboxes when using `file://` protocols, start the development server using the NPM script:
   ```bash
   npm run dev
   ```
   *Note: This command runs Python's built-in HTTP server (`python -m http.server 8000`) and serves the static files at `http://localhost:8000` with zero dependencies.*

3. **Running the Preprocessor**:
   To ingest new CSV data from `data_sources/` and compile it into `data/dashboard_data.js`, run:
   ```bash
   npm run preprocess
   ```

---

## 💾 Data Sources

The preprocessor ingests two groups of CSV files located in `data_sources/`:

### Dimension Tables
- `dim_site.csv`: List of project field sites (Mondolkiri, Preah Vihear, Prey Lang, Ratanakiri, Siem Pang).
- `dim_village.csv`: Maps village IDs to village names, field sites, and local farmer producer groups.
- `dim_irpg.csv`: Defines farmer producer groups.
- `dim_crop_variety.csv`: Classification of crop varieties and seeds.
- `dim_farmer.csv`: Farmer registry including names, registration date (`first_year_seen`), village, and gender.

### Fact Tables
- `fact_afl_inspection.csv`: Field inspection records tracking compliance status (`compliant`), harvest certification status, land situation, and surface area (`surface_area_ha`).
- `fact_thr_threshing.csv`: Threshing reports tracking total production (`actual_total_rice_production_kg`) and split allocations (sold, consumed, seeds kept).
- `fact_ppr_purchase.csv`: Transaction logs containing transaction date, quantity (`quantity_kg`), grade, unit price, gross amount (`total_amount_riel`), and net payout (`total_payment_riel` after seed deductions).
- `fact_ppr_spec_record.csv`: Quality measurements recording moisture levels, purity, impurity ratios, color, and grade classification.

---

## 📐 Calculations, Formulas, and Assumptions

Below is the documentation for all core calculations implemented in the dashboard:

### 1. Active Farmers
- **Data Source**: `fact_afl_inspection.csv`
- **Formula**:
  $$\text{Active Farmers} = \text{Count of unique } (\text{farmer\_uid}) \text{ in inspections for selected period}$$
- **Calculation Method**: Aggregated in `build_data.py` to prevent double-counting of farmers with multiple plots. Filtered and resolved dynamically on the frontend.
- **Assumptions**: A farmer is active in a given year if they underwent a program inspection during that year.
- **Output Format**: Integer (e.g. `2,449` active farmers).

### 2. Total Production Volume
- **Data Source**: `fact_thr_threshing.csv`
- **Formula**:
  $$\text{Production (Kg)} = \sum \text{actual\_total\_rice\_production\_kg}$$
- **Calculation Method**: Summed across matching records in the preprocessor and aggregated on the frontend.
- **Assumptions**: Threshing records are accurate. Empty/invalid inputs default to `0.0`.
- **Output Format**: Kilograms (`Kg`) for volumes $< 1,000$ Kg; Metric Tons (`MT`) for volumes $\ge 1,000$ Kg:
  $$\text{Weight in MT} = \frac{\text{Weight in Kg}}{1000}$$

### 3. Program Revenue (Net Farmer Income)
- **Data Source**: `fact_ppr_purchase.csv`
- **Formula**:
  $$\text{Revenue (Riel)} = \sum \text{total\_payment\_riel}$$
- **Calculation Method**: Sum of net payments received by farmers (after deducting seed or transportation costs).
- **Assumptions**: Large sums are converted to USD at a fixed exchange rate of **`1 USD = 4,000 KHR`**:
  $$\text{USD (\$)} = \frac{\text{Value in KHR}}{4000}$$
- **Output Format**: USD (`$`) for values $\ge 4000$ KHR. Values in the millions include the `M` suffix (e.g., `$5.51M`).

### 4. Average Paddy Yield
- **Data Source**: `fact_thr_threshing.csv` (Production) & `fact_afl_inspection.csv` (Area)
- **Formula**:
  $$\text{Yield (Kg/Ha)} = \frac{\text{Total Production (Kg)}}{\text{Total Cultivated Area (Ha)}}$$
- **Calculation Method**: Divides the total production of the cohort by the sum of inspected farmland area.
- **Assumptions**: Inspection areas and threshing volumes represent matching cohorts.
- **Output Format**: Rounded to 1 decimal place followed by `" Kg/Ha"`.

### 5. Average Paddy Unit Price
- **Data Source**: `fact_ppr_purchase.csv`
- **Formula**:
  $$\text{Average Price (KHR/Kg)} = \frac{\sum \text{total\_amount\_riel}}{\sum \text{quantity\_kg}}$$
- **Calculation Method**: Sums gross purchase values (before deductions) and divides by the total weight bought. If `total_amount_riel` is empty, it falls back to `unit_price_riel * quantity_kg`.
- **Assumptions**: Calculated using gross amounts to represent the actual market price of paddy before repayments.
- **Output Format**: Integer followed by `" KHR/Kg"` (or USD if above 4,000 KHR).

### 6. Program Compliance Rate
- **Data Source**: `fact_afl_inspection.csv`
- **Formula**:
  $$\text{Compliance Rate (\%)} = \left( \frac{\sum \text{Compliant Inspections}}{\sum \text{Total Inspections}} \right) \times 100$$
- **Calculation Method**: Inspections where `compliant` equals `"Yes"` are summed and divided by the total inspection count. Aggregated using raw counts to prevent mathematical errors.
- **Assumptions**: Compliance is binary ("Yes" / "No").
- **Output Format**: Percentage with 1 decimal place (e.g., `77.3%`).

### 7. Farmland Area
- **Data Source**: `fact_afl_inspection.csv`
- **Formula**:
  $$\text{Total Area (Ha)} = \sum \text{surface\_area\_ha}$$
- **Calculation Method**: Summed in the preprocessor. Excludes extreme outlier records where area is $\le 0.0$ or $\ge 500.0$ Ha to safeguard against data entry errors.
- **Assumptions**: Land area is measured in Hectares (Ha).
- **Output Format**: Rounded to 1 decimal place followed by `" Ha"`.

### 8. Cohort Retention Rate
- **Data Source**: `dim_farmer.csv` (Join Year) & `fact_afl_inspection.csv` (Inspection records)
- **Formula**:
  $$\text{Retention Rate (Cohort } C\text{, Year } Y\text{)} = \left( \frac{\text{Inspected Cohort Farmers in } Y}{\text{Total Cohort Size}} \right) \times 100$$
- **Calculation Method**: Cohort sizes are grouped by registration year (`first_year_seen`). The percentage of active cohort members in each subsequent year is plotted.
- **Output Format**: Percentage rounded to nearest integer (e.g. `78%`).

---

## 🗺️ Geographic Map Views

The **Geography** tab map popups, site summaries, and village list filter reflect only the **latest year (`2025`)** to highlight the current active participation in the project.

---

## 📈 UI and Chart Configurations

The dashboard uses **Chart.js v4 (UMD)** and **Leaflet.js** configured in `src/js/charts.js`:
- **Farmer Growth**: Stacked bar displaying active farmers by status (`New`, `Rejoin`, `Existing`).
- **Production Trend**: Grouped bar showing production in MT with line chart overlay of yield (Kg/Ha).
- **Purchase Trend**: Bar displaying purchase volume in MT with line overlay of revenue ($M).
- **Quality Trends**: Multi-line chart showing moisture levels, impurities, and grain quality ratios.
- **Site Comparison**: Grouped bar comparing active sites by farmer count and compliance.
- **Interactive Map**: Renders coordinates and circles sized by farmer volume. Clicking a circle populates local statistics and filters the village lists.

---

## 🚀 Deployment Instructions (GitHub Pages)

1. Make sure your repository is pushed to GitHub.
2. Navigate to your repository page on GitHub.
3. Open **Settings** > **Pages** > **Build and deployment**.
4. Set the source to **Deploy from a branch**.
5. Select the **`main`** branch and keep the directory as `/ (root)`.
6. Click **Save**. The page will deploy in 1-2 minutes and be available at:
   `https://<username>.github.io/farm_data_dashboard/`

---

## 🔄 Git Workflow

- **`main`**: The stable branch reflecting the active production environment.
- When updating data files:
  1. Replace the CSV files in `data_sources/`.
  2. Run the preprocessor command `npm run preprocess` to rebuild `data/dashboard_data.js`.
  3. Validate the dashboard locally using `npm run dev`.
  4. Commit both the updated CSVs and the newly generated `data/dashboard_data.js`.
  5. Push to GitHub to trigger automatic deployment to GitHub Pages.

---

## 🔮 Future Improvements

1. **Migrate to React and TypeScript**:
   - Rewrite the components using functional components and hooks for better state management.
   - Introduce TypeScript interfaces for the dashboard data models to catch bugs during development.
2. **Incremental Loading**:
   - For even larger datasets, load data chunk-by-chunk using API endpoints or split JSON cohorts instead of loading a single large `dashboard_data.js` file.
3. **Database Integration**:
   - Transition the Python preprocessor to run as a backend ETL pipeline feeding into a relational database (PostgreSQL) instead of using local CSV databases.
