import * as THREE from 'three';
import type { VectorField } from './VectorField';

export interface Integrator {
  nextStep(field: VectorField, current: THREE.Vector3, stepSize: number, result: THREE.Vector3): THREE.Vector3;
}

// 1. Быстрый Эйлер (текущий метод)
export class EulerIntegrator implements Integrator {
  nextStep(field: VectorField, current: THREE.Vector3, stepSize: number, result: THREE.Vector3): THREE.Vector3 {
    const dir = field.direction(current);
    return result.copy(current).addScaledVector(dir, stepSize);
  }
}

// 2. Точный Рунге-Кутта 4-го порядка (Стандарт для науки)
const k1 = new THREE.Vector3();
const k2 = new THREE.Vector3();
const k3 = new THREE.Vector3();
const k4 = new THREE.Vector3();
const tmpPos = new THREE.Vector3();

export class RK4Integrator implements Integrator {
  nextStep(field: VectorField, current: THREE.Vector3, stepSize: number, result: THREE.Vector3): THREE.Vector3 {
    k1.copy(field.direction(current));

    tmpPos.copy(current).addScaledVector(k1, stepSize * 0.5);
    k2.copy(field.direction(tmpPos));

    tmpPos.copy(current).addScaledVector(k2, stepSize * 0.5);
    k3.copy(field.direction(tmpPos));

    tmpPos.copy(current).addScaledVector(k3, stepSize);
    k4.copy(field.direction(tmpPos));

    k2.multiplyScalar(2.0);
    k3.multiplyScalar(2.0);
    k1.add(k2).add(k3).add(k4);

    return result.copy(current).addScaledVector(k1, stepSize / 6.0);
  }
}
