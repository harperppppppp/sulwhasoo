/* =========================================================================
   BUKCHON ROOM GUIDE · WebGL
   -------------------------------------------------------------------------
   .guide 섹션의 콜라주와 룸 캐러셀을 캔버스 하나(.guide_gl)에 그립니다.
   pages/_guide-webgl-demo.html 에서 만든 것을 그대로 옮긴 것이고, 데모용
   토글 패널과 스테이지 축소 코드만 뺐습니다(축소는 flagship.js 담당).

   클래스 구성
     Sizes / Time      — 리사이즈 · 프레임 시계
     Controls          — wheel · pointermove · touch → scrollOffset,
                         normalizedMouse. 계속 아래로 흐르는 자동 회전과
                         "한 번에 한 칸" 스텝이 여기 있습니다.
     Raycaster         — THREE.Raycaster 상속, update() 에서 setFromCamera
     CollagePlane      — .guide_piece 하나. CSS 좌표 · 크기 · rotate 그대로
     RoomPlane         — guide_img_box 카드 하나. 원통 위를 돕니다
     World             — 레이캐스트로 앞면만 골라 hover, guide_chang 칩 갱신
     PostProcessing    — EffectComposer + 노이즈 ShaderPass
     Experience        — 위를 전부 들고 tick 마다 순서대로 돌리는 루트

   두 벌의 plane
     콜라주 12 장과 캐러셀 카드 10 장이 morph 로 크로스페이드합니다.
     (그림이 아예 다른 셋이라 형태 모핑이 아니라 크로스페이드가 맞습니다)

   좌표계
     1 unit = 1 CSS px.
   ========================================================================= */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass }     from 'three/addons/postprocessing/ShaderPass.js';

/* =========================================================================
   설정 — 여기만 보면 됩니다
   ========================================================================= */

/* 섹션이 처음 어떤 모습으로 있을지.
     'room'    — 룸 캐러셀 (카드 10 장이 원통을 돌고, 호버하면 문구가 뜸)
     'collage' — 기존 콜라주 그대로. 배치 · 색이 DOM 과 픽셀 단위로 같고,
                 호버 줌만 얹힙니다.
   한 글자만 바꾸면 됩니다. */
const START_MODE = 'room';

/* 스크롤로 카드를 넘기는 방식.
     'page'    — 페이지 스크롤은 그대로 두고, 섹션을 지나는 스크롤 거리
                 SCROLL_STEP_PX 마다 카드를 한 칸씩 넘깁니다.
     'capture' — 캔버스 위 휠을 가로채 카드만 넘깁니다(임시 페이지와 같은 동작).
                 커서가 이 섹션 위에 있는 동안 페이지가 스크롤되지 않으니
                 주의하세요.
   어느 쪽이든 드래그와 자동 흐름은 똑같이 동작합니다. */
const SCROLL_MODE    = 'page';
const SCROLL_STEP_PX = 160;    // 'page' 모드에서 한 칸 넘기는 스크롤 거리

const SHOW_NOISE    = false;   // 아주 옅은 필름 그레인
const SHOW_PARALLAX = false;   // 포인터 시차. 켜면 조각이 CSS 좌표에서 벗어납니다

/* =========================================================================
   DOM
   ========================================================================= */
const canvas  = document.querySelector('.guide_gl');
const box     = document.querySelector('.guide_box');
const collage = document.querySelector('.guide_collage');

// 가이드 섹션이 없는 페이지에서 로드돼도 조용히 빠집니다
if (canvas && box && collage) init();

