
import * as THREE from 'three';


export interface Filament {
  points: THREE.Vector3[];
  current: number;
}


// --------------------------------------------------
// Circle
// --------------------------------------------------

export function circleCurve(
  radius: number,
  n: number = 128
): THREE.Vector3[] {

  const points: THREE.Vector3[] = [];

  for (let i = 0; i < n; i++) {

    const phi =
      2 * Math.PI * i / n;

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


export function racetrackCurve(
  halfLength: number,
  radius: number,
  nStraight: number = 40,
  nArc: number = 32
): THREE.Vector3[] {

  const points: THREE.Vector3[] = [];


  // ------------------------------------------------
  // Top straight section
  //
  // (-L, +R) -> (+L, +R)
  // ------------------------------------------------

  for (let i = 0; i < nStraight; i++) {

    const t =
      i / nStraight;

    const x =
      -halfLength +
      2 * halfLength * t;

    points.push(
      new THREE.Vector3(
        x,
        radius,
        0
      )
    );
  }


  // ------------------------------------------------
  // Right cap
  //
  // (+L, +R) -> (+L, -R)
  //
  // Center: (+L, 0)
  // ------------------------------------------------

  for (let i = 0; i <= nArc; i++) {

    const theta =
      Math.PI * i / nArc;

    const x =
      halfLength +
      radius * Math.sin(theta);

    const y =
      radius * Math.cos(theta);

    points.push(
      new THREE.Vector3(
        x,
        y,
        0
      )
    );
  }


  // ------------------------------------------------
  // Bottom straight section
  //
  // (+L, -R) -> (-L, -R)
  // ------------------------------------------------

  for (let i = 0; i < nStraight; i++) {

    const t =
      i / nStraight;

    const x =
      halfLength -
      2 * halfLength * t;

    points.push(
      new THREE.Vector3(
        x,
        -radius,
        0
      )
    );
  }


  // ------------------------------------------------
  // Left cap
  //
  // (-L, -R) -> (-L, +R)
  //
  // Center: (-L, 0)
  // ------------------------------------------------

  for (let i = 0; i <= nArc; i++) {

    const theta =
      Math.PI * i / nArc;

    const x =
      -halfLength -
      radius * Math.sin(theta);

    const y =
      -radius * Math.cos(theta);

    points.push(
      new THREE.Vector3(
        x,
        y,
        0
      )
    );
  }


  return points;
}



export function transformCurve(
  points: THREE.Vector3[],
  center: THREE.Vector3,
  rotation?: THREE.Matrix3
): THREE.Vector3[] {

  return points.map(
    point => {

      const p =
        point.clone();

      if (rotation) {
        p.applyMatrix3(
          rotation
        );
      }

      p.add(center);

      return p;
    }
  );
}

export function rotationZ(
  phi: number
): THREE.Matrix3 {

  const c =
    Math.cos(phi);

  const s =
    Math.sin(phi);

  return new THREE.Matrix3()
    .set(
       c, -s, 0,
       s,  c, 0,
       0,  0, 1
    );
}

export function makeIoffePritchard(
  {
    barRadius = 1.5,
    barHalfLength = 2.5,
    barRadiusCoil = 0.30,

    ringRadius = 1.5,
    ringZ = 2.8,

    barCurrentPattern = [
      1.1,
      -1.1,
      1.1,
      -1.1,
    ],

    currentOverC = 1.0,
  }: {
    barRadius?: number;
    barHalfLength?: number;
    barRadiusCoil?: number;

    ringRadius?: number;
    ringZ?: number;

    barCurrentPattern?: number[];
    currentOverC?: number;
  } = {}
): Filament[] {

  const filaments: Filament[] = [];


  // ------------------------------------------------
  // Four Ioffe bars
  // ------------------------------------------------

  const base =
    racetrackCurve(
      barHalfLength,
      barRadiusCoil
    );


  for (let k = 0; k < 4; k++) {

    const phi =
      k * Math.PI / 2;


    const center =
      new THREE.Vector3(
        barRadius * Math.cos(phi),
        barRadius * Math.sin(phi),
        0
      );


    const rotation =
      rotationZ(phi);


    // Rotate local racetrack so its
    // long axis becomes approximately z.
    //
    // Local coordinates:
    //
    //       y = long axis
    //
    // We first map:
    //
    //   x -> z
    //   y -> y
    //
    //   z -> -x

    const orient =
      new THREE.Matrix3()
        .set(
          0, 0, 1,
          0, 1, 0,
         -1, 0, 0
        );


    const combined =
      rotation.clone()
        .multiply(
          orient
        );


    const curve =
      transformCurve(
        base,
        center,
        combined
      );


    const current =
      currentOverC *
      barCurrentPattern[k];


    filaments.push({
      points: curve,
      current,
    });
  }


  // ------------------------------------------------
  // Two pinch coils
  // ------------------------------------------------

  const ring =
    circleCurve(
      ringRadius
    );


  for (const z0 of [-ringZ, ringZ]) {

    const curve =
      transformCurve(
        ring,
        new THREE.Vector3(
          0,
          0,
          z0
        )
      );


    filaments.push({
      points: curve,
      current: currentOverC,
    });
  }


  return filaments;
}

// ============================================================
// Yin-Yang Coil Configuration
// ============================================================

export function makeYinYang(
  {
    radius = 2.0,
    alpha = 0.75, // Угол раскрытия петли (обычно около 40-45 градусов в радианах)
    currentOverC = 1.0,
    numPoints = 32
  }: {
    radius?: number;
    alpha?: number;
    currentOverC?: number;
    numPoints?: number;
  } = {}
): Filament[] {
  const filaments: Filament[] = [];

  // Функция параметризации одной базовой катушки ("бейсбольный шов")
  const generateYinYangCurve = (rotZ: number): THREE.Vector3[] => {
    const points: THREE.Vector3[] = [];
    
    for (let i = 0; i < numPoints; i++) {
      const theta = (i / (numPoints - 1)) * Math.PI * 2;
      
      // Параметрические уравнения геометрии Yin-Yang
      const xLocal = radius * Math.cos(theta) * Math.sqrt(1 - alpha * alpha * Math.sin(theta) * Math.sin(theta));
      const yLocal = radius * Math.sin(theta) * Math.sqrt(1 - alpha * alpha * Math.cos(theta) * Math.cos(theta));
      const zLocal = radius * alpha * Math.cos(2 * theta);
      
      const p = new THREE.Vector3(xLocal, yLocal, zLocal);
      
      // Поворачиваем вторую катушку на 90 градусов относительно первой
      if (rotZ !== 0) {
        p.applyAxisAngle(new THREE.Vector3(0, 0, 1), rotZ);
        // Зеркалим по Z и меняем оси, чтобы вложить их друг в друга
        const tmp = p.x;
        p.x = p.z;
        p.z = tmp;
        p.y = -p.y;
      }
      
      points.push(p);
    }
    return points;
  };

  // Первая катушка
  filaments.push({
    points: generateYinYangCurve(0),
    current: currentOverC,
  });

  // Вторая катушка (повернутая и вложенная под 90 градусов)
  filaments.push({
    points: generateYinYangCurve(Math.PI / 2),
    current: currentOverC, // Ток течет так, чтобы поля в центре складывались
  });

  return filaments;
}


// ============================================================
// Classical Mirror & Cusp Traps
// ============================================================

export function makeMirrorOrCusp(
  isCusp: boolean, // true = Антипробкотрон (токи встречные), false = Пробкотрон (токи сонаправлены)
  {
    ringRadius = 1.8,
    ringZ = 2.0,
    currentOverC = 1.0
  }: {
    ringRadius?: number;
    ringZ?: number;
    currentOverC?: number;
  } = {}
): Filament[] {
  const filaments: Filament[] = [];
  
  // Предполагаем, что у вас есть circleCurve(radius)
  const ring = circleCurve(ringRadius);

  // Первая катушка (z = -ringZ)
  filaments.push({
    points: transformCurve(ring, new THREE.Vector3(0, 0, -ringZ)),
    current: currentOverC,
  });

  // Вторая катушка (z = +ringZ)
  filaments.push({
    points: transformCurve(ring, new THREE.Vector3(0, 0, ringZ)),
    // Если это Cusp — разворачиваем ток в противоположную сторону (-1)
    current: currentOverC * (isCusp ? -1 : 1),
  });

  return filaments;
}


export function addFilamentsToScene(scene: THREE.Scene, filaments: Filament[]): THREE.Group {
  const group = new THREE.Group();

  // 1. Материал для колец-пробок (Классическое яркое золото/светлая медь)
  const ringMaterial = new THREE.MeshStandardMaterial({
    //color: 0xffb570, 
    color: 0xFFC0CB,
    metalness: 0.1,
    roughness: 0.12,
    side: THREE.DoubleSide
  });

  // 2. Материал для стержней с ПОЛОЖИТЕЛЬНЫМ током (Насыщенный красновато-медный)
  const barPositiveMaterial = new THREE.MeshStandardMaterial({
    color: 0xff5533, // Яркий благородный красно-медный оттенок
    metalness: 0.25,
    roughness: 0.12,
    side: THREE.DoubleSide
  });

  // 3. Материал для стержней с ОТРИЦАТЕЛЬНЫМ током (Контрастный синевато-стальной хром)
  const barNegativeMaterial = new THREE.MeshStandardMaterial({
    color: 0x557799, // Сине-стальной оттенок оружейной стали
    metalness: 0.25,
    roughness: 0.14,
    side: THREE.DoubleSide
  });

  for (const f of filaments) {
    if (f.points.length < 2) continue;

    // Проверяем, замкнута ли кривая (первая точка совпадает с последней)
    const isClosed = f.points[0].distanceTo(f.points[f.points.length - 1]) < 1e-4;
    const curve = new THREE.CatmullRomCurve3(f.points, isClosed);

    const tubeGeometry = new THREE.TubeGeometry(
      curve,
      64,
      2*0.06, // толщина провода
      8,
      isClosed
    );

    // ВЫБОР ЦВЕТОВОЙ ПАЛИТРЫ ПО НАУЧНОЙ ЛОГИКЕ
    let activeMaterial;

    if (isClosed) {
      // Замкнутые кольца (Pinch Coils в Иоффе-Притчарде, кольца в Пробкотроне и Cusp)
      //activeMaterial = ringMaterial;
      if(f.current == 0.5){activeMaterial = ringMaterial}
      //activeMaterial = f.current > 1.05 ? barPositiveMaterial : barNegativeMaterial;

      activeMaterial = f.current > 1.05 ? ringMaterial : barNegativeMaterial;
      if(f.current < 0.){
        activeMaterial = barNegativeMaterial;
        if(f.current > -1.){
        activeMaterial = ringMaterial;
        }
      }
      //if(activeMaterial = f.current < 0){activeMaterial = barNegativeMaterial;}
      //if(activeMaterial = f.current > 1.){activeMaterial = barPositiveMaterial;}
     
      
    } else {
      // Разомкнутые стержни ловушки Иоффе (Ioffe Bars)
      activeMaterial = f.current > 0 ? barPositiveMaterial : barNegativeMaterial;
    }

    const mesh = new THREE.Mesh(tubeGeometry, activeMaterial);
    mesh.name = `filament-current-${f.current}`;

    group.add(mesh);
  }

  scene.add(group);
  return group;
}
