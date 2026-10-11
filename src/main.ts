//---main.ts
import './style.css';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import {
  makeIoffePritchard,
  makeYinYang,
  makeMirrorOrCusp,
  addFilamentsToScene,
} from './filaments';

import {
  makeCloverleaf,
  makeTorsatron,
  makeTokamakDCoils,
} from './advancedFilaments';

import { MagneticField } from './field';
import { FieldGrid } from './fieldGrid';
import { SeedBundle } from './seedBundle';
import { SeedBundleController } from './seedBundleController';
import { EulerIntegrator, RK4Integrator } from './integrator';

// ============================================================
// DOM
// ============================================================

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const app = document.getElementById('app');
if (app) {
  app.style.visibility = 'visible';
}
const loaderBox = document.getElementById('loader');
const percentElement = document.getElementById('loader-percent');
const uiPanel = document.getElementById('ui-panel');

const trapSelect = document.getElementById(
  'trap-config',
) as HTMLSelectElement | null;

const demoButton = document.getElementById(
  'demo-toggle',
) as HTMLButtonElement | null;

// ============================================================
// Scene & Camera
// ============================================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070c);

const camera = new THREE.PerspectiveCamera(
  45,
  1,
  0.1,
  1000,
);

//camera.position.set(7, 7, 7);

const isMobile = window.matchMedia('(max-width: 768px)').matches;

const mobileScale = isMobile ? 1.2 : 1;

camera.position.set(
  7 * mobileScale,
  7 * mobileScale,
  7 * mobileScale,
);

// ============================================================
// Renderer & Controls
// ============================================================

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