function init() {

const pieces     = [...collage.querySelectorAll('.guide_piece')];
const roomImgs   = [...document.querySelectorAll('.room_sources img')];
const changEl    = document.querySelector('.guide_chang');
const changThumb = changEl && changEl.querySelector('.guide_chang_thumb img');
const changLabel = changEl && changEl.querySelector('.guide_chang_label');

// 콜라주 모드로 돌아갈 때 되돌릴 칩의 원래 내용
const CHANG_DEFAULT = changThumb ? {
  src:   changThumb.getAttribute('src'),
  alt:   changThumb.alt,
  label: changLabel.textContent
} : null;

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGsap = typeof window.gsap !== 'undefined';

const clamp = THREE.MathUtils.clamp;
const lerp  = (a, b, t) => a + (b - a) * t;

const BOX_W = 1920;   // .guide_box 고정 폭
const BOX_H = 1239;   // .guide_box 고정 높이

/* -------------------------------------------------------------------------
   캐러셀 치수 — 패딩을 뺀 1920×1080 안전 영역 안에 전부 들어가도록 역산합니다.
   임의의 상수를 두지 않고, 카드 원본 크기(395×255)와 장 수에서 계산합니다.

     가로: 좌우 끝 카드가 안전 폭을 넘지 않도록
           2·R + 카드폭 ≤ SAFE_W        → R = (SAFE_W - CARD_W) / 2
     세로: 나선 전체 + 카드 높이가 안전 높이 안에 들어오도록
           N·gap + 카드높이 ≤ SAFE_H    → gap = (SAFE_H - CARD_H) / N
     각도: 2π / N — 10 장에 정확히 한 바퀴라 10 → 1 로 이음매 없이 반복
   원근 때문에 뒤쪽 카드는 더 작게 잡히므로 실제 결과는 이 상자보다 여유가
   있습니다(측정값 1471 × 718).
   ------------------------------------------------------------------------- */
const FRAME_W   = 1920;
const FRAME_H   = 1080;
const FRAME_PAD = 80;
const SAFE_W    = FRAME_W - FRAME_PAD * 2;   // 1760
const SAFE_H    = FRAME_H - FRAME_PAD * 2;   // 920

const CARD_W = 395;   // guide_img_box*.png 원본 크기
const CARD_H = 255;
const ROOM_COUNT = roomImgs.length;          // 10

const BASE_RADIUS  = (SAFE_W - CARD_W) / 2;             // 682.5
const VERTICAL_GAP = (SAFE_H - CARD_H) / (ROOM_COUNT || 1);  // 66.5
const ANGLE_GAP    = (Math.PI * 2) / (ROOM_COUNT || 1);      // 0.628

/* 원통에서 카메라를 정면으로 마주 보는 각. cos·sin 배치라 이 값을 더해야
   B = 0 인 카드가 (0, 0, +R) — 화면 정중앙 · 최전면에 섭니다.
   이게 없으면 B = 0 이 (R, 0, 0), 즉 오른쪽 끝에서 옆을 보고 서 있습니다. */
const FRONT_PHASE = Math.PI / 2;

/* 카드 호버 연출 */
const CARD_RADIUS   = 30;    // 모서리 반지름(px)
const VEIL_ALPHA    = 0.67;  // 호버 시 덮는 검정 농도
const LABEL_RISE    = 26;    // 문구가 아래에서 올라오는 거리(px)
const LABEL_BOTTOM  = 20;    // 문구 블록 아래끝과 카드 하단 사이 거리(px)
const LABEL_SIZE    = 15;    // 글자 크기(px, 카드 원본 395×255 기준)
const LABEL_LEADING = 28;    // 줄 간격(px)

/* -------------------------------------------------------------------------
   0) DOM 측정
   guide_box 기준 offset 을 누적해서, 부모(.page)의 scale 변형에 영향받지 않는
   "레이아웃 픽셀" 좌표를 얻습니다.
   ------------------------------------------------------------------------- */
function offsetIn(el, root) {
  let x = 0, y = 0, n = el;
  while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
  return { x, y };
}

/* CSS matrix(a,b,c,d,e,f) 를 회전 + 스케일로 분해.
   M = R(θ)·S 로 보면 sx=hypot(a,b), θ=atan2(b,a), sy=det/sx.
   .guide_piece_vec1 처럼 scaleY(-1) 이 섞인 경우도 det<0 으로 잡힙니다. */
function decompose(el) {
  const t = getComputedStyle(el).transform;
  if (!t || t === 'none') return { rot: 0, sx: 1, sy: 1 };
  const m = t.match(/matrix\(([^)]+)\)/);
  if (!m) return { rot: 0, sx: 1, sy: 1 };
  const [a, b, c, d] = m[1].split(',').map(Number);
  const sx  = Math.hypot(a, b) || 1;
  const det = a * d - b * c;
  return { rot: Math.atan2(b, a), sx, sy: det / sx };
}

function measure(piece) {
  const inner  = piece.querySelector('.guide_piece_inner');
  const target = inner || piece;
  const o = offsetIn(piece, box);
  // 회전은 inner 에 걸려 있고 inner 는 piece 안에서 가운데 정렬이므로
  // 중심점은 언제나 piece 의 중심과 같습니다.
  const cx = o.x + piece.offsetWidth  / 2;
  const cy = o.y + piece.offsetHeight / 2;
  const { rot, sx, sy } = decompose(target);
  return {
    cx, cy,
    w: target.offsetWidth,
    h: target.offsetHeight,
    rot, sx, sy,
    img: piece.querySelector('img')
  };
}

/* -------------------------------------------------------------------------
   1) 셰이더
   ------------------------------------------------------------------------- */
