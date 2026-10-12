import * as THREE from 'three';
import {
  type Filament,
  DEFAULT_FILAMENT_COLOR,
} from './filaments';

// ============================================================ // Cloverleaf Coil // ============================================================

export function makeCloverleaf({
  radius = 3.0,
  alpha = 0.5,
  currentOverC = 1.0,
  numPoints = 64,
  colors,
}: {
  radius?: number;
  alpha?: number;
  currentOverC?: number;
  numPoints?: number;
  colors?: THREE.ColorRepresentation[];
} = {}): Filament[] {
  const filaments: Filament[] = [];

  const generateLeaf = (
    rotZ: number,
    flipZ: boolean
  ): THREE.Vector3[] => {
    const points: THREE.Vector3[] = [];

    for (let i = 0; i < numPoints; i++) {
      const theta = (i / (numPoints - 1)) * Math.PI;

      const x =
        radius * Math.sin(theta) * Math.cos(2 * theta);

      const y =
        radius * Math.sin(theta) * Math.sin(2 * theta);

      const z = radius * Math.cos(theta) * alpha;

      const p = new THREE.Vector3(
        x,
        y,
        flipZ ? -z : z
      );

      p.applyAxisAngle(
        new THREE.Vector3(0, 0, 1),
        rotZ
      );

      points.push(p);
    }

    return points;
  };

  for (let k = 0; k < 4; k++) {
    const rotZ = (k * Math.PI) / 2;
    const isEven = k % 2 === 0;

    filaments.push({
      points: generateLeaf(rotZ, isEven),
      current: isEven ? currentOverC : -currentOverC,
      color: colors?.[k] ?? DEFAULT_FILAMENT_COLOR,
    });
  }

  return filaments;
}

