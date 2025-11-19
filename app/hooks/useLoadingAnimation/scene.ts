import * as THREE from 'three';
import { CustomCurve } from '../../components/three/CustomCurve';
import { animationConfig } from './config';

export type SceneObjects = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  group: THREE.Group;
  mesh: THREE.Mesh;
  ring: THREE.Mesh;
  ringcover: THREE.Mesh;
  clickableArea: THREE.Mesh;
  renderer: THREE.WebGLRenderer;
};

export function createScene(container: HTMLDivElement, canvassize: number): SceneObjects & { dispose: () => void } {
  const length = animationConfig.length;
  const radius = animationConfig.radius;
  const pi2 = Math.PI * 2;

  const group = new THREE.Group();

  const camera = new THREE.PerspectiveCamera(65, 1, 1, 10000);
  camera.position.z = 150;

  const scene = new THREE.Scene();
  scene.add(group);

  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(new CustomCurve(length, radius, pi2), 200, 1.1, 2, true),
    new THREE.MeshBasicMaterial({
      color: animationConfig.primaryColor,
    })
  );
  group.add(mesh);

  const ringcover = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 15, 1),
    new THREE.MeshBasicMaterial({ color: animationConfig.backgroundColor, opacity: 0, transparent: true })
  );
  ringcover.position.x = length + 1;
  ringcover.rotation.y = Math.PI / 2;
  group.add(ringcover);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(animationConfig.ringInnerRadius, animationConfig.ringOuterRadius, 32),
    new THREE.MeshBasicMaterial({ color: animationConfig.primaryColor, opacity: 0, transparent: true })
  );
  ring.position.x = length + 1.1;
  ring.rotation.y = Math.PI / 2;
  group.add(ring);

  for (let i = 0; i < 10; i++) {
    const plain = new THREE.Mesh(
      new THREE.PlaneGeometry(length * 2 + 1, radius * 3, 1),
      new THREE.MeshBasicMaterial({ color: animationConfig.backgroundColor, transparent: true, opacity: 0.13 })
    );
    plain.position.z = -2.5 + i * 0.5;
    group.add(plain);
  }

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvassize, canvassize);
  renderer.setClearColor(0x000000, 0);

  const canvas = renderer.domElement;
  canvas.style.position = 'absolute';
  canvas.style.left = '50%';
  canvas.style.top = '50%';
  canvas.style.transform = 'translate(-50%, -50%)';
  canvas.style.width = `${canvassize}px`;
  canvas.style.height = `${canvassize}px`;
  canvas.style.cursor = 'default';

  container.appendChild(canvas);

  const clickableArea = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius * 1.5, length * 1.5),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  clickableArea.rotation.z = Math.PI / 2;
  group.add(clickableArea);

  const dispose = () => {
    if (container && renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
    renderer.dispose();
  };

  return {
    scene,
    camera,
    group,
    mesh,
    ring,
    ringcover,
    clickableArea,
    renderer,
    dispose,
  };
}
