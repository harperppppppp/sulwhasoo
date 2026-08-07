import * as THREE from 'three';
import { createSulBottleModel } from './generated/createSulBottleModel.js';
import { clamp, getScrollFrame } from './scroll_motion.js';

const canvas = document.getElementById('sul_scene_canvas');
const statusElement = document.getElementById('sul_scene_status');
const fallbackElement = document.getElementById('sul_scene_fallback');
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reviewYawValue = new URLSearchParams(window.location.search).get('review_yaw');
const reviewYawDegrees = reviewYawValue === null ? null : Number(reviewYawValue);

let currentProgress = 0;
let currentState = null;
let isRenderQueued = false;
let renderer;

function interpolate(start, end, amount) {
  return start + (end - start) * amount;
}

function getFrame(progress) {
  return getScrollFrame(progress, reducedMotionQuery.matches);
}

function showFallback() {
  window.__SUL_SCENE_READY__ = false;
  fallbackElement.classList.add('has_error');
  fallbackElement.setAttribute('aria-hidden', 'false');
  statusElement.classList.add('is_hidden');
  statusElement.setAttribute('aria-hidden', 'true');
}

try {
  renderer = new THREE.WebGLRenderer({
    alpha: false,
    antialias: true,
    canvas,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });
} catch (error) {
  console.error('WebGL renderer initialization failed.', error);
  showFallback();
}

