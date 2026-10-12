
import * as THREE from 'three';

// ============================================================
// Filament interface
// ============================================================

export interface Filament {
  points: THREE.Vector3[];
  current: number;
  color?: THREE.ColorRepresentation;
}

// Цвет по умолчанию для филаментов,
// созданных в других конфигурациях без указания color.
export const DEFAULT_FILAMENT_COLOR: THREE.ColorRepresentation = 0xff5533;

// ============================================================
// Circle
// ============================================================

export function circleCurve(
  radius: number,
  n: number = 128
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];

  for (let i = 0; i < n; i++) {
    const phi = 2 * Math.PI * i / (n - 1);

    points.push(
      new THREE.Vector3(
        radius * Math.cos(phi),
        radius * Math.sin(phi),
        0
      )
    );
  }

  return points;
}

// ============================================================
// Racetrack
// ============================================================

export function racetrackCurve(
  halfLength: number,
  radius: number,
  nStraight: number = 40,
  nArc: number = 32
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];

  // Top straight section
  for (let i = 0; i < nStraight; i++) {
    const t = i / nStraight;
    const x = -halfLength + 2 * halfLength * t;

    points.push(
      new THREE.Vector3(x, radius, 0)
    );
  }

  // Right cap
  for (let i = 0; i <= nArc; i++) {
    const theta = Math.PI * i / nArc;

    const x = halfLength + radius * Math.sin(theta);
    const y = radius * Math.cos(theta);

    points.push(
      new THREE.Vector3(x, y, 0)
    );
  }

  // Bottom straight section
  for (let i = 0; i < nStraight; i++) {
    const t = i / nStraight;
    const x = halfLength - 2 * halfLength * t;

    points.push(
      new THREE.Vector3(x, -radius, 0)
    );
  }

  // Left cap
  for (let i = 0; i <= nArc; i++) {
    const theta = Math.PI * i / nArc;

    const x = -halfLength - radius * Math.sin(theta);
    const y = -radius * Math.cos(theta);

    points.push(
      new THREE.Vector3(x, y, 0)
    );
  }

  return points;
}

// ============================================================
// Transformations
// ============================================================

export function transformCurve(
  points: THREE.Vector3[],
  center: THREE.Vector3,
  rotation?: THREE.Matrix3
): THREE.Vector3[] {
  return points.map(point => {
    const p = point.clone();

    if (rotation) {
      p.applyMatrix3(rotation);
    }

    p.add(center);
    return p;
  });
}

export function rotationZ(phi: number): THREE.Matrix3 {
  const c = Math.cos(phi);
  const s = Math.sin(phi);

  return new THREE.Matrix3().set(
    c, -s, 0,
    s,  c, 0,
    0,  0, 1
  );
}

// ============================================================
// Ioffe-Pritchard configuration
// ============================================================

export function makeIoffePritchard({
  barRadius = 1.5,//2.5,
  barHalfLength = 2.2,
  barRadiusCoil = 0.40,
  ringRadius = 1.5,
  ringZ = 2.8,
  barCurrentPattern = [0.5, -0.5, 0.5, -0.5],
  currentOverC = 1.0,
  barColors,
  ringColors,
}: {
  barRadius?: number;
  barHalfLength?: number;
  barRadiusCoil?: number;
  ringRadius?: number;
  ringZ?: number;
  barCurrentPattern?: number[];
  currentOverC?: number;
  barColors?: THREE.ColorRepresentation[];
  ringColors?: THREE.ColorRepresentation[];
} = {}): Filament[] {
  const filaments: Filament[] = [];

  const base = racetrackCurve(
    barHalfLength,
    barRadiusCoil
  );

  const orient = new THREE.Matrix3().set(
    0, 0, 1,
    0, 1, 0,
   -1, 0, 0
  );

  // Four Ioffe bars
  for (let k = 0; k < 4; k++) {
    const phi = k * Math.PI / 2;

    const center = new THREE.Vector3(
      barRadius * Math.cos(phi),
      barRadius * Math.sin(phi),
      0
    );

    const combined = rotationZ(phi).multiply(orient);

    const curve = transformCurve(
      base,
      center,
      combined
    );

    const current = currentOverC * (
      barCurrentPattern[k] ?? 1.5
    );

    filaments.push({
      points: curve,
      current,
      color: barColors?.[k] ?? DEFAULT_FILAMENT_COLOR,
    });
  }

  // Two pinch coils
  const ring = circleCurve(ringRadius);

  for (let i = 0; i < 2; i++) {
    const z0 = i === 0 ? -ringZ : ringZ;

    const curve = transformCurve(
      ring,
      new THREE.Vector3(0, 0, z0)
    );

    filaments.push({
      points: curve,
      current: currentOverC,
      color: ringColors?.[i] ?? DEFAULT_FILAMENT_COLOR,
    });
  }

  return filaments;
}

