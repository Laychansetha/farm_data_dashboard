/* ============================================================
   data.js  —  Data access layer for Farm Data dashboard
   Reads window.DASHBOARD_DATA and provides filtered views
   ============================================================ */

var Data = (function () {
  'use strict';

  var _raw = null;

  // ── Initialise ──────────────────────────────────────────────
  function init(rawData) {
    _raw = rawData;
  }

  function ready() { return _raw !== null; }

  // ── Helpers ─────────────────────────────────────────────────
  function numFmt(n, decimals) {
    if (n == null || isNaN(n)) return '—';
    if (typeof decimals === 'number') {
      return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }
    return n.toLocaleString();
  }

  function kgFmt(n) {
    if (n == null || isNaN(n)) return '—';
    if (n >= 1000) {
      var mt = n / 1000;
      return mt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' MT';
    }
    return Math.round(n).toLocaleString() + ' Kg';
  }

  function rielFmt(n) {
    if (n == null || isNaN(n)) return '—';
    if (n >= 4000) {
      var usd = n / 4000;
      if (usd >= 1e6) {
        return '$' + (usd / 1e6).toFixed(2) + 'M';
      }
      return '$' + Math.round(usd).toLocaleString();
    }
    return Math.round(n).toLocaleString() + ' KHR';
  }

  function pctFmt(n) {
    if (n == null || isNaN(n)) return '—';
    return n.toFixed(1) + '%';
  }

  function sum(arr, key) {
    return arr.reduce(function (acc, x) { return acc + (Number(x[key]) || 0); }, 0);
  }

  function pct(a, b) {
    return b ? Math.round((a / b * 100) * 10) / 10 : 0;
  }

  // ── Yearly Trend (filtered by selected years) ────────────────
  function getYearlyTrend(state) {
    if (!_raw || !_raw.yearly_trend) return [];
    return _raw.yearly_trend.filter(function (d) {
      return state.years.has(d.year);
    });
  }

  // ── Site × Year (filtered by years + sites) ──────────────────
  function getSiteYearData(state) {
    var out = {};
    if (!_raw || !_raw.site_year) return out;
    Object.keys(_raw.site_year).forEach(function (sn) {
      if (!state.sites.has(sn)) return;
      out[sn] = {};
      Object.keys(_raw.site_year[sn]).forEach(function (y) {
        if (state.years.has(y)) {
          out[sn][y] = _raw.site_year[sn][y];
        }
      });
    });
    return out;
  }

  // ── Aggregated yearly totals across selected sites ───────────
  function getAggYearly(state) {
    var syd = getSiteYearData(state);
    var years = Array.from(state.years).sort();
    return years.map(function (y) {
      var total = {
        year: y,
        unique_farmers: 0, new: 0, existing: 0, rejoin: 0,
        prod_kg: 0, sell_kg: 0, consume_kg: 0, seed_kg: 0,
        thr_machine: 0, thr_hand: 0, thr_unknown: 0,
        purch_kg: 0, purch_riel: 0, purch_amount_riel: 0,
        area_ha: 0, planted_area_ha: 0, fallow_area_ha: 0, other_area_ha: 0,
        compliant_count: 0, inspection_count: 0,
        cert: {}, land_sit: {}, land_own: {}, irrigation: {}
      };

      Object.keys(syd).forEach(function (sn) {
        var d = syd[sn][y];
        if (!d) return;
        total.unique_farmers += d.unique_farmers || 0;
        total.new            += d.new || 0;
        total.existing       += d.existing || 0;
        total.rejoin         += d.rejoin || 0;
        total.prod_kg        += d.prod_kg || 0;
        total.sell_kg        += d.sell_kg || 0;
        total.consume_kg     += d.consume_kg || 0;
        total.seed_kg        += d.seed_kg || 0;
        total.thr_machine    += d.thr_machine || 0;
        total.thr_hand       += d.thr_hand || 0;
        total.thr_unknown    += d.thr_unknown || 0;
        total.purch_kg       += d.purch_kg || 0;
        total.purch_riel     += d.purch_riel || 0;
        total.purch_amount_riel += (d.purch_amount_riel !== undefined ? d.purch_amount_riel : d.purch_riel) || 0;
        total.area_ha        += d.total_area_ha || 0;
        total.planted_area_ha += d.planted_area_ha || 0;
        total.fallow_area_ha  += d.fallow_area_ha || 0;
        total.other_area_ha   += d.other_area_ha || 0;
        total.compliant_count += d.compliant_count || 0;
        total.inspection_count += d.inspection_count || 0;

        // Aggregate cert dict
        if (d.cert) {
          Object.keys(d.cert).forEach(function (k) {
            total.cert[k] = (total.cert[k] || 0) + d.cert[k];
          });
        }
        // Aggregate land_sit dict
        if (d.land_sit) {
          Object.keys(d.land_sit).forEach(function (k) {
            total.land_sit[k] = (total.land_sit[k] || 0) + d.land_sit[k];
          });
        }
        // Aggregate land_own dict
        if (d.land_own) {
          Object.keys(d.land_own).forEach(function (k) {
            total.land_own[k] = (total.land_own[k] || 0) + d.land_own[k];
          });
        }
        // Aggregate irrigation dict
        if (d.irrigation) {
          Object.keys(d.irrigation).forEach(function (k) {
            total.irrigation[k] = (total.irrigation[k] || 0) + d.irrigation[k];
          });
        }
      });

      total.compliance_rate = total.inspection_count ? Math.round((total.compliant_count / total.inspection_count * 100) * 10) / 10 : 0;
      total.avg_yield = total.planted_area_ha ? Math.round(total.prod_kg / total.planted_area_ha * 10) / 10 : 0;
      total.avg_price = total.purch_kg ? Math.round(total.purch_amount_riel / total.purch_kg) : 0;
      return total;
    });
  }

  // ── KPIs for current filter selection ────────────────────────
  function getKPIs(state) {
    var trend = getAggYearly(state);
    if (!trend.length) {
      return {
        farmers: { val: 0, chg: null },
        prod_kg: { val: 0, chg: null },
        purch_riel: { val: 0, chg: null },
        compliance: { val: 0, chg: null, isPoints: true },
        area_ha: { val: 0, chg: null },
        planted_area_ha: { val: 0, chg: null },
        fallow_area_ha: { val: 0, chg: null },
        other_area_ha: { val: 0, chg: null },
        avg_yield: { val: 0, chg: null },
        avg_price: { val: 0, chg: null },
        purch_kg: { val: 0, chg: null },
        year: '—',
      };
    }

    var latest = trend[trend.length - 1];
    var prev   = trend.length > 1 ? trend[trend.length - 2] : null;

    function change(key) {
      if (!prev || !prev[key]) return null;
      return Math.round((latest[key] - prev[key]) / prev[key] * 100);
    }

    return {
      farmers:         { val: latest.unique_farmers, chg: change('unique_farmers') },
      prod_kg:         { val: latest.prod_kg,        chg: change('prod_kg') },
      purch_riel:      { val: latest.purch_riel,     chg: change('purch_riel') },
      compliance:      { val: latest.compliance_rate, chg: prev ? Math.round((latest.compliance_rate - prev.compliance_rate) * 10) / 10 : null, isPoints: true },
      area_ha:         { val: latest.area_ha,         chg: change('area_ha') },
      planted_area_ha: { val: latest.planted_area_ha, chg: change('planted_area_ha') },
      fallow_area_ha:  { val: latest.fallow_area_ha,  chg: change('fallow_area_ha') },
      other_area_ha:   { val: latest.other_area_ha,   chg: change('other_area_ha') },
      avg_yield:       { val: latest.avg_yield,       chg: change('avg_yield') },
      avg_price:       { val: latest.avg_price,       chg: change('avg_price') },
      purch_kg:        { val: latest.purch_kg,        chg: change('purch_kg') },
      year:            latest.year,
    };
  }

  // ── Overall (all selected periods) KPIs across site filter ───
  function getOverallKPIs(state) {
    var trend = getAggYearly(state);
    var totals = { farmers: new Set(), prod: 0, riel: 0, amt_riel: 0, kg: 0, area: 0, planted: 0, fallow: 0, other: 0 };
    
    // Add unique farmers matching selected sites and years
    if (_raw && _raw.farmer_records) {
      _raw.farmer_records.forEach(function (f) {
        if (!state.sites.has(f.site)) return;
        var activeInYears = f.years && f.years.some(function (y) { return state.years.has(y); });
        if (activeInYears) totals.farmers.add(f.uid);
      });
    }

    trend.forEach(function (d) {
      totals.prod += d.prod_kg;
      totals.riel += d.purch_riel;
      totals.amt_riel += (d.purch_amount_riel !== undefined ? d.purch_amount_riel : d.purch_riel) || 0;
      totals.kg   += d.purch_kg;
      totals.area += d.area_ha;
      totals.planted += d.planted_area_ha || 0;
      totals.fallow  += d.fallow_area_ha || 0;
      totals.other   += d.other_area_ha || 0;
    });

    return {
      total_farmers: totals.farmers.size,
      total_prod_kg: Math.round(totals.prod),
      total_riel:    Math.round(totals.riel),
      total_kg:      Math.round(totals.kg),
      total_area_ha: Math.round(totals.area * 10) / 10,
      total_planted_area_ha: Math.round(totals.planted * 10) / 10,
      total_fallow_area_ha:  Math.round(totals.fallow * 10) / 10,
      total_other_area_ha:   Math.round(totals.other * 10) / 10,
      avg_yield:     totals.planted ? Math.round(totals.prod / totals.planted * 10) / 10 : 0,
      avg_price:     totals.kg ? Math.round(totals.amt_riel / totals.kg) : 0,
    };
  }

  // ── Cert status distribution (for doughnut) ──────────────────
  function getCertDist(state) {
    var syd = getSiteYearData(state);
    var counts = {};
    // Extract for the latest selected year to reflect active cohort status
    var sortedYears = Array.from(state.years).sort();
    var targetYear = sortedYears.length ? sortedYears[sortedYears.length - 1] : null;

    Object.keys(syd).forEach(function (sn) {
      if (targetYear && syd[sn][targetYear] && syd[sn][targetYear].cert) {
        var certs = syd[sn][targetYear].cert;
        Object.keys(certs).forEach(function (k) {
          counts[k] = (counts[k] || 0) + certs[k];
        });
      } else {
        // Fallback across all selected years if single year not isolated
        Object.values(syd[sn]).forEach(function (d) {
          if (!d.cert) return;
          Object.keys(d.cert).forEach(function (k) {
            counts[k] = (counts[k] || 0) + d.cert[k];
          });
        });
      }
    });
    return counts;
  }

  // ── Site totals (for radar / site comparison / map) ───────────
  function getSiteTotals(state) {
    var syd = getSiteYearData(state);
    var out = {};

    var siteUniqueFarmerCounts = {};
    if (_raw && _raw.farmer_records) {
      _raw.farmer_records.forEach(function (f) {
        var activeInSelected = f.years && f.years.some(function (y) { return state.years.has(y); });
        if (activeInSelected) {
          siteUniqueFarmerCounts[f.site] = (siteUniqueFarmerCounts[f.site] || 0) + 1;
        }
      });
    }

    Object.keys(syd).forEach(function (sn) {
      var t = {
        site: sn,
        farmers: siteUniqueFarmerCounts[sn] || 0,
        prod_kg: 0,
        purch_riel: 0,
        area_ha: 0,
        planted_area_ha: 0,
        fallow_area_ha: 0,
        other_area_ha: 0,
        compliant_insp: 0,
        total_insp: 0
      };

      Object.values(syd[sn]).forEach(function (d) {
        t.prod_kg         += d.prod_kg || 0;
        t.purch_riel      += d.purch_riel || 0;
        t.area_ha         += d.total_area_ha || 0;
        t.planted_area_ha += d.planted_area_ha || 0;
        t.fallow_area_ha  += d.fallow_area_ha || 0;
        t.other_area_ha   += d.other_area_ha || 0;
        t.compliant_insp  += d.compliant_count || 0;
        t.total_insp      += d.inspection_count || 0;
      });

      t.avg_yield = t.planted_area_ha ? Math.round(t.prod_kg / t.planted_area_ha * 10) / 10 : 0;
      t.compliance = t.total_insp ? Math.round((t.compliant_insp / t.total_insp * 100) * 10) / 10 : 0;
      out[sn] = t;
    });

    return out;
  }

  // ── Quality data (filtered by sites and years) ────────────────
  function getQualityByYear(state) {
    if (!_raw) return {};

    // If all sites selected, use global pre-aggregated quality_by_year
    var allSites = getAllSites();
    if (state.sites.size === allSites.length && _raw.quality_by_year) {
      var out = {};
      Object.keys(_raw.quality_by_year).forEach(function (y) {
        if (state.years.has(y)) out[y] = _raw.quality_by_year[y];
      });
      return out;
    }

    // Dynamic aggregation across selected sites from quality_by_site_year
    var result = {};
    var qsy = _raw.quality_by_site_year || {};

    Array.from(state.years).sort().forEach(function (y) {
      var q = {
        grades: {}, colors: {}, cert: {},
        moistures: [], good_grains: [], broken_grains: [], impurities: [], husks: [],
        prices_by_grade: {}, total_records: 0
      };

      Object.keys(qsy).forEach(function (sn) {
        if (!state.sites.has(sn) || !qsy[sn][y]) return;
        var d = qsy[sn][y];
        q.total_records += d.total_records || 0;

        if (d.grades) {
          Object.keys(d.grades).forEach(function (g) {
            q.grades[g] = (q.grades[g] || 0) + d.grades[g];
          });
        }
        if (d.colors) {
          Object.keys(d.colors).forEach(function (c) {
            q.colors[c] = (q.colors[c] || 0) + d.colors[c];
          });
        }
        if (d.cert) {
          Object.keys(d.cert).forEach(function (c) {
            q.cert[c] = (q.cert[c] || 0) + d.cert[c];
          });
        }
        if (d.avg_moisture) q.moistures.push(d.avg_moisture);
        if (d.avg_good_grain) q.good_grains.push(d.avg_good_grain);
        if (d.avg_broken_grain) q.broken_grains.push(d.avg_broken_grain);
        if (d.avg_impurity) q.impurities.push(d.avg_impurity);
        if (d.avg_husk) q.husks.push(d.avg_husk);
        if (d.avg_price_by_grade) {
          Object.keys(d.avg_price_by_grade).forEach(function (g) {
            if (!q.prices_by_grade[g]) q.prices_by_grade[g] = [];
            q.prices_by_grade[g].push(d.avg_price_by_grade[g]);
          });
        }
      });

      function mavg(arr) {
        return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : null;
      }

      var avgPriceGrade = {};
      Object.keys(q.prices_by_grade).forEach(function (g) {
        avgPriceGrade[g] = Math.round(mavg(q.prices_by_grade[g]));
      });

      result[y] = {
        grades: q.grades,
        colors: q.colors,
        cert: q.cert,
        avg_moisture: q.moistures.length ? Math.round(mavg(q.moistures) * 100) / 100 : null,
        avg_good_grain: q.good_grains.length ? Math.round(mavg(q.good_grains) * 10) / 10 : null,
        avg_broken_grain: q.broken_grains.length ? Math.round(mavg(q.broken_grains) * 10) / 10 : null,
        avg_impurity: q.impurities.length ? Math.round(mavg(q.impurities) * 100) / 100 : null,
        avg_husk: q.husks.length ? Math.round(mavg(q.husks) * 100) / 100 : null,
        avg_price_by_grade: avgPriceGrade,
        total_records: q.total_records
      };
    });

    return result;
  }

  // ── Village stats (dynamically filtered by sites & years) ────
  function getVillageStats(state) {
    if (!_raw) return [];

    var allYears = getAllYears();
    // If all years selected, return precompiled village_stats filtered by site
    if (state.years.size === allYears.length && _raw.village_stats) {
      return _raw.village_stats.filter(function (v) {
        return state.sites.has(v.site);
      });
    }

    // Dynamic aggregation across selected years from village_by_year
    if (!_raw.village_by_year) {
      return (_raw.village_stats || []).filter(function (v) { return state.sites.has(v.site); });
    }

    // Map village name to site
    var villSiteMap = {};
    if (_raw.village_stats) {
      _raw.village_stats.forEach(function (v) { villSiteMap[v.village] = v.site; });
    }

    var list = [];
    Object.keys(_raw.village_by_year).forEach(function (vn) {
      var sn = villSiteMap[vn] || '';
      if (!state.sites.has(sn)) return;

      var vdata = _raw.village_by_year[vn];
      var totalProd = 0, totalArea = 0, totalPurchKg = 0, totalPurchRiel = 0, maxFarmers = 0;
      var activeYears = [];

      Object.keys(vdata).forEach(function (y) {
        if (!state.years.has(y)) return;
        var yd = vdata[y];
        activeYears.push(y);
        totalProd += yd.prod_kg || 0;
        totalArea += yd.area_ha || 0;
        totalPurchKg += yd.purch_kg || 0;
        totalPurchRiel += yd.purch_riel || 0;
        if ((yd.farmers || 0) > maxFarmers) maxFarmers = yd.farmers;
      });

      if (activeYears.length > 0) {
        list.push({
          village: vn,
          site: sn,
          total_farmers: maxFarmers,
          prod_kg: Math.round(totalProd),
          area_ha: Math.round(totalArea * 10) / 10,
          avg_yield_kg_ha: totalArea ? Math.round(totalProd / totalArea * 10) / 10 : 0,
          purch_kg: Math.round(totalPurchKg),
          purch_riel: Math.round(totalPurchRiel),
          years_active: activeYears.sort(),
        });
      }
    });

    list.sort(function (a, b) { return b.prod_kg - a.prod_kg; });
    return list;
  }

  // ── Variety × Year purchase data (filtered by sites & years) ─
  function getVarietyYear(state) {
    if (!_raw) return {};

    var allSites = getAllSites();
    if (state.sites.size === allSites.length && _raw.variety_year) {
      var out = {};
      Object.keys(_raw.variety_year).forEach(function (v) {
        out[v] = {};
        Object.keys(_raw.variety_year[v]).forEach(function (y) {
          if (state.years.has(y)) out[v][y] = _raw.variety_year[v][y];
        });
      });
      return out;
    }

    // Dynamic aggregation from variety_site_year
    var outSite = {};
    var vsy = _raw.variety_site_year || {};
    Object.keys(vsy).forEach(function (v) {
      outSite[v] = {};
      Object.keys(vsy[v]).forEach(function (sn) {
        if (!state.sites.has(sn)) return;
        Object.keys(vsy[v][sn]).forEach(function (y) {
          if (!state.years.has(y)) return;
          if (!outSite[v][y]) outSite[v][y] = { kg: 0, riel: 0, n: 0, avg_price: 0 };
          var d = vsy[v][sn][y];
          outSite[v][y].kg += d.kg || 0;
          outSite[v][y].riel += d.riel || 0;
          outSite[v][y].n += d.n || 0;
        });
      });
    });

    return outSite;
  }

  // ── Farmer records (full list, filtered + searched) ──────────
  function getFarmerRecords(state, search, filterSite, filterCert, filterGender) {
    if (!_raw || !_raw.farmer_records) return [];
    var lo = (search || '').toLowerCase().trim();

    return _raw.farmer_records.filter(function (f) {
      // Must match global site filter
      if (!state.sites.has(f.site)) return false;
      if (!state.years.size) return false;

      // Must be active in at least one of the selected years
      var activeInSelected = f.years && f.years.some(function (y) { return state.years.has(y); });
      if (!activeInSelected) return false;

      // Global cert filter
      if (state.certs && state.certs.size < getAllCerts().length) {
        var matchesGlobalCert = f.certs && f.certs.some(function (c) { return state.certs.has(c); });
        if (!matchesGlobalCert && !state.certs.has(f.latest_cert)) return false;
      }

      // Local table toolbar filters
      if (filterSite && f.site !== filterSite) return false;
      if (filterCert && f.latest_cert !== filterCert) return false;
      if (filterGender && f.gender !== filterGender) return false;

      // Text search
      if (lo) {
        var haystack = [
          f.uid, f.family_id, f.village, f.site, f.latest_cert, f.gender,
          (f.varieties || []).join(' ')
        ].join(' ').toLowerCase();
        if (haystack.indexOf(lo) === -1) return false;
      }

      return true;
    });
  }

  // ── Cohort data (dynamically filtered by site) ────────────────
  function getCohortData(state) {
    if (!_raw) return {};

    var allSites = getAllSites();
    // If all sites selected, use precomputed farmer_cohort
    if ((!state || state.sites.size === allSites.length) && _raw.farmer_cohort) {
      return _raw.farmer_cohort;
    }

    // Dynamically calculate cohort matrix for selected sites
    var dynamicCohort = {};
    if (_raw.farmer_records) {
      _raw.farmer_records.forEach(function (f) {
        if (state && !state.sites.has(f.site)) return;
        var jy = f.first_year;
        if (!jy) return;
        if (!dynamicCohort[jy]) dynamicCohort[jy] = {};
        if (f.years) {
          f.years.forEach(function (ay) {
            if (ay >= jy) {
              dynamicCohort[jy][ay] = (dynamicCohort[jy][ay] || 0) + 1;
            }
          });
        }
      });
    }

    return dynamicCohort;
  }

  // ── Site summary (dynamic for Leaflet map & sidebar) ─────────
  function getSiteSummary(state) {
    if (!_raw) return {};

    var coords = _raw.site_coords || {
      '1': { name: 'Preah Vihear', lat: 13.7960, lng: 104.9800 },
      '2': { name: 'Prey Lang',    lat: 12.9500, lng: 105.5000 },
      '3': { name: 'Siem Pang',    lat: 14.1200, lng: 106.3700 },
      '4': { name: 'Ratanakiri',   lat: 13.7350, lng: 106.9870 },
      '5': { name: 'Mondolkiri',   lat: 12.4535, lng: 107.1877 },
    };

    var siteTotals = getSiteTotals(state);
    var villStats = getVillageStats(state);
    var out = {};

    Object.keys(coords).forEach(function (sid) {
      var sc = coords[sid];
      var sn = sc.name;
      var st = siteTotals[sn] || {
        farmers: 0, prod_kg: 0, purch_riel: 0,
        area_ha: 0, planted_area_ha: 0, fallow_area_ha: 0, other_area_ha: 0,
        avg_yield: 0, compliance: 100
      };

      var villCount = villStats.filter(function (v) { return v.site === sn; }).length;

      out[sn] = {
        site_id: sid,
        site_name: sn,
        lat: sc.lat,
        lng: sc.lng,
        total_farmers: st.farmers,
        total_villages: villCount,
        prod_kg: st.prod_kg,
        purch_riel: st.purch_riel,
        area_ha: st.area_ha,
        planted_area_ha: st.planted_area_ha,
        fallow_area_ha: st.fallow_area_ha,
        other_area_ha: st.other_area_ha,
        avg_yield: st.avg_yield,
        compliance_rate: st.compliance,
      };
    });

    return out;
  }

  // ── Meta & Dimensional lists ─────────────────────────────────
  function getMeta() {
    return (_raw && _raw.meta) ? _raw.meta : { generated_at: new Date().toISOString(), years: [], latest_year: '' };
  }

  function getAllYears() {
    return (_raw && _raw.meta && _raw.meta.years) ? _raw.meta.years.slice().sort() : [];
  }

  function getAllSites() {
    if (_raw && _raw.dimensions && _raw.dimensions.sites) {
      return _raw.dimensions.sites.map(function (s) { return s.site_name; }).sort();
    }
    if (_raw && _raw.village_stats) {
      return Array.from(new Set(_raw.village_stats.map(function (v) { return v.site; }))).sort();
    }
    return ['Mondolkiri', 'Preah Vihear', 'Prey Lang', 'Ratanakiri', 'Siem Pang'];
  }

  function getAllCerts() {
    var s = new Set();
    if (_raw && _raw.yearly_trend) {
      _raw.yearly_trend.forEach(function (d) {
        if (d.cert) Object.keys(d.cert).forEach(function (k) { s.add(k); });
      });
    }
    if (!s.size) {
      ['Organic', 'New Organic', 'Ibis I', 'Ibis II', 'WF'].forEach(function (c) { s.add(c); });
    }
    return Array.from(s).sort();
  }

  // ── Dynamic analytical insights ──────────────────────────────
  function generateInsights(state) {
    var trend = getAggYearly(state);
    if (trend.length < 2) return [];

    var first = trend[0], last = trend[trend.length - 1];
    var farmerGrowth = first.unique_farmers ? Math.round((last.unique_farmers - first.unique_farmers) / first.unique_farmers * 100) : 0;
    var prodGrowth   = first.prod_kg ? Math.round((last.prod_kg - first.prod_kg) / first.prod_kg * 100) : 0;
    var yoyF = trend.length > 1 && trend[trend.length - 2].unique_farmers
      ? Math.round((trend[trend.length - 1].unique_farmers - trend[trend.length - 2].unique_farmers) / trend[trend.length - 2].unique_farmers * 100)
      : 0;

    var vills = getVillageStats(state);
    var topVill = vills[0] || {};
    var siteTotals = getSiteTotals(state);
    var sites = Object.values(siteTotals);
    var topYield = sites.slice().sort(function (a, b) { return b.avg_yield - a.avg_yield; })[0] || {};
    var largestSite = sites.slice().sort(function (a, b) { return b.farmers - a.farmers; })[0] || {};

    return [
      {
        icon: '📈',
        title: 'Program Growth (' + first.year + '–' + last.year + ')',
        body: 'Farmer participation grew by ' + farmerGrowth + '% over the observed period — from ' + first.unique_farmers.toLocaleString() + ' to ' + last.unique_farmers.toLocaleString() + ' active farmers.'
      },
      {
        icon: '🌾',
        title: 'Production Expansion',
        body: 'Total rice production increased by ' + prodGrowth + '%, rising from ' + kgFmt(first.prod_kg) + ' to ' + kgFmt(last.prod_kg) + ' in ' + last.year + '.'
      },
      {
        icon: '🏆',
        title: 'Top Yield Site',
        body: (topYield.site || '—') + ' achieves the highest average yield at ' + numFmt(topYield.avg_yield, 1) + ' Kg/Ha, demonstrating strong organic cultivation methods.'
      },
      {
        icon: '🗺️',
        title: 'Largest Site by Farmer Base',
        body: (largestSite.site || '—') + ' leads with ' + (largestSite.farmers || 0).toLocaleString() + ' active farmers across the selected timeframe.'
      },
      {
        icon: '📊',
        title: 'Latest YoY Farmer Trajectory',
        body: 'From ' + (trend.length > 1 ? trend[trend.length - 2].year : '') + ' to ' + last.year + ', active farmer count changed by ' + (yoyF >= 0 ? '+' : '') + yoyF + '% (' + (yoyF >= 0 ? 'growth' : 'reduction') + ').'
      },
      {
        icon: '🏡',
        title: 'Top Producing Village',
        body: (topVill.village || '—') + (topVill.site ? ' (' + topVill.site + ')' : '') + ' is the highest producing village with ' + kgFmt(topVill.prod_kg) + ' total paddy rice.'
      },
    ];
  }

  // ── Public API ────────────────────────────────────────────────
  return {
    init: init,
    ready: ready,
    // Formatters
    numFmt: numFmt,
    kgFmt: kgFmt,
    rielFmt: rielFmt,
    pctFmt: pctFmt,
    // Data getters
    getYearlyTrend: getYearlyTrend,
    getSiteYearData: getSiteYearData,
    getAggYearly: getAggYearly,
    getKPIs: getKPIs,
    getOverallKPIs: getOverallKPIs,
    getCertDist: getCertDist,
    getSiteTotals: getSiteTotals,
    getQualityByYear: getQualityByYear,
    getVillageStats: getVillageStats,
    getVarietyYear: getVarietyYear,
    getFarmerRecords: getFarmerRecords,
    getCohortData: getCohortData,
    getSiteSummary: getSiteSummary,
    getMeta: getMeta,
    getAllYears: getAllYears,
    getAllSites: getAllSites,
    getAllCerts: getAllCerts,
    generateInsights: generateInsights,
    raw: function () { return _raw; },
  };
})();
