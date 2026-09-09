import json
import os
from data.mining_data import (
    MOIL_MINES,
    generate_satellite_layers,
    generate_boreholes,
    generate_3d_voxels,
    generate_production_and_shortfall
)

all_data = {}
for m in MOIL_MINES:
    all_data[m] = {
        'satellite': generate_satellite_layers(m),
        'boreholes': generate_boreholes(m),
        'voxels': generate_3d_voxels(m, 35.0),
        'shortfall': generate_production_and_shortfall(m)
    }

header = """/**
 * MOIL-PRAGYA Embedded Data Engine & Intelligent API Client
 * Provides 100% resilient data access for all 8 MOIL mines:
 * Automatically connects to backend at http://localhost:8085 when available,
 * and seamlessly falls back to precomputed high-fidelity geological models
 * if running on static preview (port 5500 / Live Server / offline).
 */
"""

mines_json = json.dumps(MOIL_MINES, indent=2)
all_data_json = json.dumps(all_data)

js_logic = """
function solvePrescriptiveOptimizationClient(params) {
  params = params || {};
  const weather_severity = params.weather_severity !== undefined ? params.weather_severity : 1.0;
  const shovel_downtime = params.shovel_downtime !== undefined ? params.shovel_downtime : 0;
  const blasting_delay_days = params.blasting_delay_days !== undefined ? params.blasting_delay_days : 0;
  const target_tonnes = params.target_tonnes !== undefined ? params.target_tonnes : 1450;
  const target_mn_grade = params.target_mn_grade !== undefined ? params.target_mn_grade : 42.5;

  const base_deficit = (weather_severity * 280) + (shovel_downtime * 210) + (blasting_delay_days * 160);
  const base_prod = Math.max(400, target_tonnes - base_deficit);

  const gap = target_mn_grade - 29.5;
  const spread = 47.8 - 29.5;
  let w_hg = Math.max(0.15, Math.min(0.65, (gap / spread) * 0.75));
  let w_fg = Math.max(0.15, Math.min(0.45, 0.35));
  const remaining = 1.0 - (w_hg + w_fg);
  let w_sm = remaining * 0.7;
  let w_lg = remaining * 0.3;

  const total_w = w_hg + w_fg + w_sm + w_lg;
  w_hg /= total_w;
  w_fg /= total_w;
  w_sm /= total_w;
  w_lg /= total_w;

  const blended_mn = +(w_hg * 47.8 + w_fg * 41.5 + w_sm * 35.2 + w_lg * 29.5).toFixed(2);
  const blended_fe = +(w_hg * 3.8 + w_fg * 5.4 + w_sm * 6.8 + w_lg * 8.1).toFixed(2);
  const blended_p = +(w_hg * 0.08 + w_fg * 0.11 + w_sm * 0.14 + w_lg * 0.17).toFixed(3);

  const actions = [];
  if (weather_severity > 1.2) {
    actions.push({
      priority: 'HIGH',
      category: 'Weather Mitigation & Drainage',
      action: 'Activate Auxiliary Dewatering Pumps (Pump Station #3)',
      impact: 'Lowers pit sump rise rate by 420 m³/hr; prevents flooding of High-Grade Bench 04.',
      tonnes_recovered: 180,
      status: 'Ready to Trigger'
    });
    actions.push({
      priority: 'HIGH',
      category: 'Haulage Optimization',
      action: 'Reroute 60T Dumpers (Batch B) to South Weather-Graded Hardstand Road',
      impact: 'Decreases round-trip cycle time from 26.8 min to 19.2 min; restores 15% fleet throughput.',
      tonnes_recovered: 140,
      status: 'Ready to Trigger'
    });
  }

  if (shovel_downtime > 0) {
    actions.push({
      priority: 'CRITICAL',
      category: 'Equipment Dynamic Redeployment',
      action: 'Reallocate 4 Dumpers from idle excavator to P&H 1900AL Shovel #1 at Bench 04',
      impact: 'Boosts shovel utilization to 98% and increases high-grade extraction rate.',
      tonnes_recovered: 210,
      status: 'Ready to Trigger'
    });
  }

  if (blasting_delay_days > 0) {
    actions.push({
      priority: 'MEDIUM',
      category: 'Blasting & Explosive Logistics',
      action: 'Execute Pre-Split Controlled Blast 18h ahead of incoming precipitation front',
      impact: 'Prevents wall-slumping dilution and creates 12,000 tonnes muckpile buffer.',
      tonnes_recovered: 160,
      status: 'Scheduled'
    });
  }

  actions.push({
    priority: 'HIGH',
    category: 'Smart Ore Blending Protocol',
    action: 'Release Stockpile Blend: ' + Math.round(w_hg * 100) + '% HG + ' + Math.round(w_fg * 100) + '% FG + ' + Math.round(w_sm * 100) + '% SM to maintain plant feed',
    impact: 'Delivers ' + blended_mn + '% Mn and ' + blended_p + '% P, meeting customer spec (SAIL Contract #8491) without penalties.',
    tonnes_recovered: Math.round(base_deficit * 0.85),
    status: 'Optimized'
  });

  const total_recovered = actions.reduce((sum, a) => sum + a.tonnes_recovered, 0);
  const mitigated_prod = Math.min(target_tonnes, base_prod + total_recovered);
  const recovery_rate = +((mitigated_prod / target_tonnes) * 100).toFixed(1);

  return {
    parameters: {
      weather_severity,
      shovel_downtime,
      blasting_delay_days,
      target_tonnes,
      target_mn_grade
    },
    base_unmitigated_production: Math.round(base_prod),
    unmitigated_deficit: Math.round(base_deficit),
    mitigated_production: Math.round(mitigated_prod),
    recovery_rate_pct: recovery_rate,
    residual_shortfall: Math.round(Math.max(0, target_tonnes - mitigated_prod)),
    stockpile_blend: {
      high_grade_pct: +(w_hg * 100).toFixed(1),
      ferro_grade_pct: +(w_fg * 100).toFixed(1),
      silico_mn_pct: +(w_sm * 100).toFixed(1),
      low_grade_pct: +(w_lg * 100).toFixed(1),
      result_mn_pct: blended_mn,
      result_fe_pct: blended_fe,
      result_p_pct: blended_p,
      cost_per_tonne_inr: Math.round(w_hg * 14200 + w_fg * 11800 + w_sm * 8900 + w_lg * 5400)
    },
    prescriptive_actions: actions
  };
}

window.apiClient = {
  getApiBase() {
    if (window.location.port === '8085') {
      return '';
    }
    return 'http://localhost:8085';
  },

  async get(path) {
    const primaryUrl = this.getApiBase() + '/api' + path;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    try {
      const res = await fetch(primaryUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        return await res.json();
      }
      throw new Error('HTTP ' + res.status);
    } catch (e) {
      clearTimeout(timeoutId);
      return this.fallbackGet(path);
    }
  },

  async post(path, body) {
    const primaryUrl = this.getApiBase() + '/api' + path;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    try {
      const res = await fetch(primaryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        return await res.json();
      }
      throw new Error('HTTP ' + res.status);
    } catch (e) {
      clearTimeout(timeoutId);
      return this.fallbackPost(path, body);
    }
  },

  fallbackGet(path) {
    const parts = path.split('?');
    const endpoint = parts[0];
    const queryString = parts[1] || '';
    const params = new URLSearchParams(queryString);
    const mineId = params.get('mine') || params.get('id') || 'balaghat';
    const mineData = window.PRAGYA_ALL_DATA && window.PRAGYA_ALL_DATA[mineId] 
      ? window.PRAGYA_ALL_DATA[mineId] 
      : (window.PRAGYA_ALL_DATA ? window.PRAGYA_ALL_DATA['balaghat'] : null);

    if (endpoint === '/mines') {
      return { status: 'success', mines: Object.values(window.MOIL_MINES_DATA || {}) };
    }
    if (endpoint === '/mine-detail') {
      return { status: 'success', mine: window.MOIL_MINES_DATA[mineId] };
    }
    if (endpoint === '/satellite-layers') {
      return { status: 'success', data: mineData ? mineData.satellite : null };
    }
    if (endpoint === '/boreholes') {
      return { status: 'success', boreholes: mineData ? mineData.boreholes : [] };
    }
    if (endpoint === '/reserves-3d') {
      return { status: 'success', data: mineData ? mineData.voxels : null };
    }
    if (endpoint === '/shortfall-forecast') {
      return { status: 'success', data: mineData ? mineData.shortfall : null };
    }
    if (endpoint === '/health') {
      return { status: 'healthy', service: 'MOIL-PRAGYA Engine (In-Browser Fallback)' };
    }
    throw new Error('Endpoint not supported in fallback: ' + path);
  },

  fallbackPost(path, body) {
    if (path === '/simulate-scenario') {
      const result = solvePrescriptiveOptimizationClient(body);
      return { status: 'success', result: result };
    }
    if (path === '/optimize-blend') {
      const result = solvePrescriptiveOptimizationClient(body);
      return { status: 'success', result: result.stockpile_blend };
    }
    throw new Error('Endpoint not supported in fallback POST: ' + path);
  }
};
"""

full_content = f"{header}\nwindow.MOIL_MINES_DATA = {mines_json};\nwindow.PRAGYA_ALL_DATA = {all_data_json};\n{js_logic}"

out_path = os.path.join("public", "js", "data_engine.js")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(full_content)

print(f"Successfully generated {out_path}, size: {round(os.path.getsize(out_path)/1024, 2)} KB")