function resizeScene() {
  if (!app) return;

  const width = app.clientWidth;
  const height = app.clientHeight;

  if (width <= 0 || height <= 0) return;

  renderer.setSize(width, height, false);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

resizeScene();

const controls = new OrbitControls(camera, renderer.domElement);

controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

controls.enablePan = false;
controls.enableZoom = true;
controls.enableRotate = true;

controls.autoRotate = false;
controls.autoRotateSpeed = 0.45;

controls.update();

window.addEventListener('resize', resizeScene);
window.visualViewport?.addEventListener('resize', resizeScene);

// ============================================================
// Lighting
// ============================================================

scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight1.position.set(5, 10, 7);
scene.add(dirLight1);

const dirLight2 = new THREE.DirectionalLight(0x00aaff, 0.3);
dirLight2.position.set(-5, -5, -5);
scene.add(dirLight2);

// ============================================================
// Application state
// ============================================================

let currentFilamentsGroup: THREE.Group | null = null;
let exactField: MagneticField | null = null;
let gridField: FieldGrid | null = null;

let bundleEuler: SeedBundle | null = null;
let bundleRK4: SeedBundle | null = null;
let seedBundleController: SeedBundleController | null = null;

let demoMode = false;
let demoTaskId = 0;
let loadTaskId = 0;

// ============================================================
// Trap metadata
// ============================================================

const trapTitles: Record<string, string> = {
  ioffe: 'Ioffe–Pritchard',
  yinyang: 'Yin–Yang · Minimum-B',
  mirror: 'Mirror Machine',
  cusp: 'Anti-mirror · Cusp',
  cloverleaf: 'Cloverleaf',
  torsatron: 'Torsatron',
  tokamak: 'Tokamak',
};

const trapSequence = [
  'ioffe',
  'mirror',
  'cusp',
  'yinyang',
  'cloverleaf',
  'torsatron',
  'tokamak',
];

function updateTrapTitle(type: string) {
  const title = document.getElementById('demo-title');

  if (title) {
    title.textContent = trapTitles[type] ?? type;
  }
}


// 1. Создаем элемент для копирайта
const copyrightNotice = document.createElement('div');

// 2. Пишем текст на английском с лицензией MIT
const currentYear = new Date().getFullYear();
copyrightNotice.innerHTML = `&copy; ${currentYear} NE`;

// 3. Задаем стили прямо из кода, чтобы надпись была видна поверх canvas
copyrightNotice.style.position = 'fixed'; 
copyrightNotice.style.bottom = '20px';
copyrightNotice.style.left = '10%';
copyrightNotice.style.transform = 'translateX(-50%)';
copyrightNotice.style.zIndex = '999999'; // Поднимаем на самый верхний слой
copyrightNotice.style.fontFamily = 'system-ui, -apple-system, sans-serif';
copyrightNotice.style.fontSize = '13px';
copyrightNotice.style.color = 'rgba(255, 255, 255, 0.8)'; // Белый полупрозрачный текст
copyrightNotice.style.background = 'rgba(0, 0, 0, 0.6)'; // Темная подложка, чтобы читалось на любом фоне
copyrightNotice.style.padding = '6px 14px';
copyrightNotice.style.borderRadius = '20px';
copyrightNotice.style.pointerEvents = 'none'; // Чтобы клики сквозь текст уходили в canvas

// 4. Добавляем копирайт на страницу
document.body.appendChild(copyrightNotice);



// ============================================================
// Helpers
// ============================================================

function fadeLinesIn(
  bundles: (SeedBundle | null)[],
  duration = 400,
): Promise<void> {
  const materials: THREE.Material[] = [];

  bundles.forEach((bundle) => {
    bundle?.seeds.forEach((seed) => {
      seed.line.visible = true;

      const material = seed.line.material;
      const list = Array.isArray(material)
        ? material
        : [material];

      list.forEach((mat) => {
        mat.transparent = true;
        mat.depthWrite = false;
        mat.opacity = 0;
        materials.push(mat);
      });
    });
  });

  const start = performance.now();

  return new Promise((resolve) => {
    function animateFade(now: number) {
      const t = Math.min((now - start) / duration, 1);

      // Smoothstep: мягкое начало и завершение.
      const eased = t * t * (3 - 2 * t);

      materials.forEach((material) => {
        material.opacity = eased;
      });

      if (t < 1) {
        requestAnimationFrame(animateFade);
      } else {
        materials.forEach((material) => {
          material.opacity = 1;
          material.depthWrite = true;
        });

        resolve();
      }
    }

    requestAnimationFrame(animateFade);
  });
}

function setLoaderVisible(visible: boolean) {
  if (!loaderBox) return;

  if (visible) {
    loaderBox.style.display = 'block';
    loaderBox.style.opacity = '1';
  } else {
    loaderBox.style.opacity = '0';

    window.setTimeout(() => {
      if (loaderBox.style.opacity === '0') {
        loaderBox.style.display = 'none';
      }
    }, 300);
  }
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((child) => {
    if (
      child instanceof THREE.Mesh ||
      child instanceof THREE.Line ||
      child instanceof THREE.LineSegments
    ) {
      child.geometry.dispose();

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      materials.forEach((material) => material.dispose());
    }
  });
}


// ============================================================
// Load trap configuration
// ============================================================

async function loadTrapConfiguration(type: string) {
  const taskId = ++loadTaskId;

  bundleEuler?.seeds.forEach((seed) => {
    seed.line.visible = false;
  });

  bundleRK4?.seeds.forEach((seed) => {
    seed.line.visible = false;
  });

  updateTrapTitle(type);

  if (percentElement) {
    percentElement.innerText = '0%';
  }

  setLoaderVisible(true);

  try {
    if (currentFilamentsGroup) {
      scene.remove(currentFilamentsGroup);
      disposeObject(currentFilamentsGroup);
      currentFilamentsGroup = null;
    }

    let filaments;

    switch (type) {
      case 'yinyang':
       filaments = makeYinYang({
        numPoints: 32,
          colors: [
            0x00bcd4,
            0xffa726,
          ],
        });//makeYinYang({ numPoints: 32 });
        break;

      case 'mirror':
        filaments = makeMirrorOrCusp(false, {colors: [0xffc0cb, 0xffc0cb]});//makeMirrorOrCusp(false);
        break;

      case 'cusp':
        filaments = makeMirrorOrCusp(true, {colors: [0xffc0cb, 0x557799]});//makeMirrorOrCusp(true);
        break;

      case 'cloverleaf':
        filaments =  makeCloverleaf({
          colors: [
            0xff5533,
            0x557799,
            0x00bcd4,
            0xffc0cb,
          ],
        });;//makeCloverleaf();
        break;

      case 'torsatron':
        filaments = makeTorsatron({
          colors: [
            0xff5533,
            0x557799,
            0xffc0cb,
            0xffc0cb,
          ],
        });
        break;

      case 'tokamak':
        filaments = makeTokamakDCoils({
          numCoils: 12,
          colors: [
            0xff5533,
            0xff8844,
            0xffbb55,
            0xffdd66,
            0x00bcd4,
            0x0097a7,
            0x557799,
            0x7766aa,
            0xaa77bb,
            0xff77aa,
            0xff5577,
            0xff5533,
          ],
        });
        break;

      case 'ioffe':
      default:
        //filaments = makeIoffePritchard();
        filaments = makeIoffePritchard({
          barColors: [
            0xff5533,
            0x557799,
            0xff5533,
            0x557799,
          ],
          ringColors: [
            0xffc0cb,
            0xffc0cb,
          ],
        });
        break;
    }

    currentFilamentsGroup = addFilamentsToScene(scene, filaments);
    exactField = new MagneticField(filaments);

    if (!gridField) {
      gridField = new FieldGrid(exactField, {
        min: new THREE.Vector3(-4, -4, -4),
        max: new THREE.Vector3(4, 4, 4),
        nx: 32,
        ny: 32,
        nz: 32,
        onProgress: (percent) => {
          // Ignore progress from an outdated configuration.
          if (taskId !== loadTaskId) return;

          if (percentElement) {
            percentElement.innerText = `${percent}%`;
          }
        },
      });
    } else {
      // The FieldGrid implementation must expose a writable field.
      (gridField as any).field = exactField;
    }

    await gridField.init();

    // A newer request may have started while init() was running.
    if (taskId !== loadTaskId) return;

    if (bundleEuler && bundleRK4) {
      (bundleEuler as any).field = gridField;
      (bundleRK4 as any).field = gridField;

      bundleEuler.moveTo(bundleEuler.center);
      bundleRK4.moveTo(bundleRK4.center);

      await fadeLinesIn([bundleEuler, bundleRK4], 400);
      /*
      bundleEuler.moveTo(bundleEuler.center);
      bundleRK4.moveTo(bundleRK4.center);

      bundleEuler.seeds.forEach((seed) => {
        seed.line.visible = true;
      });

      bundleRK4.seeds.forEach((seed) => {
        seed.line.visible = true;
      });
      */
    }
  } catch (error) {
    console.error(`Failed to load trap "${type}":`, error);

    if (taskId === loadTaskId && percentElement) {
      percentElement.innerText = 'Calculation failed';
    }

    throw error;
  } finally {
    if (taskId === loadTaskId) {
      setLoaderVisible(false);
    }
  }
}

// ============================================================
// Mobile controls
// ============================================================

function setupMobileControls() {
  const openButton = document.getElementById(
    'mobile-controls-toggle',
  ) as HTMLButtonElement | null;

  const closeButton = document.getElementById(
    'mobile-controls-close',
  ) as HTMLButtonElement | null;

  const backdrop = document.getElementById('panel-backdrop');

  function setPanelOpen(open: boolean) {
    uiPanel?.classList.toggle('is-open', open);
    backdrop?.classList.toggle('is-visible', open);

    openButton?.setAttribute('aria-expanded', String(open));
  }

  openButton?.addEventListener('click', () => {
    setPanelOpen(!uiPanel?.classList.contains('is-open'));
  });

  closeButton?.addEventListener('click', () => {
    setPanelOpen(false);
  });

  backdrop?.addEventListener('click', () => {
    setPanelOpen(false);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setPanelOpen(false);
    }
  });

  // Close the bottom sheet after choosing a trap.
  trapSelect?.addEventListener('change', () => {
    if (window.matchMedia('(max-width: 768px)').matches) {
      setPanelOpen(false);
    }
  });
}