const VERT = /* glsl */`
  uniform float uRevealProgress; // 0 ~ 1, 진입 리빌
  uniform float uZoom;           // 0 ~ 0.14, 호버
  uniform vec2  uPlaneSizes;     // 조각의 화면 크기(px)

  varying vec2 vUv;

  /* 주의 — position 은 1×1 plane 의 로컬 좌표(-0.5~0.5)이고 mesh.scale 이
     나중에 곱해집니다. 그래서 "몇 px 밀지"를 그대로 더하면 조각 크기만큼
     증폭됩니다. y 는 uPlaneSizes 로 나눠 로컬 비율로 바꿔서 더하고,
     z 는 scale.z 가 1 이라 px 를 그대로 씁니다. */
  void main() {
    vUv = uv;

    vec3 p = position;

    // 진입: 아래에서 70px 떠오르며 자리를 잡음
    p.y -= (1.0 - uRevealProgress) * 70.0 / uPlaneSizes.y;

    // 호버하면 아주 조금 앞으로
    p.z += uZoom * 140.0;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAG = /* glsl */`
  uniform sampler2D uTexture;
  uniform vec2  uPlaneSizes;
  uniform vec2  uImageSizes;
  uniform float uZoom;
  uniform float uRevealProgress;
  uniform float uColorStrength;
  uniform vec3  uFillColor;
  uniform float uAlpha;          // 캐러셀에서 위아래 끝으로 사라질 때

  uniform float uHover;          // 0~1 호버 진행도
  uniform float uRadius;         // 모서리 반지름(px). 0 이면 마스크 안 씀
  uniform sampler2D uLabel;      // 카드 문구를 그려 둔 텍스처
  uniform float uHasLabel;
  uniform float uLabelRise;      // 문구가 아래에서 올라오는 거리(px)
  uniform float uVeil;           // 호버 시 덮는 검정 농도

  varying vec2 vUv;

  // three 의 sRGBTransferOETF 와 같은 식
  vec3 linearToSRGB(vec3 c) {
    return mix(pow(c, vec3(0.41666)) * 1.055 - vec3(0.055),
               c * 12.92,
               vec3(lessThanEqual(c, vec3(0.0031308))));
  }

  /* 라운드 사각형 SDF. 텍스처를 확대(uZoom)해도 모서리는 이 마스크가 잡아
     주기 때문에 호버 중에도 radius 가 그대로 유지됩니다. */
  float roundedRectMask(vec2 uv, vec2 size, float r) {
    vec2 p = (uv - 0.5) * size;
    vec2 q = abs(p) - (size * 0.5 - vec2(r));
    float dist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
    return 1.0 - smoothstep(-1.0, 1.0, dist);   // 안쪽 1, 바깥 0
  }

  void main() {
    // object-fit: cover 와 같은 UV 보정
    float planeAspect = uPlaneSizes.x / uPlaneSizes.y;
    float imageAspect = uImageSizes.x / uImageSizes.y;
    vec2 ratio = vec2(
      min(planeAspect / imageAspect, 1.0),
      min(imageAspect / planeAspect, 1.0)
    );

    // 호버 줌 — 중심 기준으로 텍스처만 확대
    vec2 uv = (vUv - 0.5) / (1.0 + uZoom) + 0.5;
    uv = vec2(
      uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      uv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );

    vec4 col = texture2D(uTexture, uv);

    // 다른 조각을 호버하는 동안만 배경 크림색 쪽으로 눌러 둡니다(선형 공간에서)
    col.rgb = mix(col.rgb, uFillColor, uColorStrength);

    /* 텍스처는 colorSpace=srgb 라 샘플링할 때 선형으로 디코드됩니다. 그런데
       three 는 ShaderMaterial 에 출력 인코딩(colorspace_fragment)을 붙여 주지
       않아서, 그대로 두면 선형 값이 프레임버퍼로 나가 DOM 보다 어두워집니다
       (원본 157 → 85). 여기서 직접 sRGB 로 되돌려 놔야 DOM 과 같은 색이 되고,
       알파 합성도 브라우저와 같은 공간에서 이뤄집니다. */
    col.rgb = linearToSRGB(col.rgb);

    // 호버하면 검정으로 덮습니다
    col.rgb = mix(col.rgb, vec3(0.0), uVeil * uHover);

    /* 문구 — 아래에서 위로. 최종 자리에 그려 둔 라벨 텍스처를 호버가 0 일 때
       아래쪽에서 샘플링해서(= 화면상 아래에 있는 것처럼) 위로 올립니다.
       uv.y 는 위가 1 이므로, 아래로 밀려면 샘플 좌표를 위로 옮깁니다. */
    if (uHasLabel > 0.5 && uHover > 0.001) {
      vec2 luv = vec2(vUv.x, vUv.y + (1.0 - uHover) * uLabelRise / uPlaneSizes.y);
      vec4 lab = texture2D(uLabel, luv);
      float inside = step(0.0, luv.y) * step(luv.y, 1.0);
      col.rgb = mix(col.rgb, lab.rgb, lab.a * uHover * inside);
    }

    // 리빌 — 아래에서 위로 훑고 지나가는 와이프
    float wipe = smoothstep(0.0, 1.0, uRevealProgress * 1.4 - vUv.y * 0.4);

    float alpha = col.a * wipe * uAlpha;
    // 라운드 모서리 — uZoom 으로 텍스처를 확대해도 여기서 다시 깎아 유지합니다
    if (uRadius > 0.0) alpha *= roundedRectMask(vUv, uPlaneSizes, uRadius);

    gl_FragColor = vec4(col.rgb, alpha);
    if (gl_FragColor.a < 0.001) discard;
  }
`;

/* 아주 옅은 필름 그레인 */
const NoiseShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime:    { value: 0 },
    uAmount:  { value: 0.055 }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAmount;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      // 투명한 곳까지 흔들면 배경에 사각형 자국이 남으므로 알파로 막습니다
      float n = hash(vUv * 1024.0 + fract(uTime) * 97.0) - 0.5;
      c.rgb += n * uAmount * c.a;
      gl_FragColor = c;
    }
  `
};

/* =========================================================================
   Sizes / Time
   ========================================================================= */
class Sizes {
  constructor() {
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);
    this.handlers = [];
    window.addEventListener('resize', () => {
      this.pixelRatio = Math.min(window.devicePixelRatio, 2);
      this.handlers.forEach((fn) => fn());
    });
  }
  on(fn) { this.handlers.push(fn); }
}

class Time {
  constructor() {
    this.start = performance.now();
    this.current = this.start;
    this.elapsed = 0;
    this.delta = 16;
  }
  tick(now) {
    // 상한만 막으면 탭에서 돌아올 때 delta 가 튀거나 음수가 되어
    // 1-(1-k)^(delta·s) 가 발산합니다. 양쪽 다 막습니다.
    this.delta = clamp(now - this.current, 0, 64);
    this.current = now;
    this.elapsed = now - this.start;
  }
}

/* =========================================================================
   Controls
   scrollOffset 이 카드 순번을 밀어 줍니다(roomTransform 참고).
     · 가만히 두면 flowSpeed 만큼 계속 "아래로" 흐릅니다.
       (scrollOffset 이 커지면 카드의 y 가 작아져서 아래로 내려갑니다)
     · 휠 · 드래그는 다음 정수 칸 하나로만 이동합니다. 한 제스처에 여러
       칸이 뛰지 않도록 stepCooldown 으로 묶습니다.
   ========================================================================= */
