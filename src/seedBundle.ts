import * as THREE from 'three';
import type { VectorField } from './VectorField';
import type { Integrator } from './integrator';
import { EulerIntegrator } from './integrator'; // дефолтный
import { Seed } from './seed';

export interface SeedBundleOptions {
  center: THREE.Vector3;
  radius: number;
  count: number;
  integrator?: Integrator; // <-- Метод стал параметром для конкретного пучка
}

export class SeedBundle {
  readonly center: THREE.Vector3;
  readonly radius: number;
  readonly seeds: Seed[];
  readonly picker: THREE.Mesh;

  private scene: THREE.Scene;
  private field: VectorField;
  private integrator: Integrator; // Храним метод внутри пучка

  constructor(
    scene: THREE.Scene,
    field: VectorField,
    options: SeedBundleOptions
  ) {
    this.scene = scene;
    this.field = field;
    this.center = options.center.clone();
    this.radius = options.radius;
    this.seeds = [];
    
    // Если интегратор не передан, берем базовый метод Эйлера
    this.integrator = options.integrator || new EulerIntegrator();

    // --------------------------------------------------------
    // Invisible sphere used for mouse picking
    // --------------------------------------------------------
    const pickerGeometry = new THREE.SphereGeometry(options.radius, 24, 16);
    const pickerMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      visible: true, // <-- ГАРАНТИРУЕТ, ЧТО RAYCASTER НЕ ПРОЛЕТИТ МИМО СФЕРЫ
    });
    
    /*
    const pickerMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    */


    this.picker = new THREE.Mesh(pickerGeometry, pickerMaterial);
    this.picker.position.copy(this.center);
    scene.add(this.picker);

    // --------------------------------------------------------
    // Seeds on Fibonacci sphere
    // --------------------------------------------------------
    const positions = fibonacciSphere(options.count, options.radius);

    for (const position of positions) {
      position.add(this.center);

      // Передаем интегратор конкретного пучка в каждый его Seed
      const seed = new Seed(
        scene,
        this.field,
        position,
        this.integrator
      );

      this.seeds.push(seed);
    }
  }

  // Динамическая смена метода интеграции для ВСЕХ линий этого пучка
  public setIntegrator(newIntegrator: Integrator) {
    this.integrator = newIntegrator;
    for (const seed of this.seeds) {
      seed.setIntegrator(newIntegrator);
    }
  }

  // ==========================================================
  // Move entire bundle
  // ==========================================================
  moveTo(newCenter: THREE.Vector3) {
    const displacement = new THREE.Vector3().subVectors(newCenter, this.center);

    this.center.copy(newCenter);
    this.picker.position.copy(this.center);

    for (const seed of this.seeds) {
      const newPosition = seed.position.clone().add(displacement);
      seed.updatePosition(newPosition);
    }
  }
}

// ============================================================
// Fibonacci sphere
// ============================================================
function fibonacciSphere(count: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = count === 1 ? 0 : 1 - (2 * i) / (count - 1);
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;

    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;

    points.push(new THREE.Vector3(radius * x, radius * y, radius * z));
  }

  return points;
}
