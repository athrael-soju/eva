import * as THREE from 'three';

type InteractionOptions = {
  canvas: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;
  targets: THREE.Object3D[];
  onActivate: () => void;
};

export function setupInteractions({ canvas, camera, targets, onActivate }: InteractionOptions) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const handleCanvasClick = (event: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(targets);

    if (intersects.length > 0) {
      onActivate();
    }
  };

  const handleMouseMove = (event: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(targets);

    canvas.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
  };

  canvas.addEventListener('click', handleCanvasClick);
  canvas.addEventListener('mousemove', handleMouseMove);

  const dispose = () => {
    canvas.removeEventListener('click', handleCanvasClick);
    canvas.removeEventListener('mousemove', handleMouseMove);
  };

  return { dispose };
}
