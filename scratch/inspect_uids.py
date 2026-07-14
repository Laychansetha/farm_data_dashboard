import csv

def load_uids(filename, colname):
    uids = set()
    with open(f"data_sources/{filename}", encoding='utf-8-sig', errors='replace') as f:
        reader = csv.DictReader(f)
        for r in reader:
            val = r.get(colname, '').strip()
            if val:
                uids.add(val)
    return uids

dim_farmers = load_uids('dim_farmer.csv', 'farmer_uid')
insp_farmers = load_uids('fact_afl_inspection.csv', 'farmer_uid')
purch_farmers = load_uids('fact_ppr_purchase.csv', 'farmer_uid')
thresh_farmers = load_uids('fact_thr_threshing.csv', 'farmer_uid')
spec_farmers = load_uids('fact_ppr_spec_record.csv', 'farmer_uid')

print(f"Unique UIDs in dim_farmer.csv: {len(dim_farmers)}")
print(f"Unique UIDs in fact_afl_inspection.csv: {len(insp_farmers)}")
print(f"Unique UIDs in fact_ppr_purchase.csv: {len(purch_farmers)}")
print(f"Unique UIDs in fact_thr_threshing.csv: {len(thresh_farmers)}")
print(f"Unique UIDs in fact_ppr_spec_record.csv: {len(spec_farmers)}")

# Check intersection
print(f"\nIn inspection but not in dim_farmer: {len(insp_farmers - dim_farmers)}")
print(f"In purchase but not in dim_farmer: {len(purch_farmers - dim_farmers)}")
print(f"In threshing but not in dim_farmer: {len(thresh_farmers - dim_farmers)}")

# Print a few samples of mismatched UIDs
print("\nSample mismatched in purchase:")
print(list(purch_farmers - dim_farmers)[:10])
print("\nSample mismatched in threshing:")
print(list(thresh_farmers - dim_farmers)[:10])
print("\nSample mismatched in inspection:")
print(list(insp_farmers - dim_farmers)[:10])