// ============================================================
// Yin-Yang configuration
// ============================================================

export function makeYinYang({
  radius = 2.0,
  alpha = 0.75,
  currentOverC = 1.0,
  numPoints = 32,
  colors,
}: {
  radius?: number;
  alpha?: number;
  currentOverC?: number;
  numPoints?: number;
  colors?: THREE.ColorRepresentation[];
} = {}): Filament[] {
  const filaments: Filament[] = [];

  const generateYinYangCurve = (
    rotZ: number
  ): THREE.Vector3[] => {
    const points: THREE.Vector3[] = [];

    for (let i = 0; i < numPoints; i++) {
      const theta =
        (i / (numPoints - 1)) * Math.PI * 2;

      const xLocal =
        radius * Math.cos(theta) *
        Math.sqrt(
          1 - alpha * alpha *
          Math.sin(theta) * Math.sin(theta)
        );

      const yLocal =
        radius * Math.sin(theta) *
        Math.sqrt(
          1 - alpha * alpha *
          Math.cos(theta) * Math.cos(theta)
        );

      const zLocal =
        radius * alpha * Math.cos(2 * theta);

      const p = new THREE.Vector3(
        xLocal,
        yLocal,
        zLocal
      );

      if (rotZ !== 0) {
        p.applyAxisAngle(
          new THREE.Vector3(0, 0, 1),
          rotZ
        );

        const tmp = p.x;
        p.x = p.z;
        p.z = tmp;
        p.y = -p.y;
      }

      points.push(p);
    }

    return points;
  };

  // First coil
  filaments.push({
    points: generateYinYangCurve(0),
    current: currentOverC,
    color: colors?.[0] ?? DEFAULT_FILAMENT_COLOR,
  });

  // Second coil
  filaments.push({
    points: generateYinYangCurve(Math.PI / 2),
    current: currentOverC,
    color: colors?.[1] ?? DEFAULT_FILAMENT_COLOR,
  });

  return filaments;
}

// ============================================================
// Classical Mirror & Cusp traps
// ============================================================

export function makeMirrorOrCusp(
  isCusp: boolean,
  {
    ringRadius = 1.8,
    ringZ = 2.0,
    currentOverC = 1.0,
    colors,
  }: {
    ringRadius?: number;
    ringZ?: number;
    currentOverC?: number;
    colors?: THREE.ColorRepresentation[];
  } = {}
): Filament[] {
  const filaments: Filament[] = [];
  const ring = circleCurve(ringRadius);

  // First coil
  filaments.push({
    points: transformCurve(
      ring,
      new THREE.Vector3(0, 0, -ringZ)
    ),
    current: currentOverC,
    color: colors?.[0] ?? DEFAULT_FILAMENT_COLOR,
  });

  // Second coil
  filaments.push({
    points: transformCurve(
      ring,
      new THREE.Vector3(0, 0, ringZ)
    ),
    current: currentOverC * (isCusp ? -1 : 1),
    color: colors?.[1] ?? DEFAULT_FILAMENT_COLOR,
  });

  return filaments;
}

// ============================================================
// Rendering
// ============================================================

