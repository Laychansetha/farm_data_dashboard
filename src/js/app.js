/* ============================================================
   app.js  —  Main controller, router, filtering and tables
   ============================================================ */

(function () {
  'use strict';

  // ── Application State ────────────────────────────────────────
  var state = {
    currentTab: 'overview',
    years: new Set(), // active year filters
    sites: new Set(), // active site filters
    certs: new Set(), // active cert filters
  };

  var mapInstance = null;
  var mapMarkers = [];

  // Table Pagination & Search state
  var tableSearch = '';
  var tableFilterSite = '';
  var tableFilterCert = '';
  var tableFilterGender = '';
  var tableSortCol = 'prod_kg';
  var tableSortDesc = true;
  var tablePage = 1;
  var tablePageSize = 15;

  // ── Initialisation ──────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    // Check if DASHBOARD_DATA is loaded
    if (typeof window.DASHBOARD_DATA === 'undefined') {
      document.getElementById('loading-screen').style.display = 'none';
      document.getElementById('no-data-screen').style.display = 'flex';
      return;
    }

    // Initialize data module
    Data.init(window.DASHBOARD_DATA);
    Charts.initDefaults();

    // Populate initial filter sets with all values
    Data.getAllYears().forEach(function (y) { state.years.add(y); });
    Data.getAllSites().forEach(function (s) { state.sites.add(s); });
    Data.getAllCerts().forEach(function (c) { state.certs.add(c); });

    // Build filter UI dropdown elements
    buildFilterDropdowns();
    updateSidebarMeta();

    // Register handlers
    setupNavigation();
    setupFilters();
    setupRecordsTable();
    setupSidebarToggle();

    // Hide loader
    var loaderBar = document.getElementById('loader-bar');
    if (loaderBar) loaderBar.style.width = '100%';
    setTimeout(function () {
      var screen = document.getElementById('loading-screen');
      if (screen) screen.style.display = 'none';
    }, 400);

    // Initial draw
    refreshCurrentView();
  });

  // ── Sidebar Meta Info ───────────────────────────────────────
  function updateSidebarMeta() {
    var meta = Data.getMeta();
    document.getElementById('sidebar-gen-date').textContent = new Date(meta.generated_at).toLocaleDateString();
    
    var yearsStr = '';
    if (meta.years && meta.years.length > 0) {
      var sortedYears = meta.years.slice().sort();
      yearsStr = sortedYears.length > 1 
        ? sortedYears[0] + '–' + sortedYears[sortedYears.length - 1] 
        : sortedYears[0];
    } else {
      yearsStr = '—';
    }
    document.getElementById('sidebar-years').textContent = yearsStr;
  }

  // ── Sidebar Toggle ──────────────────────────────────────────
  function setupSidebarToggle() {
    var btn = document.getElementById('sidebar-toggle');
    var sidebar = document.getElementById('sidebar');
    if (btn && sidebar) {
      btn.addEventListener('click', function () {
        sidebar.classList.toggle('collapsed');
      });
    }
  }

  // ── Navigation ──────────────────────────────────────────────
  function setupNavigation() {
    var items = document.querySelectorAll('.nav-item');
    items.forEach(function (item) {
      item.addEventListener('click', function () {
        var tabId = this.getAttribute('data-tab');
        if (!tabId) return;

        items.forEach(function (el) { el.classList.remove('active'); });
        this.classList.add('active');

        document.querySelectorAll('.tab-pane').forEach(function (el) {
          el.classList.remove('active');
        });
        document.getElementById('tab-' + tabId).classList.add('active');

        document.getElementById('page-title').textContent = this.getAttribute('title') || this.textContent;

        state.currentTab = tabId;
        refreshCurrentView();
      });
    });
  }

  // ── Filter UI Rendering ─────────────────────────────────────
  function buildFilterDropdowns() {
    // Years
    var yDrop = document.getElementById('fd-year');
    yDrop.innerHTML = '';
    Data.getAllYears().forEach(function (y) {
      var opt = document.createElement('div');
      opt.className = 'filter-option checked';
      opt.innerHTML = '<input type="checkbox" checked data-val="' + y + '"> <span>' + y + '</span>';
      yDrop.appendChild(opt);
    });

    // Sites
    var sDrop = document.getElementById('fd-site');
    sDrop.innerHTML = '';
    Data.getAllSites().forEach(function (s) {
      var opt = document.createElement('div');
      opt.className = 'filter-option checked';
      opt.innerHTML = '<input type="checkbox" checked data-val="' + s + '"> <span>' + s + '</span>';
      sDrop.appendChild(opt);
    });

    // Certs
    var cDrop = document.getElementById('fd-cert');
    cDrop.innerHTML = '';
    Data.getAllCerts().forEach(function (c) {
      var opt = document.createElement('div');
      opt.className = 'filter-option checked';
      opt.innerHTML = '<input type="checkbox" checked data-val="' + c + '"> <span>' + c + '</span>';
      cDrop.appendChild(opt);
    });

    // Rec Table site dropdown options
    var recSiteSel = document.getElementById('rec-filter-site');
    if (recSiteSel) {
      recSiteSel.innerHTML = '<option value="">All Sites</option>';
      Data.getAllSites().forEach(function (s) {
        recSiteSel.innerHTML += '<option value="' + s + '">' + s + '</option>';
      });
    }

    // Rec Table cert dropdown options
    var recCertSel = document.getElementById('rec-filter-cert');
    if (recCertSel) {
      recCertSel.innerHTML = '<option value="">All Certifications</option>';
      Data.getAllCerts().forEach(function (c) {
        recCertSel.innerHTML += '<option value="' + c + '">' + c + '</option>';
      });
    }

    // Rec Table gender options
    var recGenSel = document.getElementById('rec-filter-gender');
    if (recGenSel) {
      recGenSel.innerHTML = '<option value="">All Genders</option>' +
        '<option value="Female">Female</option>' +
        '<option value="Male">Male</option>';
    }
  }

  // ── Filter Interaction logic ────────────────────────────────
  function setupFilters() {
    var dropdowns = ['year', 'site', 'cert'];

    dropdowns.forEach(function (name) {
      var btn = document.getElementById('fb-' + name);
      var drop = document.getElementById('fd-' + name);

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = drop.classList.contains('open');
        closeAllDropdowns();
        if (!open) {
          drop.classList.add('open');
          btn.classList.add('active');
        }
      });

      drop.addEventListener('click', function (e) {
        e.stopPropagation();
      });

      // Handle checkbox change
      drop.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
        cb.addEventListener('change', function () {
          var val = this.getAttribute('data-val');
          var checked = this.checked;
          var opt = this.parentElement;

          if (checked) {
            opt.classList.add('checked');
            state[name + 's'].add(val);
          } else {
            opt.classList.remove('checked');
            state[name + 's'].delete(val);
          }

          updateFilterBadges(name);
          refreshCurrentView();
        });
      });
    });

    document.addEventListener('click', closeAllDropdowns);

    // Reset button
    document.getElementById('btn-reset-filters').addEventListener('click', function () {
      state.years.clear();
      state.sites.clear();
      state.certs.clear();

      Data.getAllYears().forEach(function (y) { state.years.add(y); });
      Data.getAllSites().forEach(function (s) { state.sites.add(s); });
      Data.getAllCerts().forEach(function (c) { state.certs.add(c); });

      dropdowns.forEach(function (name) {
        var drop = document.getElementById('fd-' + name);
        drop.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
          cb.checked = true;
          cb.parentElement.classList.add('checked');
        });
        updateFilterBadges(name);
      });

      refreshCurrentView();
    });
  }

  function closeAllDropdowns() {
    document.querySelectorAll('.filter-dropdown').forEach(function (el) {
      el.classList.remove('open');
    });
    document.querySelectorAll('.filter-btn').forEach(function (el) {
      el.classList.remove('active');
    });
  }

  function updateFilterBadges(name) {
    var all = name === 'year' ? Data.getAllYears() : name === 'site' ? Data.getAllSites() : Data.getAllCerts();
    var set = state[name + 's'];
    var badge = document.getElementById('fb-' + name + '-badge');
    var btn = document.getElementById('fb-' + name);

    if (set.size === all.length) {
      badge.textContent = 'All';
      btn.classList.remove('has-filter');
    } else if (set.size === 0) {
      badge.textContent = 'None';
      btn.classList.add('has-filter');
    } else {
      badge.textContent = set.size;
      btn.classList.add('has-filter');
    }
  }

  // ── Dispatch Update for Active Tab ──────────────────────────
  function refreshCurrentView() {
    Views.update(state.currentTab, state);

    if (state.currentTab === 'geography') {
      updateGeography();
    } else if (state.currentTab === 'records') {
      updateRecords();
    }
  }

  // ── Leaflet Map logic ───────────────────────────────────────
  function updateGeography() {
    // Initialise map if not done
    if (!mapInstance) {
      // Centered on Cambodia Siem Pang/Preah Vihear region
      mapInstance = L.map('leaflet-map').setView([13.6, 106.0], 7.5);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstance);
    }

    // Clear existing markers
    mapMarkers.forEach(function (m) { mapInstance.removeLayer(m); });
    mapMarkers = [];

    var summary = Data.getSiteSummary();
    var maxFarmers = Math.max.apply(null, Object.values(summary).map(function (s) { return s.total_farmers; })) || 1;

    Object.keys(summary).forEach(function (name) {
      var d = summary[name];
      var c = Charts.SITE_COLORS[name] || '#6B7280';
      
      // Calculate scaled radius
      var rad = 10 + (d.total_farmers / maxFarmers) * 20;

      var marker = L.circleMarker([d.lat, d.lng], {
        radius: rad,
        fillColor: c,
        fillOpacity: 0.6,
        color: '#07091A',
        weight: 1.5
      }).addTo(mapInstance);

      var popupHtml = '<strong>Site: ' + name + '</strong><br>' +
        'Village count: ' + d.total_villages + '<br>' +
        'Active Farmers: ' + d.total_farmers.toLocaleString() + '<br>' +
        'Total Prod: ' + Data.kgFmt(d.prod_kg) + '<br>' +
        'Compliance: ' + Data.pctFmt(d.compliance_rate);

      marker.bindPopup(popupHtml);

      marker.on('click', function () {
        showSiteSidebar(name, d);
      });

      mapMarkers.push(marker);
    });

    // Compare chart below map
    Charts.renderSiteComparison('chart-site-comparison', Data.getSiteTotals(state));
  }

  function showSiteSidebar(name, d) {
    document.getElementById('geo-site-name').textContent = name;
    var badge = document.getElementById('geo-site-badge');
    badge.className = 'chart-badge';
    // set site color to badge border/text
    var col = Charts.SITE_COLORS[name] || '#6B7280';
    badge.style.background = col + '20';
    badge.style.color = col;
    badge.textContent = 'Active Site';

    // Show dynamic sections
    document.getElementById('geo-village-section').style.display = 'block';
    document.getElementById('geo-trend-section').style.display = 'block';
    document.getElementById('geo-village-count').textContent = '(' + (d.total_villages || 0) + ')';

    var kpis = document.getElementById('geo-site-kpis');
    kpis.innerHTML = 
      '<div class="geo-kpi-item"><div class="geo-kpi-label">Active Farmers</div><div class="geo-kpi-val">' + d.total_farmers.toLocaleString() + '</div></div>' +
      '<div class="geo-kpi-item" style="flex-direction:column; align-items:stretch; gap:6px;">' +
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<div class="geo-kpi-label">Farmland Area</div>' +
          '<div class="geo-kpi-val">' + d.area_ha.toLocaleString() + ' Ha</div>' +
        '</div>' +
        '<div class="geo-land-progress-bar" style="display:flex; height:6px; border-radius:3px; overflow:hidden; margin:4px 0; background:rgba(255,255,255,0.1);">' +
          '<div style="width:' + ((d.planted_area_ha / d.area_ha * 100) || 0) + '%; background:#00D4A8;" title="Planted"></div>' +
          '<div style="width:' + ((d.fallow_area_ha / d.area_ha * 100) || 0) + '%; background:#F59E0B;" title="Fallow"></div>' +
          '<div style="width:' + ((d.other_area_ha / d.area_ha * 100) || 0) + '%; background:#A78BFA;" title="Other"></div>' +
        '</div>' +
        '<div class="geo-land-legend" style="display:flex; flex-direction:column; gap:4px; font-size:0.72rem; color:var(--text-2); margin-top:2px;">' +
          '<div style="display:flex; justify-content:space-between;"><span><span style="display:inline-block; width:6px; height:6px; background:#00D4A8; border-radius:50%; margin-right:6px;"></span>Planted Area:</span><span class="fw-600" style="color:var(--text-1);">' + (d.planted_area_ha || 0).toLocaleString() + ' Ha</span></div>' +
          '<div style="display:flex; justify-content:space-between;"><span><span style="display:inline-block; width:6px; height:6px; background:#F59E0B; border-radius:50%; margin-right:6px;"></span>Fallow Area:</span><span class="fw-600" style="color:var(--text-1);">' + (d.fallow_area_ha || 0).toLocaleString() + ' Ha</span></div>' +
          '<div style="display:flex; justify-content:space-between;"><span><span style="display:inline-block; width:6px; height:6px; background:#A78BFA; border-radius:50%; margin-right:6px;"></span>Other Area:</span><span class="fw-600" style="color:var(--text-1);">' + (d.other_area_ha || 0).toLocaleString() + ' Ha</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="geo-kpi-item"><div class="geo-kpi-label">Paddy Yield</div><div class="geo-kpi-val">' + d.avg_yield.toLocaleString() + ' Kg/Ha</div></div>' +
      '<div class="geo-kpi-item"><div class="geo-kpi-label">Program Revenue</div><div class="geo-kpi-val">' + Data.rielFmt(d.purch_riel) + '</div></div>';

    // List villages in site
    var vList = document.getElementById('geo-village-list');
    vList.innerHTML = '';
    var vData = Data.getVillageStats(state).filter(function (v) { return v.site === name; });
    vData.forEach(function (v) {
      vList.innerHTML += '<div class="geo-village-item">' + v.village + ' <span>' + v.total_farmers + ' farmers</span></div>';
    });

    // Render Farmer Trend for this site
    var siteYears = Data.raw().site_year[name];
    if (siteYears) {
      Charts.renderMiniSiteTrend('chart-geo-site-trend', name, siteYears);
    }
  }

  // ── Farmer Record Table ─────────────────────────────────────
  function setupRecordsTable() {
    // Search
    document.getElementById('records-search').addEventListener('input', function () {
      tableSearch = this.value;
      tablePage = 1;
      updateRecords();
    });

    // Toolbar filters
    document.getElementById('rec-filter-site').addEventListener('change', function () {
      tableFilterSite = this.value;
      tablePage = 1;
      updateRecords();
    });
    document.getElementById('rec-filter-cert').addEventListener('change', function () {
      tableFilterCert = this.value;
      tablePage = 1;
      updateRecords();
    });
    document.getElementById('rec-filter-gender').addEventListener('change', function () {
      tableFilterGender = this.value;
      tablePage = 1;
      updateRecords();
    });

    // Column sorting headers
    document.querySelectorAll('#records-table th.sortable').forEach(function (th) {
      th.addEventListener('click', function () {
        var col = this.getAttribute('data-col');
        if (tableSortCol === col) {
          tableSortDesc = !tableSortDesc;
        } else {
          tableSortCol = col;
          tableSortDesc = true;
        }
        
        document.querySelectorAll('#records-table th').forEach(function (el) {
          el.classList.remove('sort-asc', 'sort-desc');
        });
        this.classList.add(tableSortDesc ? 'sort-desc' : 'sort-asc');

        updateRecords();
      });
    });

    // Set initial sort class
    var initialTh = document.querySelector('#records-table th[data-col="' + tableSortCol + '"]');
    if (initialTh) {
      initialTh.classList.add(tableSortDesc ? 'sort-desc' : 'sort-asc');
    }

    // Export button
    document.getElementById('btn-export-csv').addEventListener('click', exportCSV);

    // Modal Close
    document.getElementById('modal-close').addEventListener('click', function () {
      document.getElementById('farmer-modal').style.display = 'none';
    });
  }

  // Helper for empty/incomplete field fallback
  function fallback(val, suffix) {
    if (val == null || val === '' || val === 'Unknown') return '—';
    return val + (suffix || '');
  }

  function updateRecords() {
    var data = Data.getFarmerRecords(state, tableSearch, tableFilterSite, tableFilterCert, tableFilterGender);

    // Sort
    data.sort(function (a, b) {
      var valA = a[tableSortCol];
      var valB = b[tableSortCol];
      if (valA == null) return tableSortDesc ? 1 : -1;
      if (valB == null) return tableSortDesc ? -1 : 1;
      if (valA < valB) return tableSortDesc ? 1 : -1;
      if (valA > valB) return tableSortDesc ? -1 : 1;
      return 0;
    });

    // Count badge
    document.getElementById('records-count').textContent = data.length.toLocaleString() + ' farmers matching';

    // Pagination bounds
    var totalPages = Math.ceil(data.length / tablePageSize) || 1;
    if (tablePage > totalPages) tablePage = totalPages;
    var startIdx = (tablePage - 1) * tablePageSize;
    var pageData = data.slice(startIdx, startIdx + tablePageSize);

    // Render tbody
    var tbody = document.getElementById('records-tbody');
    tbody.innerHTML = '';
    if (!pageData.length) {
      tbody.innerHTML = '<tr><td colspan="13" class="empty-state">No farmers match the current filter selection</td></tr>';
    } else {
      pageData.forEach(function (f) {
        var tr = document.createElement('tr');
        var certCls = f.latest_cert ? 'cert-' + f.latest_cert.replace(' ', '-') : 'cert-Unknown';
        tr.innerHTML = 
          '<td class="fw-700 text-blue">' + fallback(f.uid) + '</td>' +
          '<td>' + fallback(f.site) + '</td>' +
          '<td>' + fallback(f.village) + '</td>' +
          '<td>' + fallback(f.gender) + '</td>' +
          '<td>' + fallback(f.first_year) + '</td>' +
          '<td>' + (f.years_count ? f.years_count + ' years' : '—') + '</td>' +
          '<td>' + (f.insp_total != null ? f.insp_total : '—') + '</td>' +
          '<td>' + (f.compliance !== null ? f.compliance + '%' : '—') + '</td>' +
          '<td>' + (f.area_ha != null ? f.area_ha.toFixed(2) + ' Ha' : '—') + '</td>' +
          '<td>' + (f.prod_kg != null ? Data.numFmt(f.prod_kg) + ' Kg' : '—') + '</td>' +
          '<td>' + (f.purch_riel != null ? Data.rielFmt(f.purch_riel) : '—') + '</td>' +
          '<td><span class="cert-badge ' + certCls + '">' + (f.latest_cert || 'Unknown') + '</span></td>' +
          '<td><button class="action-btn" data-uid="' + f.uid + '" title="View Profile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button></td>';
        
        tr.querySelector('.action-btn').addEventListener('click', function () {
          openFarmerModal(f);
        });

        tbody.appendChild(tr);
      });
    }

    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    var container = document.getElementById('records-pagination');
    if (!container) return;
    container.innerHTML = '';

    var start = (tablePage - 1) * tablePageSize + 1;
    var total = Data.getFarmerRecords(state, tableSearch, tableFilterSite, tableFilterCert, tableFilterGender).length;
    var end = Math.min(start + tablePageSize - 1, total);

    var label = document.createElement('div');
    label.className = 'pagination-info';
    label.textContent = total ? 'Showing ' + start + '–' + end + ' of ' + total + ' farmers' : 'No records';
    container.appendChild(label);

    var btns = document.createElement('div');
    btns.className = 'pagination-btns';

    // Prev
    var prev = document.createElement('button');
    prev.className = 'page-btn';
    prev.innerHTML = '←';
    prev.disabled = tablePage === 1;
    prev.addEventListener('click', function () { tablePage--; updateRecords(); });
    btns.appendChild(prev);

    // Dynamic page links
    var maxLinks = 5;
    var startLink = Math.max(1, tablePage - Math.floor(maxLinks / 2));
    var endLink = Math.min(totalPages, startLink + maxLinks - 1);
    if (endLink - startLink < maxLinks - 1) {
      startLink = Math.max(1, endLink - maxLinks + 1);
    }

    for (var i = startLink; i <= endLink; i++) {
      var link = document.createElement('button');
      link.className = 'page-btn ' + (i === tablePage ? 'active' : '');
      link.textContent = i;
      (function (page) {
        link.addEventListener('click', function () { tablePage = page; updateRecords(); });
      })(i);
      btns.appendChild(link);
    }

    // Next
    var next = document.createElement('button');
    next.className = 'page-btn';
    next.innerHTML = '→';
    next.disabled = tablePage === totalPages;
    next.addEventListener('click', function () { tablePage++; updateRecords(); });
    btns.appendChild(next);

    container.appendChild(btns);
  }

  // ── Profile Detail Modal ────────────────────────────────────
  function openFarmerModal(f) {
    document.getElementById('modal-farmer-id').textContent = 'Profile: ' + fallback(f.uid);
    var gender = fallback(f.gender);
    var familyId = fallback(f.family_id);
    var village = fallback(f.village);
    var site = fallback(f.site);
    document.getElementById('modal-farmer-meta').textContent = gender + ' | Family ID: ' + familyId + ' | ' + village + ', ' + site;

    var mk = document.getElementById('modal-kpis');
    mk.innerHTML = 
      '<div class="modal-kpi"><div class="modal-kpi-val">' + Data.kgFmt(f.prod_kg) + '</div><div class="modal-kpi-label">Cumulative Prod</div></div>' +
      '<div class="modal-kpi-val modal-kpi"><div class="modal-kpi-val">' + Data.rielFmt(f.purch_riel) + '</div><div class="modal-kpi-label">Cumulative Income</div></div>' +
      '<div class="modal-kpi"><div class="modal-kpi-val">' + (f.area_ha != null ? f.area_ha.toFixed(2) + ' Ha' : '—') + '</div><div class="modal-kpi-label">Inspected Area</div><div class="modal-kpi-sub text-muted" style="font-size:0.75rem; margin-top:4px; line-height:1.2;">Planted: ' + (f.planted_area_ha != null ? f.planted_area_ha.toFixed(2) : '0.00') + ' Ha<br>Fallow: ' + (f.fallow_area_ha != null ? f.fallow_area_ha.toFixed(2) : '0.00') + ' Ha<br>Other: ' + (f.other_area_ha != null ? f.other_area_ha.toFixed(2) : '0.00') + ' Ha</div></div>';

    // Cert History Timeline
    var timeline = document.getElementById('modal-cert-timeline');
    timeline.innerHTML = '';
    // Query inspections matching farmer uid
    var inspections = Data.raw().farmer_records.filter(function(fr){return fr.uid === f.uid;})[0];
    if (inspections && inspections.certs && inspections.certs.length > 0) {
      f.certs.forEach(function (c) {
        var tb = document.createElement('span');
        tb.className = 'cert-year-badge cert-' + c.replace(' ', '-');
        tb.textContent = c;
        timeline.appendChild(tb);
      });
    } else {
      timeline.innerHTML = '<span class="text-muted">No certification history recorded</span>';
    }

    // Varieties tag list
    var varWrap = document.getElementById('modal-varieties');
    varWrap.innerHTML = '';
    if (f.varieties && f.varieties.length > 0) {
      f.varieties.forEach(function (v) {
        varWrap.innerHTML += '<span class="tag">' + v + '</span>';
      });
    } else {
      varWrap.innerHTML = '<span class="text-muted">No crop varieties recorded</span>';
    }

    // Active years
    var yrsWrap = document.getElementById('modal-years');
    yrsWrap.innerHTML = '';
    if (f.years && f.years.length > 0) {
      f.years.forEach(function (y) {
        yrsWrap.innerHTML += '<span class="tag year">' + y + '</span>';
      });
    } else {
      yrsWrap.innerHTML = '<span class="text-muted">No active years recorded</span>';
    }

    document.getElementById('farmer-modal').style.display = 'flex';
  }

  // ── CSV Export ──────────────────────────────────────────────
  function exportCSV() {
    var data = Data.getFarmerRecords(state, tableSearch, tableFilterSite, tableFilterCert, tableFilterGender);
    if (!data.length) return;

    var headers = ['Farmer UID', 'Family ID', 'Site', 'Village', 'Gender', 'First Seen', 'Years Active', 'Inspections', 'Compliance', 'Farmland Area (Ha)', 'Total Production (Kg)', 'Total Revenue (KHR)', 'Latest Cert'];
    
    var csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += headers.join(',') + '\r\n';

    data.forEach(function (f) {
      var row = [
        f.uid, f.family_id, f.site, f.village, f.gender, f.first_year, f.years_count, f.insp_total,
        f.compliance !== null ? f.compliance : '', f.area_ha, f.prod_kg, f.purch_riel, f.latest_cert
      ];
      var rowStr = row.map(function(val) {
        var str = String(val).replace(/"/g, '""');
        return '"' + str + '"';
      }).join(',');
      csvContent += rowStr + '\r\n';
    });

    var encodedUri = encodeURI(csvContent);
    var link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'farm_data_farmer_records.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

})();
