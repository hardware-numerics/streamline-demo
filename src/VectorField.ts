// vector-field.ts
import * as THREE from 'three';

export interface VectorField {
  B(position: THREE.Vector3): THREE.Vector3;
  direction(position: THREE.Vector3): THREE.Vector3;
}