class Controls {
  constructor(experience) {
    this.experience = experience;
    this.canvas = experience.canvas;

    this.scrollOffset = 0;

    this.autoFlow   = !reduced; // 계속 흐를지
    this.flowSpeed  = 0.0018;   // + 는 아래 방향
    this.stepEasing = 0.12;

    this.stepTarget   = null;   // 휠로 지정한 다음 칸
    this.lastStepAt   = 0;
    this.stepCooldown = 280;    // ms — 한 제스처에 한 칸만

    this.normalizedMouse = new THREE.Vector2(-2, -2);
    this.parallax        = new THREE.Vector2(0, 0);   // 뷰포트 기준 -1~1

    this.isRoomMode = false;    // 캐러셀 모드에서만 휠을 가로챕니다
    this.isDragging = false;
    this.DRAG_THRESHOLD = 8;
    this.DRAG_STEP_PX   = 90;   // 이만큼 끌 때마다 한 칸
    this.dragAccum      = 0;

    this.addEventListeners();
  }

  /* 다음(또는 이전) 칸 하나로. 이미 이동 중이면 그 목표를 기준으로 한 칸 더. */
  step(dir) {
    const now = performance.now();
    if (now - this.lastStepAt < this.stepCooldown) return;
    this.lastStepAt = now;
    const base = this.stepTarget !== null ? this.stepTarget : Math.round(this.scrollOffset);
    this.stepTarget = base + dir;
  }

  addEventListeners() {
    /* 'capture' 모드에서만 캔버스 위 휠을 가로챕니다. 기본값인 'page' 모드에서는
       페이지가 정상적으로 스크롤되고, 카드는 Experience.update() 가 스크롤
       거리를 재서 넘깁니다. */
    if (SCROLL_MODE === 'capture') {
      this.canvas.addEventListener('wheel', (e) => {
        if (!this.isRoomMode) return;
        e.preventDefault();
        e.stopPropagation();
        this.step(e.deltaY > 0 ? 1 : -1);
      }, { passive: false });
    }

    // 호버 판정용 좌표는 캔버스 기준, 시차용 좌표는 뷰포트 기준
    window.addEventListener('pointermove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.normalizedMouse.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
      this.normalizedMouse.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
      this.parallax.x = (e.clientX / window.innerWidth)  * 2 - 1;
      this.parallax.y = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    this.canvas.addEventListener('click', () => {
      if (this.isRoomMode && this.onClick) this.onClick();
    });

    /* 드래그(터치 · 마우스)도 같은 "한 칸씩"으로 처리합니다.
       끈 거리를 모아서 DRAG_STEP_PX 를 넘을 때마다 한 칸 넘깁니다.
       왼쪽 → 오른쪽으로 끌면 아래로(= 스크롤을 내린 것과 같은 방향) 갑니다. */
    const dragStart = (x) => { this.isDragging = true; this.lastDragX = x; this.dragAccum = 0; };
    const dragMove  = (x) => {
      if (!this.isDragging) return;
      this.dragAccum += (x - this.lastDragX);
      this.lastDragX = x;
      while (Math.abs(this.dragAccum) >= this.DRAG_STEP_PX) {
        const dir = this.dragAccum > 0 ? 1 : -1;
        this.dragAccum -= dir * this.DRAG_STEP_PX;
        this.lastStepAt = 0;          // 드래그는 쿨다운 없이 거리로만 셉니다
        this.step(dir);
      }
    };
    const dragEnd = () => { this.isDragging = false; this.dragAccum = 0; };

    this.canvas.addEventListener('touchstart', (e) => {
      if (!this.isRoomMode) return;
      const t = e.touches[0]; if (!t) return;
      this.touchStartX = t.clientX;
      dragStart(t.clientX);
      this.isDragging = false;        // THRESHOLD 를 넘어야 시작
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (!this.isRoomMode) return;
      const t = e.touches[0]; if (!t) return;
      if (!this.isDragging && Math.abs(t.clientX - this.touchStartX) > this.DRAG_THRESHOLD) {
        dragStart(t.clientX);
      }
      if (this.isDragging) { e.preventDefault(); dragMove(t.clientX); }
    }, { passive: false });

    this.canvas.addEventListener('touchend', dragEnd);

    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.isRoomMode) return;
      dragStart(e.clientX);
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', (e) => dragMove(e.clientX));
    const endPointer = (e) => {
      if (!this.isDragging) return;
      dragEnd();
      if (this.canvas.hasPointerCapture && this.canvas.hasPointerCapture(e.pointerId)) {
        this.canvas.releasePointerCapture(e.pointerId);
      }
    };
    this.canvas.addEventListener('pointerup', endPointer);
    this.canvas.addEventListener('pointercancel', endPointer);
  }

  update() {
    if (this.stepTarget !== null) {
      // 지정된 칸까지 부드럽게. 도착하면 정확히 정수에 앉힙니다.
      const d = this.stepTarget - this.scrollOffset;
      this.scrollOffset += d * this.stepEasing;
      if (Math.abs(d) < 0.002) { this.scrollOffset = this.stepTarget; this.stepTarget = null; }
    } else if (this.autoFlow) {
      this.scrollOffset += this.flowSpeed;   // 계속 아래로
    }

  }
}

/* =========================================================================
   Raycaster
   ========================================================================= */
class Raycaster extends THREE.Raycaster {
  constructor(experience) {
    super();
    this.camera = experience.camera;
    this.mouse  = experience.controls.normalizedMouse;
  }
  update() { this.setFromCamera(this.mouse, this.camera); }
}

/* =========================================================================
   재질 · 텍스처 헬퍼
   ========================================================================= */

// uLabel 이 비어 있을 때 쓸 1px 더미 — 샘플러가 null 이면 경고가 납니다
const EMPTY_1PX = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
EMPTY_1PX.needsUpdate = true;

