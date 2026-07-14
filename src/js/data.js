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
    if (typeof decimals === 'number') return n.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals});
    return n.toLocaleString();
  }
  function kgFmt(n) {
    if (n == null || isNaN(n)) return '—';
    if (n >= 1000) {
      var mt = n / 1000;
      return mt.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) + ' MT';
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
  function pct(a, b) { return b ? Math.round(a / b * 10) / 10 : 0; }

  // ── Yearly Trend (filtered by selected years) ────────────────
  function getYearlyTrend(state) {
    return _raw.yearly_trend.filter(function (d) {
      return state.years.has(d.year);
    });
  }

  // ── Site × Year (filtered by years + sites) ──────────────────
  function getSiteYearData(state) {
    var out = {};
    Object.keys(_raw.site_year).forEach(function (sn) {
      if (!state.sites.has(sn)) return;
      out[sn] = {};
      Object.keys(_raw.site_year[sn]).forEach(function (y) {
        if (state.years.has(y)) out[sn][y] = _raw.site_year[sn][y];
      });
    });
    return out;
  }

  // ── Aggregated yearly totals across selected sites ───────────
  function getAggYearly(state) {
    var syd = getSiteYearData(state);
    var years = Array.from(state.years).sort();
    return years.map(function (y) {
      var total = {year: y, unique_farmers: 0, new: 0, existing: 0, rejoin: 0,
                   prod_kg: 0, purch_kg: 0, purch_riel: 0, area_ha: 0, planted_area_ha: 0, fallow_area_ha: 0, other_area_ha: 0, compliance_sum: 0, compliance_n: 0};
      Object.keys(syd).forEach(function (sn) {
        var d = syd[sn][y];
        if (!d) return;
        total.unique_farmers += d.unique_farmers || 0;
        total.new            += d.new || 0;
        total.existing       += d.existing || 0;
        total.rejoin         += d.rejoin || 0;
        total.prod_kg        += d.prod_kg || 0;
        total.purch_kg       += d.purch_kg || 0;
        total.purch_riel     += d.purch_riel || 0;
        total.area_ha        += d.total_area_ha || 0;
        total.planted_area_ha += d.planted_area_ha || 0;
        total.fallow_area_ha  += d.fallow_area_ha || 0;
        total.other_area_ha   += d.other_area_ha || 0;
        total.compliance_sum += (d.compliance_rate || 0) * (d.unique_farmers || 0);
        total.compliance_n   += d.unique_farmers || 0;
      });
      total.compliance_rate = total.compliance_n ? Math.round(total.compliance_sum / total.compliance_n * 10) / 10 : 0;
      total.avg_yield = total.planted_area_ha ? Math.round(total.prod_kg / total.planted_area_ha * 10) / 10 : 0;
      total.avg_price = total.purch_kg ? Math.round(total.purch_riel / total.purch_kg) : 0;
      return total;
    });
  }

  // ── KPIs for current filter selection ────────────────────────
  function getKPIs(state) {
    var trend = getAggYearly(state);
    if (!trend.length) return {};
    var latest = trend[trend.length - 1];
    var prev   = trend.length > 1 ? trend[trend.length - 2] : null;

    function change(key) {
      if (!prev || !prev[key]) return null;
      return Math.round((latest[key] - prev[key]) / prev[key] * 100);
    }

    return {
      farmers:     {val: latest.unique_farmers, chg: change('unique_farmers')},
      prod_kg:     {val: latest.prod_kg,        chg: change('prod_kg')},
      purch_riel:  {val: latest.purch_riel,     chg: change('purch_riel')},
      compliance:  {val: latest.compliance_rate, chg: prev ? Math.round((latest.compliance_rate - prev.compliance_rate) * 10) / 10 : null, isPoints: true},
      area_ha:     {val: latest.area_ha,         chg: change('area_ha')},
      planted_area_ha: {val: latest.planted_area_ha, chg: change('planted_area_ha')},
      fallow_area_ha:  {val: latest.fallow_area_ha,  chg: change('fallow_area_ha')},
      other_area_ha:   {val: latest.other_area_ha,   chg: change('other_area_ha')},
      avg_yield:   {val: latest.avg_yield,       chg: change('avg_yield')},
      avg_price:   {val: latest.avg_price,       chg: change('avg_price')},
      purch_kg:    {val: latest.purch_kg,        chg: change('purch_kg')},
      year:        latest.year,
    };
  }

  // ── Overall (all-years) KPIs across site filter ──────────────
  function getOverallKPIs(state) {
    var trend = getAggYearly(state);
    var totals = {farmers: new Set(), prod: 0, riel: 0, kg: 0, area: 0, planted: 0, fallow: 0, other: 0};
    // Add unique farmers from farmer_records matching sites
    _raw.farmer_records.forEach(function (f) {
      if (state.sites.has(f.site)) totals.farmers.add(f.uid);
    });
    trend.forEach(function (d) {
      totals.prod += d.prod_kg;
      totals.riel += d.purch_riel;
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
      avg_price:     totals.kg ? Math.round(totals.riel / totals.kg) : 0,
    };
  }

  // ── Cert status distribution (for doughnut) ──────────────────
  function getCertDist(state) {
    // From latest selected year(s) + selected sites
    var syd = getSiteYearData(state);
    var counts = {};
    Object.keys(syd).forEach(function (sn) {
      Object.values(syd[sn]).forEach(function (d) {
        if (!d.cert) return;
        Object.keys(d.cert).forEach(function (k) {
          counts[k] = (counts[k] || 0) + d.cert[k];
        });
      });
    });
    return counts;
  }

  // ── Site totals (for radar / site comparison) ─────────────────
  function getSiteTotals(state) {
    var syd = getSiteYearData(state);
    var out = {};
    
    // Group all farmer records by site to get true unique farmer count active in selected years
    var siteUniqueFarmerCounts = {};
    _raw.farmer_records.forEach(function (f) {
      var activeInSelected = f.years.some(function (y) { return state.years.has(y); });
      if (activeInSelected) {
        siteUniqueFarmerCounts[f.site] = (siteUniqueFarmerCounts[f.site] || 0) + 1;
      }
    });

    Object.keys(syd).forEach(function (sn) {
      var t = {site: sn, farmers: siteUniqueFarmerCounts[sn] || 0, prod_kg: 0, purch_riel: 0, area_ha: 0, compliant_insp: 0, total_insp: 0};
      Object.values(syd[sn]).forEach(function (d) {
        t.prod_kg        += d.prod_kg || 0;
        t.purch_riel     += d.purch_riel || 0;
        t.area_ha        += d.total_area_ha || 0;
        t.compliant_insp += d.compliant_count || 0;
        t.total_insp     += d.inspection_count || 0;
      });
      t.avg_yield = t.area_ha ? Math.round(t.prod_kg / t.area_ha * 10) / 10 : 0;
      t.compliance = t.total_insp ? Math.round((t.compliant_insp / t.total_insp * 100) * 10) / 10 : 0;
      out[sn] = t;
    });
    return out;
  }

  // ── Quality data (filtered by years) ─────────────────────────
  function getQualityByYear(state) {
    var out = {};
    Object.keys(_raw.quality_by_year).forEach(function (y) {
      if (state.years.has(y)) out[y] = _raw.quality_by_year[y];
    });
    return out;
  }

  // ── Village stats (filtered by sites) ────────────────────────
  function getVillageStats(state) {
    return _raw.village_stats.filter(function (v) {
      return state.sites.has(v.site);
    });
  }

  // ── Variety × Year purchase data ─────────────────────────────
  function getVarietyYear(state) {
    var out = {};
    Object.keys(_raw.variety_year).forEach(function (v) {
      out[v] = {};
      Object.keys(_raw.variety_year[v]).forEach(function (y) {
        if (state.years.has(y)) out[v][y] = _raw.variety_year[v][y];
      });
    });
    return out;
  }

  // ── Farmer records (full list, filtered + searched) ──────────
  function getFarmerRecords(state, search, filterSite, filterCert, filterGender) {
    var lo = (search || '').toLowerCase();
    return _raw.farmer_records.filter(function (f) {
      if (!state.sites.has(f.site)) return false;
      if (!state.years.size) return false;
      // Must be active in at least one selected year
      var activeInSelected = f.years.some(function (y) { return state.years.has(y); });
      if (!activeInSelected) return false;
      if (filterSite && f.site !== filterSite) return false;
      if (filterCert && f.latest_cert !== filterCert) return false;
      if (filterGender && f.gender !== filterGender) return false;
      if (lo) {
        var haystack = [f.uid, f.family_id, f.village, f.site, f.latest_cert, f.gender].join(' ').toLowerCase();
        if (haystack.indexOf(lo) === -1) return false;
      }
      return true;
    });
  }

  // ── Cohort data ───────────────────────────────────────────────
  function getCohortData() { return _raw.farmer_cohort; }

  // ── Site summary (map) ────────────────────────────────────────
  function getSiteSummary() { return _raw.site_summary; }

  // ── Meta ──────────────────────────────────────────────────────
  function getMeta()    { return _raw.meta; }
  function getAllYears(){ return _raw.meta.years; }
  function getAllSites(){
    return Array.from(new Set(_raw.village_stats.map(function (v) { return v.site; }))).sort();
  }
  function getAllCerts(){
    var s = new Set();
    _raw.yearly_trend.forEach(function (d) { Object.keys(d.cert).forEach(function (k) { s.add(k); }); });
    return Array.from(s).sort();
  }

  // ── Insight generation ────────────────────────────────────────
  function generateInsights(state) {
    var trend = getAggYearly(state);
    if (trend.length < 2) return [];
    var first = trend[0], last = trend[trend.length - 1];
    var farmerGrowth = first.unique_farmers ? Math.round((last.unique_farmers - first.unique_farmers) / first.unique_farmers * 100) : 0;
    var prodGrowth   = first.prod_kg ? Math.round((last.prod_kg - first.prod_kg) / first.prod_kg * 100) : 0;
    var yoyF = trend.length > 1 ? Math.round((trend[trend.length-1].unique_farmers - trend[trend.length-2].unique_farmers) / trend[trend.length-2].unique_farmers * 100) : 0;

    var vills = getVillageStats(state);
    var topVill = vills[0] || {};
    var siteTotals = getSiteTotals(state);
    var sites = Object.values(siteTotals);
    var topYield = sites.sort(function(a,b){ return b.avg_yield - a.avg_yield; })[0] || {};
    sites.sort(function(a,b){ return b.farmers - a.farmers; });
    var largestSite = sites[0] || {};

    return [
      {icon: '📈', title: 'Program Growth (' + first.year + '–' + last.year + ')',
       body: 'Farmer participation grew by ' + farmerGrowth + '% over the program period — from ' + first.unique_farmers.toLocaleString() + ' to ' + last.unique_farmers.toLocaleString() + ' active farmers.'},
      {icon: '🌾', title: 'Production Increase',
       body: 'Total rice production increased by ' + prodGrowth + '%, rising from ' + kgFmt(first.prod_kg) + ' to ' + kgFmt(last.prod_kg) + ' in ' + last.year + '.'},
      {icon: '🏆', title: 'Top Yield Site',
       body: (topYield.site || '—') + ' achieves the highest average yield at ' + numFmt(topYield.avg_yield, 1) + ' Kg/Ha, indicating strong agronomic practices.'},
      {icon: '🗺️', title: 'Largest Site by Farmers',
       body: (largestSite.site || '—') + ' is the largest site with ' + (largestSite.farmers || 0).toLocaleString() + ' farmer-year participations recorded.'},
      {icon: '📊', title: 'YoY Farmer Growth',
       body: 'From ' + trend[trend.length-2].year + ' to ' + last.year + ', farmer count changed by ' + (yoyF >= 0 ? '+' : '') + yoyF + '% (' + (yoyF >= 0 ? 'growth' : 'decline') + ').'},
      {icon: '🏡', title: 'Top Village by Production',
       body: (topVill.village || '—') + ' (' + (topVill.site || '') + ') is the top-producing village with ' + kgFmt(topVill.prod_kg) + ' total production.'},
    ];
  }

  // ── Public API ────────────────────────────────────────────────
  return {
    init: init, ready: ready,
    // Formatters
    numFmt: numFmt, kgFmt: kgFmt, rielFmt: rielFmt, pctFmt: pctFmt,
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
    raw: function() { return _raw; },
  };
})();