// ============================================================
// Demo mode
// ============================================================

function updateDemoButton() {
  if (!demoButton) return;

  demoButton.setAttribute('aria-pressed', String(demoMode));

  const icon = demoButton.querySelector('.button-icon');
  const label = demoButton.querySelector('.demo-button-label');

  if (icon) icon.textContent = demoMode ? '■' : '▶';
  if (label) label.textContent = demoMode ? 'Stop demo' : 'Explore demo';
}

function stopDemoMode() {
  demoMode = false;
  demoTaskId++;

  controls.autoRotate = false;

  updateDemoButton();
}

function waitForDemoInterval(taskId: number, milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

async function startDemoMode() {
  if (demoMode || !trapSelect) return;

  demoMode = true;
  const taskId = ++demoTaskId;

  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.45;

  updateDemoButton();

  try {
    let index = trapSequence.indexOf(trapSelect.value);

    while (demoMode && taskId === demoTaskId) {
      index = (index + 1) % trapSequence.length;

      const type = trapSequence[index];

      trapSelect.value = type;

      await loadTrapConfiguration(type);

      if (!demoMode || taskId !== demoTaskId) break;

      await waitForDemoInterval(taskId, 7000);
    }
  } catch (error) {
    console.error('Demo mode stopped:', error);
    stopDemoMode();
  }
}

demoButton?.addEventListener('click', () => {
  if (demoMode) {
    stopDemoMode();
  } else {
    void startDemoMode();
  }
});

// ============================================================
// Bootstrap
// ============================================================

async function bootstrap() {
  await loadTrapConfiguration('ioffe');

  if (!gridField) {
    throw new Error('FieldGrid was not initialized.');
  }

  bundleEuler = new SeedBundle(scene, gridField, {
    center: new THREE.Vector3(-1.5, 0, 0),
    radius: 0.6,
    count: 24,
    integrator: new EulerIntegrator(),
  });

  bundleEuler.seeds.forEach((seed) => {
    /*
    (seed.line.material as THREE.LineBasicMaterial)
      .color.setHex(0xff3333);
      */
      const material = seed.line.material as THREE.LineBasicMaterial;

      //material.color.setHex(0xff3333);
      material.color.setHex(0xff5555);
      material.linewidth = 1;
  });

  bundleRK4 = new SeedBundle(scene, gridField, {
    center: new THREE.Vector3(1.5, 0, 0),
    radius: 0.6,
    count: 24,
    integrator: new RK4Integrator(),
  });

  bundleRK4.seeds.forEach((seed) => {
    (seed.line.material as THREE.LineBasicMaterial)
      .color.setHex(0x33ff77);
  });

  seedBundleController = new SeedBundleController(
    [bundleEuler, bundleRK4],
    camera,
    renderer,
    controls,   
  );

  //if (uiPanel) {
  //  uiPanel.style.display = 'block';
  //}

  setupMobileControls();

  trapSelect?.addEventListener('change', async () => {
    if (demoMode) {
      stopDemoMode();
    }

    try {
      await loadTrapConfiguration(trapSelect.value);
    } catch {
      // The error is already logged by loadTrapConfiguration().
    }
  });

  const selectEuler = document.getElementById(
    'method-euler',
  ) as HTMLSelectElement | null;

  const selectRK4 = document.getElementById(
    'method-rk4',
  ) as HTMLSelectElement | null;

  selectEuler?.addEventListener('change', () => {
    if (selectEuler.value === 'rk4') {
      bundleEuler?.setIntegrator(new RK4Integrator());

      bundleEuler?.seeds.forEach((seed) => {
        (seed.line.material as THREE.LineBasicMaterial)
          .color.setHex(0x00d2ff);
      });
    } else {
      bundleEuler?.setIntegrator(new EulerIntegrator());

      bundleEuler?.seeds.forEach((seed) => {
        (seed.line.material as THREE.LineBasicMaterial)
          .color.setHex(0xff3333);
      });
    }
  });

  selectRK4?.addEventListener('change', () => {
    if (selectRK4.value === 'rk4') {
      bundleRK4?.setIntegrator(new RK4Integrator());

      bundleRK4?.seeds.forEach((seed) => {
        (seed.line.material as THREE.LineBasicMaterial)
          .color.setHex(0x33ff77);
      });
    } else {
      bundleRK4?.setIntegrator(new EulerIntegrator());

      bundleRK4?.seeds.forEach((seed) => {
        (seed.line.material as THREE.LineBasicMaterial)
          .color.setHex(0xffaa00);
      });
    }
  });
}

// ============================================================
// Animation
// ============================================================

function animate() {
  requestAnimationFrame(animate);

  controls.update();
  renderer.render(scene, camera);
}

animate();

bootstrap().catch((error) => {
  console.error('Application initialization failed:', error);

  if (loaderBox) {
    loaderBox.style.display = 'block';
    loaderBox.style.opacity = '1';
  }

  if (percentElement) {
    percentElement.innerText = 'Initialization failed — see Console';
  }
});