/* 카드 문구를 캔버스에 그려 텍스처로 만듭니다.
   문구는 최종 자리(하단에서 LABEL_BOTTOM 만큼 띄운 곳)에 그려 두고,
   올라오는 연출은 셰이더가 샘플 좌표를 밀어서 처리합니다. */
function drawLabel(ctx, lines, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = `300 ${LABEL_SIZE}px "Open Sans", sans-serif`;
  // 마지막 줄의 베이스라인이 하단에서 LABEL_BOTTOM 위에 오도록 쌓아 올립니다
  lines.forEach((line, i) => {
    const fromBottom = LABEL_BOTTOM + (lines.length - 1 - i) * LABEL_LEADING;
    ctx.fillText(line, w / 2, h - fromBottom);
  });
}

function makeLabelTexture(lines, w, h) {
  const dpr = 2;                       // 글자가 뭉개지지 않게 2 배로
  const c = document.createElement('canvas');
  c.width = w * dpr; c.height = h * dpr;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  drawLabel(ctx, lines, w, h);

  const tex = new THREE.CanvasTexture(c);
  // 이 텍스처는 sRGB 로 인코딩을 끝낸 뒤에 섞으므로 변환을 걸지 않습니다
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearFilter;   // 밉맵 없이 — 글자가 번지지 않게
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return { tex, ctx };
}

function makeGuideMaterial(w, h) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTexture:        { value: null },
      uPlaneSizes:     { value: new THREE.Vector2(Math.abs(w), Math.abs(h)) },
      uImageSizes:     { value: new THREE.Vector2(1, 1) },
      uZoom:           { value: 0 },
      uRevealProgress: { value: 0 },
      uColorStrength:  { value: 0 },
      uFillColor:      { value: new THREE.Color('#f5ecd7') },
      uAlpha:          { value: 1 },
      uHover:          { value: 0 },
      uRadius:         { value: 0 },        // 0 = 마스크 안 씀(콜라주 조각)
      uLabel:          { value: EMPTY_1PX },
      uHasLabel:       { value: 0 },
      uLabelRise:      { value: LABEL_RISE },
      uVeil:           { value: VEIL_ALPHA }
    },
    transparent: true,
    // 겹침 순서는 depth 가 아니라 renderOrder 로만 정합니다
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide
  });
}

function loadTextureInto(experience, plane, src) {
  experience.loader.load(src, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = experience.renderer.capabilities.getMaxAnisotropy();
    plane.material.uniforms.uTexture.value = tex;
    plane.material.uniforms.uImageSizes.value.set(tex.image.width, tex.image.height);
  });
}

/* 호버 반응은 두 종류가 똑같아서 한 곳에 모아 둡니다 */
function applyHover(plane, focus) {
  const d = plane.time.delta;
  const k = plane.isHovered ? 0.09 : 0.07;
  plane.hoverProgress = lerp(plane.hoverProgress, plane.hoverTarget, 1 - Math.pow(1 - k, d * 0.20));

  const u = plane.material.uniforms;
  u.uZoom.value  = 0.13 * plane.hoverProgress;
  u.uHover.value = plane.hoverProgress;
  /* 아무것도 호버하지 않으면 0(= DOM 과 똑같은 원본 색), 무언가를 호버할
     때만 나머지를 크림색으로 눌러 줍니다. */
  u.uColorStrength.value = 0.22 * focus * (1 - plane.hoverProgress);
  return u;
}

/* =========================================================================
   CollagePlane — .guide_piece 하나. CSS 좌표 · 크기 · rotate 를 그대로 씁니다.
   ========================================================================= */
class CollagePlane extends THREE.Mesh {
  constructor(experience, index, geometry, m) {
    super(geometry, null);
    this.experience = experience;
    this.time  = experience.time;
    this.index = index;
    this.isHovered = false; this.hoverProgress = 0; this.hoverTarget = 0;

    this.baseX = m.cx - BOX_W / 2;
    this.baseY = -(m.cy - BOX_H / 2);
    this.cw = m.w * m.sx;
    this.ch = m.h * m.sy;
    this.crot = -m.rot;                  // CSS 는 y축이 아래, WebGL 은 위

    // 조각마다 다른 시차 깊이 — 큰 조각은 얕게, 작은 조각은 깊게
    this.depth = 0.35 + (1 - Math.min(m.w * m.h / 90000, 1)) * 0.9;

    this.material = makeGuideMaterial(this.cw, this.ch);
    this.renderOrder = index;
    this.scale.set(this.cw, this.ch, 1);
    this.rotation.z = this.crot;
    this.position.set(this.baseX, this.baseY, 0);

    loadTextureInto(experience, this, m.img.currentSrc || m.img.src);
  }

  setHovered(on) { this.isHovered = on; this.hoverTarget = on ? 1 : 0; }

  update(morph, para, scrollShift, focus) {
    const u = applyHover(this, focus);

    let cx = this.baseX, cy = this.baseY;
    if (para) {
      cx += para.x * this.depth * -18;
      cy += para.y * this.depth * -14 + scrollShift * this.depth * 40;
    }
    this.position.set(cx, cy, 0);
    this.rotation.set(0, 0, this.crot);
    this.scale.set(this.cw, this.ch, 1);
    u.uPlaneSizes.value.set(Math.abs(this.cw), Math.abs(this.ch));
    u.uAlpha.value = 1 - morph;                 // 캐러셀로 갈수록 사라짐
    this.visible = morph < 0.999;
    this.renderOrder = this.index;
  }
}

