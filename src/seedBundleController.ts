import * as THREE from 'three';
import { SeedBundle } from './seedBundle';

export class SeedBundleController {
  // Явно прописываем наши два независимых пучка
  private bundleEuler: SeedBundle;
  private bundleRK4: SeedBundle;
  
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private controls: { enabled: boolean };

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private dragPlane = new THREE.Plane();
  private dragPoint = new THREE.Vector3();
  private cameraDirection = new THREE.Vector3();

  // Запоминаем конкретный пучок, который сейчас тащим
  private activeBundle: SeedBundle | null = null;

  constructor(
    // Принимаем пучки массивом из main.ts, как и планировали
    bundles: SeedBundle[],
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    controls: { enabled: boolean }
  ) {
    this.bundleEuler = bundles[0];
    this.bundleRK4 = bundles[1];
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);

    renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    renderer.domElement.addEventListener('pointerup', this.onPointerUp);
  }

  private updateMouse(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  // ==========================================================
  // Pointer down
  // ==========================================================
  private onPointerDown(event: PointerEvent) {
    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Делаем два независимых, гарантированно рабочих одиночных рейкаста
    const hitsEuler = this.raycaster.intersectObject(this.bundleEuler.picker);
    const hitsRK4 = this.raycaster.intersectObject(this.bundleRK4.picker);

    // Определяем, по какому пучку кликнули (если по обоим — берем тот, что ближе к камере)
    if (hitsEuler.length > 0 && hitsRK4.length > 0) {
      this.activeBundle = hitsEuler[0].distance < hitsRK4[0].distance ? this.bundleEuler : this.bundleRK4;
    } else if (hitsEuler.length > 0) {
      this.activeBundle = this.bundleEuler;
    } else if (hitsRK4.length > 0) {
      this.activeBundle = this.bundleRK4;
    } else {
      return; // Никуда не попали
    }

    this.dragging = true;
    this.controls.enabled = false;
    this.renderer.domElement.style.cursor = 'grabbing';

    this.camera.getWorldDirection(this.cameraDirection);

    // Плоскость драга строим ровно через центр ТОГО пучка, который захватили
    this.dragPlane.setFromNormalAndCoplanarPoint(
      this.cameraDirection,
      this.activeBundle.center
    );

    this.renderer.domElement.setPointerCapture(event.pointerId);
  }

  private dragging = false;

  // ==========================================================
  // Pointer move
  // ==========================================================
  private onPointerMove(event: PointerEvent) {
    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (!this.activeBundle) {
      // Подсвечиваем курсор, если просто навели мышь на любой из пикеров
      const hitsEuler = this.raycaster.intersectObject(this.bundleEuler.picker);
      const hitsRK4 = this.raycaster.intersectObject(this.bundleRK4.picker);
      
      this.renderer.domElement.style.cursor = (hitsEuler.length > 0 || hitsRK4.length > 0) ? 'grab' : 'default';
      return;
    }

    // Двигаем только тот пучок, который захвачен
    const hit = this.raycaster.ray.intersectPlane(this.dragPlane, this.dragPoint);
    if (hit) {
      this.activeBundle.moveTo(this.dragPoint);
    }
  }

  // ==========================================================
  // Pointer up
  // ==========================================================
  private onPointerUp(event: PointerEvent) {
    if (!this.activeBundle) return;

    this.activeBundle = null;
    this.dragging = false;
    this.controls.enabled = true;
    this.renderer.domElement.style.cursor = 'grab';

    this.renderer.domElement.releasePointerCapture(event.pointerId);
  }
}


/*
import * as THREE from 'three';

import {
  SeedBundle,
} from './seedBundle';


export class SeedBundleController {

  private bundle: SeedBundle;

  private camera: THREE.Camera;

  private renderer: THREE.WebGLRenderer;

  private controls: {
    enabled: boolean;
  };


  private raycaster =
    new THREE.Raycaster();

  private mouse =
    new THREE.Vector2();

  private dragPlane =
    new THREE.Plane();

  private dragPoint =
    new THREE.Vector3();

  private cameraDirection =
    new THREE.Vector3();


  private dragging =
    false;


  constructor(
    bundle: SeedBundle,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    controls: {
      enabled: boolean;
    }
  ) {

    this.bundle =
      bundle;

    this.camera =
      camera;

    this.renderer =
      renderer;

    this.controls =
      controls;


    this.onPointerDown =
      this.onPointerDown.bind(this);

    this.onPointerMove =
      this.onPointerMove.bind(this);

    this.onPointerUp =
      this.onPointerUp.bind(this);


    renderer.domElement.addEventListener(
      'pointerdown',
      this.onPointerDown
    );


    renderer.domElement.addEventListener(
      'pointermove',
      this.onPointerMove
    );


    renderer.domElement.addEventListener(
      'pointerup',
      this.onPointerUp
    );
  }


  // ==========================================================
  // Mouse coordinates
  // ==========================================================

  private updateMouse(
    event: PointerEvent
  ) {

    const rect =
      this.renderer.domElement
        .getBoundingClientRect();


    this.mouse.x =
      (
        event.clientX -
        rect.left
      ) /
      rect.width *
      2 -
      1;


    this.mouse.y =
      -(
        (
          event.clientY -
          rect.top
        ) /
        rect.height
      ) *
      2 +
      1;
  }


  // ==========================================================
  // Pointer down
  // ==========================================================

  private onPointerDown(
    event: PointerEvent
  ) {

    this.updateMouse(
      event
    );


    this.raycaster.setFromCamera(
      this.mouse,
      this.camera
    );


    const hits =
      this.raycaster.intersectObject(
        this.bundle.picker
      );


    if (
      hits.length === 0
    ) {
      return;
    }


    this.dragging =
      true;


    this.controls.enabled =
      false;


    this.renderer.domElement.style.cursor =
      'grabbing';


    this.camera.getWorldDirection(
      this.cameraDirection
    );


    this.dragPlane.setFromNormalAndCoplanarPoint(
      this.cameraDirection,
      this.bundle.center
    );


    this.renderer.domElement.setPointerCapture(
      event.pointerId
    );
  }


  // ==========================================================
  // Pointer move
  // ==========================================================

  private onPointerMove(
    event: PointerEvent
  ) {

    this.updateMouse(
      event
    );


    this.raycaster.setFromCamera(
      this.mouse,
      this.camera
    );


    if (
      !this.dragging
    ) {

      const hits =
        this.raycaster.intersectObject(
          this.bundle.picker
        );


      this.renderer.domElement.style.cursor =
        hits.length > 0
          ? 'grab'
          : 'default';


      return;
    }


    const hit =
      this.raycaster.ray.intersectPlane(
        this.dragPlane,
        this.dragPoint
      );


    if (
      hit
    ) {

      this.bundle.moveTo(
        this.dragPoint
      );
    }
  }


  // ==========================================================
  // Pointer up
  // ==========================================================

  private onPointerUp(
    event: PointerEvent
  ) {

    if (
      !this.dragging
    ) {
      return;
    }


    this.dragging =
      false;


    this.controls.enabled =
      true;


    this.renderer.domElement.style.cursor =
      'grab';


    this.renderer.domElement.releasePointerCapture(
      event.pointerId
    );
  }
}

*/