export function addFilamentsToScene(
  scene: THREE.Scene,
  filaments: Filament[]
): THREE.Group {
  const group = new THREE.Group();

  // Cache materials to avoid creating duplicates
  // for filaments that use the same color.
  const materialCache = new Map<
    THREE.ColorRepresentation,
    THREE.MeshStandardMaterial
  >();

  function getMaterial(
    color: THREE.ColorRepresentation
  ): THREE.MeshStandardMaterial {
    let material = materialCache.get(color);

    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.45,
        roughness: 0.15,
        side: THREE.DoubleSide,
      });

      materialCache.set(color, material);
    }

    return material;
  }

  for (const f of filaments) {
    if (f.points.length < 2) continue;

    const isClosed =
      f.points[0].distanceTo(
        f.points[f.points.length - 1]
      ) < 1e-4;

    const curve = new THREE.CatmullRomCurve3(
      f.points,
      isClosed
    );

    const tubeGeometry = new THREE.TubeGeometry(
      curve,
      64,
      0.1,
      8,
      isClosed
    );

    // Explicit color takes priority.
    // Otherwise use the default color.
    const color = f.color ?? DEFAULT_FILAMENT_COLOR;
    const material = getMaterial(color);

    const mesh = new THREE.Mesh(
      tubeGeometry,
      material
    );

    mesh.name = `filament-current-${f.current}`;

    group.add(mesh);
  }

  scene.add(group);
  return group;
}

// ============================================================
// Multipole Ioffe-Pritchard configuration
// Experimental: quadrupole, octupole, and higher multipoles
// ============================================================

export function makeMultipoleIoffePritchard({
  barCount = 4,

  barRadius = 1.5,
  barHalfLength = 2.5,
  barRadiusCoil = 0.30,

  ringRadius = 1.5,
  ringZ = 2.8,

  barCurrent = 1.5,
  ringCurrent = 1.0,
  currentOverC = 1.0,

  barCurrentPattern,
  barColors,
  ringColors,

  includePinchCoils = true,
}: {
  barCount?: number;

  barRadius?: number;
  barHalfLength?: number;
  barRadiusCoil?: number;

  ringRadius?: number;
  ringZ?: number;

  barCurrent?: number;
  ringCurrent?: number;
  currentOverC?: number;

  barCurrentPattern?: number[];
  barColors?: THREE.ColorRepresentation[];
  ringColors?: THREE.ColorRepresentation[];

  includePinchCoils?: boolean;
} = {}): Filament[] {

  // ----------------------------------------------------------
  // Validate configuration
  // ----------------------------------------------------------

  if (!Number.isInteger(barCount) || barCount < 4 || barCount % 2 !== 0) {
    throw new Error(
      'barCount must be an even integer greater than or equal to 4.'
    );
  }

  const filaments: Filament[] = [];

  // ----------------------------------------------------------
  // Base racetrack geometry
  // ----------------------------------------------------------

  const base = racetrackCurve(
    barHalfLength,
    barRadiusCoil
  );

  // Map the racetrack's long axis onto the Z axis.
  const orient = new THREE.Matrix3().set(
     0, 0, 1,
     0, 1, 0,
    -1, 0, 0
  );

  // ----------------------------------------------------------
  // Multipole bars
  // ----------------------------------------------------------

  for (let k = 0; k < barCount; k++) {

    const phi = 2 * Math.PI * k / barCount;

    const center = new THREE.Vector3(
      barRadius * Math.cos(phi),
      barRadius * Math.sin(phi),
      0
    );

    const combined = rotationZ(phi).multiply(
      orient.clone()
    );

    const curve = transformCurve(
      base,
      center,
      combined
    );

    // Alternating current directions:
    // + - + - + - ...
    const normalizedCurrent =
      barCurrentPattern?.[k] ??
      (k % 2 === 0 ? barCurrent : -barCurrent);

    const current = currentOverC * normalizedCurrent;

    filaments.push({
      points: curve,
      current,
      color: barColors?.[k] ?? DEFAULT_FILAMENT_COLOR,
    });
  }

  // ----------------------------------------------------------
  // Optional pinch coils
  // ----------------------------------------------------------

  if (includePinchCoils) {

    const ring = circleCurve(ringRadius);

    for (let i = 0; i < 2; i++) {

      const z0 = i === 0 ? -ringZ : ringZ;

      const curve = transformCurve(
        ring,
        new THREE.Vector3(0, 0, z0)
      );

      filaments.push({
        points: curve,
        current: currentOverC * ringCurrent,
        color: ringColors?.[i] ?? DEFAULT_FILAMENT_COLOR,
      });
    }
  }

  return filaments;
}
