/* ============================================================
   charts.js  —  All Chart.js chart definitions
   ============================================================ */

var Charts = (function () {
  'use strict';

  var instances = {};

  // ── Global defaults ─────────────────────────────────────────
  function initDefaults() {
    Chart.defaults.color              = '#9BAAC5';
    Chart.defaults.borderColor        = 'rgba(255,255,255,0.06)';
    Chart.defaults.font.family        = "'Inter', system-ui, sans-serif";
    Chart.defaults.font.size          = 11.5;
    Chart.defaults.plugins.legend.labels.boxWidth  = 10;
    Chart.defaults.plugins.legend.labels.boxHeight = 10;
    Chart.defaults.plugins.legend.labels.padding   = 14;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
    Chart.defaults.plugins.tooltip.backgroundColor = '#1C2640';
    Chart.defaults.plugins.tooltip.borderColor     = 'rgba(255,255,255,0.1)';
    Chart.defaults.plugins.tooltip.borderWidth     = 1;
    Chart.defaults.plugins.tooltip.padding         = 10;
    Chart.defaults.plugins.tooltip.titleFont       = {size: 12, weight: '600'};
    Chart.defaults.plugins.tooltip.bodyFont        = {size: 11.5};
    Chart.defaults.animation.duration              = 600;
    Chart.defaults.animation.easing               = 'easeOutQuart';
  }

  // ── Instance registry ────────────────────────────────────────
  function destroy(id) {
    if (instances[id]) { instances[id].destroy(); delete instances[id]; }
  }

  function create(id, config) {
    destroy(id);
    var el = document.getElementById(id);
    if (!el) return null;
    instances[id] = new Chart(el.getContext('2d'), config);
    return instances[id];
  }

  // ── Colour palettes ──────────────────────────────────────────
  var SITE_COLORS = {
    'Mondolkiri':   '#F59E0B',
    'Preah Vihear': '#10B981',
    'Prey Lang':    '#818CF8',
    'Ratanakiri':   '#F87171',
    'Siem Pang':    '#38BDF8',
    'Unknown':      '#6B7280',
  };

  var CERT_COLORS = {
    'Organic':      '#00D4A8',
    'New Organic':  '#4ADE80',
    'Ibis I':       '#60A5FA',
    'Ibis II':      '#93C5FD',
    'WF':           '#A78BFA',
    'Adhoc':        '#F59E0B',
    'Unknown':      '#6B7280',
  };

  var GRADE_COLORS = {
    'A1': '#00D4A8', 'A': '#34D399', 'A2': '#6EE7B7',
    'B1': '#60A5FA', 'B2': '#93C5FD',
    'B': '#F59E0B', 'B2+': '#FCD34D',
    'Unknown': '#6B7280',
  };

  var YEAR_PALETTE = ['#00D4A8','#38BDF8','#F59E0B','#A78BFA','#F87171','#4ADE80','#FB923C'];

  function siteColors(sites) {
    return sites.map(function (s) { return SITE_COLORS[s] || '#6B7280'; });
  }
  function alpha(hex, a) {
    // Convert hex to rgba
    var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  var gridOpts = {
    color: 'rgba(255,255,255,0.05)',
    drawBorder: false,
  };
  function yAxis(title, right) {
    return {
      position: right ? 'right' : 'left',
      grid: right ? {drawOnChartArea: false} : gridOpts,
      ticks: { color: '#9BAAC5', font: {size: 11} },
      title: title ? {display: true, text: title, color: '#5A6882', font: {size: 10.5}} : undefined,
    };
  }
  var xAxis = {
    grid: gridOpts,
    ticks: { color: '#9BAAC5', font: {size: 11} },
  };

  // ── 1. Farmer Growth (stacked bar: new / existing / rejoin) ──
  function renderFarmerGrowth(id, trend) {
    var labels = trend.map(function (d) { return d.year; });
    return create(id, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {label: 'New',      data: trend.map(function (d) { return d.new; }),      backgroundColor: '#4ADE80', stack: 's'},
          {label: 'Rejoin',   data: trend.map(function (d) { return d.rejoin; }),   backgroundColor: '#F59E0B', stack: 's'},
          {label: 'Existing', data: trend.map(function (d) { return d.existing; }), backgroundColor: '#00D4A8', stack: 's'},
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {x: xAxis, y: Object.assign({}, yAxis('Farmers'), {stacked: true, beginAtZero: true})},
        plugins: {legend: {position: 'top'}, tooltip: {callbacks: {
          afterBody: function (items) {
            var i = items[0].dataIndex;
            var d = trend[i];
            return ['Total: ' + (d.new + d.existing + d.rejoin).toLocaleString()];
          }
        }}},
      },
    });
  }

  // ── 2. Production Trend (bar + line yield) ───────────────────
  function renderProductionTrend(id, trend) {
    var labels = trend.map(function (d) { return d.year; });
    return create(id, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            type: 'bar', label: 'Production (MT)',
            data: trend.map(function (d) { return Math.round(d.prod_kg / 1000); }),
            backgroundColor: alpha('#00D4A8', 0.5), borderColor: '#00D4A8',
            borderWidth: 1.5, borderRadius: 4, yAxisID: 'y',
          },
          {
            type: 'line', label: 'Avg Yield (Kg/Ha)',
            data: trend.map(function (d) { return d.avg_yield; }),
            borderColor: '#F59E0B', backgroundColor: alpha('#F59E0B', 0.1),
            borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#F59E0B',
            tension: 0.4, fill: true, yAxisID: 'y2',
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: xAxis,
          y:  yAxis('Production (MT)', false),
          y2: yAxis('Avg Yield (Kg/Ha)', true),
        },
        plugins: {legend: {position: 'top'}},
      },
    });
  }

  // ── 3. Purchase Trend (bar + line price) ─────────────────────
  function renderPurchaseTrend(id, trend) {
    var labels = trend.map(function (d) { return d.year; });
    return create(id, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            type: 'bar', label: 'Volume (MT)',
            data: trend.map(function (d) { return Math.round(d.purch_kg / 1000); }),
            backgroundColor: alpha('#60A5FA', 0.5), borderColor: '#60A5FA',
            borderWidth: 1.5, borderRadius: 4, yAxisID: 'y',
          },
          {
            type: 'line', label: 'Revenue ($M)',
            data: trend.map(function (d) { return Math.round(d.purch_riel / 4e9 * 100) / 100; }),
            borderColor: '#A78BFA', backgroundColor: alpha('#A78BFA', 0.1),
            borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#A78BFA',
            tension: 0.4, fill: true, yAxisID: 'y2',
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: xAxis,
          y:  yAxis('Volume (MT)', false),
          y2: yAxis('Revenue ($M)', true),
        },
        plugins: {legend: {position: 'top'}},
      },
    });
  }

  // ── 4. Cert Doughnut ─────────────────────────────────────────
  function renderCertDoughnut(id, certCounts) {
    var labels = Object.keys(certCounts).filter(function (k) { return k !== 'Unknown' && certCounts[k] > 0; });
    var data   = labels.map(function (k) { return certCounts[k]; });
    var colors = labels.map(function (k) { return CERT_COLORS[k] || '#6B7280'; });
    return create(id, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{data: data, backgroundColor: colors, borderColor: '#1C2640', borderWidth: 2, hoverOffset: 6}],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {position: 'bottom', labels: {font: {size: 11}}},
          tooltip: {callbacks: {
            label: function (ctx) {
              var total = ctx.dataset.data.reduce(function (a,b){ return a+b; }, 0);
              var pct = total ? Math.round(ctx.parsed / total * 100) : 0;
              return ' ' + ctx.label + ': ' + ctx.parsed.toLocaleString() + ' (' + pct + '%)';
            }
          }},
        },
      },
    });
  }

  // ── 5. Site Radar ────────────────────────────────────────────
  function renderSiteRadar(id, siteTotals) {
    var sites = Object.keys(siteTotals).slice(0, 5);
    if (!sites.length) return;
    var maxFarm  = Math.max.apply(null, sites.map(function (s) { return siteTotals[s].farmers; })) || 1;
    var maxProd  = Math.max.apply(null, sites.map(function (s) { return siteTotals[s].prod_kg; })) || 1;
    var maxArea  = Math.max.apply(null, sites.map(function (s) { return siteTotals[s].area_ha; })) || 1;
    var maxRiel  = Math.max.apply(null, sites.map(function (s) { return siteTotals[s].purch_riel; })) || 1;

    var datasets = sites.map(function (s, i) {
      var d = siteTotals[s];
      var c = SITE_COLORS[s] || YEAR_PALETTE[i];
      return {
        label: s,
        data: [
          Math.round(d.farmers / maxFarm * 100),
          Math.round(d.prod_kg / maxProd * 100),
          Math.round(d.area_ha / maxArea * 100),
          Math.round(d.purch_riel / maxRiel * 100),
          Math.round((d.compliance || 0)),
        ],
        borderColor: c, backgroundColor: alpha(c, 0.12),
        borderWidth: 2, pointBackgroundColor: c, pointRadius: 3,
      };
    });

    return create(id, {
      type: 'radar',
      data: {labels: ['Farmers', 'Production', 'Land Area', 'Revenue', 'Compliance %'], datasets: datasets},
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {r: {
          beginAtZero: true, max: 100,
          grid: {color: 'rgba(255,255,255,0.07)'},
          ticks: {display: false},
          angleLines: {color: 'rgba(255,255,255,0.07)'},
          pointLabels: {color: '#9BAAC5', font: {size: 10.5}},
        }},
        plugins: {legend: {position: 'bottom', labels: {font: {size: 10}}}},
      },
    });
  }

  // ── 6. Farmer Status Stacked ─────────────────────────────────
  function renderFarmerStatus(id, trend) {
    var labels = trend.map(function (d) { return d.year; });
    return create(id, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {label: 'New',      data: trend.map(function(d){ return d.new; }),      backgroundColor: '#4ADE80', stack: 's'},
          {label: 'Rejoin',   data: trend.map(function(d){ return d.rejoin; }),   backgroundColor: '#F59E0B', stack: 's'},
          {label: 'Existing', data: trend.map(function(d){ return d.existing; }), backgroundColor: '#00D4A8', stack: 's'},
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {x: xAxis, y: Object.assign({}, yAxis('Farmers'), {stacked: true, beginAtZero: true})},
        plugins: {legend: {position: 'top'}},
      },
    });
  }

  // ── 7. Farmers by Site (grouped) ─────────────────────────────
  function renderFarmersBySite(id, siteYearData, years) {
    var sites = Object.keys(siteYearData).sort();
    var datasets = years.map(function (y, i) {
      return {
        label: y,
        data: sites.map(function (s) { return (siteYearData[s][y] || {}).unique_farmers || 0; }),
        backgroundColor: alpha(YEAR_PALETTE[i % YEAR_PALETTE.length], 0.7),
        borderColor: YEAR_PALETTE[i % YEAR_PALETTE.length],
        borderWidth: 1.5, borderRadius: 3,
      };
    });
    return create(id, {
      type: 'bar',
      data: {labels: sites, datasets: datasets},
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {x: xAxis, y: Object.assign({}, yAxis('Active Farmers'), {beginAtZero: true})},
        plugins: {legend: {position: 'top'}},
      },
    });
  }

  // ── 8. Top Villages (horizontal bar) ─────────────────────────
  function renderTopVillagesFarmers(id, villageStats) {
    var top = villageStats.slice(0, 15);
    top.sort(function(a,b) { return b.total_farmers - a.total_farmers; });
    return create(id, {
      type: 'bar',
      data: {
        labels: top.map(function (v) { return v.village; }),
        datasets: [{
          label: 'Farmers',
          data: top.map(function (v) { return v.total_farmers; }),
          backgroundColor: top.map(function (v) { return alpha(SITE_COLORS[v.site] || '#6B7280', 0.7); }),
          borderColor: top.map(function (v) { return SITE_COLORS[v.site] || '#6B7280'; }),
          borderWidth: 1.5, borderRadius: 3,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: Object.assign({}, xAxis, {title: {display: true, text: 'Farmer Count', color: '#5A6882'}}),
          y: {grid: {display: false}, ticks: {color: '#9BAAC5', font: {size: 11}}},
        },
        plugins: {legend: {display: false}},
      },
    });
  }

  // ── 9. Gender doughnut ────────────────────────────────────────
  function renderGender(id, farmerRecords, state) {
    var counts = {Female: 0, Male: 0, Unknown: 0};
    farmerRecords.forEach(function (f) {
      if (!state.sites.has(f.site)) return;
      var g = (f.gender || 'Unknown').trim();
      if (g in counts) counts[g]++;
      else counts['Unknown']++;
    });
    return create(id, {
      type: 'doughnut',
      data: {
        labels: ['Female', 'Male', 'Unknown'],
        datasets: [{
          data: [counts.Female, counts.Male, counts.Unknown],
          backgroundColor: ['#F472B6', '#60A5FA', '#6B7280'],
          borderColor: '#1C2640', borderWidth: 2, hoverOffset: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {legend: {position: 'bottom', labels: {font: {size: 11}}}},
      },
    });
  }

  // ── 10. Production vs Area (dual axis) ───────────────────────
  function renderProdArea(id, trend) {
    var labels = trend.map(function (d) { return d.year; });
    return create(id, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            type: 'bar', label: 'Production (MT)',
            data: trend.map(function (d) { return Math.round(d.prod_kg / 1000); }),
            backgroundColor: alpha('#00D4A8', 0.5), borderColor: '#00D4A8',
            borderWidth: 1.5, borderRadius: 4, yAxisID: 'y',
          },
          {
            type: 'line', label: 'Farmland Area (Ha)',
            data: trend.map(function (d) { return Math.round(d.area_ha); }),
            borderColor: '#F59E0B', backgroundColor: alpha('#F59E0B', 0.08),
            borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#F59E0B',
            tension: 0.4, fill: true, yAxisID: 'y2',
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: xAxis,
          y:  yAxis('Production (MT)', false),
          y2: yAxis('Area (Ha)', true),
        },
        plugins: {legend: {position: 'top'}},
      },
    });
  }

  // ── 11. Yield by Site (multi-line) ───────────────────────────
  function renderYieldBySite(id, siteYearData, years) {
    var sites = Object.keys(siteYearData).sort();
    var datasets = sites.map(function (s, i) {
      var c = SITE_COLORS[s] || YEAR_PALETTE[i];
      return {
        label: s,
        data: years.map(function (y) { return (siteYearData[s][y] || {}).avg_yield_kg_ha || null; }),
        borderColor: c, backgroundColor: alpha(c, 0.1),
        borderWidth: 2.5, pointRadius: 3.5, pointBackgroundColor: c,
        tension: 0.4, fill: false,
        spanGaps: true,
      };
    });
    return create(id, {
      type: 'line',
      data: {labels: years, datasets: datasets},
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {x: xAxis, y: yAxis('Yield (Kg/Ha)')},
        plugins: {legend: {position: 'top'}},
      },
    });
  }

  // ── 12. Paddy Split (stacked bar: sell/consume/seed) ─────────
  function renderPaddySplit(id, trend) {
    var labels = trend.map(function (d) { return d.year; });
    return create(id, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {label: 'Sold',        data: trend.map(function(d){ return Math.round(d.sell_kg/1000); }),    backgroundColor: '#00D4A8', stack: 's'},
          {label: 'Consumed',    data: trend.map(function(d){ return Math.round(d.consume_kg/1000); }), backgroundColor: '#60A5FA', stack: 's'},
          {label: 'Seeds Kept',  data: trend.map(function(d){ return Math.round(d.seed_kg/1000); }),    backgroundColor: '#F59E0B', stack: 's'},
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {x: xAxis, y: Object.assign({}, yAxis('Paddy (metric tons)'), {stacked: true, beginAtZero: true})},
        plugins: {legend: {position: 'top'}},
      },
    });
  }

  // ── 13. Threshing Method (doughnut) ──────────────────────────
  function renderThreshingMethod(id, trend) {
    var machine = 0, hand = 0, unknown = 0;
    trend.forEach(function (d) { machine += d.thr_machine || 0; hand += d.thr_hand || 0; unknown += d.thr_unknown || 0; });
    return create(id, {
      type: 'doughnut',
      data: {
        labels: ['Machine', 'Hand', 'Unknown'],
        datasets: [{
          data: [machine, hand, unknown],
          backgroundColor: ['#00D4A8', '#F59E0B', '#6B7280'],
          borderColor: '#1C2640', borderWidth: 2, hoverOffset: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {legend: {position: 'bottom', labels: {font: {size: 11}}}},
      },
    });
  }

  // ── 14. Top Villages by Production ───────────────────────────
  function renderTopVillagesProd(id, villageStats) {
    var top = villageStats.slice(0, 20);
    return create(id, {
      type: 'bar',
      data: {
        labels: top.map(function (v) { return v.village; }),
        datasets: [{
          label: 'Production (MT)',
          data: top.map(function (v) { return Math.round(v.prod_kg / 1000); }),
          backgroundColor: top.map(function (v) { return alpha(SITE_COLORS[v.site] || '#6B7280', 0.7); }),
          borderColor: top.map(function (v) { return SITE_COLORS[v.site] || '#6B7280'; }),
          borderWidth: 1.5, borderRadius: 3,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: Object.assign({}, xAxis, {title: {display: true, text: 'Production (MT)', color: '#5A6882'}}),
          y: {grid: {display: false}, ticks: {color: '#9BAAC5', font: {size: 10.5}}},
        },
        plugins: {legend: {display: false},
          tooltip: {callbacks: {
            afterLabel: function (ctx) {
              var v = top[ctx.dataIndex];
              return '  Yield: ' + v.avg_yield_kg_ha + ' Kg/Ha | Farmers: ' + v.total_farmers;
            }
          }}},
      },
    });
  }

  // ── 15. Market Trend (bar + line) ────────────────────────────
  function renderMarketTrend(id, trend) {
    var labels = trend.map(function (d) { return d.year; });
    return create(id, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            type: 'bar', label: 'Volume (MT)',
            data: trend.map(function (d) { return Math.round(d.purch_kg / 1000); }),
            backgroundColor: alpha('#00D4A8', 0.5), borderColor: '#00D4A8',
            borderWidth: 1.5, borderRadius: 4, yAxisID: 'y',
          },
          {
            type: 'line', label: 'Revenue ($M)',
            data: trend.map(function (d) { return Math.round(d.purch_riel / 4e9 * 100) / 100; }),
            borderColor: '#F59E0B', backgroundColor: alpha('#F59E0B', 0.1),
            borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#F59E0B',
            tension: 0.4, fill: true, yAxisID: 'y2',
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {x: xAxis, y: yAxis('Volume (MT)'), y2: yAxis('Revenue ($M)', true)},
        plugins: {legend: {position: 'top'}},
      },
    });
  }

  // ── 16. Price Trend (line) ────────────────────────────────────
  function renderPriceTrend(id, trend) {
    var labels = trend.map(function (d) { return d.year; });
    return create(id, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Avg Price (KHR/Kg)',
          data: trend.map(function (d) { return d.avg_price; }),
          borderColor: '#F59E0B', backgroundColor: alpha('#F59E0B', 0.1),
          borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: '#F59E0B',
          tension: 0.4, fill: true,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {x: xAxis, y: yAxis('Price (KHR / Kg)')},
        plugins: {
          legend: {display: false},
          tooltip: {callbacks: {
            label: function (ctx) { return ' ' + (ctx.parsed.y || 0).toLocaleString() + ' KHR / Kg'; }
          }},
        },
      },
    });
  }

  // ── 17. Revenue by Site (grouped bar) ────────────────────────
  function renderRevenueBySite(id, siteYearData, years) {
    var sites = Object.keys(siteYearData).sort();
    var datasets = years.map(function (y, i) {
      return {
        label: y,
        data: sites.map(function (s) {
          return Math.round((siteYearData[s][y] || {}).purch_riel / 4e9 * 100) / 100;
        }),
        backgroundColor: alpha(YEAR_PALETTE[i % YEAR_PALETTE.length], 0.7),
        borderColor: YEAR_PALETTE[i % YEAR_PALETTE.length],
        borderWidth: 1.5, borderRadius: 3,
      };
    });
    return create(id, {
      type: 'bar',
      data: {labels: sites, datasets: datasets},
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {x: xAxis, y: Object.assign({}, yAxis('Revenue ($M)'), {beginAtZero: true})},
        plugins: {legend: {position: 'top'}},
      },
    });
  }

  // ── 18. Variety Volume (stacked) ─────────────────────────────
  function renderVarietyVolume(id, varietyYear, years) {
    // Top varieties by total kg
    var varTotals = {};
    Object.keys(varietyYear).forEach(function (v) {
      varTotals[v] = Object.values(varietyYear[v]).reduce(function (a,d) { return a + d.kg; }, 0);
    });
    var topVars = Object.keys(varTotals).sort(function(a,b){ return varTotals[b] - varTotals[a]; }).slice(0, 6);
    var palette = ['#00D4A8','#60A5FA','#F59E0B','#A78BFA','#F87171','#4ADE80'];

    var datasets = topVars.map(function (v, i) {
      return {
        label: v,
        data: years.map(function (y) {
          return Math.round(((varietyYear[v] || {})[y] || {}).kg / 1000) || 0;
        }),
        backgroundColor: alpha(palette[i], 0.7),
        borderColor: palette[i], borderWidth: 1, borderRadius: 2, stack: 's',
      };
    });

    return create(id, {
      type: 'bar',
      data: {labels: years, datasets: datasets},
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {x: xAxis, y: Object.assign({}, yAxis('Volume (MT)'), {stacked: true, beginAtZero: true})},
        plugins: {legend: {position: 'top', labels: {font: {size: 10}}}},
      },
    });
  }

  // ── 19. Grade Distribution (stacked 100%) ────────────────────
  function renderGradeDist(id, qualityByYear) {
    var years  = Object.keys(qualityByYear).sort();
    var allGrades = ['A1', 'A', 'A2', 'B1', 'B2', 'B', 'Unknown'];
    var datasets = allGrades.map(function (g) {
      return {
        label: g,
        data: years.map(function (y) { return (qualityByYear[y].grades || {})[g] || 0; }),
        backgroundColor: GRADE_COLORS[g] || '#6B7280',
        stack: 's',
      };
    });
    return create(id, {
      type: 'bar',
      data: {labels: years, datasets: datasets},
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {x: xAxis, y: Object.assign({}, yAxis('Records'), {stacked: true, beginAtZero: true})},
        plugins: {legend: {position: 'top', labels: {font: {size: 10}}}},
      },
    });
  }

  // ── 20. Quality Trend (good grain / broken grain) ────────────
  function renderQualityTrend(id, qualityByYear) {
    var years = Object.keys(qualityByYear).sort();
    return create(id, {
      type: 'line',
      data: {
        labels: years,
        datasets: [
          {
            label: 'Good Grain %',
            data: years.map(function (y) { return qualityByYear[y].avg_good_grain; }),
            borderColor: '#00D4A8', backgroundColor: alpha('#00D4A8', 0.08),
            borderWidth: 2.5, pointRadius: 4, tension: 0.4, fill: true,
          },
          {
            label: 'Broken Grain %',
            data: years.map(function (y) { return qualityByYear[y].avg_broken_grain; }),
            borderColor: '#F87171', backgroundColor: alpha('#F87171', 0.08),
            borderWidth: 2.5, pointRadius: 4, tension: 0.4, fill: true,
          },
          {
            label: 'Impurity %',
            data: years.map(function (y) { return qualityByYear[y].avg_impurity; }),
            borderColor: '#F59E0B', backgroundColor: 'transparent',
            borderWidth: 2, borderDash: [4,3], pointRadius: 3, tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {x: xAxis, y: yAxis('Percentage (%)')},
        plugins: {legend: {position: 'top'}},
      },
    });
  }

  // ── 21. Moisture Trend ────────────────────────────────────────
  function renderMoisture(id, qualityByYear) {
    var years = Object.keys(qualityByYear).sort();
    return create(id, {
      type: 'line',
      data: {
        labels: years,
        datasets: [{
          label: 'Avg Moisture %',
          data: years.map(function (y) { return qualityByYear[y].avg_moisture; }),
          borderColor: '#38BDF8', backgroundColor: alpha('#38BDF8', 0.1),
          borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: '#38BDF8',
          tension: 0.4, fill: true,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {x: xAxis, y: yAxis('Moisture (%)')},
        plugins: {legend: {display: false}},
        plugins: {
          legend: {display: false},
          annotation: {},
        }
      },
    });
  }

  // ── 22. Color Doughnut ────────────────────────────────────────
  function renderColorDist(id, qualityByYear) {
    var colorCounts = {};
    Object.values(qualityByYear).forEach(function (d) {
      Object.keys(d.colors || {}).forEach(function (c) {
        colorCounts[c] = (colorCounts[c] || 0) + d.colors[c];
      });
    });
    var labels = Object.keys(colorCounts).filter(function (k) { return colorCounts[k] > 0; });
    var palette = ['#F8E3B3','#D97706','#F59E0B','#FDE68A','#92400E','#6B7280','#B45309'];
    return create(id, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: labels.map(function (k) { return colorCounts[k]; }),
          backgroundColor: labels.map(function (k, i) { return palette[i % palette.length]; }),
          borderColor: '#1C2640', borderWidth: 2, hoverOffset: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {legend: {position: 'bottom', labels: {font: {size: 11}}}},
      },
    });
  }

  // ── 23. Price by Grade (bar) ──────────────────────────────────
  function renderPriceByGrade(id, qualityByYear) {
    var priceTotals = {};
    Object.values(qualityByYear).forEach(function (d) {
      Object.keys(d.avg_price_by_grade || {}).forEach(function (g) {
        if (!priceTotals[g]) priceTotals[g] = [];
        priceTotals[g].push(d.avg_price_by_grade[g]);
      });
    });
    var grades = Object.keys(priceTotals).sort();
    var avgs   = grades.map(function (g) { var arr = priceTotals[g]; return Math.round(arr.reduce(function(a,b){return a+b;},0)/arr.length); });
    return create(id, {
      type: 'bar',
      data: {
        labels: grades,
        datasets: [{
          label: 'Avg Price (KHR/Kg)',
          data: avgs,
          backgroundColor: grades.map(function (g) { return alpha(GRADE_COLORS[g] || '#6B7280', 0.7); }),
          borderColor: grades.map(function (g) { return GRADE_COLORS[g] || '#6B7280'; }),
          borderWidth: 1.5, borderRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: Object.assign({}, xAxis, {grid: {display: false}}),
          y: yAxis('Price (KHR / Kg)'),
        },
        plugins: {legend: {display: false}},
      },
    });
  }

  // ── 24. Area Trend (stacked bar) ─────────────────────────────
  function renderAreaTrend(id, trend) {
    var labels = trend.map(function (d) { return d.year; });
    return create(id, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Planted Area (Ha)',
            data: trend.map(function (d) { return Math.round(d.planted_area_ha || 0); }),
            backgroundColor: '#00D4A8', stack: 's',
          },
          {
            label: 'Fallow Area (Ha)',
            data: trend.map(function (d) { return Math.round(d.fallow_area_ha || 0); }),
            backgroundColor: '#F59E0B', stack: 's',
          },
          {
            label: 'Other Area (Ha)',
            data: trend.map(function (d) { return Math.round(d.other_area_ha || 0); }),
            backgroundColor: '#A78BFA', stack: 's',
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: xAxis,
          y: Object.assign({}, yAxis('Hectares (Ha)'), {stacked: true, beginAtZero: true}),
        },
        plugins: {legend: {position: 'top'}},
      },
    });
  }

  // ── 25. Cert Trend (stacked area) ────────────────────────────
  function renderCertTrend(id, trend) {
    var labels = trend.map(function (d) { return d.year; });
    var certs  = ['Organic', 'New Organic', 'Ibis I', 'Ibis II', 'WF'];
    var datasets = certs.map(function (c) {
      return {
        label: c,
        data: trend.map(function (d) { return (d.cert || {})[c] || 0; }),
        backgroundColor: alpha(CERT_COLORS[c] || '#6B7280', 0.6),
        borderColor: CERT_COLORS[c] || '#6B7280',
        borderWidth: 1, fill: true, stack: 's',
      };
    });
    return create(id, {
      type: 'line',
      data: {labels: labels, datasets: datasets},
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {x: xAxis, y: Object.assign({}, yAxis('Inspection Records'), {stacked: true, beginAtZero: true})},
        plugins: {legend: {position: 'top', labels: {font: {size: 10}}}},
      },
    });
  }

  // ── 26. Land Situation (doughnut) ────────────────────────────
  function renderLandSit(id, trend) {
    var counts = {};
    trend.forEach(function (d) {
      Object.keys(d.land_sit || {}).forEach(function (k) {
        var label = k || 'Lowland';
        if (['Lowland', 'Highland', 'Flooded land'].indexOf(label) === -1) label = 'Lowland';
        counts[label] = (counts[label] || 0) + d.land_sit[k];
      });
    });
    var labels = Object.keys(counts).filter(function(k){return counts[k]>0;});
    return create(id, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: labels.map(function(k){return counts[k];}),
          backgroundColor: ['#00D4A8','#F59E0B','#60A5FA'],
          borderColor: '#1C2640', borderWidth: 2, hoverOffset: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {legend: {position: 'bottom', labels: {font: {size: 11}}}},
      },
    });
  }

  // ── 27. Land Ownership (doughnut) ────────────────────────────
  function renderLandOwn(id, trend) {
    var counts = {};
    trend.forEach(function (d) {
      Object.keys(d.land_own || {}).forEach(function (k) {
        var label = k.trim() || 'Unknown';
        if (!label || label === 'Unknown') label = 'Unknown';
        counts[label] = (counts[label] || 0) + d.land_own[k];
      });
    });
    var labels = Object.keys(counts).filter(function(k){return counts[k]>10;}).slice(0,6);
    var palette = ['#00D4A8','#60A5FA','#F59E0B','#A78BFA','#F87171','#6B7280'];
    return create(id, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: labels.map(function(k){return counts[k];}),
          backgroundColor: palette,
          borderColor: '#1C2640', borderWidth: 2, hoverOffset: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {legend: {position: 'bottom', labels: {font: {size: 11}}}},
      },
    });
  }

  // ── 28. Irrigation (bar) ─────────────────────────────────────
  function renderIrrigation(id, trend) {
    var counts = {};
    trend.forEach(function (d) {
      Object.keys(d.irrigation || {}).forEach(function (k) {
        var label = k.trim() || 'None / Rain-fed';
        counts[label] = (counts[label] || 0) + d.irrigation[k];
      });
    });
    var sorted = Object.keys(counts).sort(function(a,b){ return counts[b] - counts[a]; }).slice(0, 8);
    var palette = ['#00D4A8','#60A5FA','#F59E0B','#A78BFA','#F87171','#4ADE80','#FB923C','#6B7280'];
    return create(id, {
      type: 'bar',
      data: {
        labels: sorted,
        datasets: [{
          label: 'Inspections',
          data: sorted.map(function(k){return counts[k];}),
          backgroundColor: sorted.map(function(k,i){return alpha(palette[i%palette.length],0.7);}),
          borderColor: sorted.map(function(k,i){return palette[i%palette.length];}),
          borderWidth: 1.5, borderRadius: 3,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: Object.assign({}, xAxis, {title: {display: true, text: 'Inspection Count', color: '#5A6882'}}),
          y: {grid: {display: false}, ticks: {color: '#9BAAC5', font: {size: 10.5}}},
        },
        plugins: {legend: {display: false}},
      },
    });
  }

  // ── 29. Site Comparison (grouped bar) ────────────────────────
  function renderSiteComparison(id, siteTotals) {
    var sites = Object.keys(siteTotals).sort();
    return create(id, {
      type: 'bar',
      data: {
        labels: sites,
        datasets: [
          {
            label: 'Farmers',
            data: sites.map(function(s){ return siteTotals[s].farmers; }),
            backgroundColor: sites.map(function(s){ return alpha(SITE_COLORS[s]||'#6B7280', 0.7); }),
            borderColor: sites.map(function(s){ return SITE_COLORS[s]||'#6B7280'; }),
            borderWidth: 1.5, borderRadius: 3, yAxisID: 'y',
          },
          {
            type: 'line',
            label: 'Compliance Rate %',
            data: sites.map(function(s){ return siteTotals[s].compliance; }),
            borderColor: '#F59E0B', backgroundColor: 'transparent',
            borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: '#F59E0B',
            tension: 0.3, yAxisID: 'y2',
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: Object.assign({}, xAxis, {grid: {display: false}}),
          y:  yAxis('Farmers', false),
          y2: Object.assign({}, yAxis('Compliance (%)', true), {min: 0, max: 100}),
        },
        plugins: {legend: {position: 'top'}},
      },
    });
  }

  // ── 30. Mini Site Farmer Trend (line) ─────────────────────────
  function renderMiniSiteTrend(id, name, siteYears) {
    var yrs = Object.keys(siteYears).sort();
    var data = yrs.map(function (y) { return siteYears[y].unique_farmers || 0; });
    var color = SITE_COLORS[name] || '#6B7280';
    return create(id, {
      type: 'line',
      data: {
        labels: yrs,
        datasets: [{
          label: 'Farmers',
          data: data,
          borderColor: color,
          backgroundColor: alpha(color, 0.1),
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.3,
          fill: true,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: xAxis,
          y: {grid: gridOpts, ticks: {color: '#9BAAC5', font: {size: 10}, precision: 0}}
        },
        plugins: {legend: {display: false}, tooltip: {enabled: true}},
      }
    });
  }

  return {
    initDefaults: initDefaults,
    destroy: destroy,
    SITE_COLORS: SITE_COLORS,
    CERT_COLORS: CERT_COLORS,
    renderFarmerGrowth: renderFarmerGrowth,
    renderProductionTrend: renderProductionTrend,
    renderPurchaseTrend: renderPurchaseTrend,
    renderCertDoughnut: renderCertDoughnut,
    renderSiteRadar: renderSiteRadar,
    renderFarmerStatus: renderFarmerStatus,
    renderFarmersBySite: renderFarmersBySite,
    renderTopVillagesFarmers: renderTopVillagesFarmers,
    renderGender: renderGender,
    renderProdArea: renderProdArea,
    renderYieldBySite: renderYieldBySite,
    renderPaddySplit: renderPaddySplit,
    renderThreshingMethod: renderThreshingMethod,
    renderTopVillagesProd: renderTopVillagesProd,
    renderMarketTrend: renderMarketTrend,
    renderPriceTrend: renderPriceTrend,
    renderRevenueBySite: renderRevenueBySite,
    renderVarietyVolume: renderVarietyVolume,
    renderGradeDist: renderGradeDist,
    renderQualityTrend: renderQualityTrend,
    renderMoisture: renderMoisture,
    renderColorDist: renderColorDist,
    renderPriceByGrade: renderPriceByGrade,
    renderAreaTrend: renderAreaTrend,
    renderCertTrend: renderCertTrend,
    renderLandSit: renderLandSit,
    renderLandOwn: renderLandOwn,
    renderIrrigation: renderIrrigation,
    renderSiteComparison: renderSiteComparison,
    renderMiniSiteTrend: renderMiniSiteTrend,
  };
})();
