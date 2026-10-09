import * as THREE from 'three';
import type { VectorField } from './VectorField'; // Импортируем интерфейс поля
import type { Integrator } from './integrator';    // Импортируем интерфейс интегратора
import { EulerIntegrator } from './integrator';    // Дефолтный метод на всякий случай
import { calculateStreamline } from './streamline';

export class Seed {
  readonly position: THREE.Vector3;
  readonly marker: THREE.Mesh;
  readonly line: THREE.Line;

  private field: VectorField; // Сменили тип на интерфейс
  private scene: THREE.Scene;
  private integrator: Integrator; // Сохраняем метод численного интегрирования

  private options: {
    stepSize: number;
    maxSteps: number;
    minField: number;
    integrator: Integrator; // Добавляем интегратор в объект опций
  };

  constructor(
    scene: THREE.Scene,
    field: VectorField, // Сменили тип на интерфейс
    position: THREE.Vector3,
    integrator?: Integrator // Принимаем четвертым параметром из SeedBundle
  ) {
    this.scene = scene;
    this.field = field;
    this.position = position.clone();
    this.integrator = integrator || new EulerIntegrator();

    // --------------------------------------------------------
    // Seed marker
    // --------------------------------------------------------
    const geometry = new THREE.SphereGeometry(0.08, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
    });
    this.marker = new THREE.Mesh(geometry, material);
    this.marker.position.copy(this.position);
    scene.add(this.marker);

    // --------------------------------------------------------
    // Streamline configuration
    // --------------------------------------------------------
    this.options = {
      stepSize: 0.05,
      maxSteps: 600,
      minField: 1e-12,
      integrator: this.integrator // Записываем в опции расчета линий
    };

    const points = calculateStreamline(
      this.field,
      this.position,
      this.options
    );

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x66ccff,
    });

    this.line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(this.line);
  }

  // ==========================================================
  // Метод динамической смены интегратора (вызывается из SeedBundle)
  // ==========================================================
  public setIntegrator(newIntegrator: Integrator) {
    this.integrator = newIntegrator;
    this.options.integrator = newIntegrator;
    
    // Сразу же пересчитываем линию по новой математике
    this.rebuildLine();
  }

  // ==========================================================
  // Move seed & recalculate streamline
  // ==========================================================
  updatePosition(position: THREE.Vector3) {
    this.position.copy(position);
    this.marker.position.copy(position);
    this.rebuildLine();
  }

  // Вспомогательный приватный метод, чтобы убрать дублирование кода

  private rebuildLine() {
    // ГАРАНТИРУЕМ, что в опциях лежит правильный интегратор пучка
    this.options.integrator = this.integrator;
  
    const points = calculateStreamline(
      this.field,
      this.position,
      this.options // <-- Передаем объект опций, где сидит наш RK4 или Эйлер
    );
  
    this.line.geometry.dispose();
    this.line.geometry = new THREE.BufferGeometry().setFromPoints(points);
  }
}
  