/*
import * as THREE from 'three';

// Импортируем интерфейс Filament прямо из вашего старого файла, 
// чтобы гарантировать 100% совместимость типов
import { Filament } from './filaments'; 

// ==========================================
// Вспомогательные генераторы базовых петель
// ==========================================

function generateBaseballCoil(radius: number, alpha: number, numPoints: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < numPoints; i++) {
    const theta = (i / (numPoints - 1)) * Math.PI * 2;
    const denomX = Math.sqrt(1 - alpha * alpha * Math.sin(theta) * Math.sin(theta));
    const denomY = Math.sqrt(1 - alpha * alpha * Math.cos(theta) * Math.cos(theta));
    
    const x = radius * Math.cos(theta) * denomX;
    const y = radius * Math.sin(theta) * denomY;
    const z = radius * alpha * Math.cos(2 * theta);
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

function generateCloverLeaf(radius: number, alpha: number, numPoints: number, flipZ: boolean): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < numPoints; i++) {
    const theta = (i / (numPoints - 1)) * Math.PI;
    const x = radius * Math.sin(theta) * Math.cos(2 * theta);
    const y = radius * Math.sin(theta) * Math.sin(2 * theta);
    const z = radius * Math.cos(theta) * alpha;
    points.push(new THREE.Vector3(x, y, flipZ ? -z : z));
  }
  return points;
}

// ==========================================
// Экспорт новых конфигураций
// ==========================================

/// Одиночная бейсбольная ловушка (Минимум-B) 
export function makeSingleBaseball(
  { radius = 2.0, alpha = 0.65, currentOverC = 1.0, numPoints = 64 } = {}
): Filament[] {
  return [{ points: generateBaseballCoil(radius, alpha, numPoints), current: currentOverC }];
}

// Антипрокотрон / Бейсбольный тандем 
export function makeBaseballTandem(
  { radius = 1.5, alpha = 0.65, distanceZ = 4.0, currentOverC = 1.0, numPoints = 64, antiParallel = true } = {}
): Filament[] {
  const filaments: Filament[] = [];
  
  const leftPoints = generateBaseballCoil(radius, alpha, numPoints).map(p => {
    p.z -= distanceZ / 2;
    return p;
  });
  filaments.push({ points: leftPoints, current: currentOverC });

  const rightPoints = generateBaseballCoil(radius, alpha, numPoints).map(p => {
    p.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
    p.z += distanceZ / 2;
    return p;
  });
  filaments.push({ points: rightPoints, current: antiParallel ? -currentOverC : currentOverC });

  return filaments;
}

// Ловушка «Клевер» (Cloverleaf) 
export function makeCloverleaf(
  { radius = 2.0, alpha = 0.5, currentOverC = 1.0, numPoints = 64 } = {}
): Filament[] {
  const filaments: Filament[] = [];
  for (let k = 0; k < 4; k++) {
    const rotZ = (k * Math.PI) / 2;
    const isEven = k % 2 === 0;
    const leafPoints = generateCloverLeaf(radius, alpha, numPoints, isEven).map(p => {
      p.applyAxisAngle(new THREE.Vector3(0, 0, 1), rotZ);
      return p;
    });
    filaments.push({ points: leafPoints, current: isEven ? currentOverC : -currentOverC });
  }
  return filaments;
}
*/
// Стелларатор Торсатрон (L=2) с кольцами компенсации 
export function makeTorsatron({
  majorRadius = 2.5,
  minorRadius = 0.8,
  periods = 4,
  currentOverC = 1.0,
  numPoints = 200,
  colors,
}: {
  majorRadius?: number;
  minorRadius?: number;
  periods?: number;
  currentOverC?: number;
  numPoints?: number;
  colors?: THREE.ColorRepresentation[];
} = {}): Filament[] {
  const filaments: Filament[] = [];

  const generateHelix = (
    phiOffset: number
  ): THREE.Vector3[] => {
    const points: THREE.Vector3[] = [];

    for (let i = 0; i < numPoints; i++) {
      const phi = (i / (numPoints - 1)) * Math.PI * 2;
      const theta = periods * phi + phiOffset;
      const r = majorRadius + minorRadius * Math.cos(theta);

      points.push(
        new THREE.Vector3(
          r * Math.cos(phi),
          r * Math.sin(phi),
          minorRadius * Math.sin(theta)
        )
      );
    }

    return points;
  };

  // Helix 1
  filaments.push({
    points: generateHelix(0),
    current: currentOverC,
    color: colors?.[0] ?? DEFAULT_FILAMENT_COLOR,
  });

  // Helix 2
  filaments.push({
    points: generateHelix(Math.PI),
    current: currentOverC,
    color: colors?.[1] ?? DEFAULT_FILAMENT_COLOR,
  });

  const makeRing = (zOffset: number): THREE.Vector3[] => {
    const points: THREE.Vector3[] = [];

    for (let i = 0; i < 64; i++) {
      const phi = (i / 63) * Math.PI * 2;

      points.push(
        new THREE.Vector3(
          (majorRadius + minorRadius * 1.2) * Math.cos(phi),
          (majorRadius + minorRadius * 1.2) * Math.sin(phi),
          zOffset
        )
      );
    }

    return points;
  };

  // Upper compensation ring
  filaments.push({
    points: makeRing(minorRadius * 1.5),
    current: -currentOverC * 0.5,
    color: colors?.[2] ?? DEFAULT_FILAMENT_COLOR,
  });

  // Lower compensation ring
  filaments.push({
    points: makeRing(-minorRadius * 1.5),
    current: -currentOverC * 0.5,
    color: colors?.[3] ?? DEFAULT_FILAMENT_COLOR,
  });

  return filaments;
}

// Тороидальные D-катушки Токамака 

export function makeTokamakDCoils({
  R0 = 3.0,
  a = 1.0,
  numCoils = 12,
  numPoints = 64,
  currentOverC = 1.0,
  colors,
}: {
  R0?: number;
  a?: number;
  numCoils?: number;
  numPoints?: number;
  currentOverC?: number;
  colors?: THREE.ColorRepresentation[];
} = {}): Filament[] {
  const filaments: Filament[] = [];
  const basePoints: THREE.Vector3[] = [];

  for (let i = 0; i < numPoints; i++) {
    const t = (i / (numPoints - 1)) * Math.PI * 2;

    const r = R0 + a * Math.cos(t + 0.3 * Math.sin(t));
    const z = a * 1.3 * Math.sin(t);

    basePoints.push(
      new THREE.Vector3(r, 0, z)
    );
  }

  for (let c = 0; c < numCoils; c++) {
    const phi = (c / numCoils) * Math.PI * 2;

    const rotatedPoints = basePoints.map(
      p => p.clone().applyAxisAngle(
        new THREE.Vector3(0, 0, 1),
        phi
      )
    );

    filaments.push({
      points: rotatedPoints,
      current: currentOverC,
      color: colors?.[c] ?? DEFAULT_FILAMENT_COLOR,
    });
  }

  return filaments;
}