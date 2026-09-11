/**
 * ORE FINDER-AI: Core Application Controller
 * Manages state, API communication, tab transitions, mine switching,
 * alert tickers, modals, and cross-module synchronization.
 */

class AppController {
  constructor() {
    this.activeMineId = 'balaghat';
    this.currentMineData = null;
    this.cachedSatellite = null;
    this.cachedBoreholes = null;
    this.cachedVoxels = null;
    this.cachedShortfall = null;
  }

  async init() {
    this.initUserProfile();
    this.bindTabNavigation();
    this.bindMineSelector();
    this.bindModal();
    this.initGlobalHandlers();

    // Load initial mine data
    await this.loadMineData(this.activeMineId);
  }

  initUserProfile() {
    const user = window.AuthService ? window.AuthService.getCurrentUser() : null;
    if (user) {
      const nameEl = document.getElementById('userHeaderName');
      const roleEl = document.getElementById('userHeaderRole');
      if (nameEl) nameEl.textContent = user.name.split(' ')[0] + ' ' + (user.name.split(' ')[1] || '');
      if (roleEl) roleEl.textContent = user.id;
    }

    const btnSignOut = document.getElementById('btnSignOut');
    if (btnSignOut && window.AuthService) {
      btnSignOut.addEventListener('click', () => {
        if (confirm('Sign out of ORE FINDER-AI session?')) {
          window.AuthService.logout();
        }
      });
    }
  }

  bindTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const targetId = btn.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');

        // Toggle contextual options in left section
        document.querySelectorAll('.left-context-panel').forEach(p => p.classList.remove('active'));
        const contextPanel = document.getElementById(targetId + '-options');
        if (contextPanel) contextPanel.classList.add('active');

