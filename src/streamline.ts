import * as THREE from 'three';

import {
  MagneticField,
} from './field';


export interface StreamlineOptions {

  stepSize: number;

  maxSteps: number;

  minField: number;
}


export const defaultStreamlineOptions:
  StreamlineOptions = {

    stepSize: 0.05,

    maxSteps: 400,

    minField: 1e-12,
  };

/*
function integrateDirection(
  field: MagneticField,
  start: THREE.Vector3,
  sign: number,
  options: StreamlineOptions
): THREE.Vector3[] {

  const points: THREE.Vector3[] = [];

  let position =
    start.clone();


  for (
    let i = 0;
    i < options.maxSteps;
    i++
  ) {

    const direction =
      field.direction(
        position
      );


    if (
      direction.lengthSq() <
      options.minField
    ) {
      break;
    }


    position =
      position.clone()
        .addScaledVector(
          direction,
          sign * options.stepSize
        );


    points.push(
      position.clone()
    );
  }


  return points;
}
*/

function integrateDirection(
  field: VectorField,
  start: THREE.Vector3,
  sign: number,
  options: StreamlineOptions
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const position = start.clone();
  const nextPos = new THREE.Vector3();
  const signedStep = sign * options.stepSize;

  // КРИТИЧЕСКИ ВАЖНО: берем интегратор из переданных опций!
  const integrator = options.integrator; 
  
  if (!integrator) {
    console.error("Интегратор не передан в options!");
    return [];
  }

  for (let i = 0; i < options.maxSteps; i++) {
    const direction = field.direction(position);
    if (direction.lengthSq() < options.minField) {
      break;
    }

    // Шаг делает именно тот алгоритм, который мы просили
    integrator.nextStep(field, position, signedStep, nextPos);

    position.copy(nextPos);
    points.push(position.clone());
  }

  return points;
}


export function calculateStreamline(
  field: MagneticField,
  seed: THREE.Vector3,
  options:
    StreamlineOptions =
      defaultStreamlineOptions
): THREE.Vector3[] {

  const seedPosition =
    new THREE.Vector3(
      seed.x,
      seed.y,
      seed.z
    );


  const backward =
    integrateDirection(
      field,
      seedPosition,
      -1,
      options
    );


  const forward =
    integrateDirection(
      field,
      seedPosition,
      +1,
      options
    );


  backward.reverse();


  return [
    ...backward,
    seedPosition.clone(),
    ...forward,
  ];
}
