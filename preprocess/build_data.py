#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io
if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
"""
Agricultural Dashboard Data Preprocessor
=========================================
Run annually after updating CSV files in data_sources/
Outputs: data/dashboard_data.js

Usage:
    python preprocess/build_data.py

Requirements: Python 3.7+ (no external dependencies)
"""

import csv
import json
import os
import sys
from collections import defaultdict
from datetime import datetime

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR   = os.path.join(BASE_DIR, 'data_sources')
OUTPUT_DIR = os.path.join(BASE_DIR, 'data')
OUTPUT_JS  = os.path.join(OUTPUT_DIR, 'dashboard_data.js')

# ── Cambodia site coordinates ─────────────────────────────────────────────────
SITE_COORDS = {
    '1': {'name': 'Mondolkiri',   'lat': 12.4535, 'lng': 107.1877},
    '2': {'name': 'Preah Vihear', 'lat': 13.7960, 'lng': 104.9800},
    '3': {'name': 'Prey Lang',    'lat': 12.9500, 'lng': 105.5000},
    '4': {'name': 'Ratanakiri',   'lat': 13.7350, 'lng': 106.9870},
    '5': {'name': 'Siem Pang',    'lat': 14.1200, 'lng': 106.3700},
}

# ── Helpers ────────────────────────────────────────────────────────────────────
def read_csv(filename):
    path = os.path.join(DATA_DIR, filename)
    with open(path, encoding='utf-8-sig', errors='replace') as f:
        return list(csv.DictReader(f))

def safe_float(val, default=0.0):
    try:
        v = float(str(val).strip())
        return v if v == v else default   # NaN guard
    except (TypeError, ValueError):
        return default

def normalize_cert(s):
    s = (s or '').strip().lower()
    if not s: return 'Unknown'
    if s in ('organic', 'orgainic'): return 'Organic'
    if s in ('new_organic', 'new organic', 'adhoc', 'ad hoc'): return 'New Organic'
    if s in ('ibis 1', 'ibis i', 'ibis1', 'ibis i', 'ibis i'): return 'Ibis I'
    if s in ('ibis 2', 'ibis ii', 'ibis2', 'ibis ii'): return 'Ibis II'
    if s in ('wf', 'wildlife friendly', 'wildlife-friendly'): return 'WF'
    return s.title()

def normalize_farmer_status(s):
    s = (s or '').strip().lower()
    if not s: return 'Unknown'
    if 'new' in s: return 'New'
    if 'rejoin' in s: return 'Rejoin'
    if 'existing' in s: return 'Existing'
    return s.title()

def normalize_threshing(s):
    s = (s or '').strip().lower()
    if not s or s == '0': return 'Unknown'
    if 'machine' in s or 'harvest by machine' in s: return 'Machine'
    if 'hand' in s: return 'Hand'
    return 'Unknown'

def normalize_grade(g):
    g = (g or '').strip()
    if g in ('1',): return 'A1'
    if g in ('2',): return 'A2'
    if g in ('3',): return 'B1'
    if g in ('4', 'b2', 'B3', 'B4', 'B5'): return 'B2'
    return g if g else 'Unknown'

def pct(n, d, digits=1):
    return round(n / d * 100, digits) if d else 0.0