        // Trigger resize on dynamic canvases after DOM paint
        setTimeout(() => {
          if (targetId === 'tab-space' && window.satelliteMap) {
            window.satelliteMap.invalidateSize();
          } else if (targetId === 'tab-3d' && window.subsurface3D) {
            window.subsurface3D.onResize();
          }
        }, 60);
      });
    });
  }

  bindMineSelector() {
    const selector = document.getElementById('mineSelector');
    if (selector) {
      selector.addEventListener('change', async (e) => {
        this.activeMineId = e.target.value;
        const mineName = selector.options[selector.selectedIndex] ? selector.options[selector.selectedIndex].text : this.activeMineId;
        if (window.showToast) {
          window.showToast(`Loading geological model for ${mineName}...`, 'info');
        }
        await this.loadMineData(this.activeMineId);
      });
    }
  }

  bindModal() {
    const modal = document.getElementById('detailModal');
    const closeBtn = document.getElementById('btnModalClose');
    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    }
  }

  initGlobalHandlers() {
    window.appState = this;

    // Toast notification utility
    window.showToast = (msg, type = 'info') => {
      const container = document.getElementById('toastContainer');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = 'toast';
      let icon = 'fa-info-circle';
      if (type === 'success') icon = 'fa-circle-check';
      if (type === 'error') icon = 'fa-triangle-exclamation';

      toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${msg}</span>`;
      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    };

    this.showToast = window.showToast;

    // Modal popup utilities
    window.showBoreholeDetail = (bh) => {
      const modal = document.getElementById('detailModal');
      const title = document.getElementById('modalTitle');
      const body = document.getElementById('modalBody');

      title.innerHTML = `<i class="fa-solid fa-gem"></i> Borehole Log: ${bh.id} (${bh.fence})`;
      body.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: var(--bg-tertiary); padding: 12px; border-radius: var(--radius-sm);">
            <div><strong>Collar Elevation:</strong> ${bh.collar_elevation_m}m</div>
            <div><strong>Total Core Depth:</strong> ${bh.total_depth_m}m</div>
            <div><strong>Ore Interval:</strong> ${bh.ore_from_m}m to ${bh.ore_to_m}m (${bh.ore_thickness_m}m true thickness)</div>
            <div><strong>Inclination / Dip:</strong> ${bh.dip}° (Azimuth ${bh.azimuth}°)</div>
          </div>

          <h4 style="color: var(--accent-orange); margin-top: 6px;">Chemical Assay Chemistry</h4>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center;">
            <div style="background: var(--bg-secondary); padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.7rem; color: var(--text-muted);">Manganese (Mn)</div>
              <div style="font-size: 1.1rem; font-weight: 700; color: var(--accent-orange);">${bh.assays.mn_pct}%</div>
            </div>
            <div style="background: var(--bg-secondary); padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.7rem; color: var(--text-muted);">Iron (Fe)</div>
              <div style="font-size: 1.1rem; font-weight: 700; color: #fff;">${bh.assays.fe_pct}%</div>
            </div>
            <div style="background: var(--bg-secondary); padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.7rem; color: var(--text-muted);">Silica (SiO₂)</div>
              <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">${bh.assays.sio2_pct}%</div>
            </div>
            <div style="background: var(--bg-secondary); padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.7rem; color: var(--text-muted);">Phosphorus (P)</div>
              <div style="font-size: 1.1rem; font-weight: 700; color: ${bh.assays.p_pct > 0.12 ? 'var(--accent-amber)' : 'var(--accent-emerald)'};">${bh.assays.p_pct}%</div>
            </div>
          </div>

          <h4 style="color: var(--accent-orange); margin-top: 6px;">Core Lithology Stratigraphy</h4>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${bh.lithology.map(l => `
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 4px;">
                <span>${l.from}m - ${l.to}m: <strong>${l.rock}</strong></span>
                <span style="color: var(--accent-orange); font-weight: 600;">${l.grade}% Mn</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      modal.style.display = 'flex';
    };

    window.showAnomalyDetail = (anom) => {
      const modal = document.getElementById('detailModal');
      const title = document.getElementById('modalTitle');
      const body = document.getElementById('modalBody');

      title.innerHTML = `<i class="fa-solid fa-satellite"></i> Space Anomaly: ${anom.id}`;
      body.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div><strong style="color: var(--accent-orange); font-size: 1rem;">${anom.name}</strong></div>
          <div><strong>Spectral Signature:</strong> ${anom.signature}</div>
          <div><strong>Estimated Ore Grade:</strong> <span style="color: var(--accent-orange); font-weight: 700;">${anom.estimated_grade}</span></div>
          <div><strong>AI Confidence Level:</strong> <span style="color: var(--accent-emerald); font-weight: 700;">${anom.confidence}%</span></div>
          <div><strong>Recommended Operational Action:</strong> ${anom.status}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Coordinates: Lat ${anom.lat}, Lon ${anom.lon} (Sausar Gondite Formation)</div>
        </div>
      `;
      modal.style.display = 'flex';
    };

    window.showVoxelDetail = (vox) => {
      const modal = document.getElementById('detailModal');
      const title = document.getElementById('modalTitle');
      const body = document.getElementById('modalBody');

      title.innerHTML = `<i class="fa-solid fa-cube"></i> Subsurface Voxel Block [${vox.x}m, ${vox.y}m, ${vox.z}m]`;
      body.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Manganese Grade:</span>
            <strong style="color: var(--accent-orange); font-size: 1.1rem;">${vox.mn}% Mn</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Category:</span>
            <strong style="color: var(--accent-amber);">${vox.category}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>UNFC Classification:</span>
            <strong style="color: var(--accent-emerald);">${vox.unfc}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Block Volume / Tonnage:</span>
            <strong>${vox.tonnes.toLocaleString()} Tonnes (@ ${vox.density} t/m³)</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Exploration Confidence:</span>
            <span>${vox.confidence}</span>
          </div>
        </div>
      `;
      modal.style.display = 'flex';
    };
  }

  async loadMineData(mineId) {
    try {
      // 1. Fetch satellite & geological indices
      const satRes = window.apiClient ? await window.apiClient.get(`/satellite-layers?mine=${mineId}`) : await fetch(`/api/satellite-layers?mine=${mineId}`).then(r => r.json());
      this.cachedSatellite = satRes.data;
      this.currentMineData = this.cachedSatellite ? this.cachedSatellite.mine : null;

      // 2. Fetch boreholes
      const bhRes = window.apiClient ? await window.apiClient.get(`/boreholes?mine=${mineId}`) : await fetch(`/api/boreholes?mine=${mineId}`).then(r => r.json());
      this.cachedBoreholes = bhRes.boreholes;

      // 3. Fetch 3D voxel block model
      const voxRes = window.apiClient ? await window.apiClient.get(`/reserves-3d?mine=${mineId}&cutoff=35`) : await fetch(`/api/reserves-3d?mine=${mineId}&cutoff=35`).then(r => r.json());
      this.cachedVoxels = voxRes.data;

      // 4. Fetch production & shortfall prediction
      const sfRes = window.apiClient ? await window.apiClient.get(`/shortfall-forecast?mine=${mineId}`) : await fetch(`/api/shortfall-forecast?mine=${mineId}`).then(r => r.json());
      this.cachedShortfall = sfRes.data;

      // Update Top KPIs
      this.updateKPIs();

      // Update Satellite GIS Map
      if (window.satelliteMap) {
        window.satelliteMap.initMap();
        window.satelliteMap.updateData(this.cachedSatellite, this.cachedBoreholes);
      }

      // Update 3D Subsurface Block Model
      if (window.subsurface3D) {
        window.subsurface3D.updateData(this.cachedVoxels, this.cachedBoreholes);
      }

      // Update Borehole Sidebar List
      this.renderBoreholeSidebarList();

      // Update Shortfall & Fleet Telemetry
      if (window.shortfallPredictor) {
        window.shortfallPredictor.updateData(this.cachedShortfall);
      }

      // Update Alert Ticker
      this.updateAlertTicker();

      // Run initial prescriptive optimization
      if (window.prescriptiveOptimizer) {
        await window.prescriptiveOptimizer.runSimulation();
      }

    } catch (err) {
      console.warn('Network call failed, applying embedded model fallback:', err);
      if (window.PRAGYA_ALL_DATA && (window.PRAGYA_ALL_DATA[mineId] || window.PRAGYA_ALL_DATA['balaghat'])) {
        const fallback = window.PRAGYA_ALL_DATA[mineId] || window.PRAGYA_ALL_DATA['balaghat'];
        this.cachedSatellite = fallback.satellite;
        this.currentMineData = fallback.satellite.mine;
        this.cachedBoreholes = fallback.boreholes;
        this.cachedVoxels = fallback.voxels;
        this.cachedShortfall = fallback.shortfall;

        this.updateKPIs();
        if (window.satelliteMap) {
          window.satelliteMap.initMap();
          window.satelliteMap.updateData(this.cachedSatellite, this.cachedBoreholes);
        }
        if (window.subsurface3D) {
          window.subsurface3D.updateData(this.cachedVoxels, this.cachedBoreholes);
        }
        this.renderBoreholeSidebarList();
        if (window.shortfallPredictor) {
          window.shortfallPredictor.updateData(this.cachedShortfall);
        }
        this.updateAlertTicker();
        if (window.prescriptiveOptimizer) {
          await window.prescriptiveOptimizer.runSimulation();
        }
      } else {
        if (window.showToast) {
          window.showToast('Network error loading mine data', 'error');
        }
      }
    }
  }

  updateKPIs() {
    const mine = this.currentMineData;
    if (!mine) return;

    const resVal = document.getElementById('kpiReservesVal');
    const resSub = document.getElementById('kpiReservesSub');
    const grVal = document.getElementById('kpiGradeVal');
    const grSub = document.getElementById('kpiGradeSub');
    const tarVal = document.getElementById('kpiTargetVal');
    const riskVal = document.getElementById('kpiRiskVal');
    const riskSub = document.getElementById('kpiRiskSub');

    if (resVal) resVal.textContent = `${mine.total_reserves_mt} MT`;
    if (resSub) resSub.textContent = `Type: ${mine.type}`;
    if (grVal) grVal.textContent = `${mine.avg_grade_mn}% Mn`;
    if (grSub) grSub.textContent = mine.primary_ore;
    if (tarVal) tarVal.textContent = `${mine.daily_target_tonnes.toLocaleString()} TPD`;
    if (riskVal) riskVal.textContent = mine.current_shortfall_risk.split(' ')[0];
    if (riskSub) riskSub.textContent = mine.current_shortfall_risk;

    const stratText = document.getElementById('geoStratigraphyText');
    if (stratText) stratText.textContent = mine.host_rock + '. ' + mine.description;
  }

  renderBoreholeSidebarList() {
    const container = document.getElementById('boreholeListContainer');
    if (!container || !this.cachedBoreholes) return;

    container.innerHTML = this.cachedBoreholes.map(bh => `
      <div class="borehole-card" onclick="window.showBoreholeDetail(window.appState.cachedBoreholes.find(b => b.id === '${bh.id}'))">
        <div class="borehole-header">
          <span>${bh.id}</span>
          <span style="color: var(--accent-orange); font-weight: 700;">${bh.assays.mn_pct}% Mn</span>
        </div>
        <div class="borehole-meta">
          <span>Depth: ${bh.total_depth_m}m (${bh.ore_thickness_m}m Ore)</span>
          <span style="color: var(--text-muted);">${bh.fence}</span>
        </div>
      </div>
    `).join('');
  }

  updateAlertTicker() {
    const ticker = document.getElementById('alertTickerContent');
    if (!ticker || !this.cachedShortfall) return;

    const env = this.cachedShortfall.environmental_telemetry;
    const mine = this.currentMineData;
    ticker.innerHTML = `
      <strong>${mine.name}:</strong> 
      Rainfall Rate: ${env.current_rainfall_rate_mm_hr} mm/hr | 
      Pit Sump Water: ${env.pit_sump_water_level_m}m (Threshold: ${env.pit_sump_critical_threshold_m}m) | 
      Dewatering Pumps: ${env.dewatering_pumps_active} Active (${env.dewatering_pumps_capacity_m3_hr} m³/hr) | 
      Haul Road Friction: ${env.haul_road_friction_index} | 
      ${this.cachedShortfall.shortfall_summary.primary_driver}
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new AppController();
  app.init();
});
