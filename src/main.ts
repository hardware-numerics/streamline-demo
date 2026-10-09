import './style.css';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { makeIoffePritchard, makeYinYang, makeMirrorOrCusp, addFilamentsToScene } from './filaments';
import { makeCloverleaf, makeTorsatron, makeTokamakDCoils} from './advancedFilaments';
import { MagneticField } from './field';
import { FieldGrid } from './fieldGrid';
import { SeedBundle } from './seedBundle';
import { SeedBundleController } from './seedBundleController';
import { EulerIntegrator, RK4Integrator } from './integrator';

const percentElement = document.getElementById('loader-percent');
const loaderBox = document.getElementById('loader');
const uiPanel = document.getElementById('ui-panel');

// ============================================================
// Scene & Camera
// ============================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070c);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(7, 7, 7);

// ============================================================
// Renderer & Controls (Связываем с существующим Canvas)
// ============================================================
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('scene') as HTMLCanvasElement, // Наш хук в HTML
  antialias: true,
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.update();

// ============================================================
// Lighting (Добавляем свет для блеска катушек)
// ============================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Мягкий общий свет
scene.add(ambientLight);

const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8); // Направленный белый свет сверху
dirLight1.position.set(5, 10, 7);
scene.add(dirLight1);

const dirLight2 = new THREE.DirectionalLight(0x00aaff, 0.3); // Красивая голубая подсветка снизу для хайтек-эффекта
dirLight2.position.set(-5, -5, -5);
scene.add(dirLight2);

// Глобальные переменные состояния приложения
let currentFilamentsGroup: THREE.Group | null = null;
let exactField: MagneticField | null = null;
let gridField: FieldGrid | null = null;

let bundleEuler: SeedBundle | null = null;
let bundleRK4: SeedBundle | null = null;
let seedBundleController: SeedBundleController | null = null;

// ============================================================
// Animation Loop
// ============================================================
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// ============================================================
// Функция пересчета и смены ловушки
// ============================================================
async function loadTrapConfiguration(type: string) {
  // Скрываем старые силовые линии сразу при переключении
  bundleEuler?.seeds.forEach(s => {
    s.line.visible = false;
  });

  bundleRK4?.seeds.forEach(s => {
    s.line.visible = false;
  });

  // 1. Включаем лоадер
  if (loaderBox && percentElement) {
    percentElement.innerText = '0%';
    loaderBox.style.display = 'block';
    loaderBox.style.opacity = '1';
  }

  // 2. Удаляем старые катушки со сцены, если они были
    // main.ts — внутри функции loadTrapConfiguration():
  // Находим блок очистки старых катушек и меняем THREE.Line на THREE.Mesh:
  if (currentFilamentsGroup) {
    scene.remove(currentFilamentsGroup);
    currentFilamentsGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) { // <-- поменяли на THREE.Mesh
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
  }

  
  // 3. Генерируем новые филаменты
  let filaments;
  if (type === 'yinyang') {
    filaments = makeYinYang({ numPoints: 32 }); // 32 точки — баланс точности и скорости!
  } else if (type === 'mirror') {
    filaments = makeMirrorOrCusp(false); // Пробкотрон
  } else if (type === 'cusp') {
    filaments = makeMirrorOrCusp(true);  // Антипробкотрон
  } else if (type === 'cloverleaf') { //Klever
    filaments = makeCloverleaf();
  } else if (type === 'torsatron') { //Torsatron makeTokamakDCoils
    filaments = makeTorsatron();
  } else if (type === 'tokamak') { //Torsatron makeTokamakDCoils
    filaments = makeTokamakDCoils();
  } 
  else {
    filaments = makeIoffePritchard();    // Иоффе-Притчард
  }

  // 4. Отрисовываем новые катушки и запоминаем ссылку на группу
  currentFilamentsGroup = addFilamentsToScene(scene, filaments);

  // 5. Строим математику поля
  exactField = new MagneticField(filaments);

  // 6. Если сетка еще не создавалась — конструируем её
  if (!gridField) {
    gridField = new FieldGrid(exactField, {
      min: new THREE.Vector3(-4, -4, -4),
      max: new THREE.Vector3(4, 4, 4),
      nx: 32, ny: 32, nz: 32,
      onProgress: (percent) => {
        if (percentElement) percentElement.innerText = `${percent}%`;
      }
    });
  } else {
    // Если сетка уже есть, просто подменяем ей внутреннее точное поле
    // (для этого в вашем классе FieldGrid свойство field должно быть доступно или используйте хак):
    (gridField as any).field = exactField;
  }

  // 7. Запускаем асинхронный расчет слоев сетки (прогресс-бар бежит сам!)
  await gridField.init();

  // 8. Прячем лоадер
  if (loaderBox) {
    loaderBox.style.opacity = '0';
    setTimeout(() => loaderBox.style.display = 'none', 500);
  }

  // 9. Если пучки уже созданы — просто говорим им пересчитаться на новом поле
  if (bundleEuler && bundleRK4) {
    (bundleEuler as any).field = gridField;
    (bundleRK4 as any).field = gridField;
  
    // Пересчитываем линии в новом поле
    bundleEuler.moveTo(bundleEuler.center);
    bundleRK4.moveTo(bundleRK4.center);
  
    // Показываем обновлённые линии
    bundleEuler.seeds.forEach(s => {
      s.line.visible = true;
    });
  
    bundleRK4.seeds.forEach(s => {
      s.line.visible = true;
    });
  }
  /*
  if (bundleEuler && bundleRK4) {
    // Подменяем поле внутри пучков (у нас там тип VectorField, сетка подходит идеально)
    (bundleEuler as any).field = gridField;
    (bundleRK4 as any).field = gridField;
    
    // Сдвигаем пучки в их текущие центры, чтобы спровоцировать перерасчет линий
    bundleEuler.moveTo(bundleEuler.center);
    bundleRK4.moveTo(bundleRK4.center);
  }
    */
}

