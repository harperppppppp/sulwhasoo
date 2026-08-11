// Sulwhasoo · Product Detail — Hero → ContentBlock 3 3D 제품 시퀀스
// yultest2 프로토타입(sul_scene.js + scroll_motion.js)의 절차적 병 모델과
// 카메라 연출 로직을 이 페이지에 맞게 이식했다.
//
// 진행 방식: intro(hero_product_img 자리, 작게) → feature(화면 중앙, 크게 + 360도 회전)
// → detail(message_round_img = ContentBlock 3 자리, 작게) 순으로 스크롤에 맞춰 움직인다.
// 시작/끝 지점은 고정 좌표가 아니라 두 실사 이미지 요소의 실시간 위치를 읽어 계산하므로,
// 3D 모델이 실제 그 자리에 정확히 겹쳐서 안착한다.
import * as THREE from 'three';
import { createSulBottleModel } from './three/createSulBottleModel.js';

const canvas = document.getElementById('sul_scene_canvas');
const heroImg = document.querySelector('.hero_product_img');
const msgBgImg = document.querySelector('.message_bg_img');
const msgRoundImg = document.querySelector('.message_round_img');

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(value) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

function interpolate(start, end, amount) {
  return start + (end - start) * amount;
}

// hero_product_img / message_bg_img는 CSS 기본값이 opacity:0이다(실사 사진과
// 3D 렌더가 서로 다른 포즈라 서서히 겹치면 "이중 노출" 고스트가 보이기 때문에,
// 트랜지션 없이 처음부터 숨겨둔 채 시작한다). 3D를 못 띄우는 경우에만 여기서
// 실사 사진을 다시 보여준다(폴백).
function showFallbackImages() {
  heroImg.style.opacity = '1';
  if (msgBgImg) msgBgImg.style.opacity = '1';
}

