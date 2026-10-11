
import './demo_style.css';

import * as THREE from 'three';

import {
  makeIoffePritchard,
  makeYinYang,
  makeMirrorOrCusp,
  addFilamentsToScene
} from './filaments';
import { makeCloverleaf,
  makeTorsatron,
  makeTokamakDCoils,} from './advancedFilaments';

import { MagneticField } from './field';
import { FieldGrid } from './fieldGrid';
import { SeedBundle } from './seedBundle';
import { EulerIntegrator, RK4Integrator } from './integrator';


// ============================================================
// Scene
// ============================================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x05070c);


// ============================================================
// Camera
// ============================================================

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.position.set(7, 5, 7);


// ============================================================
// Renderer
// ============================================================

const canvas = document.getElementById(
  'scene'
) as HTMLCanvasElement;

const demoTitle = document.getElementById(
  'demo-title'
) as HTMLDivElement;

const configurationNames: Record<string, string> = {
  ioffe: 'Ioffe–Pritchard',
  yinyang: 'Yin–Yang',
  mirror: 'Mirror Trap',
  cusp: 'Cusp Trap',
  torsatron: 'Torsarton',
};

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});

renderer.setPixelRatio(
  window.devicePixelRatio
);

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

//-----copyright

// 1. Создаем элемент для копирайта
const copyrightNotice = document.createElement('div');

// 2. Пишем текст на английском с лицензией MIT
const currentYear = new Date().getFullYear();
copyrightNotice.innerHTML = `&copy; ${currentYear} NE`;

// 3. Задаем стили прямо из кода, чтобы надпись была видна поверх canvas
copyrightNotice.style.position = 'fixed';
copyrightNotice.style.bottom = '40px';
copyrightNotice.style.left = '20%';
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
// Lighting
// ============================================================

const ambientLight = new THREE.AmbientLight(
  0xffffff,
  0.6
);

scene.add(ambientLight);


const dirLight1 = new THREE.DirectionalLight(
  0xffffff,
  0.8
);

dirLight1.position.set(5, 10, 7);

scene.add(dirLight1);


const dirLight2 = new THREE.DirectionalLight(
  0x00aaff,
  0.3
);

dirLight2.position.set(-5, -5, -5);

scene.add(dirLight2);


// ============================================================
// Simulation state
// ============================================================

let currentFilamentsGroup: THREE.Group | null = null;

let exactField: MagneticField | null = null;

let gridField: FieldGrid | null = null;

let bundleEuler: SeedBundle | null = null;

let bundleRK4: SeedBundle | null = null;


// ============================================================
// Demo settings
// ============================================================

const configurations = [
  'ioffe',
  'yinyang',
  'mirror',
  'cusp',
  'torsatron',
] as const;


// How long each configuration is shown

const CONFIG_DURATION = 5000;


// Camera orbit

const CAMERA_RADIUS = 9;

const CAMERA_HEIGHT = 5;

const CAMERA_SPEED = 0.005;


// ============================================================
// Helper
// ============================================================

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function updateDemoTitle(type: string) {

  if (!demoTitle) {
    return;
  }

  demoTitle.textContent =
    configurationNames[type] ?? type;
}

// ============================================================
// Remove field lines
// ============================================================
//
// We completely destroy the old SeedBundles.
//
// This is intentional for the demo: every configuration gets
// completely fresh field lines, so nothing can accumulate from
// previous configurations.
// ============================================================

function removeSeedBundles() {

  const bundles = [
    bundleEuler,
    bundleRK4
  ];

  bundles.forEach((bundle) => {

    if (!bundle) {
      return;
    }


    bundle.seeds.forEach((seed) => {

      // Remove line from scene

      scene.remove(seed.line);


      // Free geometry

      seed.line.geometry.dispose();


      // Free material

      if (Array.isArray(seed.line.material)) {

        seed.line.material.forEach((material) => {
          material.dispose();
        });

      } else {

        seed.line.material.dispose();

      }

    });

  });


  // Forget old bundles

  bundleEuler = null;

  bundleRK4 = null;
}


// ============================================================
// Remove old filaments
// ============================================================

function removeFilaments() {

  if (!currentFilamentsGroup) {
    return;
  }


  scene.remove(
    currentFilamentsGroup
  );


  currentFilamentsGroup.traverse((child) => {

    if (child instanceof THREE.Mesh) {

      child.geometry.dispose();

      if (Array.isArray(child.material)) {

        child.material.forEach((material) => {
          material.dispose();
        });

      } else {

        child.material.dispose();

      }

    }

  });


  currentFilamentsGroup = null;
}


// ============================================================
// Create filaments for configuration
// ============================================================

