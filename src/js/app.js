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
  var currentSelectedSite = null;

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
      var loader = document.getElementById('loading-screen');
      if (loader) loader.style.display = 'none';
      var noData = document.getElementById('no-data-screen');
      if (noData) noData.style.display = 'flex';
      return;
    }

    // Initialize data module & charts defaults
    Data.init(window.DASHBOARD_DATA);
    Charts.initDefaults();

    // Populate initial filter sets with all available values
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
    setupModalKeyHandlers();

    // Hide loader
    var loaderBar = document.getElementById('loader-bar');
    if (loaderBar) loaderBar.style.width = '100%';
    setTimeout(function () {
      var screen = document.getElementById('loading-screen');
      if (screen) screen.style.display = 'none';
    }, 350);

    // Initial draw
    refreshCurrentView();
  });

  // ── Sidebar Meta Info ───────────────────────────────────────
  function updateSidebarMeta() {
    var meta = Data.getMeta();
    var genEl = document.getElementById('sidebar-gen-date');
    if (genEl && meta.generated_at) {
      genEl.textContent = new Date(meta.generated_at).toLocaleDateString();
    }

    var yearsStr = '—';
    if (meta.years && meta.years.length > 0) {
      var sortedYears = meta.years.slice().sort();
      yearsStr = sortedYears.length > 1
        ? sortedYears[0] + '–' + sortedYears[sortedYears.length - 1]
        : sortedYears[0];
    }
    var yearsEl = document.getElementById('sidebar-years');
    if (yearsEl) yearsEl.textContent = yearsStr;
  }

  // ── Sidebar Toggle ──────────────────────────────────────────
  function setupSidebarToggle() {
    var btn = document.getElementById('sidebar-toggle');
    var sidebar = document.getElementById('sidebar');
    if (btn && sidebar) {
      btn.addEventListener('click', function () {
        sidebar.classList.toggle('collapsed');
        setTimeout(function () {
          window.dispatchEvent(new Event('resize'));
        }, 300);
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
        var targetPane = document.getElementById('tab-' + tabId);
        if (targetPane) targetPane.classList.add('active');

        var pageTitle = document.getElementById('page-title');
        if (pageTitle) {
          pageTitle.textContent = this.getAttribute('title') || this.textContent;
        }

        state.currentTab = tabId;
        refreshCurrentView();

        if (tabId === 'geography' && mapInstance) {
          setTimeout(function () {
            mapInstance.invalidateSize();
          }, 100);
        }
      });
    });
  }

  // ── Filter UI Rendering ─────────────────────────────────────
  function buildFilterDropdowns() {
    buildDropdownContent('year', Data.getAllYears());
    buildDropdownContent('site', Data.getAllSites());
    buildDropdownContent('cert', Data.getAllCerts());

    // Populate Records Table toolbar dropdowns
    var recSiteSel = document.getElementById('rec-filter-site');
    if (recSiteSel) {
      recSiteSel.innerHTML = '<option value="">All Sites</option>';
      Data.getAllSites().forEach(function (s) {
        recSiteSel.innerHTML += '<option value="' + s + '">' + s + '</option>';
      });
    }

    var recCertSel = document.getElementById('rec-filter-cert');
    if (recCertSel) {
      recCertSel.innerHTML = '<option value="">All Certifications</option>';
      Data.getAllCerts().forEach(function (c) {
        recCertSel.innerHTML += '<option value="' + c + '">' + c + '</option>';
      });
    }

    var recGenSel = document.getElementById('rec-filter-gender');
    if (recGenSel) {
      recGenSel.innerHTML = '<option value="">All Genders</option>' +
        '<option value="Female">Female</option>' +
        '<option value="Male">Male</option>';
    }
  }

  function buildDropdownContent(name, allValues) {
    var drop = document.getElementById('fd-' + name);
    if (!drop) return;
    drop.innerHTML = '';

    // Quick Action Bar (Select All / Clear)
    var header = document.createElement('div');
    header.className = 'filter-dropdown-actions';
    header.style.cssText = 'display:flex; justify-content:space-between; padding:6px 10px; border-bottom:1px solid var(--border); margin-bottom:6px; font-size:0.75rem;';

    var allBtn = document.createElement('span');
    allBtn.className = 'filter-action-all text-teal';
    allBtn.style.cssText = 'cursor:pointer; font-weight:600;';
    allBtn.textContent = 'Select All';
    allBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      allValues.forEach(function (val) { state[name + 's'].add(val); });
      drop.querySelectorAll('.filter-option').forEach(function (opt) {
        opt.classList.add('checked');
        var cb = opt.querySelector('input');
        if (cb) cb.checked = true;
      });
      updateFilterBadges(name);
      refreshCurrentView();
    });

    var noneBtn = document.createElement('span');
    noneBtn.className = 'filter-action-none text-muted';
    noneBtn.style.cssText = 'cursor:pointer;';
    noneBtn.textContent = 'Clear';
    noneBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      state[name + 's'].clear();
      drop.querySelectorAll('.filter-option').forEach(function (opt) {
        opt.classList.remove('checked');
        var cb = opt.querySelector('input');
        if (cb) cb.checked = false;
      });
      updateFilterBadges(name);
      refreshCurrentView();
    });

    header.appendChild(allBtn);
    header.appendChild(noneBtn);
    drop.appendChild(header);

    // Filter Options
    allValues.forEach(function (val) {
      var isChecked = state[name + 's'].has(val);
      var opt = document.createElement('div');
      opt.className = 'filter-option' + (isChecked ? ' checked' : '');
      opt.style.cursor = 'pointer';
      opt.innerHTML = '<input type="checkbox" ' + (isChecked ? 'checked' : '') + ' data-val="' + val + '"> <span>' + val + '</span>';

      // Toggle on entire row click
      opt.addEventListener('click', function (e) {
        var cb = opt.querySelector('input[type=checkbox]');
        if (e.target !== cb) {
          cb.checked = !cb.checked;
        }
        var checked = cb.checked;
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

      drop.appendChild(opt);
    });
  }

  // ── Filter Interaction logic ────────────────────────────────
  function setupFilters() {
    var dropdowns = ['year', 'site', 'cert'];

    dropdowns.forEach(function (name) {
      var btn = document.getElementById('fb-' + name);
      var drop = document.getElementById('fd-' + name);
      if (!btn || !drop) return;

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
    });

    document.addEventListener('click', closeAllDropdowns);

    // Global Reset Button
    var resetBtn = document.getElementById('btn-reset-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        state.years.clear();
        state.sites.clear();
        state.certs.clear();

        Data.getAllYears().forEach(function (y) { state.years.add(y); });
        Data.getAllSites().forEach(function (s) { state.sites.add(s); });
        Data.getAllCerts().forEach(function (c) { state.certs.add(c); });

        dropdowns.forEach(function (name) {
          var drop = document.getElementById('fd-' + name);
          if (drop) {
            drop.querySelectorAll('.filter-option').forEach(function (opt) {
              opt.classList.add('checked');
              opt.querySelector('input').checked = true;
            });
          }
          updateFilterBadges(name);
        });

        // Reset records table toolbar filters too
        tableSearch = '';
        tableFilterSite = '';
        tableFilterCert = '';
        tableFilterGender = '';
        var searchInput = document.getElementById('records-search');
        if (searchInput) searchInput.value = '';
        var rSite = document.getElementById('rec-filter-site');
        if (rSite) rSite.value = '';
        var rCert = document.getElementById('rec-filter-cert');
        if (rCert) rCert.value = '';
        var rGen = document.getElementById('rec-filter-gender');
        if (rGen) rGen.value = '';

        refreshCurrentView();
      });
    }
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
    if (!badge || !btn) return;

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
    var mapEl = document.getElementById('leaflet-map');
    if (!mapEl) return;

    // Initialise map if not done
    if (!mapInstance) {
      mapInstance = L.map('leaflet-map').setView([13.6, 106.0], 7.5);
      // Use Esri World Dark Gray Canvas: 100% free, requires NO API key, fits dark theme
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, FAO, NOAA, USGS',
        maxZoom: 16
      }).addTo(mapInstance);

      // Add boundary and place name labels overlay
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        attribution: '',
        maxZoom: 16
      }).addTo(mapInstance);
    }

    setTimeout(function () {
      if (mapInstance) mapInstance.invalidateSize();
    }, 100);

    // Clear existing markers
    mapMarkers.forEach(function (m) { mapInstance.removeLayer(m); });
    mapMarkers = [];

    var summary = Data.getSiteSummary(state);
    var activeSites = Object.keys(summary).filter(function (sn) { return state.sites.has(sn); });
    var maxFarmers = Math.max.apply(null, activeSites.map(function (s) { return summary[s].total_farmers; })) || 1;

    activeSites.forEach(function (name) {
      var d = summary[name];
      var c = Charts.SITE_COLORS[name] || '#6B7280';

      // Calculate scaled radius
      var rad = 10 + (d.total_farmers / maxFarmers) * 20;

      var marker = L.circleMarker([d.lat, d.lng], {
        radius: rad,
        fillColor: c,
        fillOpacity: 0.65,
        color: '#07091A',
        weight: 2
      }).addTo(mapInstance);

      var popupHtml = '<strong>Site: ' + name + '</strong><br>' +
        'Active Farmers: ' + d.total_farmers.toLocaleString() + '<br>' +
        'Farmland: ' + d.area_ha.toLocaleString() + ' Ha<br>' +
        'Paddy Prod: ' + Data.kgFmt(d.prod_kg) + '<br>' +
        'Compliance: ' + Data.pctFmt(d.compliance_rate);

      marker.bindPopup(popupHtml);

      marker.on('click', function () {
        currentSelectedSite = name;
        showSiteSidebar(name, d);
      });

      mapMarkers.push(marker);
    });

    // Auto-select site in sidebar if current selection active or pick largest
    if (activeSites.length > 0) {
      var siteToSelect = (currentSelectedSite && activeSites.indexOf(currentSelectedSite) !== -1)
        ? currentSelectedSite
        : activeSites[0];
      showSiteSidebar(siteToSelect, summary[siteToSelect]);
    } else {
      clearSiteSidebar();
    }

    // Compare chart below map
    Charts.renderSiteComparison('chart-site-comparison', Data.getSiteTotals(state));
  }

  function clearSiteSidebar() {
    var nameEl = document.getElementById('geo-site-name');
    if (nameEl) nameEl.textContent = 'No sites selected';
    var badge = document.getElementById('geo-site-badge');
    if (badge) { badge.textContent = ''; badge.style.display = 'none'; }
    var kpis = document.getElementById('geo-site-kpis');
    if (kpis) kpis.innerHTML = '<div class="text-muted" style="padding:16px;">Select at least one site from the top filter.</div>';
    var vSection = document.getElementById('geo-village-section');
    if (vSection) vSection.style.display = 'none';
    var tSection = document.getElementById('geo-trend-section');
    if (tSection) tSection.style.display = 'none';
  }

  function showSiteSidebar(name, d) {
    if (!d) return;
    document.getElementById('geo-site-name').textContent = name;
    var badge = document.getElementById('geo-site-badge');
    if (badge) {
      badge.style.display = 'inline-block';
      badge.className = 'chart-badge';
      var col = Charts.SITE_COLORS[name] || '#6B7280';
      badge.style.background = col + '20';
      badge.style.color = col;
      badge.textContent = 'Active Site';
    }

    var vSection = document.getElementById('geo-village-section');
    if (vSection) vSection.style.display = 'block';
    var tSection = document.getElementById('geo-trend-section');
    if (tSection) tSection.style.display = 'block';

    var vCount = document.getElementById('geo-village-count');
    if (vCount) vCount.textContent = '(' + (d.total_villages || 0) + ')';

    var kpis = document.getElementById('geo-site-kpis');
    if (kpis) {
      var plantedPct = (d.area_ha ? (d.planted_area_ha / d.area_ha * 100) : 0);
      var fallowPct  = (d.area_ha ? (d.fallow_area_ha / d.area_ha * 100) : 0);
      var otherPct   = (d.area_ha ? (d.other_area_ha / d.area_ha * 100) : 0);

      kpis.innerHTML =
        '<div class="geo-kpi-item"><div class="geo-kpi-label">Active Farmers</div><div class="geo-kpi-val">' + (d.total_farmers || 0).toLocaleString() + '</div></div>' +
        '<div class="geo-kpi-item" style="flex-direction:column; align-items:stretch; gap:6px;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center;">' +
            '<div class="geo-kpi-label">Farmland Area</div>' +
            '<div class="geo-kpi-val">' + (d.area_ha || 0).toLocaleString() + ' Ha</div>' +
          '</div>' +
          '<div class="geo-land-progress-bar" style="display:flex; height:6px; border-radius:3px; overflow:hidden; margin:4px 0; background:rgba(255,255,255,0.1);">' +
            '<div style="width:' + plantedPct + '%; background:#00D4A8;" title="Planted"></div>' +
            '<div style="width:' + fallowPct + '%; background:#F59E0B;" title="Fallow"></div>' +
            '<div style="width:' + otherPct + '%; background:#A78BFA;" title="Other"></div>' +
          '</div>' +
          '<div class="geo-land-legend" style="display:flex; flex-direction:column; gap:4px; font-size:0.72rem; color:var(--text-2); margin-top:2px;">' +
            '<div style="display:flex; justify-content:space-between;"><span><span style="display:inline-block; width:6px; height:6px; background:#00D4A8; border-radius:50%; margin-right:6px;"></span>Planted:</span><span class="fw-600" style="color:var(--text-1);">' + (d.planted_area_ha || 0).toLocaleString() + ' Ha</span></div>' +
            '<div style="display:flex; justify-content:space-between;"><span><span style="display:inline-block; width:6px; height:6px; background:#F59E0B; border-radius:50%; margin-right:6px;"></span>Fallow:</span><span class="fw-600" style="color:var(--text-1);">' + (d.fallow_area_ha || 0).toLocaleString() + ' Ha</span></div>' +
            '<div style="display:flex; justify-content:space-between;"><span><span style="display:inline-block; width:6px; height:6px; background:#A78BFA; border-radius:50%; margin-right:6px;"></span>Other:</span><span class="fw-600" style="color:var(--text-1);">' + (d.other_area_ha || 0).toLocaleString() + ' Ha</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="geo-kpi-item"><div class="geo-kpi-label">Paddy Yield</div><div class="geo-kpi-val">' + (d.avg_yield || 0).toLocaleString() + ' Kg/Ha</div></div>' +
        '<div class="geo-kpi-item"><div class="geo-kpi-label">Program Revenue</div><div class="geo-kpi-val">' + Data.rielFmt(d.purch_riel) + '</div></div>' +
        '<div class="geo-kpi-item"><div class="geo-kpi-label">Compliance Rate</div><div class="geo-kpi-val">' + Data.pctFmt(d.compliance_rate) + '</div></div>';
    }

    // List villages in site
    var vList = document.getElementById('geo-village-list');
    if (vList) {
      vList.innerHTML = '';
      var vData = Data.getVillageStats(state).filter(function (v) { return v.site === name; });
      if (!vData.length) {
        vList.innerHTML = '<div class="text-muted" style="font-size:0.8rem; padding:8px 0;">No active villages recorded for this selection.</div>';
      } else {
        vData.forEach(function (v) {
          vList.innerHTML += '<div class="geo-village-item">' + v.village + ' <span>' + v.total_farmers + ' farmers</span></div>';
        });
      }
    }

    // Render Farmer Trend sparkline for this site
    var raw = Data.raw();
    if (raw && raw.site_year && raw.site_year[name]) {
      Charts.renderMiniSiteTrend('chart-geo-site-trend', name, raw.site_year[name]);
    }
  }

  // ── Farmer Record Table ─────────────────────────────────────
  function setupRecordsTable() {
    var searchInput = document.getElementById('records-search');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        tableSearch = this.value;
        tablePage = 1;
        updateRecords();
      });
    }

    var rSite = document.getElementById('rec-filter-site');
    if (rSite) {
      rSite.addEventListener('change', function () {
        tableFilterSite = this.value;
        tablePage = 1;
        updateRecords();
      });
    }

    var rCert = document.getElementById('rec-filter-cert');
    if (rCert) {
      rCert.addEventListener('change', function () {
        tableFilterCert = this.value;
        tablePage = 1;
        updateRecords();
      });
    }

    var rGen = document.getElementById('rec-filter-gender');
    if (rGen) {
      rGen.addEventListener('change', function () {
        tableFilterGender = this.value;
        tablePage = 1;
        updateRecords();
      });
    }

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

    var initialTh = document.querySelector('#records-table th[data-col="' + tableSortCol + '"]');
    if (initialTh) {
      initialTh.classList.add(tableSortDesc ? 'sort-desc' : 'sort-asc');
    }

    // Export button
    var exportBtn = document.getElementById('btn-export-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportCSV);
    }

    // Modal Close button
    var modalClose = document.getElementById('modal-close');
    if (modalClose) {
      modalClose.addEventListener('click', closeModal);
    }
  }

  function setupModalKeyHandlers() {
    // Backdrop click to close
    var modal = document.getElementById('farmer-modal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === this) closeModal();
      });
    }

    // Escape key to close
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        closeModal();
      }
    });
  }

  function closeModal() {
    var modal = document.getElementById('farmer-modal');
    if (modal) modal.style.display = 'none';
  }

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
      if (typeof valA === 'string') {
        return tableSortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
      }
      if (valA < valB) return tableSortDesc ? 1 : -1;
      if (valA > valB) return tableSortDesc ? -1 : 1;
      return 0;
    });

    var countBadge = document.getElementById('records-count');
    if (countBadge) {
      countBadge.textContent = data.length.toLocaleString() + ' farmers matching';
    }

    // Pagination bounds
    var totalPages = Math.ceil(data.length / tablePageSize) || 1;
    if (tablePage > totalPages) tablePage = totalPages;
    var startIdx = (tablePage - 1) * tablePageSize;
    var pageData = data.slice(startIdx, startIdx + tablePageSize);

    // Render tbody
    var tbody = document.getElementById('records-tbody');
    if (tbody) {
      tbody.innerHTML = '';
      if (!pageData.length) {
        tbody.innerHTML = '<tr><td colspan="13" class="empty-state" style="text-align:center; padding:32px;">No farmers match the current filter selection</td></tr>';
      } else {
        pageData.forEach(function (f) {
          var tr = document.createElement('tr');
          var certCls = f.latest_cert ? 'cert-' + f.latest_cert.replace(/\s+/g, '-') : 'cert-Unknown';
          tr.innerHTML =
            '<td class="fw-700 text-blue">' + fallback(f.uid) + '</td>' +
            '<td>' + fallback(f.site) + '</td>' +
            '<td>' + fallback(f.village) + '</td>' +
            '<td>' + fallback(f.gender) + '</td>' +
            '<td>' + fallback(f.first_year) + '</td>' +
            '<td>' + (f.years_count ? f.years_count + ' yrs' : '—') + '</td>' +
            '<td>' + (f.insp_total != null ? f.insp_total : '—') + '</td>' +
            '<td>' + (f.compliance !== null ? f.compliance + '%' : '—') + '</td>' +
            '<td>' + (f.area_ha != null ? f.area_ha.toFixed(2) + ' Ha' : '—') + '</td>' +
            '<td>' + (f.prod_kg != null ? Data.numFmt(f.prod_kg) + ' Kg' : '—') + '</td>' +
            '<td>' + (f.purch_riel != null ? Data.rielFmt(f.purch_riel) : '—') + '</td>' +
            '<td><span class="cert-badge ' + certCls + '">' + (f.latest_cert || 'Unknown') + '</span></td>' +
            '<td><button class="action-btn" data-uid="' + f.uid + '" title="View Profile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button></td>';

          tr.querySelector('.action-btn').addEventListener('click', function () {
            openFarmerModal(f);
          });

          tbody.appendChild(tr);
        });
      }
    }

    renderPagination(totalPages, data.length);
  }

  function renderPagination(totalPages, totalCount) {
    var container = document.getElementById('records-pagination');
    if (!container) return;
    container.innerHTML = '';

    var start = totalCount ? (tablePage - 1) * tablePageSize + 1 : 0;
    var end = Math.min(start + tablePageSize - 1, totalCount);

    var label = document.createElement('div');
    label.className = 'pagination-info';
    label.textContent = totalCount ? 'Showing ' + start + '–' + end + ' of ' + totalCount.toLocaleString() + ' farmers' : 'No records';
    container.appendChild(label);

    if (totalPages <= 1) return;

    var btns = document.createElement('div');
    btns.className = 'pagination-btns';

    // Prev Button
    var prev = document.createElement('button');
    prev.className = 'page-btn';
    prev.innerHTML = '←';
    prev.disabled = tablePage === 1;
    prev.addEventListener('click', function () { tablePage--; updateRecords(); });
    btns.appendChild(prev);

    // Numbered Links
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

    // Next Button
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
    var titleEl = document.getElementById('modal-farmer-id');
    if (titleEl) titleEl.textContent = 'Farmer Profile: ' + fallback(f.uid);

    var metaEl = document.getElementById('modal-farmer-meta');
    if (metaEl) {
      metaEl.textContent = fallback(f.gender) + ' | Family: ' + fallback(f.family_id) + ' | ' + fallback(f.village) + ', ' + fallback(f.site);
    }

    var mk = document.getElementById('modal-kpis');
    if (mk) {
      mk.innerHTML =
        '<div class="modal-kpi"><div class="modal-kpi-val">' + Data.kgFmt(f.prod_kg) + '</div><div class="modal-kpi-label">Cumulative Prod</div></div>' +
        '<div class="modal-kpi"><div class="modal-kpi-val">' + Data.rielFmt(f.purch_riel) + '</div><div class="modal-kpi-label">Cumulative Payout</div></div>' +
        '<div class="modal-kpi"><div class="modal-kpi-val">' + (f.area_ha != null ? f.area_ha.toFixed(2) + ' Ha' : '—') + '</div><div class="modal-kpi-label">Total Land Area</div><div class="modal-kpi-sub text-muted" style="font-size:0.75rem; margin-top:4px; line-height:1.3;">Planted: ' + (f.planted_area_ha != null ? f.planted_area_ha.toFixed(2) : '0.00') + ' Ha<br>Fallow: ' + (f.fallow_area_ha != null ? f.fallow_area_ha.toFixed(2) : '0.00') + ' Ha</div></div>';
    }

    // Detailed Certification & Production Timeline
    var timeline = document.getElementById('modal-cert-timeline');
    if (timeline) {
      timeline.innerHTML = '';
      if (f.history && Object.keys(f.history).length > 0) {
        var histYears = Object.keys(f.history).sort();
        histYears.forEach(function (y) {
          var h = f.history[y];
          var item = document.createElement('div');
          item.className = 'cert-timeline-row';
          item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 12px; margin-bottom:6px; background:var(--card); border-radius:6px; border:1px solid var(--border); font-size:0.85rem;';
          var certCls = h.cert ? 'cert-' + h.cert.replace(/\s+/g, '-') : 'cert-Organic';
          item.innerHTML =
            '<div style="display:flex; align-items:center; gap:8px;">' +
              '<span class="fw-700 text-teal" style="min-width:40px;">' + y + '</span>' +
              '<span class="cert-year-badge ' + certCls + '">' + (h.cert || 'Organic') + '</span>' +
            '</div>' +
            '<div style="display:flex; gap:14px; color:var(--text-2); font-size:0.8rem;">' +
              '<span>Area: <strong style="color:var(--text);">' + (h.area_ha ? h.area_ha.toFixed(2) + ' Ha' : '—') + '</strong></span>' +
              '<span>Prod: <strong style="color:var(--text);">' + (h.prod_kg ? Data.kgFmt(h.prod_kg) : '—') + '</strong></span>' +
              '<span>Income: <strong style="color:var(--text);">' + (h.purch_riel ? Data.rielFmt(h.purch_riel) : '—') + '</strong></span>' +
            '</div>';
          timeline.appendChild(item);
        });
      } else if (f.certs && f.certs.length > 0) {
        f.certs.forEach(function (c) {
          var tb = document.createElement('span');
          tb.className = 'cert-year-badge cert-' + c.replace(/\s+/g, '-');
          tb.textContent = c;
          timeline.appendChild(tb);
        });
      } else {
        timeline.innerHTML = '<span class="text-muted">No certification history recorded</span>';
      }
    }

    // Varieties tag list
    var varWrap = document.getElementById('modal-varieties');
    if (varWrap) {
      varWrap.innerHTML = '';
      if (f.varieties && f.varieties.length > 0) {
        f.varieties.forEach(function (v) {
          varWrap.innerHTML += '<span class="tag">' + v + '</span>';
        });
      } else {
        varWrap.innerHTML = '<span class="text-muted">No crop varieties recorded</span>';
      }
    }

    // Active years
    var yrsWrap = document.getElementById('modal-years');
    if (yrsWrap) {
      yrsWrap.innerHTML = '';
      if (f.years && f.years.length > 0) {
        f.years.forEach(function (y) {
          yrsWrap.innerHTML += '<span class="tag year">' + y + '</span>';
        });
      } else {
        yrsWrap.innerHTML = '<span class="text-muted">No active years recorded</span>';
      }
    }

    var modal = document.getElementById('farmer-modal');
    if (modal) modal.style.display = 'flex';
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
      var rowStr = row.map(function (val) {
        var str = String(val == null ? '' : val).replace(/"/g, '""');
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