/* =========================================================================
   RoomPlane — guide_img_box 카드 한 장이 원통을 돕니다.
   10 장이 한 바퀴를 이루고 10 → 1 로 이어 붙어 끝없이 반복합니다.
   ========================================================================= */
class RoomPlane extends THREE.Mesh {
  constructor(experience, index, count, geometry, img) {
    super(geometry, null);
    this.experience = experience;
    this.controls = experience.controls;
    this.time     = experience.time;
    this.index    = index;
    this.count    = count;
    this.centerIndex = Math.floor(count / 2);
    this.group  = img.dataset.group || '';        // guide_chang 칩에 뜰 이름
    this.src    = img.currentSrc || img.src;      // 칩 썸네일이 같은 그림을 씁니다
    this.isRoomCard = true;                        // 콜라주 조각과 구분
    this.isHovered = false; this.hoverProgress = 0; this.hoverTarget = 0;

    this.material = makeGuideMaterial(CARD_W, CARD_H);
    this.material.uniforms.uRadius.value = CARD_RADIUS;
    this.scale.set(CARD_W, CARD_H, 1);
    this.visible = false;

    loadTextureInto(experience, this, this.src);

    /* 카드 문구 — data-caption 에 줄바꿈으로 적어 둔 만큼 칸을 나눕니다.
       웹폰트가 늦게 오면 대체 글꼴로 그려지므로 준비된 뒤 한 번 다시 그립니다. */
    const raw = (img.dataset.caption || '').trim();
    if (raw) {
      this.lines = raw.split('\n').map((s) => s.trim()).filter(Boolean);
      this.label = makeLabelTexture(this.lines, CARD_W, CARD_H);
      this.material.uniforms.uLabel.value = this.label.tex;
      this.material.uniforms.uHasLabel.value = 1;
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          drawLabel(this.label.ctx, this.lines, CARD_W, CARD_H);
          this.label.tex.needsUpdate = true;
        });
      }
    }
  }

  setHovered(on) { this.isHovered = on; this.hoverTarget = on ? 1 : 0; }

  /* 원통 위 자리
       B  = 내 순번 - 가운데                (scrollOffset 만큼 밀림)
       V  = B·angleGap + π/2                (각도)
       pos = (cos V · R, B·gap, sin V · R),  rotY = -V + π/2

     B = 0 → V = π/2 → pos (0, 0, +R), rotY 0.
     즉 scrollOffset 이 정수일 때마다 카드 하나가 화면 정중앙 · 최전면에서
     카메라를 정면으로 보고 섭니다. π/2 가 없으면 B = 0 이 (R, 0, 0) 이라
     오른쪽 끝에서 옆을 보고 서고, 중앙에는 아무것도 오지 않습니다. */
  roomTransform(out) {
    let n = this.index - this.controls.scrollOffset;
    n = ((n % this.count) + this.count) % this.count;   // 10 → 1 무한 반복
    const B = n - this.centerIndex;
    const V = B * ANGLE_GAP + FRONT_PHASE;

    out.x = Math.cos(V) * BASE_RADIUS;
    out.y = B * VERTICAL_GAP;
    out.z = Math.sin(V) * BASE_RADIUS;
    out.rotY = -V + Math.PI / 2;
    /* B 는 [-5, 5) 를 돌다가 -5 에서 +5 로 한 번 튑니다. 그 지점(edge = 1)에서만
       투명해지게 해서, 튀는 장면을 감추면서 나머지 9 장은 온전히 보입니다. */
    const edge = Math.abs(B) / (this.count / 2);
    out.alpha = 1 - clamp((edge - 0.82) / 0.18, 0, 1);
    return out;
  }

  update(morph, focus) {
    this.visible = morph > 0.001;
    if (!this.visible) return;

    const u = applyHover(this, focus);

    const t = this.roomTransform(_rt);
    this.position.set(t.x, t.y, t.z);
    this.rotation.set(0, t.rotY, 0);
    u.uPlaneSizes.value.set(CARD_W, CARD_H);
    u.uAlpha.value = t.alpha * morph;

    // 앞에 있는 카드가 위로. 페이드 중인 콜라주보다는 항상 위에 그립니다.
    this.renderOrder = 1000 + Math.round(t.z);
  }
}
const _rt = { x: 0, y: 0, z: 0, rotY: 0, alpha: 1 };

/* =========================================================================
   World
   ========================================================================= */
class World {
  constructor(experience) {
    this.experience = experience;
    this.collagePlanes = [];   // .guide_piece 12 장
    this.roomPlanes    = [];   // guide_img_box 10 장
    this.hovered = null;
    this.hoverEnabled = true;
    this.focus = 0;            // 0 = 아무것도 호버 안 함

    const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);

    pieces.map(measure).filter((m) => m.img).forEach((m, i) => {
      const plane = new CollagePlane(experience, i, geometry, m);
      experience.scene.add(plane);
      this.collagePlanes.push(plane);
    });

