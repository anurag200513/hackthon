/**
 * MOIL-PRAGYA: Satellite Remote Sensing & GIS Engine
 * Manages Leaflet GIS map, multispectral band switching (MOSI, NDVI, LST, SMI),
 * geological lineament faults, borehole collar markers, and mineral anomaly targets.
 */

class SatelliteMapEngine {
  constructor() {
    this.map = null;
    this.currentLayer = 'mosi';
    this.currentBaseMap = 'satellite';
    this.baseLayers = {};
    this.currentMineData = null;
    this.gridLayerGroup = null;
    this.lineamentsGroup = null;
    this.boreholesGroup = null;
    this.anomaliesGroup = null;
    this.showLineaments = true;
    this.showBoreholes = true;
  }

  initMap() {
    if (this.map) return;

    // Centered initially at Balaghat Mine
    this.map = L.map('leafletMap', {
      center: [21.8672, 80.2014],
      zoom: 14,
      minZoom: 10,
      maxZoom: 19,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // High-Resolution Space Satellite Imagery & Geographic Reference (No API key required)
    const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Esri, Maxar, Earthstar Geographics, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
      maxZoom: 19
    });

    const esriLabels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      opacity: 0.85
    });

    const topoMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Esri, HERE, Garmin, Intermap, USGS, METI/NASA',
      maxZoom: 19
    });

    const osmMap = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    });

    this.baseLayers = {
      satellite: L.layerGroup([esriSatellite, esriLabels]),
      topo: topoMap,
      osm: osmMap
    };

    // Add default high-resolution satellite imagery
    this.baseLayers.satellite.addTo(this.map);

    this.gridLayerGroup = L.layerGroup().addTo(this.map);
    this.lineamentsGroup = L.layerGroup().addTo(this.map);
    this.boreholesGroup = L.layerGroup().addTo(this.map);
    this.anomaliesGroup = L.layerGroup().addTo(this.map);

    this.bindEvents();
  }

  setBaseMap(name) {
    if (!this.baseLayers[name] || this.currentBaseMap === name) return;
    this.map.removeLayer(this.baseLayers[this.currentBaseMap]);
    this.baseLayers[name].addTo(this.map);
    this.currentBaseMap = name;
  }

  bindEvents() {
    // Base map selector buttons
    document.querySelectorAll('.layer-btn[data-basemap]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.layer-btn[data-basemap]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setBaseMap(btn.dataset.basemap);
      });
    });

    // Layer selector buttons
    document.querySelectorAll('.layer-btn[data-layer]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.layer-btn[data-layer]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentLayer = btn.dataset.layer;
        this.renderGrid();
      });
    });

    // Toggle Lineaments
    const toggleLinBtn = document.getElementById('toggleLineamentsBtn');
    if (toggleLinBtn) {
      toggleLinBtn.addEventListener('click', () => {
        this.showLineaments = !this.showLineaments;
        toggleLinBtn.classList.toggle('active', this.showLineaments);
        if (this.showLineaments) {
          this.map.addLayer(this.lineamentsGroup);
        } else {
          this.map.removeLayer(this.lineamentsGroup);
        }
      });
    }

    // Toggle Boreholes
    const toggleBhBtn = document.getElementById('toggleBoreholesBtn');
    if (toggleBhBtn) {
      toggleBhBtn.addEventListener('click', () => {
        this.showBoreholes = !this.showBoreholes;
        toggleBhBtn.classList.toggle('active', this.showBoreholes);
        if (this.showBoreholes) {
          this.map.addLayer(this.boreholesGroup);
        } else {
          this.map.removeLayer(this.boreholesGroup);
        }
      });
    }
  }

  updateData(satelliteData, boreholesData) {
    this.currentMineData = satelliteData;
    this.boreholesData = boreholesData;

    const mine = satelliteData.mine;
    this.map.setView([mine.lat, mine.lon], 14);

    this.renderGrid();
    this.renderLineaments();
    this.renderBoreholes();
    this.renderAnomalies();
    this.updateSidebar(satelliteData);
  }

  getGridColor(point) {
    if (this.currentLayer === 'mosi') {
      // Manganese Oxide Signature Index (SWIR/VNIR): Higher is vibrant orange
      const v = point.mosi;
      if (v > 0.75) return '#ff6b00';
      if (v > 0.55) return '#f97316';
      if (v > 0.35) return '#c2410c';
      return '#431407';
    } else if (this.currentLayer === 'prospectivity') {
      // AI Prospectivity: High is electric orange/gold
      const p = point.prospectivity;
      if (p > 0.75) return '#ff6b00';
      if (p > 0.55) return '#f59e0b';
      if (p > 0.35) return '#ea580c';
      return '#27272a';
    } else if (this.currentLayer === 'lst') {
      // Land Surface Temperature (°C)
      const t = point.lst;
      if (t > 38.0) return '#ef4444';
      if (t > 35.0) return '#f97316';
      if (t > 32.0) return '#eab308';
      return '#38bdf8';
    } else if (this.currentLayer === 'ndvi') {
      // NDVI: Low is mineral/soil (orange/yellow), high is dense canopy (emerald)
      const n = point.ndvi;
      if (n > 0.6) return '#16a34a';
      if (n > 0.4) return '#84cc16';
      if (n > 0.25) return '#eab308';
      return '#b45309';
    } else if (this.currentLayer === 'smi') {
      // Soil Moisture Index
      const s = point.smi;
      if (s > 0.6) return '#0284c7';
      if (s > 0.4) return '#38bdf8';
      if (s > 0.25) return '#67e8f9';
      return '#334155';
    }
    return '#ff6b00';
  }

  renderGrid() {
    this.gridLayerGroup.clearLayers();
    if (!this.currentMineData || !this.currentMineData.points) return;

    const step = (this.currentMineData.grid_step_deg || 0.005) / 2.0;

    this.currentMineData.points.forEach(pt => {
      const bounds = [
        [pt.lat - step, pt.lon - step],
        [pt.lat + step, pt.lon + step]
      ];
      const color = this.getGridColor(pt);

      const rect = L.rectangle(bounds, {
        color: color,
        weight: 0.5,
        opacity: 0.4,
        fillColor: color,
        fillOpacity: 0.55
      });

      const tooltipContent = `
        <div style="font-family: var(--font-body); font-size: 0.75rem; color: #fff;">
          <strong>Lithology:</strong> ${pt.geology}<br/>
          <strong>MOSI (Mn-Oxide):</strong> ${(pt.mosi * 100).toFixed(1)}%<br/>
          <strong>AI Prospectivity:</strong> ${(pt.prospectivity * 100).toFixed(1)}%<br/>
          <strong>Surface Temp:</strong> ${pt.lst}°C | <strong>NDVI:</strong> ${pt.ndvi}<br/>
          <strong>Soil Moisture:</strong> ${pt.smi}
        </div>
      `;
      rect.bindTooltip(tooltipContent, { sticky: true, className: 'geo-tooltip' });
      this.gridLayerGroup.addLayer(rect);
    });
  }

  renderLineaments() {
    this.lineamentsGroup.clearLayers();
    if (!this.currentMineData || !this.currentMineData.lineaments) return;

    this.currentMineData.lineaments.forEach(lin => {
      const isFault = lin.type.includes('Fault');
      const poly = L.polyline(lin.coordinates, {
        color: isFault ? '#f43f5e' : '#f59e0b',
        weight: isFault ? 3.5 : 2.5,
        dashArray: isFault ? '6, 6' : '3, 6',
        opacity: 0.95
      });

      poly.bindTooltip(`
        <div style="font-size: 0.75rem; font-family: var(--font-body);">
          <strong style="color: ${isFault ? '#f43f5e' : '#f59e0b'};">${lin.name}</strong><br/>
          <strong>Type:</strong> ${lin.type}<br/>
          <strong>Orientation:</strong> ${lin.strike}
        </div>
      `, { sticky: true });

      this.lineamentsGroup.addLayer(poly);
    });
  }

  renderBoreholes() {
    this.boreholesGroup.clearLayers();
    if (!this.boreholesData) return;

    this.boreholesData.forEach(bh => {
      const mnGrade = bh.assays.mn_pct;
      // High grade braunite is orange, medium is amber, low is neutral zinc
      const markerColor = mnGrade >= 44.0 ? '#ff6b00' : (mnGrade >= 38.0 ? '#f59e0b' : '#71717a');

      const marker = L.circleMarker([bh.lat, bh.lon], {
        radius: 6,
        fillColor: markerColor,
        color: '#ffffff',
        weight: 1.5,
        opacity: 1.0,
        fillOpacity: 0.95
      });

      marker.bindTooltip(`
        <div style="font-size: 0.75rem; font-family: var(--font-body);">
          <strong style="color: ${markerColor};">${bh.id}</strong> (${bh.fence})<br/>
          <strong>Depth:</strong> ${bh.total_depth_m}m | <strong>Ore Thickness:</strong> ${bh.ore_thickness_m}m<br/>
          <strong>Mn Grade:</strong> ${mnGrade}% | <strong>P:</strong> ${bh.assays.p_pct}%
        </div>
      `, { sticky: true });

      marker.on('click', () => {
        if (window.showBoreholeDetail) {
          window.showBoreholeDetail(bh);
        }
      });

      this.boreholesGroup.addLayer(marker);
    });
  }

  renderAnomalies() {
    this.anomaliesGroup.clearLayers();
    if (!this.currentMineData || !this.currentMineData.anomalies) return;

    this.currentMineData.anomalies.forEach(anom => {
      const iconHtml = `
        <div style="
          width: 28px; height: 28px; border-radius: 50%;
          background: rgba(255, 107, 0, 0.25); border: 2px solid #ff6b00;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 11px; font-weight: 700;
          box-shadow: 0 0 14px rgba(255, 107, 0, 0.6);
          animation: pulseAnim 2s infinite ease-in-out;
        ">
          <i class="fa-solid fa-bullseye" style="color: #ff8c38;"></i>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'anomaly-marker',
        html: iconHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([anom.lat, anom.lon], { icon: customIcon });

      marker.bindTooltip(`
        <div style="font-size: 0.75rem; font-family: var(--font-body);">
          <strong style="color: #ff8c38;">🎯 ${anom.id}: ${anom.name}</strong><br/>
          <strong>AI Confidence:</strong> ${anom.confidence}%<br/>
          <strong>Est. Grade:</strong> ${anom.estimated_grade}<br/>
          <em>${anom.status}</em>
        </div>
      `, { sticky: true });

      marker.on('click', () => {
        if (window.showAnomalyDetail) {
          window.showAnomalyDetail(anom);
        }
      });

      this.anomaliesGroup.addLayer(marker);
    });
  }

  updateSidebar(satelliteData) {
    const container = document.getElementById('anomalyListContainer');
    if (!container) return;

    if (!satelliteData.anomalies || satelliteData.anomalies.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.75rem;">No active anomalies in current zone.</div>';
      return;
    }

    container.innerHTML = satelliteData.anomalies.map(a => `
      <div class="anomaly-item" onclick="window.satelliteMap.zoomToAnomaly(${a.lat}, ${a.lon})">
        <div class="anomaly-item-header">
          <span class="anomaly-name">${a.id}: ${a.name}</span>
          <span class="anomaly-conf">${a.confidence}% Conf.</span>
        </div>
        <div class="anomaly-desc">${a.signature}</div>
        <div class="anomaly-grade">Est: ${a.estimated_grade}</div>
      </div>
    `).join('');
  }

  zoomToAnomaly(lat, lon) {
    this.map.flyTo([lat, lon], 16, { duration: 1.2 });
  }

  invalidateSize() {
    if (this.map) {
      setTimeout(() => this.map.invalidateSize(), 200);
    }
  }
}

window.satelliteMap = new SatelliteMapEngine();
