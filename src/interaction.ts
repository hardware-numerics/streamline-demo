import * as THREE from 'three';


import {
  updateSeed,
} from './seed';

import type {
  Seed,
} from './seed';


export function enableSeedDragging(
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  seeds: Seed[]
) {

  const raycaster =
    new THREE.Raycaster();

  const mouse =
    new THREE.Vector2();

  let activeSeed:
    Seed | null = null;


  function updateMouse(
    event: PointerEvent
  ) {

    const rect =
      canvas.getBoundingClientRect();

    mouse.x =
      ((event.clientX - rect.left) / rect.width)
      * 2 - 1;

    mouse.y =
      -((event.clientY - rect.top) / rect.height)
      * 2 + 1;
  }


  canvas.addEventListener(
    'pointerdown',
    (event) => {

      updateMouse(event);

      raycaster.setFromCamera(
        mouse,
        camera
      );


      // All seed markers

      const markers =
        seeds.map(
          seed => seed.marker
        );


      const hits =
        raycaster.intersectObjects(
          markers
        );


      if (hits.length === 0) {
        return;
      }


      // Find which Seed was clicked

      const marker =
        hits[0].object;


      activeSeed =
        seeds.find(
          seed => seed.marker === marker
        ) ?? null;


      if (!activeSeed) {
        return;
      }


      canvas.setPointerCapture(
        event.pointerId
      );
    }
  );


  canvas.addEventListener(
    'pointermove',
    (event) => {

      if (!activeSeed) {
        return;
      }


      updateMouse(event);


      raycaster.setFromCamera(
        mouse,
        camera
      );


      // Temporary interaction plane:
      //
      // z = 0

      const plane =
        new THREE.Plane(
          new THREE.Vector3(
            0,
            0,
            1
          ),
          0
        );


      const position =
        new THREE.Vector3();


      raycaster.ray.intersectPlane(
        plane,
        position
      );


      activeSeed.position.copy(
        position
      );


      updateSeed(
        activeSeed
      );
    }
  );


  canvas.addEventListener(
    'pointerup',
    (event) => {

      activeSeed = null;

      canvas.releasePointerCapture(
        event.pointerId
      );
    }
  );
}