if (renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(Number.isFinite(reviewYawDegrees) ? 0x211e1a : 0xf5ecd5);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0, 0, 8);
  camera.lookAt(0, 0, 0);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;

  // Punchy direct lights flatten a matte shell: the reference reads as a volume because
  // a large soft source wraps around it. Bake a studio dome plus softboxes into an
  // environment map and let the direct lights only shape the terminator and the shadow.
  function createStudioEnvironment() {
    const environmentScene = new THREE.Scene();

    const gradientCanvas = document.createElement('canvas');
    gradientCanvas.width = 4;
    gradientCanvas.height = 256;
    const gradientContext = gradientCanvas.getContext('2d');
    const gradient = gradientContext.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#fffdf6');
    gradient.addColorStop(0.42, '#f2e9d8');
    gradient.addColorStop(0.72, '#a2937e');
    gradient.addColorStop(1, '#4b4139');
    gradientContext.fillStyle = gradient;
    gradientContext.fillRect(0, 0, gradientCanvas.width, gradientCanvas.height);
    const domeTexture = new THREE.CanvasTexture(gradientCanvas);
    domeTexture.colorSpace = THREE.SRGBColorSpace;

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(16, 32, 24),
      new THREE.MeshBasicMaterial({ map: domeTexture, side: THREE.BackSide }),
    );
    environmentScene.add(dome);

    function addSoftbox(width, height, intensity, position) {
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff6e4).multiplyScalar(intensity) }),
      );
      panel.position.copy(position);
      panel.lookAt(0, 0, 0);
      environmentScene.add(panel);
    }

    addSoftbox(11, 15, 5.4, new THREE.Vector3(-6.5, 4.2, 7.5));
    addSoftbox(8, 12, 1.5, new THREE.Vector3(8.2, 0.6, 5.2));
    addSoftbox(13, 13, 1.1, new THREE.Vector3(0, 11, 1.5));
    addSoftbox(6, 10, 0.9, new THREE.Vector3(3.4, 2.6, -8.5));

    const generator = new THREE.PMREMGenerator(renderer);
    generator.compileEquirectangularShader();
    const target = generator.fromScene(environmentScene, 0.03);
    generator.dispose();
    return target.texture;
  }

  try {
    scene.environment = createStudioEnvironment();
  } catch (error) {
    console.warn('Studio environment unavailable; falling back to direct lighting.', error);
  }

  const hemisphereLight = new THREE.HemisphereLight(0xfff9eb, 0x7e6a52, scene.environment ? 0.3 : 2.25);
  scene.add(hemisphereLight);

  const keyLight = new THREE.DirectionalLight(0xfff5df, scene.environment ? 1.55 : 4.2);
  keyLight.name = 'key_light';
  keyLight.position.set(-3.8, 4.8, 5.8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.bias = -0.0007;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xf3d9bd, scene.environment ? 0.32 : 2.0);
  fillLight.name = 'fill_light';
  fillLight.position.set(4.5, 1.2, 4.1);
  scene.add(fillLight);

  const rimLight = new THREE.PointLight(0xffb277, scene.environment ? 3.2 : 10.5, 15, 2);
  rimLight.name = 'rim_light';
  rimLight.position.set(2.4, 3.1, -3.4);
  scene.add(rimLight);

  const { root, tiltRoot, spinRoot, parts, materials, manifest } = createSulBottleModel();
  scene.add(root);

  const modelBox = new THREE.Box3().setFromObject(tiltRoot);
  const modelSize = modelBox.getSize(new THREE.Vector3());
  const cameraDistance = camera.position.z;

  function getViewSize() {
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * cameraDistance;
    return { width: height * camera.aspect, height };
  }

  function queueRender() {
    if (isRenderQueued) return;
    isRenderQueued = true;
    requestAnimationFrame(() => {
      isRenderQueued = false;
      renderer.render(scene, camera);
    });
  }

  function applyFrame(frame) {
    spinRoot.rotation.y = frame.yaw;
    tiltRoot.rotation.z = frame.tilt;
    root.position.set(0, 0, 0);
    root.scale.setScalar(1);
    root.updateMatrixWorld(true);

    const rotatedBox = new THREE.Box3().setFromObject(tiltRoot);
    const rotatedSize = rotatedBox.getSize(new THREE.Vector3());
    const view = getViewSize();
    const marginWorldX = view.width * 0.02;
    const marginWorldY = view.height * 0.02;
    const availableHalfWidth = Math.max(0.01, Math.min(frame.screenX, 1 - frame.screenX) * view.width - marginWorldX);
    const availableHalfHeight = Math.max(0.01, Math.min(frame.screenY, 1 - frame.screenY) * view.height - marginWorldY);
    const heightScale = (view.height * frame.heightRatio) / Math.max(modelSize.y, 0.01);
    const perspectiveSafety = 0.88;
    const widthFitScale = ((availableHalfWidth * 2) / Math.max(rotatedSize.x, 0.01)) * perspectiveSafety;
    const heightFitScale = ((availableHalfHeight * 2) / Math.max(rotatedSize.y, 0.01)) * perspectiveSafety;
    const scale = Math.min(heightScale, widthFitScale, heightFitScale);

    root.scale.setScalar(scale);
    root.position.set(
      (frame.screenX - 0.5) * view.width,
      (0.5 - frame.screenY) * view.height,
      0,
    );
    root.updateMatrixWorld(true);
    const initialRect = projectRect();
    const currentCenterX = (initialRect.left + initialRect.right) / 2;
    const currentCenterY = (initialRect.top + initialRect.bottom) / 2;
    const targetCenterX = frame.screenX * window.innerWidth;
    const targetCenterY = frame.screenY * window.innerHeight;
    root.position.x += ((targetCenterX - currentCenterX) / window.innerWidth) * view.width;
    root.position.y -= ((targetCenterY - currentCenterY) / window.innerHeight) * view.height;
    parts.contactShadow.material.opacity = interpolate(0.11, 0.19, clamp(frame.heightRatio));
    currentState = { ...frame, scale };
    root.updateMatrixWorld(true);
    queueRender();
  }

  function setProgress(progress) {
    currentProgress = clamp(progress);
    applyFrame(getFrame(currentProgress));
    return getState();
  }

  function getState() {
    return { ...currentState };
  }

  function projectRect() {
    root.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(tiltRoot);
    const corners = [
      [box.min.x, box.min.y, box.min.z], [box.max.x, box.min.y, box.min.z],
      [box.min.x, box.max.y, box.min.z], [box.max.x, box.max.y, box.min.z],
      [box.min.x, box.min.y, box.max.z], [box.max.x, box.min.y, box.max.z],
      [box.min.x, box.max.y, box.max.z], [box.max.x, box.max.y, box.max.z],
    ];
    const rect = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    for (const corner of corners) {
      const point = new THREE.Vector3(...corner).project(camera);
      const x = (point.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-point.y * 0.5 + 0.5) * window.innerHeight;
      rect.left = Math.min(rect.left, x);
      rect.right = Math.max(rect.right, x);
      rect.top = Math.min(rect.top, y);
      rect.bottom = Math.max(rect.bottom, y);
    }
    rect.width = rect.right - rect.left;
    rect.height = rect.bottom - rect.top;
    return rect;
  }

  function capture() {
    renderer.render(scene, camera);
    return {
      ...getState(),
      rect: projectRect(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      canvas: { width: canvas.width, height: canvas.height },
    };
  }

  function captureTurntable(yaw) {
    const restoreFrame = { ...currentState };
    const reviewFrame = {
      ...getFrame(0.58),
      screenX: 0.5,
      screenY: 0.5,
      yaw,
      tilt: 0,
      heightRatio: 0.72,
    };
    applyFrame(reviewFrame);
    renderer.render(scene, camera);
    const dataUrl = canvas.toDataURL('image/png');
    applyFrame(restoreFrame);
    renderer.render(scene, camera);
    return dataUrl;
  }

  function handleScroll() {
    if (Number.isFinite(reviewYawDegrees)) {
      currentProgress = 0.58;
      applyFrame({
        ...getFrame(currentProgress),
        screenX: 0.5,
        screenY: 0.5,
        yaw: THREE.MathUtils.degToRad(reviewYawDegrees),
        tilt: 0,
        heightRatio: 0.72,
      });
      return;
    }
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    setProgress(maxScroll > 0 ? window.scrollY / maxScroll : 0);
  }

  function handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    applyFrame(getFrame(currentProgress));
  }

  function handleMotionPreference() {
    applyFrame(getFrame(currentProgress));
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleResize, { passive: true });
  reducedMotionQuery.addEventListener('change', handleMotionPreference);

  handleResize();
  handleScroll();
  renderer.render(scene, camera);

  window.__sulScene = {
    THREE,
    camera,
    capture,
    captureTurntable,
    getState,
    manifest,
    materials,
    parts,
    renderer,
    root,
    scene,
    setProgress,
    spinRoot,
    tiltRoot,
  };
  window.__previewSul = setProgress;
  window.__IMG2THREEJS_CAPTURE__ = capture;
  window.__SUL_SCENE_READY__ = true;
  window.__IMG2THREEJS_READY__ = true;
  statusElement.classList.add('is_hidden');
  statusElement.setAttribute('aria-hidden', 'true');
  fallbackElement.classList.remove('has_error');
  fallbackElement.setAttribute('aria-hidden', 'true');
}