    roomImgs.forEach((img, i) => {
      const plane = new RoomPlane(experience, i, roomImgs.length, geometry, img);
      experience.scene.add(plane);
      this.roomPlanes.push(plane);
    });
  }

  get planes() { return [...this.collagePlanes, ...this.roomPlanes]; }

  checkHovered() {
    if (!this.hoverEnabled) {
      if (this.hovered) { this.hovered.setHovered(false); this.hovered = null; this.emit(null); }
      return;
    }

    const hits = this.experience.raycaster.intersectObjects(this.planes, false);

    // 앞면만 + 겹쳐 있으면 CSS 처럼 "가장 위에 그려지는" 조각
    let top = null;
    for (const h of hits) {
      const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
      if (n.dot(this.experience.raycaster.ray.direction) >= 0) continue;   // 뒷면
      if (h.object.material.uniforms.uAlpha.value < 0.35) continue;        // 사라지는 중
      if (!top || h.object.renderOrder > top.renderOrder) top = h.object;
    }

    if (this.hovered === top) return;
    if (this.hovered) this.hovered.setHovered(false);
    this.hovered = top;
    if (top) top.setHovered(true);
    canvas.style.cursor = top && this.experience.morph.v > 0.5 ? 'pointer' : '';
    this.emit(top);
  }

  /* guide_chang 칩 — 캐러셀에서 카드에 마우스를 올리면 아래에서 올라오며
     그 카드의 그림(48×48)과 이름(Hanok / Yangok)을 보여 줍니다. */
  emit(plane) {
    if (!changEl) return;
    const card = plane && plane.isRoomCard ? plane : null;
    if (card) {
      if (changThumb.getAttribute('src') !== card.src) changThumb.setAttribute('src', card.src);
      changThumb.alt = card.group;
      changLabel.textContent = card.group;
      changEl.classList.add('is_visible');
    } else {
      changEl.classList.remove('is_visible');
    }
  }

  update(morph, para, scrollShift) {
    this.checkHovered();
    // 무언가를 호버하는 동안만 0 → 1 로 올라가는 값
    const k = 1 - Math.pow(1 - 0.08, this.experience.time.delta * 0.20);
    this.focus = lerp(this.focus, this.hovered ? 1 : 0, k);

    for (const p of this.collagePlanes) p.update(morph, para, scrollShift, this.focus);
    for (const p of this.roomPlanes)    p.update(morph, this.focus);
  }
}

/* =========================================================================
   PostProcessing
   ========================================================================= */
class PostProcessing {
  constructor(experience) {
    this.experience = experience;
    this.enabled = SHOW_NOISE;

    this.composer = new EffectComposer(experience.renderer);
    this.composer.renderToScreen = true;
    this.renderPass = new RenderPass(experience.scene, experience.camera);
    this.renderPass.clearAlpha = 0;
    this.noisePass = new ShaderPass(NoiseShader);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.noisePass);
    this.resize();
  }
  resize() {
    this.composer.setSize(BOX_W, BOX_H);
    this.composer.setPixelRatio(this.experience.sizes.pixelRatio);
  }
  update() {
    this.noisePass.uniforms.uTime.value = this.experience.time.elapsed * 0.001;
    this.noisePass.enabled = this.enabled;
    this.composer.render();
  }
}

/* =========================================================================
   Experience
   ========================================================================= */
class Experience {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.isActive = true;
    this.morph = { v: 0 };          // 0 = 콜라주, 1 = 룸 캐러셀
    this.parallaxEnabled = SHOW_PARALLAX;
    this.sectionProgress = 0;

    this.sizes = new Sizes();
    this.time  = new Time();
    this.scene = new THREE.Scene();
    this.loader = new THREE.TextureLoader();

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(this.sizes.pixelRatio);
    this.renderer.setSize(BOX_W, BOX_H, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    /* 1 unit = 1 CSS px 이 되도록 카메라 거리에서 fov 를 역산합니다.
       거리를 바꿔도 z=0 평면의 1:1 매핑(= 콜라주)은 그대로고 원근의 세기만
       달라집니다. 반지름의 4 배 거리로 두면 앞뒤 카드의 크기 차가 과하지
       않습니다. */
    this.camZ = BASE_RADIUS * 4;
    this.camera = new THREE.PerspectiveCamera(
      2 * Math.atan((BOX_H / 2) / this.camZ) * (180 / Math.PI),
      BOX_W / BOX_H, 1, 6000
    );
    this.camera.position.z = this.camZ;

    this.controls  = new Controls(this);
    this.raycaster = new Raycaster(this);
    this.world     = new World(this);
    this.postprocessing = new PostProcessing(this);

    this.sizes.on(() => {
      this.renderer.setPixelRatio(this.sizes.pixelRatio);
      this.postprocessing.resize();
    });

    // 페이지 스크롤 속도 — Lenis 에 기대지 않고 직접 잽니다
    this.lastScrollY = window.scrollY;
    this.scrollAccum = 0;      // 'page' 모드에서 한 칸을 채우기까지 모은 거리
    this.section = document.querySelector('.guide');

    const loop = (now) => {
      requestAnimationFrame(loop);
      this.time.tick(now);
      this.update();
    };
    requestAnimationFrame(loop);
  }

