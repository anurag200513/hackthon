/**
 * MOIL-PRAGYA: Prescriptive Action Optimizer & What-If Sandbox
 * Solves fleet rerouting, blast rescheduling, and linear programming stockpile blending
 * to neutralize ore production shortfalls.
 */

class PrescriptiveOptimizerEngine {
  constructor() {
    this.simWeather = 1.0;
    this.simShovel = 0;
    this.simBlasting = 0;
    this.simGradeTarget = 42.5;
    this.bindEvents();
  }

  bindEvents() {
    // Weather slider
    const weatherSlider = document.getElementById('simWeatherSlider');
    const weatherLabel = document.getElementById('simWeatherLabel');
    if (weatherSlider) {
      weatherSlider.addEventListener('input', (e) => {
        this.simWeather = parseFloat(e.target.value);
        const mm = Math.round(this.simWeather * 15);
        if (weatherLabel) {
          weatherLabel.textContent = `${this.simWeather.toFixed(1)}x (${mm}mm Rainfall)`;
        }
      });
    }

    // Shovel breakdown slider
    const shovelSlider = document.getElementById('simShovelSlider');
    const shovelLabel = document.getElementById('simShovelLabel');
    if (shovelSlider) {
      shovelSlider.addEventListener('input', (e) => {
        this.simShovel = parseInt(e.target.value);
        if (shovelLabel) {
          shovelLabel.textContent = `${this.simShovel} Shovels Down`;
        }
      });
    }

    // Blasting postponement slider
    const blastSlider = document.getElementById('simBlastingSlider');
    const blastLabel = document.getElementById('simBlastingLabel');
    if (blastSlider) {
      blastSlider.addEventListener('input', (e) => {
        this.simBlasting = parseInt(e.target.value);
        if (blastLabel) {
          blastLabel.textContent = `${this.simBlasting} Days Postponed`;
        }
      });
    }

    // Customer grade slider
    const gradeSlider = document.getElementById('simGradeTargetSlider');
    const gradeLabel = document.getElementById('simGradeTargetLabel');
    if (gradeSlider) {
      gradeSlider.addEventListener('input', (e) => {
        this.simGradeTarget = parseFloat(e.target.value);
        if (gradeLabel) {
          gradeLabel.textContent = `${this.simGradeTarget.toFixed(1)}% Mn`;
        }
      });
    }

    // Run Simulation Button
    const runBtn = document.getElementById('btnRunSimulation');
    if (runBtn) {
      runBtn.addEventListener('click', () => this.runSimulation());
    }
  }

