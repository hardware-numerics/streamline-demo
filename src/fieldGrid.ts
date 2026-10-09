import * as THREE from 'three';
import type { VectorField } from './VectorField';

export interface FieldGridOptions {
  min: THREE.Vector3;
  max: THREE.Vector3;
  nx: number;
  ny: number;
  nz: number;
  // Добавляем опциональный коллбек, который будет принимать процент от 0 до 100
  onProgress?: (percent: number) => void; 
}

export class FieldGrid implements VectorField {
  readonly min: THREE.Vector3;
  readonly max: THREE.Vector3;
  readonly nx: number;
  readonly ny: number;
  readonly nz: number;

  private field: VectorField;
  private values: Float32Array;
  private onProgress?: (percent: number) => void; // сохраняем коллбек

  constructor(field: VectorField, options: FieldGridOptions) {
    this.field = field;
    this.min = options.min.clone();
    this.max = options.max.clone();
    this.nx = options.nx;
    this.ny = options.ny;
    this.nz = options.nz;
    this.onProgress = options.onProgress; // <-- записываем

    const size = this.nx * this.ny * this.nz * 3;
    this.values = new Float32Array(size);

    // ВНИМАНИЕ: this.build() отсюда убрали! 
    // Сетку теперь нужно будет инициализировать явно через метод init()
  }

  // Публичный метод для запуска инициализации
  public async init(): Promise<void> {
    await this.build();
  }

  // Делаем метод асинхронным
  private async build() {
    const position = new THREE.Vector3();

    for (let iz = 0; iz < this.nz; iz++) {
      const z = this.coordinate(iz, this.nz, this.min.z, this.max.z);

      for (let iy = 0; iy < this.ny; iy++) {
        const y = this.coordinate(iy, this.ny, this.min.y, this.max.y);

        for (let ix = 0; ix < this.nx; ix++) {
          const x = this.coordinate(ix, this.nx, this.min.x, this.max.x);

          position.set(x, y, z);
          const B = this.field.B(position);
          this.set(ix, iy, iz, B);
        }
      }

      // --- РАЗМОРАЖИВАЕМ БРАУЗЕР ПОСЛЕ КАЖДОГО СЛОЯ Z ---
      if (this.onProgress) {
        const percent = Math.round(((iz + 1) / this.nz) * 100);
        this.onProgress(percent);
      }

      // Магия: отдаем управление главному потоку браузера на 0 миллисекунд.
      // За это время браузер успеет перерисовать прогресс-бар и не выведет
      // предупреждение "Вкладка не отвечает".
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  private coordinate(i: number, n: number, min: number, max: number): number {
    if (n <= 1) return min;
    return min + ((max - min) * i) / (n - 1);
  }

  private index(ix: number, iy: number, iz: number): number {
    return (iz * this.ny * this.nx + iy * this.nx + ix) * 3;
  }

  private set(ix: number, iy: number, iz: number, B: THREE.Vector3) {
    const index = this.index(ix, iy, iz);
    this.values[index] = B.x;
    this.values[index + 1] = B.y;
    this.values[index + 2] = B.z;
  }

  // Оптимизированный прямой доступ к массиву без создания объектов
  B(position: THREE.Vector3): THREE.Vector3 {
    const tx = (position.x - this.min.x) / (this.max.x - this.min.x);
    const ty = (position.y - this.min.y) / (this.max.y - this.min.y);
    const tz = (position.z - this.min.z) / (this.max.z - this.min.z);

    if (tx < 0 || tx > 1 || ty < 0 || ty > 1 || tz < 0 || tz > 1) {
      return new THREE.Vector3(0, 0, 0); // Вылет за границы — константный ноль
    }

    const gx = tx * (this.nx - 1);
    const gy = ty * (this.ny - 1);
    const gz = tz * (this.nz - 1);

    const ix0 = Math.min(Math.floor(gx), this.nx - 2);
    const iy0 = Math.min(Math.floor(gy), this.ny - 2);
    const iz0 = Math.min(Math.floor(gz), this.nz - 2);

    const ix1 = ix0 + 1;
    const iy1 = iy0 + 1;
    const iz1 = iz0 + 1;

    const fx = gx - ix0;
    const fy = gy - iy0;
    const fz = gz - iz0;

    // Шаг 1: Считаем смещения индексов в плоском массиве для всех 8 вершин куба
    const i000 = this.index(ix0, iy0, iz0);
    const i100 = this.index(ix1, iy0, iz0);
    const i010 = this.index(ix0, iy1, iz0);
    const i110 = this.index(ix1, iy1, iz0);
    const i001 = this.index(ix0, iy0, iz1);
    const i101 = this.index(ix1, iy0, iz1);
    const i011 = this.index(ix0, iy1, iz1);
    const i111 = this.index(ix1, iy1, iz1);

    const invFx = 1 - fx;
    const invFy = 1 - fy;
    const invFz = 1 - fz;

    // Шаг 2: Интерполируем каждую компоненту (X, Y, Z) на голых примитивах
    // Это полностью защищает память от выделения новых объектов
    const values = this.values;
    const result = new THREE.Vector3();

    for (let c = 0; c < 3; c++) {
      // Плоскость z0
      const c00 = values[i000 + c] * invFx + values[i100 + c] * fx;
      const c10 = values[i010 + c] * invFx + values[i110 + c] * fx;
      const c0 = c00 * invFy + c10 * fy;

      // Плоскость z1
      const c01 = values[i001 + c] * invFx + values[i101 + c] * fx;
      const c11 = values[i011 + c] * invFx + values[i111 + c] * fx;
      const c1 = c01 * invFy + c11 * fy;

      // Итоговое значение для текущей компоненты
      const finalVal = c0 * invFz + c1 * fz;

      if (c === 0) result.x = finalVal;
      else if (c === 1) result.y = finalVal;
      else result.z = finalVal;
    }

    return result;
  }

  // Оптимизированный расчет направления
  direction(position: THREE.Vector3): THREE.Vector3 {
    // Вызываем B(position) только ОДИН раз
    const B = this.B(position);
    const magnitude = B.length();

    if (magnitude < 1e-12) {
      return B.set(0, 0, 0); // Переиспользуем тот же объект вектора
    }

    return B.multiplyScalar(1 / magnitude);
  }
  // ... ваши методы coordinate(), index(), set(), get(), B() и direction() остаются БЕЗ ИЗМЕНЕНИЙ
}

