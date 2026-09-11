/**
 * MOIL-PRAGYA: Production Shortfall Predictor & Fleet Telemetry Engine
 * Powered by Chart.js
 * Renders 14-day shortfall probabilistic forecast, constraint distribution,
 * and live Heavy Earth Moving Machinery (HEMM) fleet condition cards.
 */

class ShortfallPredictorEngine {
  constructor() {
    this.forecastChart = null;
    this.constraintsChart = null;
    this.currentData = null;
  }

  updateData(shortfallData) {
    this.currentData = shortfallData;
    this.renderForecastChart(shortfallData.forecast, shortfallData.mine.daily_target_tonnes);
    this.renderConstraintsChart();
    this.renderFleetCards(shortfallData.equipment_fleet, shortfallData.environmental_telemetry);
  }

  renderForecastChart(forecast, targetTonnes) {
    const ctx = document.getElementById('forecastChart');
    if (!ctx) return;

    const labels = forecast.map(f => f.day);
    const predicted = forecast.map(f => f.predicted);
    const upper = forecast.map(f => f.confidence_upper);
    const lower = forecast.map(f => f.confidence_lower);
    const targets = forecast.map(() => targetTonnes);

    if (this.forecastChart) {
      this.forecastChart.destroy();
    }

    this.forecastChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Daily Target (TPD)',
            data: targets,
            borderColor: '#a1a1aa',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            tension: 0
          },
          {
            label: 'AI Forecast Output',
            data: predicted,
            borderColor: '#ff6b00',
            backgroundColor: 'rgba(255, 107, 0, 0.15)',
            borderWidth: 3,
            pointBackgroundColor: '#ff6b00',
            pointBorderColor: '#09090b',
            pointBorderWidth: 1.5,
            pointHoverRadius: 6,
            tension: 0.35,
            fill: false
          },
          {
            label: 'Upper Confidence (90%)',
            data: upper,
            borderColor: 'transparent',
            backgroundColor: 'rgba(255, 107, 0, 0.12)',
            fill: '+1', // fill to lower
            pointRadius: 0,
            tension: 0.35
          },
          {
            label: 'Lower Confidence (90%)',
            data: lower,
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            fill: false,
            pointRadius: 0,
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            labels: {
              color: '#a1a1aa',
              font: { family: 'Inter', size: 11 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(18, 18, 21, 0.95)',
            titleFont: { family: 'Outfit', weight: 'bold' },
            bodyFont: { family: 'Inter' },
            borderColor: 'rgba(255, 107, 0, 0.4)',
            borderWidth: 1,
            callbacks: {
              afterBody: (context) => {
                const idx = context[0].dataIndex;
                const f = forecast[idx];
                return `\nConstraint: ${f.key_constraint}\nRainfall: ${f.rainfall_forecast_mm} mm\nShortfall Gap: ${f.shortfall > 0 ? '-' + f.shortfall + ' TPD' : 'None'}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#71717a', font: { family: 'Inter', size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#71717a', font: { family: 'Inter', size: 11 } },
            title: {
              display: true,
              text: 'Production (Tonnes / Day)',
              color: '#a1a1aa',
              font: { family: 'Inter', size: 12 }
            }
          }
        }
      }
    });
  }

  renderConstraintsChart() {
    const ctx = document.getElementById('constraintsChart');
    if (!ctx) return;

    if (this.constraintsChart) {
      this.constraintsChart.destroy();
    }

    this.constraintsChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [
          'Monsoon Inundation & Sump Flooding',
          'Shovel / HEMM Mechanical Breakdown',
          'Blasting Delays & Misfires',
          'Haul Road Slippage & Cycle Time',
          'Underground Hoisting Skip Queuing'
        ],
        datasets: [{
          data: [38, 26, 16, 12, 8],
          backgroundColor: [
            '#ff6b00', // Vivid Safety Orange
            '#f59e0b', // Warm Amber
            '#ea580c', // Deep Orange
            '#c2410c', // Rust Tangerine
            '#52525b'  // Dark Zinc
          ],
          borderWidth: 2,
          borderColor: '#121215'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: { family: 'Inter', size: 10 },
              boxWidth: 12
            }
          }
        },
        cutout: '68%'
      }
    });
  }

  renderFleetCards(equipmentList, envTelemetry) {
    const container = document.getElementById('fleetGridContainer');
    if (!container || !equipmentList) return;

    container.innerHTML = equipmentList.map(eq => {
      let statusClass = 'operational';
      let statusIcon = 'fa-circle-check';
      if (eq.status.includes('WARNING')) {
        statusClass = 'warning';
        statusIcon = 'fa-triangle-exclamation';
      } else if (eq.status.includes('DEGRADED') || eq.status.includes('STANDBY')) {
        statusClass = 'degraded';
        statusIcon = 'fa-circle-pause';
      }

      return `
        <div class="fleet-card">
          <div class="fleet-card-top">
            <div>
              <div class="fleet-name">${eq.name}</div>
              <div class="fleet-bench">${eq.bench}</div>
            </div>
            <span class="status-chip ${statusClass}">
              <i class="fa-solid ${statusIcon}"></i> ${eq.status.split(' ')[0]}
            </span>
          </div>

          <div class="health-bar-container">
            <div class="health-bar-labels">
              <span>Equipment Health / Telemetry</span>
              <strong>${eq.health}%</strong>
            </div>
            <div class="health-progress">
              <div class="health-progress-fill" style="width: ${eq.health}%;"></div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-secondary); margin-top: 4px;">
            <span>MTBF: <strong>${eq.mtbf_hrs || 320}h</strong></span>
            <span>Throughput: <strong>${eq.throughput_tph ? eq.throughput_tph + ' TPH' : (eq.cycle_time_min ? eq.cycle_time_min + ' min cycle' : 'Active')}</strong></span>
          </div>
        </div>
      `;
    }).join('');
  }
}

window.shortfallPredictor = new ShortfallPredictorEngine();