  async runSimulation() {
    const activeMine = window.appState ? window.appState.activeMineId : 'balaghat';
    const targetTonnes = window.appState && window.appState.currentMineData ? 
      window.appState.currentMineData.daily_target_tonnes : 1450;

    const runBtn = document.getElementById('btnRunSimulation');
    if (runBtn) {
      runBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Optimizing Protocols...';
      runBtn.disabled = true;
    }

    try {
      const payload = {
        weather_severity: this.simWeather,
        shovel_downtime: this.simShovel,
        blasting_delay_days: this.simBlasting,
        target_tonnes: targetTonnes,
        target_mn_grade: this.simGradeTarget
      };

      const res = window.apiClient 
        ? await window.apiClient.post('/simulate-scenario', payload)
        : await fetch('/api/simulate-scenario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).then(r => r.json());

      if (res && res.status === 'success') {
        this.renderSimulationResults(res.result);
        if (window.showToast) {
          window.showToast('Prescriptive Mitigation Plan Generated & Validated', 'success');
        }
      }
    } catch (err) {
      console.warn('Simulation API call failed, using client prescriptive engine:', err);
      if (typeof solvePrescriptiveOptimizationClient === 'function') {
        const result = solvePrescriptiveOptimizationClient({
          weather_severity: this.simWeather,
          shovel_downtime: this.simShovel,
          blasting_delay_days: this.simBlasting,
          target_tonnes: targetTonnes,
          target_mn_grade: this.simGradeTarget
        });
        this.renderSimulationResults(result);
        if (window.showToast) {
          window.showToast('Prescriptive Mitigation Plan Generated & Validated', 'success');
        }
      } else {
        console.error('Simulation error:', err);
        if (window.showToast) {
          window.showToast('Error calculating prescriptive optimization', 'error');
        }
      }
    } finally {
      if (runBtn) {
        runBtn.innerHTML = '<i class="fa-solid fa-microchip"></i> Run AI Prescriptive Engine';
        runBtn.disabled = false;
      }
    }
  }

  renderSimulationResults(data) {
    // 1. Recovery banner
    const recRateEl = document.getElementById('simRecoveryRateVal');
    const prodPreservedEl = document.getElementById('simProductionPreservedVal');
    const deficitRecEl = document.getElementById('simDeficitRecoveredVal');

    if (recRateEl) recRateEl.textContent = `${data.recovery_rate_pct}%`;
    if (prodPreservedEl) prodPreservedEl.textContent = `${data.mitigated_production.toLocaleString()} / ${data.parameters.target_tonnes.toLocaleString()} TPD`;
    if (deficitRecEl) {
      const saved = Math.round(data.mitigated_production - data.base_unmitigated_production);
      deficitRecEl.textContent = `+${saved.toLocaleString()} Tonnes Output Preserved`;
    }

    // 2. Stockpile blend formulation
    const blend = data.stockpile_blend;
    const hgEl = document.getElementById('blendHgVal');
    const fgEl = document.getElementById('blendFgVal');
    const smEl = document.getElementById('blendSmVal');
    const lgEl = document.getElementById('blendLgVal');

    if (hgEl) hgEl.textContent = `${blend.high_grade_pct}%`;
    if (fgEl) fgEl.textContent = `${blend.ferro_grade_pct}%`;
    if (smEl) smEl.textContent = `${blend.silico_mn_pct}%`;
    if (lgEl) lgEl.textContent = `${blend.low_grade_pct}%`;

    const resMnEl = document.getElementById('blendResultMn');
    const resPEl = document.getElementById('blendResultP');
    const resCostEl = document.getElementById('blendResultCost');

    if (resMnEl) resMnEl.textContent = `${blend.result_mn_pct}% Mn`;
    if (resPEl) resPEl.textContent = `${blend.result_p_pct}% P (<0.15% limit)`;
    if (resCostEl) resCostEl.textContent = `₹${blend.cost_per_tonne_inr.toLocaleString()} / Tonne`;

    // 3. Action Cards
    const container = document.getElementById('actionCardsList');
    if (!container) return;

    container.innerHTML = data.prescriptive_actions.map((act, i) => {
      let badgeClass = 'optimized';
      if (act.priority === 'CRITICAL') badgeClass = 'critical';
      else if (act.priority === 'HIGH') badgeClass = 'high';

      return `
        <div class="action-card">
          <div class="action-card-left">
            <div style="display: flex; gap: 8px; align-items: center;">
              <span class="action-badge ${badgeClass}">${act.priority}</span>
              <span style="font-size: 0.72rem; color: var(--accent-cyan); font-weight: 600;">${act.category}</span>
            </div>
            <div class="action-title">${act.action}</div>
            <div class="action-desc">${act.impact}</div>
            <div style="font-size: 0.75rem; color: var(--accent-emerald); font-weight: 600; margin-top: 2px;">
              <i class="fa-solid fa-arrow-trend-up"></i> Recovers +${act.tonnes_recovered} Tonnes/Day
            </div>
          </div>
          <button class="action-btn-trigger" onclick="window.prescriptiveOptimizer.triggerAction(${i}, '${encodeURIComponent(act.action)}')">
            <i class="fa-solid fa-bolt"></i> Apply Action
          </button>
        </div>
      `;
    }).join('');
  }

  triggerAction(index, actionText) {
    const text = decodeURIComponent(actionText);
    if (window.showToast) {
      window.showToast(`Action Triggered: ${text}`, 'success');
    }
  }
}

window.prescriptiveOptimizer = new PrescriptiveOptimizerEngine();