if (!canvas || !heroImg || !msgRoundImg) {
  if (heroImg) showFallbackImages();
} else {
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas,
      powerPreference: 'high-performance',
    });
  } catch (error) {
    console.error('Sulwhasoo 3D scene: WebGL renderer 초기화 실패.', error);
  }

  if (!renderer) {
    showFallbackImages();
  } else {
    const scene = new THREE.Scene();
    scene.background = null; // 투명 — 페이지의 크림색 배경이 그대로 비친다.

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;

    // 스튜디오 돔 + 소프트박스를 환경맵으로 구워 매트한 아이보리 셸에 은은한 볼륨감을 준다.
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
      console.warn('Sulwhasoo 3D scene: 스튜디오 환경맵 생성 실패, 직접광으로 대체합니다.', error);
    }

    scene.add(new THREE.HemisphereLight(0xfff9eb, 0x7e6a52, scene.environment ? 0.3 : 2.25));

    const keyLight = new THREE.DirectionalLight(0xfff5df, scene.environment ? 1.55 : 4.2);
    keyLight.position.set(-3.8, 4.8, 5.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0007;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf3d9bd, scene.environment ? 0.32 : 2.0);
    fillLight.position.set(4.5, 1.2, 4.1);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xffb277, scene.environment ? 3.2 : 10.5, 15, 2);
    rimLight.position.set(2.4, 3.1, -3.4);
    scene.add(rimLight);

    const { root, tiltRoot, spinRoot, parts } = createSulBottleModel();
    scene.add(root);

    const modelBox = new THREE.Box3().setFromObject(tiltRoot);
    const modelSize = modelBox.getSize(new THREE.Vector3());
    const cameraDistance = camera.position.z;

    function getViewSize() {
      const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * cameraDistance;
      return { width: height * camera.aspect, height };
    }

    let isRenderQueued = false;
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
      root.position.set((frame.screenX - 0.5) * view.width, (0.5 - frame.screenY) * view.height, 0);
      root.updateMatrixWorld(true);

      parts.contactShadow.material.opacity = interpolate(0.11, 0.19, clamp(frame.heightRatio));
      queueRender();
    }

    // ---- 진행률(progress, 0~1) → 카메라 프레임 ----
    // 시작/끝 키프레임은 hero_product_img / message_round_img의 실시간 뷰포트 위치를 읽어 만든다.
    function readAnchor(el) {
      const r = el.getBoundingClientRect();
      return {
        screenX: (r.left + r.right) / 2 / window.innerWidth,
        screenY: (r.top + r.bottom) / 2 / window.innerHeight,
        heightRatio: clamp(r.height / window.innerHeight, 0.04, 1),
      };
    }

    function getKeyframes() {
      const start = readAnchor(heroImg);
      const end = readAnchor(msgRoundImg);
      return [
        { progress: 0, screenX: start.screenX, screenY: start.screenY, yaw: 0, tilt: 0, heightRatio: start.heightRatio },
        { progress: 0.45, screenX: 0.5, screenY: 0.46, yaw: Math.PI * 2, tilt: -17 * Math.PI / 180, heightRatio: 0.78 },
        { progress: 0.62, screenX: 0.5, screenY: 0.46, yaw: Math.PI * 2, tilt: -17 * Math.PI / 180, heightRatio: 0.78 },
        { progress: 1, screenX: end.screenX, screenY: end.screenY, yaw: Math.PI * 2, tilt: 0, heightRatio: end.heightRatio },
      ];
    }

    function getFrame(progress, isReducedMotion) {
      const normalized = clamp(progress);
      const keyframes = getKeyframes();
      let start = keyframes[0];
      let end = keyframes[keyframes.length - 1];
      for (let index = 0; index < keyframes.length - 1; index += 1) {
        if (normalized <= keyframes[index + 1].progress) {
          start = keyframes[index];
          end = keyframes[index + 1];
          break;
        }
      }
      const range = end.progress - start.progress;
      const amount = range === 0 ? 0 : smoothstep((normalized - start.progress) / range);
      return {
        screenX: interpolate(start.screenX, end.screenX, amount),
        screenY: interpolate(start.screenY, end.screenY, amount),
        yaw: isReducedMotion ? 0 : interpolate(start.yaw, end.yaw, amount),
        tilt: isReducedMotion ? 0 : interpolate(start.tilt, end.tilt, amount),
        heightRatio: interpolate(start.heightRatio, end.heightRatio, amount),
      };
    }

    // ---- 스크롤 범위: hero_product_img ~ message_round_img 사이 문서상 거리 ----
    let range = 1;
    function measureRange() {
      const heroDocY = heroImg.getBoundingClientRect().top + window.scrollY;
      const targetDocY = msgRoundImg.getBoundingClientRect().top + window.scrollY;
      range = Math.max(1, targetDocY - heroDocY);
    }

    function handleScroll() {
      const progress = clamp(window.scrollY / range);

      if (progress < 1) {
        // 아직 안착 전 — hero → 화면 중앙 → ContentBlock 3 여정을 진행한다.
        canvas.style.display = 'block';
        applyFrame(getFrame(progress, reducedMotionQuery.matches));
        return;
      }

      // 안착 완료 후: 병을 없애지 않고 ContentBlock 3 자리에 그대로 둔 채,
      // 일반 콘텐츠처럼 스크롤을 따라 함께 움직이게 한다(getKeyframes가 매번
      // message_round_img의 실시간 위치를 다시 읽으므로 자연스럽게 따라간다).
      // 화면에서 완전히 벗어나면 렌더링만 잠시 꺼서 자원을 아낀다.
      const anchorRect = msgRoundImg.getBoundingClientRect();
      const isNearViewport = anchorRect.bottom > -200 && anchorRect.top < window.innerHeight + 200;
      if (!isNearViewport) {
        canvas.style.display = 'none';
        return;
      }

      canvas.style.display = 'block';
      applyFrame(getFrame(1, reducedMotionQuery.matches));
    }

    function handleResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      measureRange();
      handleScroll();
    }

    // ---- 외부(Add to Cart flying-product 애니메이션, js/detail.js)에서 "지금
    // 이 순간 병이 화면 어디에 얼마나 크게 있는지"를 읽을 수 있게 노출한다.
    // canvas 자체는 뷰포트 전체 크기라 그대로 clone/캡처하면 빈 여백까지 함께
    // 딸려오므로, root(병+접지 그림자)의 3D 바운딩 박스 8개 꼭짓점을 현재
    // 카메라로 투영해 화면 픽셀 기준 tight bounding box를 계산한다. 3D가
    // 정상 초기화된 경우에만 정의되므로, 호출부는 typeof 체크만으로 3D
    // 실패(fallback 이미지 사용 중) 상황과 구분할 수 있다.
    window.sulwhasooGetBottleScreenRect = function () {
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      if (box.isEmpty()) return null;
      const corners = [
        new THREE.Vector3(box.min.x, box.min.y, box.min.z),
        new THREE.Vector3(box.min.x, box.min.y, box.max.z),
        new THREE.Vector3(box.min.x, box.max.y, box.min.z),
        new THREE.Vector3(box.min.x, box.max.y, box.max.z),
        new THREE.Vector3(box.max.x, box.min.y, box.min.z),
        new THREE.Vector3(box.max.x, box.min.y, box.max.z),
        new THREE.Vector3(box.max.x, box.max.y, box.min.z),
        new THREE.Vector3(box.max.x, box.max.y, box.max.z),
      ];
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      corners.forEach((corner) => {
        const projected = corner.clone().project(camera);
        const sx = (projected.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (1 - (projected.y * 0.5 + 0.5)) * window.innerHeight;
        minX = Math.min(minX, sx);
        maxX = Math.max(maxX, sx);
        minY = Math.min(minY, sy);
        maxY = Math.max(maxY, sy);
      });
      return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    reducedMotionQuery.addEventListener('change', handleScroll);

    handleResize();
  }
}
