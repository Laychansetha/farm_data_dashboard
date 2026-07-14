import csv

for filename in ['fact_thr_threshing.csv', 'fact_ppr_spec_record.csv']:
    with open(f"data_sources/{filename}", encoding='utf-8-sig', errors='replace') as f:
        reader = csv.reader(f)
        headers = next(reader)
        print(f"\nFile: {filename}")
        print("Columns:", headers)
