import os
import csv
import shutil

DATA_DIR = 'data_sources'
BACKUP_DIR = os.path.join(DATA_DIR, 'raw_backup')

def main():
    print("=" * 60)
    print("  Data Normalization & PostgreSQL Preparation Tool")
    print("=" * 60)

    # 1. Create backup of raw CSVs
    if not os.path.exists(BACKUP_DIR):
        print(f"\n[1/5] Backing up original CSVs to '{BACKUP_DIR}'...")
        os.makedirs(BACKUP_DIR)
        for f in os.listdir(DATA_DIR):
            if f.endswith('.csv') and f != 'fact_farmer_annual_survey.csv':
                shutil.copy(os.path.join(DATA_DIR, f), os.path.join(BACKUP_DIR, f))
        print("     Backup completed successfully.")
    else:
        print(f"\n[1/5] Backup already exists at '{BACKUP_DIR}'. Using existing backup.")

    def read_backup(filename):
        path = os.path.join(BACKUP_DIR, filename)
        with open(path, encoding='utf-8-sig', errors='replace') as f:
            return list(csv.DictReader(f))

    def write_normalized(filename, fieldnames, rows):
        path = os.path.join(DATA_DIR, filename)
        with open(path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for r in rows:
                writer.writerow({k: r.get(k, '') for k in fieldnames})
        print(f"     OK: Saved {filename} ({len(rows)} rows)")

    # 2. Normalize Dimension Tables
    print("\n[2/5] Normalizing Dimension Tables...")

    # dim_site.csv
    # Add coordinates from build_data.py
    site_coords = {
        '1': {'lat': 13.7960, 'lng': 104.9800},
        '2': {'lat': 12.9500, 'lng': 105.5000},
        '3': {'lat': 14.1200, 'lng': 106.3700},
        '4': {'lat': 13.7350, 'lng': 106.9870},
        '5': {'lat': 12.4535, 'lng': 107.1877},
    }
    sites = read_backup('dim_site.csv')
    for s in sites:
        sid = s['site_id']
        s['lat'] = site_coords.get(sid, {}).get('lat', '')
        s['lng'] = site_coords.get(sid, {}).get('lng', '')
    write_normalized('dim_site.csv', ['site_name', 'site_id', 'lat', 'lng'], sites)

    # dim_irpg.csv
    # Keep as-is
    irpgs = read_backup('dim_irpg.csv')
    write_normalized('dim_irpg.csv', ['irpg_name', 'irpg_id'], irpgs)

    # dim_village.csv
    # Remove site_name and irpg_name
    villages = read_backup('dim_village.csv')
    write_normalized('dim_village.csv', ['village_name', 'site_id', 'village_id', 'irpg_id'], villages)

    # dim_farmer.csv
    # Remove site_id, first_year_seen, last_year_seen, current_status
    farmers = read_backup('dim_farmer.csv')
    write_normalized('dim_farmer.csv', ['farmer_uid', 'family_id', 'village_id', 'farmer_name', 'husband_name', 'wife_name', 'gender'], farmers)

    # dim_crop_variety.csv
    # Keep as-is
    varieties = read_backup('dim_crop_variety.csv')
    write_normalized('dim_crop_variety.csv', ['variety_name', 'variety_id', 'category'], varieties)

    # 3. Process Inspections to produce fact_farmer_annual_survey and fact_plot_inspection
    print("\n[3/5] Processing Inspections...")
    inspections = read_backup('fact_afl_inspection.csv')

    # Socio-economic/Demographics extraction
    surveys = {}
    survey_id_seq = 1

    # Keep track of unique survey properties per (farmer_uid, year)
    for r in inspections:
        uid = r.get('farmer_uid', '').strip()
        y = r.get('data_year', '').strip()
        if not uid or not y:
            continue
        key = (uid, y)
        if key not in surveys:
            # Extract demographic fields
            surveys[key] = {
                'survey_id': survey_id_seq,
                'farmer_uid': uid,
                'data_year': y,
                'age': r.get('age', '').strip(),
                'education': r.get('education', '').strip(),
                'household_member': r.get('household_member', '').strip(),
                'women': r.get('women', '').strip(),
                'total_income_riel': r.get('total_income_riel', '').strip(),
                'spend_riel': r.get('spend_riel', '').strip(),
                'homestead': r.get('homestead', '').strip(),
                'cattle': r.get('cattle', '').strip(),
                'buffalo': r.get('buffalo', '').strip(),
            }
            survey_id_seq += 1

    survey_rows = sorted(surveys.values(), key=lambda x: (x['farmer_uid'], x['data_year']))
    write_normalized('fact_farmer_annual_survey.csv', [
        'survey_id', 'farmer_uid', 'data_year', 'age', 'education', 
        'household_member', 'women', 'total_income_riel', 'spend_riel', 
        'homestead', 'cattle', 'buffalo'
    ], survey_rows)

    # fact_plot_inspection.csv
    # Rename other_(ha) to other_area_ha, and exclude socio-economic columns
    plot_rows = []
    insp_id_seq = 1
    for r in inspections:
        plot_rows.append({
            'inspection_id': insp_id_seq,
            'farmer_uid': r.get('farmer_uid', '').strip(),
            'data_year': r.get('data_year', '').strip(),
            'inspection_date': r.get('inspection_date', '').strip(),
            'parcel_id': r.get('parcel_id', '').strip(),
            'plot_code': r.get('plot_code', '').strip(),
            'variety': r.get('variety', '').strip(),
            'planting_method': r.get('planting_method', '').strip(),
            'status_harvest': r.get('status_harvest', '').strip(),
            'planted_area_ha': r.get('planted_area_ha', '').strip(),
            'fallow_area_ha': r.get('fallow_area_ha', '').strip(),
            'other_area_ha': r.get('other_(ha)', '').strip(),
            'expected_production_kg': r.get('expected_production_kg', '').strip(),
            'expected_sell_kg': r.get('expected_sell_kg', '').strip(),
            'land_situation': r.get('land_situation', '').strip(),
            'land_ownership': r.get('land_ownership', '').strip(),
            'irrigation_system': r.get('irrigation_system', '').strip(),
            'compliant': r.get('compliant', '').strip(),
            'farmer_status': r.get('farmer_status', '').strip()
        })
        insp_id_seq += 1

    write_normalized('fact_plot_inspection.csv', [
        'inspection_id', 'farmer_uid', 'data_year', 'inspection_date', 'parcel_id', 'plot_code',
        'variety', 'planting_method', 'status_harvest', 'planted_area_ha', 'fallow_area_ha',
        'other_area_ha', 'expected_production_kg', 'expected_sell_kg', 'land_situation',
        'land_ownership', 'irrigation_system', 'compliant', 'farmer_status'
    ], plot_rows)

    # 4. Process Other Fact Tables
    print("\n[4/5] Processing Transaction Fact Tables...")

    # fact_purchase.csv (fact_ppr_purchase.csv)
    # Remove site_id, village_id, irpg_id
    purchases = read_backup('fact_ppr_purchase.csv')
    purch_rows = []
    purch_id_seq = 1
    for r in purchases:
        purch_rows.append({
            'purchase_id': purch_id_seq,
            'farmer_uid': r.get('farmer_uid', '').strip(),
            'data_year': r.get('data_year', '').strip(),
            'purchase_date': r.get('purchase_date', '').strip(),
            'variety': r.get('variety', '').strip(),
            'status': r.get('status', '').strip(),
            'unit_price_riel': r.get('unit_price_riel', '').strip(),
            'quantity_kg': r.get('quantity_kg', '').strip(),
            'number_of_sacks': r.get('number_of_sacks', '').strip(),
            'total_amount_riel': r.get('total_amount_riel', '').strip(),
            'total_payment_riel': r.get('total_payment_riel', '').strip(),
            'borrowed_seed_kg': r.get('borrowed_seed_kg', '').strip(),
            'returned_seed_kg': r.get('returned_seed_kg', '').strip()
        })
        purch_id_seq += 1
    write_normalized('fact_purchase.csv', [
        'purchase_id', 'farmer_uid', 'data_year', 'purchase_date', 'variety', 'status',
        'unit_price_riel', 'quantity_kg', 'number_of_sacks', 'total_amount_riel', 'total_payment_riel',
        'borrowed_seed_kg', 'returned_seed_kg'
    ], purch_rows)

    # fact_threshing.csv (fact_thr_threshing.csv)
    threshings = read_backup('fact_thr_threshing.csv')
    thresh_rows = []
    thresh_id_seq = 1
    for r in threshings:
        # Keep columns but assign primary key
        r['threshing_id'] = thresh_id_seq
        thresh_rows.append(r)
        thresh_id_seq += 1
    thresh_cols = ['threshing_id', 'data_year', 'farmer_uid', 'threshing_date', 'planting_method',
                   'total_area_ha', 'rice_type', 'threshing_method', 'threshing_machine_owner',
                   'how_to_clean', 'actual_total_rice_production_kg', 'paddy_take_to_clean_machine_kg',
                   'paddy_prepare_for_sell_kg', 'paddy_keep_for_consumption_kg', 'paddy_keep_for_seeds_kg',
                   'payment_by', 'by_cash_riel', 'by_paddy_kg']
    write_normalized('fact_threshing.csv', thresh_cols, thresh_rows)

    # fact_quality_spec.csv (fact_ppr_spec_record.csv)
    # Remove site_id, village_id, family_id_raw
    specs = read_backup('fact_ppr_spec_record.csv')
    spec_rows = []
    spec_id_seq = 1
    for r in specs:
        spec_rows.append({
            'spec_id': spec_id_seq,
            'farmer_uid': r.get('farmer_uid', '').strip(),
            'data_year': r.get('data_year', '').strip(),
            'moisture': r.get('moisture', '').strip(),
            'color': r.get('color', '').strip(),
            'rice_impurity': r.get('rice_impurity', '').strip(),
            'rice_husk': r.get('rice_husk', '').strip(),
            'good_grain_pct': r.get('good_grain_pct', '').strip(),
            'broken_grain_pct': r.get('broken_grain_pct', '').strip(),
            'grade': r.get('grade', '').strip(),
            'variety': r.get('variety', '').strip(),
            'status': r.get('status', '').strip(),
            'price_riel': r.get('price_riel', '').strip()
        })
        spec_id_seq += 1
    write_normalized('fact_quality_spec.csv', [
        'spec_id', 'farmer_uid', 'data_year', 'moisture', 'color', 'rice_impurity', 'rice_husk',
        'good_grain_pct', 'broken_grain_pct', 'grade', 'variety', 'status', 'price_riel'
    ], spec_rows)

    # 5. Cleanup raw unnormalized files
    print("\n[5/5] Cleaning up old CSV files from main directory...")
    old_files = [
        'fact_afl_inspection.csv',
        'fact_ppr_purchase.csv',
        'fact_thr_threshing.csv',
        'fact_ppr_spec_record.csv'
    ]
    for filename in old_files:
        path = os.path.join(DATA_DIR, filename)
        if os.path.exists(path):
            os.remove(path)
            print(f"     Deleted: {filename}")

    print("\n" + "=" * 60)
    print("  Normalization completed successfully!")
    print("=" * 60)

if __name__ == '__main__':
    main()