function createFilaments(type: string) {
  
  if (type === 'yinyang') {

    return makeYinYang({
      numPoints: 32,
        colors: [
          0x00bcd4,
          0xffa726,
        ],
      });

  }

  if (type === 'mirror') {

    return makeMirrorOrCusp(false, {colors: [0xffc0cb, 0xffc0cb]});

  }


  if (type === 'cusp') {

    return makeMirrorOrCusp(true, {colors: [0xffc0cb, 0x557799]});

  }

  if (type === 'torsatron') {

    return makeTorsatron({
      colors: [
        0xff5533,
        0x557799,
        0xffc0cb,
        0xffc0cb,
      ],
    });;

  }

  return makeIoffePritchard({
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
  });;
}


// ============================================================
// Create seed bundles
// ============================================================

function createSeedBundles() {

  if (!gridField) {

    throw new Error(
      'Cannot create seed bundles before gridField exists.'
    );

  }


  // ----------------------------------------------------------
  // Euler bundle
  // ----------------------------------------------------------

  bundleEuler = new SeedBundle(
    scene,
    gridField,
    {
      center: new THREE.Vector3(
        -1.5,
        0,
        0
      ),

      radius: 0.6,

      count: 24,

      integrator: new EulerIntegrator()
    }
  );


  bundleEuler.seeds.forEach((seed) => {

    seed.line.material.color.setHex(
      0xff3333
    );

  });


  // ----------------------------------------------------------
  // RK4 bundle
  // ----------------------------------------------------------

  bundleRK4 = new SeedBundle(
    scene,
    gridField,
    {
      center: new THREE.Vector3(
        1.5,
        0,
        0
      ),

      radius: 0.6,

      count: 24,

      integrator: new RK4Integrator()
    }
  );


  bundleRK4.seeds.forEach((seed) => {

    seed.line.material.color.setHex(
      0x33ff77
    );

  });
}


// ============================================================
// Load one configuration
// ============================================================

async function loadTrapConfiguration(
  type: string
) {
  updateDemoTitle(type);
  console.log(
    `Loading configuration: ${type}`
  );


  // ----------------------------------------------------------
  // IMPORTANT:
  //
  // Remove ALL old field lines before doing anything else.
  // ----------------------------------------------------------

  removeSeedBundles();


  // ----------------------------------------------------------
  // Remove old coils / filaments
  // ----------------------------------------------------------

  removeFilaments();


  // ----------------------------------------------------------
  // Create new filaments
  // ----------------------------------------------------------

  const filaments =
    createFilaments(type);


  // ----------------------------------------------------------
  // Put new filaments into scene
  // ----------------------------------------------------------

  currentFilamentsGroup =
    addFilamentsToScene(
      scene,
      filaments
    );


  // ----------------------------------------------------------
  // Create exact magnetic field
  // ----------------------------------------------------------

  exactField =
    new MagneticField(
      filaments
    );


  // ----------------------------------------------------------
  // Create FieldGrid once
  // ----------------------------------------------------------

  if (!gridField) {

    gridField = new FieldGrid(
      exactField,
      {
        min: new THREE.Vector3(
          -4,
          -4,
          -4
        ),

        max: new THREE.Vector3(
          4,
          4,
          4
        ),

        nx: 32,
        ny: 32,
        nz: 32,

        onProgress: () => {}
      }
    );

  } else {

    // Reuse existing grid object,
    // but give it the new exact field.

    (gridField as any).field =
      exactField;

  }


  // ----------------------------------------------------------
  // Calculate the new field
  // ----------------------------------------------------------

  await gridField.init();


  // ----------------------------------------------------------
  // Field is ready.
  //
  // Create completely fresh field lines.
  // ----------------------------------------------------------

  createSeedBundles();


  console.log(
    `Configuration ready: ${type}`
  );
}


// ============================================================
// Camera animation
// ============================================================

let cameraAngle = 0;


function updateCamera() {

  cameraAngle += CAMERA_SPEED;


  camera.position.x =
    Math.cos(cameraAngle)
    * CAMERA_RADIUS;


  camera.position.z =
    Math.sin(cameraAngle)
    * CAMERA_RADIUS;


  camera.position.y =
    CAMERA_HEIGHT;


  camera.lookAt(
    0,
    0,
    0
  );
}


// ============================================================
// Demo loop
// ============================================================

async function runDemo() {

  console.log(
    'Starting Streamline demo'
  );


  while (true) {

    for (const config of configurations) {

      // Completely rebuild the visible simulation

      await loadTrapConfiguration(
        config
      );

      //updateDemoTitle(config);

      console.log(
        `Showing: ${config}`
      );


      // Let the viewer enjoy it

      await sleep(
        CONFIG_DURATION
      );

    }

  }
}


// ============================================================
// Render loop
// ============================================================

function animate() {

  requestAnimationFrame(
    animate
  );


  updateCamera();


  renderer.render(
    scene,
    camera
  );
}


// ============================================================
// Start
// ============================================================

animate();

runDemo();


// ============================================================
// Resize
// ============================================================

window.addEventListener(
  'resize',
  () => {

    camera.aspect =
      window.innerWidth
      / window.innerHeight;


    camera.updateProjectionMatrix();


    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );

  }
);