// ============================================================
// Bootstrapping (Первичный запуск)
// ============================================================
async function bootstrap() {
  // Первым делом загружаем дефолтную ловушку Иоффе-Притчарда
  await loadTrapConfiguration('ioffe');

  // Создаем пучки (Красный - Эйлер, Зеленый - RK4)
  bundleEuler = new SeedBundle(scene, gridField!, {
    center: new THREE.Vector3(-1.5, 0, 0),
    radius: 0.6,
    count: 24,
    integrator: new EulerIntegrator()
  });
  bundleEuler.seeds.forEach(s => (s.line.material as THREE.LineBasicMaterial).color.setHex(0xff3333));

  bundleRK4 = new SeedBundle(scene, gridField!, {
    center: new THREE.Vector3(1.5, 0, 0),
    radius: 0.6,
    count: 24,
    integrator: new RK4Integrator()
  });
  bundleRK4.seeds.forEach(s => (s.line.material as THREE.LineBasicMaterial).color.setHex(0x33ff77));

  // Подключаем управление мышью
  seedBundleController = new SeedBundleController(
    [bundleEuler, bundleRK4],
    camera,
    renderer,
    controls
  );

  // Показываем панель управления
  if (uiPanel) uiPanel.style.display = 'block';

  // Навешиваем листенеры на выбор ловушек
  const trapSelect = document.getElementById('trap-config') as HTMLSelectElement;
  if (trapSelect) {
    trapSelect.addEventListener('change', async (e) => {
      const selectedTrap = (e.target as HTMLSelectElement).value;
      await loadTrapConfiguration(selectedTrap);
    });
  }

  // Вешаем листенеры на селекторы методов
  const selectEuler = document.getElementById('method-euler') as HTMLSelectElement;
  const selectRK4 = document.getElementById('method-rk4') as HTMLSelectElement;

  if (selectEuler) {
    selectEuler.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value;
      if (val === 'rk4') {
        bundleEuler?.setIntegrator(new RK4Integrator());
        bundleEuler?.seeds.forEach(s => (s.line.material as THREE.LineBasicMaterial).color.setHex(0x00d2ff));
      } else {
        bundleEuler?.setIntegrator(new EulerIntegrator());
        bundleEuler?.seeds.forEach(s => (s.line.material as THREE.LineBasicMaterial).color.setHex(0xff3333));
      }
    });
  }

  if (selectRK4) {
    selectRK4.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value;
      if (val === 'rk4') {
        bundleRK4?.setIntegrator(new RK4Integrator());
        bundleRK4?.seeds.forEach(s => (s.line.material as THREE.LineBasicMaterial).color.setHex(0x33ff77));
      } else {
        bundleRK4?.setIntegrator(new EulerIntegrator());
        bundleRK4?.seeds.forEach(s => (s.line.material as THREE.LineBasicMaterial).color.setHex(0xffaa00));
      }
    });
  }
}

bootstrap();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
