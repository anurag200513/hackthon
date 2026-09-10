/**
 * MOIL-PRAGYA: 3D Subsurface Voxel & Borehole Visualizer
 * Powered by Three.js & WebGL
 * Visualizes 3D block model, kriged manganese orebody, dipping Sausar strata,
 * core drilling trajectory cylinders, and dynamic UNFC reserve recalculations.
 */

class Subsurface3DEngine {
  constructor() {
    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.voxelGroup = new THREE.Group();
    this.boreholeGroup = new THREE.Group();
    this.gridHelper = null;
    this.isAutoRotating = false;
    this.cutoffGrade = 35.0;
    this.maxDepthSlice = 160;
    this.allVoxels = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.initialized = false;
  }

  init() {
    this.container = document.getElementById('threeCanvasContainer');
    if (!this.container || this.initialized) return;

    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 650;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x09090b);
    this.scene.fog = new THREE.FogExp2(0x09090b, 0.0018);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
    this.camera.position.set(280, 240, 360);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // OrbitControls
    if (window.THREE && window.THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxPolarAngle = Math.PI / 2 + 0.35;
      this.controls.target.set(0, -60, 0);
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight1.position.set(200, 400, 200);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xff6b00, 0.55); // Warm orange accent backlight
    dirLight2.position.set(-200, -200, -200);
    this.scene.add(dirLight2);

    // Grid Floor (ground surface)
    this.gridHelper = new THREE.GridHelper(600, 24, 0xff6b00, 0x27272a);
    this.gridHelper.position.y = 0;
    this.scene.add(this.gridHelper);

    // Add Groups
    this.scene.add(this.voxelGroup);
    this.scene.add(this.boreholeGroup);

    // Bind Controls
    this.bindEvents();

    // Start render loop
    this.initialized = true;
    this.animate();

