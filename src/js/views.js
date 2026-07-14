/* ============================================================
   views.js  —  Tab-specific rendering and updates
   ============================================================ */

var Views = (function () {
  'use strict';

  // ── Helper: Render KPI Grid ──────────────────────────────────
  function renderKPICard(targetEl, kpis) {
    if (!targetEl) return;
    targetEl.innerHTML = '';

    var list = [
      { key: 'farmers', label: 'Active Farmers', fmt: Data.numFmt, cls: 'green' },
      { key: 'prod_kg', label: 'Paddy Production', fmt: Data.kgFmt, cls: 'teal' },
      { key: 'purch_riel', label: 'Program Revenue', fmt: Data.rielFmt, cls: 'gold' },
      { key: 'compliance', label: 'Compliance Rate', fmt: Data.pctFmt, cls: 'blue' }
    ];

    list.forEach(function (item) {
      var k = kpis[item.key];
      if (!k) return;
      var card = document.createElement('div');
      card.className = 'kpi-card ' + item.cls;

      var chgHtml = '';
      if (k.chg !== null) {
        var sign = k.chg >= 0 ? '+' : '';
        var suffix = item.isPoints ? ' pp' : '%';
        var isUp = k.chg >= 0;
        chgHtml = '<span class="kpi-change ' + (isUp ? 'up' : 'down') + '">' +
          (isUp ? '▲' : '▼') + ' ' + sign + k.chg + suffix + '</span>';
      } else {
        chgHtml = '<span class="kpi-change flat">YoY —</span>';
      }

      card.innerHTML =
        '<div class="kpi-label">' + item.label + '</div>' +
        '<div class="kpi-value">' + item.fmt(k.val) + '</div>' +
        '<div class="kpi-footer">' + chgHtml + '<span class="kpi-sub">vs prior period</span></div>';

      targetEl.appendChild(card);
    });
  }

  // ── Executive Overview Tab ───────────────────────────────────
  function updateOverview(state) {
    var kpis = Data.getKPIs(state);
    var trend = Data.getAggYearly(state);
    var certCounts = Data.getCertDist(state);
    var siteTotals = Data.getSiteTotals(state);

    // KPIs
    renderKPICard(document.getElementById('kpi-overview'), kpis);

    // Charts
    Charts.renderFarmerGrowth('chart-farmer-growth', trend);
    Charts.renderProductionTrend('chart-production-trend', trend);
    Charts.renderPurchaseTrend('chart-purchase-trend', trend);
    Charts.renderCertDoughnut('chart-cert-doughnut', certCounts);
    Charts.renderSiteRadar('chart-site-radar', siteTotals);

    // Dynamic Insights Text
    var insights = Data.generateInsights(state);
    var ip = document.getElementById('insights-overview');
    if (ip) {
      ip.innerHTML = '';
      insights.forEach(function (ins) {
        var item = document.createElement('div');
        item.className = 'insight-item';
        item.innerHTML =
          '<div class="insight-icon">' + ins.icon + '</div>' +
          '<div class="insight-text">' +
          '<div class="insight-title">' + ins.title + '</div>' +
          '<div class="insight-body">' + ins.body + '</div>' +
          '</div>';
        ip.appendChild(item);
      });
    }
  }

  // ── Farmers Tab ──────────────────────────────────────────────
  function updateFarmers(state) {
    var kpis = Data.getKPIs(state);
    var trend = Data.getAggYearly(state);
    var siteYearData = Data.getSiteYearData(state);
    var vills = Data.getVillageStats(state);
    var records = Data.getFarmerRecords(state, '', '', '', '');

    // Farmers KPI
    if (document.getElementById('kpi-farmers')) {
      var targetEl = document.getElementById('kpi-farmers');
      targetEl.innerHTML = '';

      var items = [
        { val: kpis.farmers ? kpis.farmers.val : 0, chg: kpis.farmers ? kpis.farmers.chg : null, label: 'Active Farmers', fmt: Data.numFmt, cls: 'green' },
        { val: trend.reduce(function (a, b) { return a + (b.new || 0); }, 0), label: 'Total New Registrations', fmt: Data.numFmt, cls: 'teal' },
        { val: Data.getOverallKPIs(state).total_farmers, label: 'Total Farmer Registry', fmt: Data.numFmt, cls: 'blue' }
      ];

      items.forEach(function (it) {
        var card = document.createElement('div');
        card.className = 'kpi-card ' + it.cls;
        var chg = '';
        if (it.chg !== undefined && it.chg !== null) {
          var isUp = it.chg >= 0;
          chg = '<span class="kpi-change ' + (isUp ? 'up' : 'down') + '">' + (isUp ? '▲' : '▼') + ' ' + (isUp ? '+' : '') + it.chg + '%</span>';
        }
        card.innerHTML =
          '<div class="kpi-label">' + it.label + '</div>' +
          '<div class="kpi-value">' + it.fmt(it.val) + '</div>' +
          '<div class="kpi-footer">' + chg + '<span class="kpi-sub">Across active years</span></div>';
        targetEl.appendChild(card);
      });
    }

    // Charts
    Charts.renderFarmerStatus('chart-farmer-status', trend);
    Charts.renderFarmersBySite('chart-farmers-by-site', siteYearData, Array.from(state.years).sort());
    Charts.renderTopVillagesFarmers('chart-top-villages-farmers', vills);
    Charts.renderGender('chart-gender', records, state);

    // Cohort Matrix Table
    renderCohortMatrix(state);
  }

  function renderCohortMatrix(state) {
    var wrapper = document.getElementById('cohort-table-wrap');
    if (!wrapper) return;
    wrapper.innerHTML = '';

    var cohort = Data.getCohortData();
    var joinYears = Object.keys(cohort).sort();
    var activeYears = Array.from(state.years).sort();

    var table = document.createElement('table');
    table.className = 'cohort-table';

    var thead = '<thead><tr><th class="row-header">Cohort (Join Year)</th><th>Size</th>';
    activeYears.forEach(function (y) {
      thead += '<th>Year ' + y + '</th>';
    });
    thead += '</tr></thead>';
    table.innerHTML = thead;

    var tbody = document.createElement('tbody');
    joinYears.forEach(function (jy) {
      var sizes = cohort[jy];
      var size = sizes[jy] || 0;
      if (!size) return;

      var tr = document.createElement('tr');
      tr.innerHTML = '<td class="row-header fw-600">Cohort ' + jy + '</td><td class="fw-700">' + size.toLocaleString() + '</td>';

      activeYears.forEach(function (ay) {
        if (ay < jy) {
          tr.innerHTML += '<td class="text-muted">—</td>';
        } else {
          var count = sizes[ay] || 0;
          var pct = size ? Math.round(count / size * 100) : 0;
          // color mapping
          var heat = 'rgba(0, 212, 168, ' + (pct / 100 * 0.85 + 0.15) + ')';
          var textCol = pct > 45 ? '#07091A' : '#E8EDF5';
          tr.innerHTML += '<td><span class="retention-cell" style="background:' + heat + ';color:' + textCol + '">' + count.toLocaleString() + ' (' + pct + '%)</span></td>';
        }
      });
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    wrapper.appendChild(table);
  }

  // ── Production & Yield Tab ───────────────────────────────────
  function updateProduction(state) {
    var kpis = Data.getKPIs(state);
    var trend = Data.getAggYearly(state);
    var siteYearData = Data.getSiteYearData(state);
    var vills = Data.getVillageStats(state);

    if (document.getElementById('kpi-production')) {
      var targetEl = document.getElementById('kpi-production');
      targetEl.innerHTML = '';

      var items = [
        { val: kpis.prod_kg ? kpis.prod_kg.val : 0, chg: kpis.prod_kg ? kpis.prod_kg.chg : null, label: 'Total Production', fmt: Data.kgFmt, cls: 'teal' },
        { val: kpis.avg_yield ? kpis.avg_yield.val : 0, chg: kpis.avg_yield ? kpis.avg_yield.chg : null, label: 'Avg Yield per Hectare', fmt: function (n) { return Data.numFmt(n, 1) + ' Kg/Ha'; }, cls: 'green' },
        { val: kpis.planted_area_ha ? kpis.planted_area_ha.val : 0, chg: kpis.planted_area_ha ? kpis.planted_area_ha.chg : null, label: 'Cultivated Farmland', fmt: function (n) { return Data.numFmt(n, 1) + ' Ha'; }, cls: 'blue' }
      ];

      items.forEach(function (it) {
        var card = document.createElement('div');
        card.className = 'kpi-card ' + it.cls;
        var chg = '';
        if (it.chg !== null) {
          var isUp = it.chg >= 0;
          chg = '<span class="kpi-change ' + (isUp ? 'up' : 'down') + '">' + (isUp ? '▲' : '▼') + ' ' + (isUp ? '+' : '') + it.chg + '%</span>';
        }
        card.innerHTML =
          '<div class="kpi-label">' + it.label + '</div>' +
          '<div class="kpi-value">' + it.fmt(it.val) + '</div>' +
          '<div class="kpi-footer">' + chg + '<span class="kpi-sub">vs prior period</span></div>';
        targetEl.appendChild(card);
      });
    }

    // Charts
    Charts.renderProdArea('chart-prod-area', trend);
    Charts.renderYieldBySite('chart-yield-site', siteYearData, Array.from(state.years).sort());
    Charts.renderPaddySplit('chart-paddy-split', trend);
    Charts.renderThreshingMethod('chart-threshing-method', trend);
    Charts.renderTopVillagesProd('chart-top-villages-prod', vills);
  }

  // ── Market Tab ───────────────────────────────────────────────
  function updateMarket(state) {
    var kpis = Data.getKPIs(state);
    var trend = Data.getAggYearly(state);
    var siteYearData = Data.getSiteYearData(state);
    var varYear = Data.getVarietyYear(state);

    if (document.getElementById('kpi-market')) {
      var targetEl = document.getElementById('kpi-market');
      targetEl.innerHTML = '';

      var items = [
        { val: kpis.purch_riel ? kpis.purch_riel.val : 0, chg: kpis.purch_riel ? kpis.purch_riel.chg : null, label: 'Total Revenue Paid', fmt: Data.rielFmt, cls: 'gold' },
        { val: kpis.purch_kg ? kpis.purch_kg.val : 0, chg: kpis.purch_kg ? kpis.purch_kg.chg : null, label: 'Volume Purchased', fmt: Data.kgFmt, cls: 'green' },
        { val: kpis.avg_price ? kpis.avg_price.val : 0, chg: kpis.avg_price ? kpis.avg_price.chg : null, label: 'Avg Unit Price', fmt: function (n) { return Data.rielFmt(n) + '/Kg'; }, cls: 'teal' }
      ];

      items.forEach(function (it) {
        var card = document.createElement('div');
        card.className = 'kpi-card ' + it.cls;
        var chg = '';
        if (it.chg !== null) {
          var isUp = it.chg >= 0;
          chg = '<span class="kpi-change ' + (isUp ? 'up' : 'down') + '">' + (isUp ? '▲' : '▼') + ' ' + (isUp ? '+' : '') + it.chg + '%</span>';
        }
        card.innerHTML =
          '<div class="kpi-label">' + it.label + '</div>' +
          '<div class="kpi-value">' + it.fmt(it.val) + '</div>' +
          '<div class="kpi-footer">' + chg + '<span class="kpi-sub">vs prior period</span></div>';
        targetEl.appendChild(card);
      });
    }

    // Charts
    Charts.renderMarketTrend('chart-market-trend', trend);
    Charts.renderPriceTrend('chart-price-trend', trend);
    Charts.renderRevenueBySite('chart-revenue-site', siteYearData, Array.from(state.years).sort());
    Charts.renderVarietyVolume('chart-variety-volume', varYear, Array.from(state.years).sort());
  }

  // ── Quality Tab ──────────────────────────────────────────────
  function updateQuality(state) {
    var qData = Data.getQualityByYear(state);
    var trend = Data.getAggYearly(state);

    if (document.getElementById('kpi-quality')) {
      var targetEl = document.getElementById('kpi-quality');
      targetEl.innerHTML = '';

      // Compute averages across selected years
      var moists = [], good = [], broken = [], records = 0;
      Object.values(qData).forEach(function (d) {
        if (d.avg_moisture) moists.push(d.avg_moisture);
        if (d.avg_good_grain) good.push(d.avg_good_grain);
        if (d.avg_broken_grain) broken.push(d.avg_broken_grain);
        records += d.total_records || 0;
      });

      var avgMoist = moists.length ? moists.reduce(function (a, b) { return a + b; }, 0) / moists.length : 0;
      var avgGood = good.length ? good.reduce(function (a, b) { return a + b; }, 0) / good.length : 0;
      var avgBroken = broken.length ? broken.reduce(function (a, b) { return a + b; }, 0) / broken.length : 0;

      var items = [
        { val: avgGood, label: 'Average Good Grain %', fmt: function (n) { return Data.numFmt(n, 1) + '%'; }, cls: 'green' },
        { val: avgMoist, label: 'Average Moisture Content', fmt: function (n) { return Data.numFmt(n, 1) + '%'; }, cls: 'blue' },
        { val: records, label: 'Grading Records Analyzed', fmt: Data.numFmt, cls: 'teal' }
      ];

      items.forEach(function (it) {
        var card = document.createElement('div');
        card.className = 'kpi-card ' + it.cls;
        card.innerHTML =
          '<div class="kpi-label">' + it.label + '</div>' +
          '<div class="kpi-value">' + it.fmt(it.val) + '</div>' +
          '<div class="kpi-footer"><span class="kpi-change flat">Overall</span><span class="kpi-sub">across active years</span></div>';
        targetEl.appendChild(card);
      });
    }

    // Charts
    Charts.renderGradeDist('chart-grade-dist', qData);
    Charts.renderQualityTrend('chart-quality-trend', qData);
    Charts.renderMoisture('chart-moisture', qData);
    Charts.renderColorDist('chart-color-dist', qData);
    Charts.renderPriceByGrade('chart-price-grade', qData);
  }

  // ── Land Tab ─────────────────────────────────────────────────
  function updateLand(state) {
    var kpis = Data.getKPIs(state);
    var trend = Data.getAggYearly(state);

    if (document.getElementById('kpi-land')) {
      var targetEl = document.getElementById('kpi-land');
      targetEl.innerHTML = '';

      var items = [
        { val: kpis.area_ha ? kpis.area_ha.val : 0, chg: kpis.area_ha ? kpis.area_ha.chg : null, label: 'Total Farmland Area', fmt: function (n) { return Data.numFmt(n, 1) + ' Ha'; }, cls: 'green' },
        { val: kpis.planted_area_ha ? kpis.planted_area_ha.val : 0, chg: kpis.planted_area_ha ? kpis.planted_area_ha.chg : null, label: 'Planted Area', fmt: function (n) { return Data.numFmt(n, 1) + ' Ha'; }, cls: 'blue' },
        { val: kpis.fallow_area_ha ? kpis.fallow_area_ha.val : 0, chg: kpis.fallow_area_ha ? kpis.fallow_area_ha.chg : null, label: 'Fallow Area', fmt: function (n) { return Data.numFmt(n, 1) + ' Ha'; }, cls: 'gold' },
        { val: kpis.other_area_ha ? kpis.other_area_ha.val : 0, chg: kpis.other_area_ha ? kpis.other_area_ha.chg : null, label: 'Other Area', fmt: function (n) { return Data.numFmt(n, 1) + ' Ha'; }, cls: 'purple' },
        { val: kpis.farmers ? kpis.farmers.val : 0, chg: kpis.farmers ? kpis.farmers.chg : null, label: 'Inspected Farmers', fmt: Data.numFmt, cls: 'teal' }
      ];

      items.forEach(function (it) {
        var card = document.createElement('div');
        card.className = 'kpi-card ' + it.cls;
        var chg = '';
        if (it.chg !== null) {
          var isUp = it.chg >= 0;
          chg = '<span class="kpi-change ' + (isUp ? 'up' : 'down') + '">' + (isUp ? '▲' : '▼') + ' ' + (isUp ? '+' : '') + it.chg + '%</span>';
        }
        card.innerHTML =
          '<div class="kpi-label">' + it.label + '</div>' +
          '<div class="kpi-value">' + it.fmt(it.val) + '</div>' +
          '<div class="kpi-footer">' + chg + '<span class="kpi-sub">vs prior period</span></div>';
        targetEl.appendChild(card);
      });
    }

    // Charts
    Charts.renderAreaTrend('chart-area-trend', trend);
    Charts.renderCertTrend('chart-cert-trend', trend);
    Charts.renderLandSit('chart-land-sit', trend);
    Charts.renderLandOwn('chart-land-own', trend);
    Charts.renderIrrigation('chart-irrigation', trend);
  }

  // ── Public Update Dispatcher ─────────────────────────────────
  function update(tabId, state) {
    if (!Data.ready()) return;
    switch (tabId) {
      case 'overview': updateOverview(state); break;
      case 'farmers': updateFarmers(state); break;
      case 'production': updateProduction(state); break;
      case 'market': updateMarket(state); break;
      case 'quality': updateQuality(state); break;
      case 'land': updateLand(state); break;
    }
  }

  return {
    update: update,
  };
})();