  sectionInView() {
    if (!this.section) return true;
    const r = this.section.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  setRoomMode(on, immediate) {
    this.controls.isRoomMode = on;
    document.body.classList.toggle('room_on', on);
    if (on) {
      // 캐러셀 카드는 진입 와이프를 쓰지 않으므로 열어 둡니다
      this.world.roomPlanes.forEach((p) => { p.material.uniforms.uRevealProgress.value = 1; });
    } else {
      canvas.style.cursor = '';
      this.world.emit(null);
      if (CHANG_DEFAULT) {
        changThumb.setAttribute('src', CHANG_DEFAULT.src);
        changThumb.alt = CHANG_DEFAULT.alt;
        changLabel.textContent = CHANG_DEFAULT.label;
      }
    }
    const target = on ? 1 : 0;
    if (immediate || reduced || !hasGsap) this.morph.v = target;
    else gsap.to(this.morph, { v: target, duration: 1.15, ease: 'power3.inOut' });
  }

  /* 스크롤 거리를 카드 넘김으로 바꿉니다 — SCROLL_STEP_PX 를 채울 때마다 한 칸.
     페이지가 스크롤될 때는 update() 가 부르고, 섹션이 화면 중앙에 고정돼
     페이지가 움직이지 않을 때는 카드 위에서 돌린 휠을 js/flagship.js 가 그대로
     여기로 보냅니다. 세는 곳이 한 군데라 두 경우의 감각이 같습니다. */
  pushScroll(dy) {
    if (!this.controls.isRoomMode || !dy) return;
    this.scrollAccum += dy;
    while (Math.abs(this.scrollAccum) >= SCROLL_STEP_PX) {
      const dir = this.scrollAccum > 0 ? 1 : -1;
      this.scrollAccum -= dir * SCROLL_STEP_PX;
      this.controls.lastStepAt = 0;   // 거리로 세므로 쿨다운은 건너뜁니다
      this.controls.step(dir);
    }
  }

  /* 캐러셀 카드가 화면에서 차지하는 사각형(뷰포트 px). 섹션 고정(js/flagship.js)
     이 "마우스가 카드 칸 안이냐"를 판단할 때 씁니다 — 칸 안에서 돌린 휠은 카드를
     넘기고, 칸을 벗어난 자리에서 돌려야 다음 섹션으로 넘어갑니다.
     카드가 도는 동안 테두리가 계속 달라지므로 상수로 두지 않고 그때그때
     카드 네 귀퉁이를 화면 좌표로 투영해서 잽니다. */
  roomArea() {
    if (!this.controls.isRoomMode) return null;
    const r = this.canvas.getBoundingClientRect();
    const v = new THREE.Vector3();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const p of this.world.roomPlanes) {
      if (p.material.uniforms.uAlpha.value < 0.35) continue;   // 사라지는 중인 카드는 뺍니다
      for (const sx of [-0.5, 0.5]) {
        for (const sy of [-0.5, 0.5]) {
          v.set(sx, sy, 0).applyMatrix4(p.matrixWorld).project(this.camera);
          const x = r.left + (v.x * 0.5 + 0.5) * r.width;
          const y = r.top + (-v.y * 0.5 + 0.5) * r.height;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (minX === Infinity) return null;
    return { left: minX, top: minY, right: maxX, bottom: maxY };
  }

  update() {
    if (!this.isActive) return;

    // 이번 프레임에 페이지가 얼마나 스크롤됐는지 ('page' 모드 스텝에 씁니다)
    const y = window.scrollY;
    const dy = y - this.lastScrollY;
    this.lastScrollY = y;

    /* 'page' 모드 — 섹션이 화면에 걸쳐 있는 동안, 페이지를 SCROLL_STEP_PX 만큼
       스크롤할 때마다 카드를 한 칸 넘깁니다. 휠을 가로채지 않으므로 페이지는
       평소대로 내려갑니다.

       sulwhasooSnapMoving 은 섹션 스냅(js/flagship.js)이 페이지를 섹션 중앙으로
       옮기고 있다는 표시입니다. 그 이동은 사용자가 굴린 스크롤이 아닌데다 한
       번에 수천 px 이 움직이므로, 그대로 세면 카드가 십수 칸씩 돌아버립니다. */
    if (SCROLL_MODE === 'page' && dy !== 0 && this.sectionInView() && !window.sulwhasooSnapMoving) {
      this.pushScroll(dy);
    }

    // raycaster → controls → world → postprocessing
    this.raycaster.update();
    this.controls.update();

    const morph = this.morph.v;

    if (this.parallaxEnabled) {
      _para.x += (this.controls.parallax.x - _para.x) * 0.06;
      _para.y += (this.controls.parallax.y - _para.y) * 0.06;
    }

    const scrollShift = (this.sectionProgress - 0.5) * 2;   // -1 ~ 1
    this.world.update(morph, this.parallaxEnabled ? _para : null, scrollShift);
    this.postprocessing.update();
  }
}
const _para = { x: 0, y: 0 };

/* =========================================================================
   기동
   ========================================================================= */
let experience;
try {
  experience = new Experience(canvas);
} catch (err) {
  // WebGL 을 못 쓰는 환경이면 DOM 콜라주가 그대로 남습니다
  console.warn('[guide] WebGL 초기화 실패 — DOM 콜라주로 둡니다.', err);
  canvas.style.display = 'none';
  return;
}

// 여기까지 왔으면 WebGL 이 그리므로 DOM 이미지를 감춥니다
document.body.classList.add('gl_on');

experience.setRoomMode(START_MODE === 'room', true);

/* 콜라주 모드일 때만 쓰는 스크롤 연출 */
if (START_MODE !== 'room' && hasGsap && typeof window.ScrollTrigger !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);

  // 섹션 진입 리빌 — 콜라주 조각을 DOM 순서대로 스태거
  ScrollTrigger.create({
    trigger: '.guide',
    start: 'top 78%',
    once: true,
    onEnter: () => {
      experience.world.collagePlanes.forEach((p, i) => {
        gsap.to(p.material.uniforms.uRevealProgress, {
          value: 1, duration: 1.25, delay: i * 0.055, ease: 'power3.out'
        });
      });
    }
  });

  // 섹션이 화면을 지나가는 진행도 — 시차용
  ScrollTrigger.create({
    trigger: '.guide',
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => { experience.sectionProgress = self.progress; }
  });
} else {
  // 캐러셀로 시작하면 콜라주는 안 보이므로 리빌을 열어 둡니다
  experience.world.collagePlanes.forEach((p) => { p.material.uniforms.uRevealProgress.value = 1; });
}

// 콘솔에서 들여다볼 수 있게
window.guideGL = experience;

}