    window.addEventListener('resize', () => this.onResize());
  }

  bindEvents() {
    // Cutoff grade slider
    const cutoffSlider = document.getElementById('cutoffGradeSlider');
    const cutoffLabel = document.getElementById('cutoffGradeLabel');
    if (cutoffSlider) {
      cutoffSlider.addEventListener('input', (e) => {
        this.cutoffGrade = parseFloat(e.target.value);
        if (cutoffLabel) cutoffLabel.textContent = `${this.cutoffGrade.toFixed(1)}% Mn`;
        this.filterVoxels();
      });
    }

    // Depth slice slider
    const depthSlider = document.getElementById('depthSliceSlider');
    const depthLabel = document.getElementById('depthSliceLabel');
    if (depthSlider) {
      depthSlider.addEventListener('input', (e) => {
        this.maxDepthSlice = parseInt(e.target.value);
        if (depthLabel) depthLabel.textContent = `-${this.maxDepthSlice}m`;
        this.filterVoxels();
      });
    }

    // Reset Camera Button
    const btnReset = document.getElementById('btnResetCamera');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.camera.position.set(280, 240, 360);
        if (this.controls) this.controls.target.set(0, -60, 0);
      });
    }

    // Auto-spin button
    const btnAutoRotate = document.getElementById('btnAutoRotate');
    if (btnAutoRotate) {
      btnAutoRotate.addEventListener('click', () => {
        this.isAutoRotating = !this.isAutoRotating;
        btnAutoRotate.classList.toggle('active', this.isAutoRotating);
        if (this.controls) this.controls.autoRotate = this.isAutoRotating;
      });
    }

    // Canvas click inspection
    if (this.container) {
      this.container.addEventListener('click', (e) => this.onCanvasClick(e));
    }
  }

  updateData(voxelData, boreholesData) {
    if (!this.initialized) this.init();

    this.allVoxels = voxelData.voxels || [];
    this.boreholesData = boreholesData || [];

    this.renderVoxels();
    this.renderBoreholes();
    this.updateUNFCSummary(voxelData);
  }

  renderVoxels() {
    // Clear existing
    while (this.voxelGroup.children.length > 0) {
      const obj = this.voxelGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
      this.voxelGroup.remove(obj);
    }

    const boxGeo = new THREE.BoxGeometry(22, 13, 18);

    this.allVoxels.forEach(vox => {
      const isVisible = vox.mn >= this.cutoffGrade && Math.abs(vox.z) <= this.maxDepthSlice;
      if (!isVisible) return;

      let col = vox.color;
      if (vox.mn >= 44.0) col = '#ff6b00';
      else if (vox.mn >= 38.0) col = '#f59e0b';
      else if (vox.mn >= 35.0) col = '#c2410c';
      else col = '#52525b';

      const mat = new THREE.MeshLambertMaterial({
        color: new THREE.Color(col),
        transparent: true,
        opacity: vox.mn >= 44.0 ? 0.95 : 0.82
      });

      const mesh = new THREE.Mesh(boxGeo, mat);
      mesh.position.set(vox.x, vox.z, vox.y);
      mesh.userData = vox;
      this.voxelGroup.add(mesh);
    });
  }

  renderBoreholes() {
    while (this.boreholeGroup.children.length > 0) {
      const obj = this.boreholeGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
      this.boreholeGroup.remove(obj);
    }

    if (!this.boreholesData) return;

    this.boreholesData.forEach((bh, idx) => {
      // Create drill cylinder dipping at 70 degrees
      const depth = bh.total_depth_m * 0.45; // scaled
      const cylGeo = new THREE.CylinderGeometry(2, 2, depth, 12);
      const cylMat = new THREE.MeshBasicMaterial({ color: 0xff6b00, wireframe: false });

      const cyl = new THREE.Mesh(cylGeo, cylMat);

      // Position collar
      const offsetX = (idx % 4 - 1.5) * 80;
      const offsetZ = (Math.floor(idx / 4) - 1.5) * 60;
      cyl.position.set(offsetX, -depth / 2, offsetZ);
      cyl.rotation.z = 0.25; // 70 degree dip simulation
      cyl.userData = bh;

      // Collar marker ring on surface
      const ringGeo = new THREE.RingGeometry(3, 7, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(offsetX, 1, offsetZ);
      ring.rotation.x = Math.PI / 2;

      this.boreholeGroup.add(cyl);
      this.boreholeGroup.add(ring);
    });
  }

  filterVoxels() {
    let provedTonnes = 0;
    let probableTonnes = 0;
    let inferredTonnes = 0;
    let totalTonnes = 0;
    let weightedMn = 0;
    let weightedP = 0;

    this.renderVoxels();

    // Recompute tonnages for active filter
    this.allVoxels.forEach(vox => {
      if (vox.mn >= this.cutoffGrade && Math.abs(vox.z) <= this.maxDepthSlice) {
        totalTonnes += vox.tonnes;
        weightedMn += vox.mn * vox.tonnes;
        weightedP += 0.095 * vox.tonnes;

        if (vox.unfc === '111_Proved') provedTonnes += vox.tonnes;
        else if (vox.unfc === '122_Probable') probableTonnes += vox.tonnes;
        else inferredTonnes += vox.tonnes;
      }
    });

    const avgMn = totalTonnes > 0 ? (weightedMn / totalTonnes).toFixed(1) : '0.0';
    const provedEl = document.getElementById('unfcProvedVal');
    const probEl = document.getElementById('unfcProbableVal');
    const infEl = document.getElementById('unfcInferredVal');
    const totEl = document.getElementById('totalVoxelTonnageVal');
    const gradeEl = document.getElementById('avgVoxelGradeVal');

    if (provedEl) provedEl.textContent = `${(provedTonnes / 1_000_000).toFixed(2)} MT`;
    if (probEl) probEl.textContent = `${(probableTonnes / 1_000_000).toFixed(2)} MT`;
    if (infEl) infEl.textContent = `${(inferredTonnes / 1_000_000).toFixed(2)} MT`;
    if (totEl) totEl.textContent = `${(totalTonnes / 1_000_000).toFixed(2)} MT`;
    if (gradeEl) gradeEl.textContent = `${avgMn}% Mn | 0.09% P`;
  }

  updateUNFCSummary(data) {
    const provedEl = document.getElementById('unfcProvedVal');
    const probEl = document.getElementById('unfcProbableVal');
    const infEl = document.getElementById('unfcInferredVal');
    const totEl = document.getElementById('totalVoxelTonnageVal');
    const gradeEl = document.getElementById('avgVoxelGradeVal');

    if (data.unfc_summary) {
      if (provedEl) provedEl.textContent = `${data.unfc_summary.proved_111_mt} MT`;
      if (probEl) probEl.textContent = `${data.unfc_summary.probable_122_mt} MT`;
      if (infEl) infEl.textContent = `${data.unfc_summary.inferred_333_mt} MT`;
    }
    if (totEl) totEl.textContent = `${(data.total_reserve_tonnes / 1_000_000).toFixed(2)} MT`;
    if (gradeEl) gradeEl.textContent = `${data.avg_mn_pct}% Mn | ${data.avg_p_pct}% P`;
  }

  onCanvasClick(event) {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / this.container.clientHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.voxelGroup.children);

    if (intersects.length > 0) {
      const hitVoxel = intersects[0].object.userData;
      if (window.showVoxelDetail) {
        window.showVoxelDetail(hitVoxel);
      }
    }
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

window.subsurface3D = new Subsurface3DEngine();