def avg(lst):
    return sum(lst) / len(lst) if lst else None

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    print("=" * 56)
    print("  Farm Data Dashboard -- Data Preprocessor")
    print("=" * 56)

    # ── 1. Load dimensions ────────────────────────────────────────
    print("\n[1/8] Loading dimensions…")
    sites_raw    = {r['site_id']: r   for r in read_csv('dim_site.csv')}
    villages_raw = {str(r['village_id']): r for r in read_csv('dim_village.csv')}
    irpgs_raw    = {str(r['irpg_id']): r   for r in read_csv('dim_irpg.csv')}
    varieties_raw= {str(r['variety_id']): r for r in read_csv('dim_crop_variety.csv')}
    farmers_list = read_csv('dim_farmer.csv')
    farmers_map  = {r['farmer_uid']: r for r in farmers_list}
    print(f"     Sites: {len(sites_raw)} | Villages: {len(villages_raw)} | Farmers: {len(farmers_map)}")

    def farmer_site_id(uid):
        return farmers_map.get(uid, {}).get('site_id', '')

    def farmer_village_id(uid):
        return farmers_map.get(uid, {}).get('village_id', '')

    def site_name(sid):
        return sites_raw.get(str(sid), {}).get('site_name', 'Unknown')

    def village_name(vid):
        return villages_raw.get(str(vid), {}).get('village_name', 'Unknown')

    # ── 2. Load fact tables ───────────────────────────────────────
    print("[2/8] Loading fact tables…")
    inspections  = read_csv('fact_afl_inspection.csv')
    purchases    = read_csv('fact_ppr_purchase.csv')
    threshings   = read_csv('fact_thr_threshing.csv')
    spec_records = read_csv('fact_ppr_spec_record.csv')
    print(f"     Inspections: {len(inspections):,} | Purchases: {len(purchases):,} | Threshings: {len(threshings):,} | Specs: {len(spec_records):,}")

    all_years = sorted({r['data_year'] for r in inspections if r.get('data_year')} |
                       {r['data_year'] for r in purchases    if r.get('data_year')} |
                       {r['data_year'] for r in threshings   if r.get('data_year')})

    latest_year = all_years[-1] if all_years else ''

    # ── 3. Yearly trend ───────────────────────────────────────────
    print("[3/8] Computing yearly trends…")

    def new_yr():
        return {
            'farmers': set(), 'insp': 0, 'compliant': 0,
            'area_ha': 0.0, 'planted_area_ha': 0.0, 'fallow_area_ha': 0.0, 'other_area_ha': 0.0,
            'new': 0, 'existing': 0, 'rejoin': 0,
            'cert': defaultdict(int), 'land_sit': defaultdict(int),
            'land_own': defaultdict(int), 'irrigation': defaultdict(int),
            'prod_kg': 0.0, 'sell_kg': 0.0, 'consume_kg': 0.0, 'seed_kg': 0.0,
            'thr_machine': 0, 'thr_hand': 0, 'thr_unknown': 0,
            'purch_kg': 0.0, 'purch_riel': 0.0, 'purch_n': 0,
        }

    yr_data = defaultdict(new_yr)

    seen_yearly_farmer = set()
    for r in inspections:
        y = r.get('data_year', ''); uid = r.get('farmer_uid', '')
        if not y: continue
        d = yr_data[y]
        d['farmers'].add(uid); d['insp'] += 1
        if r.get('compliant', '').lower() == 'yes': d['compliant'] += 1
        p = safe_float(r.get('planted_area_ha'))
        f = safe_float(r.get('fallow_area_ha'))
        o = safe_float(r.get('other_(ha)'))
        d['planted_area_ha'] += p
        d['fallow_area_ha'] += f
        d['other_area_ha'] += o
        d['area_ha'] += (p + f + o)
        fs = normalize_farmer_status(r.get('farmer_status', ''))
        key = (y, uid, fs)
        if key not in seen_yearly_farmer:
            seen_yearly_farmer.add(key)
            if fs == 'New': d['new'] += 1
            elif fs == 'Existing': d['existing'] += 1
            elif fs == 'Rejoin': d['rejoin'] += 1
        d['cert'][normalize_cert(r.get('status_harvest', ''))] += 1
        d['land_sit'][(r.get('land_situation', '') or 'Unknown').strip()] += 1
        d['land_own'][(r.get('land_ownership', '')  or 'Unknown').strip()] += 1
        d['irrigation'][(r.get('irrigation_system', '') or 'None').strip()] += 1

    for r in threshings:
        y = r.get('data_year', '')
        if not y: continue
        d = yr_data[y]
        d['prod_kg']    += safe_float(r.get('actual_total_rice_production_kg'))
        d['sell_kg']    += safe_float(r.get('paddy_prepare_for_sell_kg'))
        d['consume_kg'] += safe_float(r.get('paddy_keep_for_consumption_kg'))
        d['seed_kg']    += safe_float(r.get('paddy_keep_for_seeds_kg'))
        m = normalize_threshing(r.get('threshing_method', ''))
        if m == 'Machine': d['thr_machine'] += 1
        elif m == 'Hand':  d['thr_hand']    += 1
        else:              d['thr_unknown']  += 1

    for r in purchases:
        y = r.get('data_year', '')
        if not y: continue
        d = yr_data[y]
        d['purch_kg']   += safe_float(r.get('quantity_kg'))
        d['purch_riel'] += safe_float(r.get('total_payment_riel'))
        d['purch_n']    += 1

    yearly_trend = []
    for y in all_years:
        d = yr_data[y]
        fc = len(d['farmers'])
        yield_ha = d['prod_kg'] / d['planted_area_ha'] if d['planted_area_ha'] else 0
        avg_price = d['purch_riel'] / d['purch_kg'] if d['purch_kg'] else 0
        yearly_trend.append({
            'year': y,
            'unique_farmers': fc,
            'new': d['new'], 'existing': d['existing'], 'rejoin': d['rejoin'],
            'total_inspections': d['insp'],
            'compliance_rate': pct(d['compliant'], d['insp']),
            'total_area_ha': round(d['area_ha'], 1),
            'planted_area_ha': round(d['planted_area_ha'], 1),
            'fallow_area_ha': round(d['fallow_area_ha'], 1),
            'other_area_ha': round(d['other_area_ha'], 1),
            'prod_kg': round(d['prod_kg']),
            'sell_kg': round(d['sell_kg']),
            'consume_kg': round(d['consume_kg']),
            'seed_kg': round(d['seed_kg']),
            'avg_yield_kg_ha': round(yield_ha, 1),
            'thr_machine': d['thr_machine'], 'thr_hand': d['thr_hand'], 'thr_unknown': d['thr_unknown'],
            'purch_kg': round(d['purch_kg']),
            'purch_riel': round(d['purch_riel']),
            'purch_n': d['purch_n'],
            'avg_price_riel_kg': round(avg_price),
            'cert': dict(d['cert']),
            'land_sit': dict(d['land_sit']),
            'land_own': dict(d['land_own']),
            'irrigation': dict(d['irrigation']),
        })

    # ── 4. Site × Year ────────────────────────────────────────────
    print("[4/8] Computing site × year aggregations…")

    def new_sy():
        return {'farmers': set(), 'insp': 0, 'compliant': 0, 'area_ha': 0.0,
                'planted_area_ha': 0.0, 'fallow_area_ha': 0.0, 'other_area_ha': 0.0,
                'prod_kg': 0.0, 'purch_kg': 0.0, 'purch_riel': 0.0,
                'new': 0, 'existing': 0, 'rejoin': 0,
                'cert': defaultdict(int),
                'land_sit': defaultdict(int),
                'land_own': defaultdict(int),
                'irrigation': defaultdict(int)}

    sy = defaultdict(lambda: defaultdict(new_sy))

    seen_site_yearly_farmer = set()
    for r in inspections:
        y = r.get('data_year', ''); uid = r.get('farmer_uid', '')
        if not y: continue
        sn = site_name(farmer_site_id(uid))
        d  = sy[sn][y]
        d['farmers'].add(uid); d['insp'] += 1
        if r.get('compliant', '').lower() == 'yes': d['compliant'] += 1
        p = safe_float(r.get('planted_area_ha'))
        f = safe_float(r.get('fallow_area_ha'))
        o = safe_float(r.get('other_(ha)'))
        d['planted_area_ha'] += p
        d['fallow_area_ha'] += f
        d['other_area_ha'] += o
        d['area_ha'] += (p + f + o)
        fs = normalize_farmer_status(r.get('farmer_status', ''))
        key = (sn, y, uid, fs)
        if key not in seen_site_yearly_farmer:
            seen_site_yearly_farmer.add(key)
            if fs == 'New': d['new'] += 1
            elif fs == 'Existing': d['existing'] += 1
            elif fs == 'Rejoin': d['rejoin'] += 1
        d['cert'][normalize_cert(r.get('status_harvest', ''))] += 1
        d['land_sit'][(r.get('land_situation', '') or 'Unknown').strip()] += 1
        d['land_own'][(r.get('land_ownership', '')  or 'Unknown').strip()] += 1
        d['irrigation'][(r.get('irrigation_system', '') or 'None').strip()] += 1

    for r in threshings:
        y = r.get('data_year', ''); uid = r.get('farmer_uid', '')
        if not y: continue
        sn = site_name(farmer_site_id(uid))
        sy[sn][y]['prod_kg'] += safe_float(r.get('actual_total_rice_production_kg'))

    for r in purchases:
        y = r.get('data_year', '')
        if not y: continue
        sid = r.get('site_id', '')
        sn  = site_name(sid) if sid else 'Unknown'
        sy[sn][y]['purch_kg']   += safe_float(r.get('quantity_kg'))
        sy[sn][y]['purch_riel'] += safe_float(r.get('total_payment_riel'))

    site_year = {}
    for sn, ydict in sy.items():
        site_year[sn] = {}
        for y, d in ydict.items():
            fc = len(d['farmers'])
            yield_ha = d['prod_kg'] / d['planted_area_ha'] if d['planted_area_ha'] else 0
            site_year[sn][y] = {
                'unique_farmers': fc,
                'new': d['new'], 'existing': d['existing'], 'rejoin': d['rejoin'],
                'compliance_rate': pct(d['compliant'], d['insp']),
                'compliant_count': d['compliant'],
                'inspection_count': d['insp'],
                'total_area_ha': round(d['area_ha'], 1),
                'planted_area_ha': round(d['planted_area_ha'], 1),
                'fallow_area_ha': round(d['fallow_area_ha'], 1),
                'other_area_ha': round(d['other_area_ha'], 1),
                'prod_kg': round(d['prod_kg']),
                'purch_kg': round(d['purch_kg']),
                'purch_riel': round(d['purch_riel']),
                'avg_yield_kg_ha': round(yield_ha, 1),
                'cert': dict(d['cert']),
                'land_sit': dict(d['land_sit']),
                'land_own': dict(d['land_own']),
                'irrigation': dict(d['irrigation']),
            }

    # ── 5. Village stats ──────────────────────────────────────────
    print("[5/8] Computing village stats…")

    def new_vill():
        return {'farmers': set(), 'site': '', 'prod_kg': 0.0,
                'area_ha': 0.0, 'planted_area_ha': 0.0, 'fallow_area_ha': 0.0, 'other_area_ha': 0.0,
                'purch_kg': 0.0, 'purch_riel': 0.0, 'years': set()}

    vill = defaultdict(new_vill)

    for r in inspections:
        if r.get('data_year') != latest_year: continue
        uid = r.get('farmer_uid', '')
        vid = farmer_village_id(uid)
        vn  = village_name(vid)
        d   = vill[vn]
        d['site'] = site_name(farmer_site_id(uid))
        d['farmers'].add(uid)
        d['years'].add(r.get('data_year', ''))
        p = safe_float(r.get('planted_area_ha'))
        f = safe_float(r.get('fallow_area_ha'))
        o = safe_float(r.get('other_(ha)'))
        d['planted_area_ha'] += p
        d['fallow_area_ha'] += f
        d['other_area_ha'] += o
        d['area_ha'] += (p + f + o)

    for r in threshings:
        if r.get('data_year') != latest_year: continue
        uid = r.get('farmer_uid', '')
        vid = farmer_village_id(uid)
        vn  = village_name(vid)
        vill[vn]['prod_kg'] += safe_float(r.get('actual_total_rice_production_kg'))

    for r in purchases:
        if r.get('data_year') != latest_year: continue
        uid = r.get('farmer_uid', '')
        vid = r.get('village_id', '') or farmer_village_id(uid)
        vn  = village_name(vid)
        vill[vn]['purch_kg']   += safe_float(r.get('quantity_kg'))
        vill[vn]['purch_riel'] += safe_float(r.get('total_payment_riel'))

    village_stats = []
    for vn, d in vill.items():
        if vn in ('Unknown', ''): continue
        fc = len(d['farmers'])
        yh = d['prod_kg'] / d['area_ha'] if d['area_ha'] else 0
        village_stats.append({
            'village': vn, 'site': d['site'],
            'total_farmers': fc,
            'prod_kg': round(d['prod_kg']),
            'area_ha': round(d['area_ha'], 1),
            'avg_yield_kg_ha': round(yh, 1),
            'purch_kg': round(d['purch_kg']),
            'purch_riel': round(d['purch_riel']),
            'years_active': sorted(d['years']),
        })
    village_stats.sort(key=lambda x: x['prod_kg'], reverse=True)

    # ── 6. Quality by year ────────────────────────────────────────
    print("[6/8] Computing quality metrics…")

    def new_q():
        return {'grades': defaultdict(int), 'colors': defaultdict(int), 'cert': defaultdict(int),
                'moisture': [], 'good_grain': [], 'broken_grain': [],
                'impurity': [], 'husk': [], 'prices_by_grade': defaultdict(list), 'n': 0}

    qy = defaultdict(new_q)

    for r in spec_records:
        y = r.get('data_year', '')
        if not y: continue
        d = qy[y]; d['n'] += 1
        grade = normalize_grade(r.get('grade', ''))
        d['grades'][grade] += 1
        color = (r.get('color') or 'Unknown').strip()
        d['colors'][color] += 1
        d['cert'][normalize_cert(r.get('status', ''))] += 1
        m = safe_float(r.get('moisture'), None)
        if m and 0 < m < 30: d['moisture'].append(m)
        gg = safe_float(r.get('good_grain_pct'), None)
        if gg is not None and 0 <= gg <= 100: d['good_grain'].append(gg)
        bg = safe_float(r.get('broken_grain_pct'), None)
        if bg is not None and 0 <= bg <= 100: d['broken_grain'].append(bg)
        imp = safe_float(r.get('rice_impurity'), None)
        if imp is not None and 0 <= imp <= 100: d['impurity'].append(imp)
        husk = safe_float(r.get('rice_husk'), None)
        if husk is not None and 0 <= husk <= 100: d['husk'].append(husk)
        p = safe_float(r.get('price_riel'))
        if p > 0: d['prices_by_grade'][grade].append(p)

    def ra(lst, digits=2): return round(avg(lst), digits) if lst else None

    quality_by_year = {}
    for y, d in qy.items():
        quality_by_year[y] = {
            'grades': dict(d['grades']),
            'colors': dict(d['colors']),
            'cert': dict(d['cert']),
            'avg_moisture': ra(d['moisture']),
            'avg_good_grain': ra(d['good_grain'], 1),
            'avg_broken_grain': ra(d['broken_grain'], 1),
            'avg_impurity': ra(d['impurity']),
            'avg_husk': ra(d['husk']),
            'avg_price_by_grade': {k: round(avg(v)) for k, v in d['prices_by_grade'].items() if v},
            'total_records': d['n'],
        }

    # ── 7. Farmer cohort ──────────────────────────────────────────
    print("[7/8] Computing farmer cohort retention…")

    farmer_active_years = defaultdict(set)
    for r in inspections:
        uid = r.get('farmer_uid', '')
        y   = r.get('data_year', '')
        if uid and y: farmer_active_years[uid].add(y)

    cohort = defaultdict(lambda: defaultdict(int))
    for r in farmers_list:
        uid      = r.get('farmer_uid', '')
        join_yr  = (r.get('first_year_seen') or '').strip()
        if not join_yr: continue
        for active_yr in farmer_active_years.get(uid, set()):
            if active_yr >= join_yr:
                cohort[join_yr][active_yr] += 1

    cohort_out = {jy: dict(yd) for jy, yd in cohort.items()}

    # ── 7b. Variety purchase breakdown ───────────────────────────
    var_yr = defaultdict(lambda: defaultdict(lambda: {'kg': 0.0, 'riel': 0.0, 'n': 0, 'prices': []}))
    for r in purchases:
        y   = r.get('data_year', '')
        var = (r.get('variety') or 'Unknown').strip()
        d   = var_yr[var][y]
        d['kg']    += safe_float(r.get('quantity_kg'))
        d['riel']  += safe_float(r.get('total_payment_riel'))
        d['n']     += 1
        up = safe_float(r.get('unit_price_riel'))
        if up > 0: d['prices'].append(up)

    variety_year = {}
    for var, ydict in var_yr.items():
        variety_year[var] = {}
        for y, d in ydict.items():
            variety_year[var][y] = {
                'kg': round(d['kg']), 'riel': round(d['riel']),
                'n': d['n'], 'avg_price': round(avg(d['prices'])) if d['prices'] else 0
            }

    # ── 8. Farmer records ─────────────────────────────────────────
    print("[8/8] Building farmer records…")

    fstats = defaultdict(lambda: {
        'insp': 0, 'compliant': 0, 'area_ha': 0.0,
        'planted_area_ha': 0.0, 'fallow_area_ha': 0.0, 'other_area_ha': 0.0,
        'prod_kg': 0.0, 'purch_riel': 0.0, 'purch_kg': 0.0,
        'years': set(), 'varieties': set(), 'certs': set(),
        'latest_year': '', 'latest_cert': '', 'quality_n': 0,
    })

    for r in inspections:
        uid = r.get('farmer_uid', '')
        d   = fstats[uid]
        d['insp'] += 1
        if r.get('compliant', '').lower() == 'yes': d['compliant'] += 1
        p = safe_float(r.get('planted_area_ha'))
        f = safe_float(r.get('fallow_area_ha'))
        o = safe_float(r.get('other_(ha)'))
        d['planted_area_ha'] += p
        d['fallow_area_ha']  += f
        d['other_area_ha']   += o
        d['area_ha']         += (p + f + o)
        d['years'].add(r.get('data_year', ''))
        v = (r.get('variety') or '').strip()
        if v: d['varieties'].add(v)
        cs = normalize_cert(r.get('status_harvest', ''))
        if cs != 'Unknown': d['certs'].add(cs)
        y  = r.get('data_year', '')
        if y > d['latest_year']:
            d['latest_year'] = y
            d['latest_cert'] = cs

    for r in threshings:
        fstats[r.get('farmer_uid', '')]['prod_kg'] += safe_float(r.get('actual_total_rice_production_kg'))

    for r in purchases:
        uid = r.get('farmer_uid', '')
        fstats[uid]['purch_riel'] += safe_float(r.get('total_payment_riel'))
        fstats[uid]['purch_kg']   += safe_float(r.get('quantity_kg'))

    for r in spec_records:
        fstats[r.get('farmer_uid', '')]['quality_n'] += 1

    farmer_records = []
    for r in farmers_list:
        uid = r.get('farmer_uid', '')
        vid = r.get('village_id', '')
        sid = r.get('site_id', '')
        v   = villages_raw.get(str(vid), {})
        s   = sites_raw.get(str(sid), {})
        d   = fstats.get(uid, {})
        ti  = d.get('insp', 0)
        ar  = d.get('area_ha', 0.0)
        ap  = d.get('planted_area_ha', 0.0)
        af  = d.get('fallow_area_ha', 0.0)
        ao  = d.get('other_area_ha', 0.0)
        pk  = d.get('prod_kg', 0.0)
        yh  = pk / ap if ap > 0 else None
        cr  = pct(d.get('compliant', 0), ti) if ti else None
        yrs = sorted(d.get('years', set()))
        farmer_records.append({
            'uid':          uid,
            'family_id':    r.get('family_id', ''),
            'site':         s.get('site_name', v.get('site_name', 'Unknown')),
            'village':      v.get('village_name', 'Unknown'),
            'gender':       (r.get('gender') or 'Unknown').strip(),
            'first_year':   r.get('first_year_seen', ''),
            'last_year':    r.get('last_year_seen', ''),
            'active':       r.get('current_status', ''),
            'insp_total':   ti,
            'compliance':   round(cr, 1) if cr is not None else None,
            'area_ha':      round(ar, 2),
            'planted_area_ha': round(ap, 2),
            'fallow_area_ha':  round(af, 2),
            'other_area_ha':   round(ao, 2),
            'prod_kg':      round(pk),
            'purch_riel':   round(d.get('purch_riel', 0)),
            'purch_kg':     round(d.get('purch_kg', 0)),
            'avg_yield':    round(yh, 1) if yh is not None else None,
            'varieties':    sorted(d.get('varieties', set())),
            'certs':        sorted(d.get('certs', set())),
            'latest_cert':  d.get('latest_cert', ''),
            'years':        yrs,
            'years_count':  len(yrs),
            'quality_n':    d.get('quality_n', 0),
        })

    farmer_records.sort(key=lambda x: x['prod_kg'], reverse=True)

    # ── Site summary (for map) ────────────────────────────────────
    site_summary = {}
    for sid, sc in SITE_COORDS.items():
        sn  = sc['name']
        all_f = set(); tot_prod = 0.0; tot_riel = 0.0; tot_area = 0.0
        tot_planted = 0.0; tot_fallow = 0.0; tot_other = 0.0
        tot_insp = 0; tot_comp = 0; vills = set()
        for r in inspections:
            if r.get('data_year') != latest_year: continue
            uid = r.get('farmer_uid', '')
            if farmer_site_id(uid) == sid:
                all_f.add(uid); tot_insp += 1
                if r.get('compliant', '').lower() == 'yes': tot_comp += 1
                p = safe_float(r.get('planted_area_ha'))
                f = safe_float(r.get('fallow_area_ha'))
                o = safe_float(r.get('other_(ha)'))
                tot_planted += p
                tot_fallow += f
                tot_other += o
                tot_area += (p + f + o)
                vills.add(farmer_village_id(uid))
        for r in threshings:
            if r.get('data_year') != latest_year: continue
            if farmer_site_id(r.get('farmer_uid', '')) == sid:
                tot_prod += safe_float(r.get('actual_total_rice_production_kg'))
        for r in purchases:
            if r.get('data_year') != latest_year: continue
            rid = r.get('site_id', '')
            if rid == sid:
                tot_riel += safe_float(r.get('total_payment_riel'))
        yield_ha = tot_prod / tot_planted if tot_planted else 0
        site_summary[sn] = {
            'site_id': sid, 'site_name': sn,
            'lat': sc['lat'], 'lng': sc['lng'],
            'total_farmers': len(all_f),
            'total_villages': len(vills),
            'prod_kg': round(tot_prod),
            'purch_riel': round(tot_riel),
            'area_ha': round(tot_area, 1),
            'planted_area_ha': round(tot_planted, 1),
            'fallow_area_ha': round(tot_fallow, 1),
            'other_area_ha': round(tot_other, 1),
            'avg_yield': round(yield_ha, 1),
            'compliance_rate': pct(tot_comp, tot_insp),
        }

    # ── Overall KPIs ──────────────────────────────────────────────
    all_f   = {r.get('farmer_uid', '') for r in inspections if r.get('farmer_uid')}
    all_p   = sum(safe_float(r.get('actual_total_rice_production_kg')) for r in threshings)
    all_r   = sum(safe_float(r.get('total_payment_riel')) for r in purchases)
    all_q   = sum(safe_float(r.get('quantity_kg')) for r in purchases)
    all_planted = 0.0
    all_fallow = 0.0
    all_other = 0.0
    for r in inspections:
        all_planted += safe_float(r.get('planted_area_ha'))
        all_fallow  += safe_float(r.get('fallow_area_ha'))
        all_other   += safe_float(r.get('other_(ha)'))
    all_a = all_planted + all_fallow + all_other
    all_c   = sum(1 for r in inspections if r.get('compliant', '').lower() == 'yes')
    all_i   = len(inspections)

    overall_kpis = {
        'total_farmers': len(all_f),
        'total_prod_kg': round(all_p),
        'total_purch_riel': round(all_r),
        'total_purch_kg': round(all_q),
        'compliance_rate': pct(all_c, all_i),
        'total_area_ha': round(all_a, 1),
        'total_planted_area_ha': round(all_planted, 1),
        'total_fallow_area_ha': round(all_fallow, 1),
        'total_other_area_ha': round(all_other, 1),
        'avg_yield_kg_ha': round(all_p / all_planted, 1) if all_planted else 0,
        'avg_price_riel_kg': round(all_r / all_q) if all_q else 0,
        'total_inspections': all_i,
        'total_purchases': len(purchases),
        'total_threshings': len(threshings),
        'total_spec_records': len(spec_records),
    }

    # ── Assemble & write ──────────────────────────────────────────
    output = {
        'meta': {
            'generated_at': datetime.now().isoformat(),
            'years': all_years,
            'latest_year': all_years[-1] if all_years else '',
            'record_counts': overall_kpis,
        },
        'overall_kpis': overall_kpis,
        'yearly_trend': yearly_trend,
        'site_year': site_year,
        'village_stats': village_stats,
        'quality_by_year': quality_by_year,
        'farmer_cohort': cohort_out,
        'variety_year': variety_year,
        'farmer_records': farmer_records,
        'site_summary': site_summary,
        'dimensions': {
            'sites': list(sites_raw.values()),
            'villages': list(villages_raw.values()),
            'varieties': list(varieties_raw.values()),
            'irpgs': list(irpgs_raw.values()),
        }
    }

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    json_str = json.dumps(output, ensure_ascii=False, separators=(',', ':'))

    with open(OUTPUT_JS, 'w', encoding='utf-8') as f:
        f.write('/* Auto-generated by preprocess/build_data.py */\n')
        f.write(f'/* Generated: {datetime.now().isoformat()} */\n')
        f.write('/* DO NOT EDIT — re-run build_data.py to regenerate */\n')
        f.write('window.DASHBOARD_DATA=')
        f.write(json_str)
        f.write(';\n')

    size_kb = os.path.getsize(OUTPUT_JS) / 1024
    print("\nOK  Output: %s" % OUTPUT_JS)
    print("    Size:   %.0f KB" % size_kb)
    print("\n  Summary:")
    print("    Years:       %s" % ', '.join(all_years))
    print("    Farmers:     %d" % len(all_f))
    print("    Production:  {:,} MT total".format(round(all_p / 1000)))
    print("    Revenue:     ${:,.2f}M USD total".format(all_r / 4e9))
    print("    Compliance:  %.1f%%" % pct(all_c, all_i))
    print("\n  Open index.html in a browser to view the dashboard.")
    print("=" * 56)

if __name__ == '__main__':
    main()
