/**
 * Hero — 절차적 3D 유리병 (yultest/index2.html 이식)
 * 실측 실루엣(LatheGeometry)과 캔버스로 구운 라벨/유리 그라데이션 텍스처로
 * "Concentrated Ginseng Renewing Cream Rich" 자음생크림 용기를 만든다.
 *
 * 진행 순서:
 *   1. 헤드카피가 다 칠해질 때까지(hero_pin_wrapper의 fill+hold 구간) 병은 제자리에
 *      멈춰 있는다.
 *   2. 채색이 끝나 hero의 sticky 고정이 풀리는 순간부터, 병은 회전하면서 동시에
 *      화면을 가로질러 3번째 섹션(image_text)의 "S" 자리(image_text_media)로
 *      이동한다 — 회전 시작 = 다음 섹션으로 이동 시작 (setupHeroJarTravel).
 *   3. 도착하면 그 자리에 정적으로 남는다.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const canvas = document.getElementById("hero_jar_canvas");
if (canvas) {
  const jar = initHeroJar(canvas);
  setupHeroJarTravel(
    canvas,
    document.querySelector(".hero_jar_slot"),
    document.querySelector(".image_text_media"),
    document.querySelector(".hero_pin_wrapper"),
    document.getElementById("hero"),
    jar
  );
}

function initHeroJar(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.15, 5.4);
  camera.lookAt(0, 0, 0);

  // 유리 재질은 환경광이 전부다. RoomEnvironment로 스튜디오 반사를 만든다.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xfff2e0, 1.1);
  key.position.set(3, 5, 4);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xffd9a0, 0.7);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  scene.add(new THREE.AmbientLight(0xffffff, 0.22));

  // ---------------------------------------------------------------
  // 용기: 회전대칭이므로 실루엣 프로파일 하나로 Lathe 생성
  // ---------------------------------------------------------------
  const product = new THREE.Group();
  scene.add(product);
  const creamJar = new THREE.Group();
  creamJar.name = "cream-jar";
  product.add(creamJar);

  function lathePoints(pairs) {
    return pairs.map(([x, y]) => new THREE.Vector2(x, y));
  }

  // 지오메트리는 눈대중이 아니라 실측 알파 실루엣에서 측정한 값이다(yultest/index2 원본과 동일).
  //   전체 비율  가로/세로 = 1.4078  →  R = 1.0 일 때 H = 1.4205
  //   최대 반지름 위치 y_norm = 0.565 (어깨). 위가 넓고 아래로 좁아진다.
  const H = 1.4205;
  const yy = (t) => t * H;

  const bodyProfile = lathePoints([
    [0.000, yy(0.000)], [0.400, yy(0.008)], [0.560, yy(0.020)],
    [0.600, yy(0.040)], [0.625, yy(0.060)], [0.648, yy(0.080)],
    [0.670, yy(0.100)], [0.713, yy(0.140)], [0.752, yy(0.180)],
    [0.789, yy(0.220)], [0.823, yy(0.260)], [0.853, yy(0.300)],
    [0.882, yy(0.340)], [0.907, yy(0.380)], [0.931, yy(0.420)],
    [0.952, yy(0.460)], [0.973, yy(0.500)], [0.991, yy(0.540)],
    [0.998, yy(0.565)],
    [0.994, yy(0.580)], [0.930, yy(0.600)], [0.840, yy(0.620)],
    [0.755, yy(0.645)], [0.000, yy(0.645)]
  ]);
  const bodyGeo = new THREE.LatheGeometry(bodyProfile, 192);

  (function remapVByHeight(geo) {
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i); if (y < lo) lo = y; if (y > hi) hi = y;
    }
    for (let i = 0; i < pos.count; i++) uv.setY(i, (pos.getY(i) - lo) / (hi - lo));
    uv.needsUpdate = true;
  })(bodyGeo);

  const GLASS_RAMP = [
    [0.000, "#7a4a14"], [0.042, "#6b1a06"], [0.083, "#6d1c06"],
    [0.125, "#7d260a"], [0.167, "#cf8318"], [0.208, "#dcab5e"],
    [0.250, "#eebc79"], [0.292, "#f5c17f"], [0.333, "#e18832"],
    [0.375, "#ee9037"], [0.417, "#f2932a"], [0.458, "#f08d18"],
    [0.500, "#e67a0a"], [0.542, "#dd6503"], [0.583, "#d05100"],
    [0.625, "#c43c00"], [0.667, "#ba2a00"], [0.708, "#ae1d00"],
    [0.750, "#a91700"], [0.792, "#a41500"], [0.833, "#a71700"],
    [0.875, "#b42400"], [0.917, "#ac1e00"], [0.958, "#933a1c"],
    [1.000, "#931a00"]
  ];

  function makeGlassRamp() {
    const c = document.createElement("canvas");
    c.width = 4; c.height = 512;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, c.height, 0, 0);
    GLASS_RAMP.forEach(([stop, hex]) => grad.addColorStop(stop, hex));
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  const glass = new THREE.MeshPhysicalMaterial({
    map: makeGlassRamp(),
    transmission: 0.0,
    roughness: 0.05,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 0.55
  });
  const body = new THREE.Mesh(bodyGeo, glass);
  body.name = "glass-body";
  creamJar.add(body);

  const gold = new THREE.MeshPhysicalMaterial({
    color: 0xd8c093,
    metalness: 1.0,
    roughness: 0.24,
    clearcoat: 0.45,
    clearcoatRoughness: 0.10,
    envMapIntensity: 0.95
  });

  const capProfile = lathePoints([
    [0.000, yy(0.690)], [0.800, yy(0.690)], [0.819, yy(0.700)],
    [0.840, yy(0.740)], [0.860, yy(0.780)], [0.878, yy(0.820)],
    [0.893, yy(0.860)], [0.907, yy(0.900)], [0.920, yy(0.940)],
    [0.928, yy(0.978)], [0.915, yy(0.994)], [0.870, yy(1.000)],
    [0.660, yy(1.000)]
  ]);
  const cap = new THREE.Mesh(new THREE.LatheGeometry(capProfile, 192), gold);
  cap.name = "cap-shell";
  creamJar.add(cap);

  const capInner = new THREE.Mesh(
    new THREE.LatheGeometry(lathePoints([
      [0.660, yy(1.000)], [0.640, yy(0.990)], [0.630, yy(0.988)],
      [0.400, yy(0.992)], [0.000, yy(0.996)]
    ]), 192),
    new THREE.MeshPhysicalMaterial({
      color: 0xd9cba6, metalness: 0.85, roughness: 0.42, envMapIntensity: 1.1
    })
  );
  capInner.name = "cap-top-plate";
  creamJar.add(capInner);

  // ---------------------------------------------------------------
  // 라벨 — 각 줄의 [아래 y_norm, 위 y_norm, 원주 대비 폭]도 실측값
  // ---------------------------------------------------------------
  const LABEL_LINES = [
    { text: "Sulwhasoo", y0: 0.414, y1: 0.504, arc: 0.1273, serif: true },
    { text: "CONCENTRATED GINSENG", y0: 0.347, y1: 0.373, arc: 0.1186 },
    { text: "REJUVENATING CREAM RICH", y0: 0.304, y1: 0.329, arc: 0.1247 },
    { text: "CONCENTRÉ GINSENG", y0: 0.263, y1: 0.288, arc: 0.1017 },
    { text: "CRÈME RICHE RAJEUNISSANTE", y0: 0.223, y1: 0.247, arc: 0.1347 }
  ];
  const LABEL_BOT = 0.21, LABEL_TOP = 0.52;
  const LABEL_SPAN = LABEL_TOP - LABEL_BOT;
  const LABEL_ARC = 0.24;

  function makeLabelTexture() {
    const c = document.createElement("canvas");
    c.width = 2048; c.height = 678;
    const g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height);
    g.textAlign = "center";
    g.textBaseline = "alphabetic";

    const toCanvasY = (yn) => (1 - (yn - LABEL_BOT) / LABEL_SPAN) * c.height;

    for (const L of LABEL_LINES) {
      const top = toCanvasY(L.y1), bottom = toCanvasY(L.y0);
      const fontPx = (bottom - top) / 0.70;
      g.font = `400 ${fontPx.toFixed(1)}px "Times New Roman", serif`;
      g.fillStyle = L.serif ? "#fffaf2" : "rgba(255,250,242,.94)";

      const natural = g.measureText(L.text).width;
      const targetW = (L.arc / LABEL_ARC) * c.width;
      g.save();
      g.translate(c.width / 2, bottom);
      g.scale(targetW / natural, 1);
      g.fillText(L.text, 0, 0);
      g.restore();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  const LABEL_OFFSET = 0.010;
  const labelProfile = lathePoints([
    [0.780, 0.210], [0.789, 0.220], [0.823, 0.260], [0.853, 0.300],
    [0.882, 0.340], [0.907, 0.380], [0.931, 0.420], [0.952, 0.460],
    [0.973, 0.500], [0.982, 0.520]
  ].map(([r, t]) => [r + LABEL_OFFSET, yy(t)]));

  const labelGeo = new THREE.LatheGeometry(
    labelProfile, 96, -Math.PI * LABEL_ARC, Math.PI * 2 * LABEL_ARC
  );
  (function remapVByHeight(geo) {
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i); if (y < lo) lo = y; if (y > hi) hi = y;
    }
    for (let i = 0; i < pos.count; i++) uv.setY(i, (pos.getY(i) - lo) / (hi - lo));
    uv.needsUpdate = true;
  })(labelGeo);

  const label = new THREE.Mesh(labelGeo, new THREE.MeshBasicMaterial({
    map: makeLabelTexture(),
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false
  }));
  label.name = "label";
  creamJar.add(label);

  // 접지 그림자 — 실제 그림자 맵 대신 그라디언트 평면
  function makeShadowTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(90,55,25,.42)");
    grad.addColorStop(0.55, "rgba(90,55,25,.14)");
    grad.addColorStop(1, "rgba(90,55,25,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, depthWrite: false })
  );
  shadow.name = "ground-shadow";
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.01;
  product.add(shadow);

  // 용기 원점을 무게중심으로 옮겨 회전이 중앙에서 일어나게
  product.children.forEach((m) => { if (m !== shadow) m.position.y -= H / 2; });
  shadow.position.y = -H / 2 - 0.01;

  // ---------------------------------------------------------------
  // 캔버스 크기 — 현재 박스(홈 슬롯 520x568 / 이동 중 / 도착 슬롯 235x350) 기준으로
  // 매번 다시 잰다. 전체 뷰포트가 아니라 캔버스 자신의 박스 안에서만 렌더링한다.
  // ---------------------------------------------------------------
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function track(p, keys) {
    for (let i = 0; i < keys.length - 1; i++) {
      const [p0, v0] = keys[i], [p1, v1] = keys[i + 1];
      if (p <= p1) {
        const t = p1 === p0 ? 0 : (p - p0) / (p1 - p0);
        const e = t * t * (3 - 2 * t); // smoothstep
        return v0 + (v1 - v0) * e;
      }
    }
    return keys[keys.length - 1][1];
  }

  const LAYOUT = { scale: 0.92, travelX: 0.08, travelY: 0.05 };
  const target = { rotY: 0, posX: 0, posY: 0, rotX: 0, camZ: 5.4 };
  const current = { ...target };
  let progress = 0; // setProgress()로 외부(스크롤 이동 로직)에서 갱신

  function updateTargets() {
    const p = progress;
    target.rotY = p * Math.PI * 1.6; // 회전 시작 = 다음 섹션으로 이동 시작
    target.posX = track(p, [[0, 0], [0.3, 0.5], [0.7, -0.5], [1, 0]]);
    target.posY = track(p, [[0, 0], [0.5, -0.06], [1, 0]]);
    target.rotX = track(p, [[0, 0.02], [0.5, -0.12], [1, 0.02]]);
    target.camZ = track(p, [[0, 5.4], [0.5, 5.2], [1, 5.4]]);
  }

  function setProgress(p) {
    progress = Math.min(1, Math.max(0, p));
    updateTargets();
  }

  const reducedMotionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  let isReducedMotion = reducedMotionQuery.matches;
  reducedMotionQuery.addEventListener("change", (event) => {
    isReducedMotion = event.matches;
  });

  const clock = new THREE.Clock();
  const LERP = 0.09;

  function tick() {
    const t = clock.getElapsedTime();
    const interpolation = isReducedMotion ? 1 : LERP;

    for (const k in target) current[k] += (target[k] - current[k]) * interpolation;

    const displayX = current.posX * LAYOUT.travelX;
    const displayY = current.posY * LAYOUT.travelY;
    product.rotation.y = current.rotY;
    product.rotation.x = current.rotX;
    product.scale.setScalar(LAYOUT.scale);
    product.position.x = displayX;
    // 스크롤이 멈춰도 미세하게 떠 있도록 사인파를 얹는다
    const floatingY = isReducedMotion ? 0 : Math.sin(t * 0.8) * 0.03 * LAYOUT.scale;
    product.position.y = displayY + floatingY;
    camera.position.z = current.camZ;
    camera.lookAt(displayX * 0.15, displayY * 0.08 + 0.05, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  resize();
  tick();

  return { resize, setProgress };
}

/**
 * Hero jar 슬롯 이동 — hero_travel_image(js/home.js 의 setupStationeryMorph)와 같은
 * 원리다. 다른 점은, 이동 진행률(progress)을 캔버스의 화면상 위치뿐 아니라
 * 3D 회전/부유 포즈(jar.setProgress)에도 그대로 먹인다는 것 — "회전이 시작하면
 * 곧 다음 섹션으로 이동도 시작한다"는 요구를 하나의 진행률로 표현한다.
 *
 *   scrollY <= startScrollY : 홈 슬롯(hero_jar_slot)에 정적으로, 회전 없음(progress=0)
 *   startScrollY ~ endScrollY : position:fixed로 화면을 가로지르며 회전(progress 0→1)
 *   scrollY >= endScrollY : 도착 슬롯(image_text_media)에 안착. 도착 후에는 canvas가
 *     position:fixed 없이 슬롯 안에 정적으로 놓이므로 스크롤에 따라 화면 위로 그대로
 *     밀려 올라간다 — 그래서 소멸 구간(endScrollY ~ vanishScrollY)은 "슬롯이 뷰포트
 *     상단을 완전히 벗어나기까지 걸리는 스크롤 양"으로 잡아, 화면 밖으로 나가기 전에
 *     축소·투명화가 다 끝나도록 한다(scrollY가 다시 줄어들면 그대로 되돌아온다).
 */
function setupHeroJarTravel(canvas, homeSlotEl, endSlotEl, pinWrapperEl, pinnedSectionEl, jar) {
  if (!canvas || !homeSlotEl || !endSlotEl || !pinWrapperEl || !pinnedSectionEl) return;

  const STATE_HOME = "home";
  const STATE_TRAVEL = "travel";
  const STATE_ARRIVED = "arrived";
  let state = STATE_HOME;

  const reducedMotionQuery = matchMedia("(prefers-reduced-motion: reduce)");

  let startRect = null; // 고정 해제 시점의 홈 슬롯 위치/크기(뷰포트 기준)
  let startScrollY = 0;
  let endScrollY = 0;
  let vanishScrollY = 0; // 도착 후 완전히 사라지는 스크롤 지점

  function measure() {
    const wrapperRect = pinWrapperEl.getBoundingClientRect();
    const wrapperAbsTop = wrapperRect.top + window.scrollY;
    const sectionRect = pinnedSectionEl.getBoundingClientRect();

    // sticky 고정이 풀리는 스크롤 지점 = 헤드카피 채색(fill+hold)이 다 끝난 시점.
    // 이 지점부터 곧바로 회전 + 이동이 함께 시작된다.
    startScrollY = wrapperAbsTop + (wrapperRect.height - sectionRect.height);

    const endRect = endSlotEl.getBoundingClientRect();
    const endAbsTop = endRect.top + window.scrollY;
    const triggerOffset = window.innerHeight * 0.4;
    endScrollY = endAbsTop - triggerOffset;

    // 도착 후 canvas는 fixed가 아니라 슬롯 안에 정적으로 놓이므로 스크롤과 함께
    // 화면 위로 밀려 올라간다. 슬롯 상단이 뷰포트 상단(triggerOffset만큼 아래)에서
    // 시작해 슬롯 높이만큼 더 스크롤되면 완전히 화면 밖으로 나가므로, 그 전까지를
    // 축소·소멸 구간으로 써서 화면 밖으로 나가기 전에 다 사라지도록 한다.
    vanishScrollY = endScrollY + triggerOffset + endRect.height;

    const homeRect = homeSlotEl.getBoundingClientRect();
    startRect = {
      top: homeRect.top - sectionRect.top,
      left: homeRect.left,
      width: homeRect.width,
      height: homeRect.height
    };
  }

  function toHome() {
    homeSlotEl.appendChild(canvas);
    canvas.style.cssText = "";
    canvas.classList.remove("is_traveling");
    state = STATE_HOME;
    jar.setProgress(0);
    jar.resize();
  }

  function toArrived() {
    endSlotEl.appendChild(canvas);
    canvas.style.cssText = "";
    canvas.classList.remove("is_traveling");
    canvas.style.transformOrigin = "center center";
    state = STATE_ARRIVED;
    jar.setProgress(1);
    jar.resize();
  }

  function toTravel() {
    document.body.appendChild(canvas);
    canvas.classList.add("is_traveling");
    canvas.style.transform = "";
    canvas.style.opacity = "";
    state = STATE_TRAVEL;
  }

  function applyVanish(scrollY) {
    const range = vanishScrollY - endScrollY;
    const t = range <= 0 ? 1 : Math.min(1, Math.max(0, (scrollY - endScrollY) / range));
    const eased = t * t * (3 - 2 * t); // smoothstep

    if (reducedMotionQuery.matches) {
      canvas.style.transform = "";
      canvas.style.opacity = "";
      canvas.style.pointerEvents = "";
      return;
    }

    const scale = 1 - eased;
    canvas.style.transform = `scale(${scale})`;
    canvas.style.opacity = String(1 - eased);
    canvas.style.pointerEvents = eased >= 1 ? "none" : "";
  }

  function update() {
    const scrollY = window.scrollY;

    if (scrollY <= startScrollY || endScrollY <= startScrollY) {
      if (state !== STATE_HOME) toHome();
      return;
    }

    if (scrollY >= endScrollY) {
      if (state !== STATE_ARRIVED) toArrived();
      applyVanish(scrollY);
      return;
    }

    if (state !== STATE_TRAVEL) toTravel();

    const progress = (scrollY - startScrollY) / (endScrollY - startScrollY);
    const endRect = endSlotEl.getBoundingClientRect();

    canvas.style.top = startRect.top + (endRect.top - startRect.top) * progress + "px";
    canvas.style.left = startRect.left + (endRect.left - startRect.left) * progress + "px";
    canvas.style.width = startRect.width + (endRect.width - startRect.width) * progress + "px";
    canvas.style.height = startRect.height + (endRect.height - startRect.height) * progress + "px";
    jar.setProgress(progress);
    jar.resize();
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  }

  measure();
  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    measure();
    update();
  });
  window.addEventListener("load", () => {
    measure();
    update();
  });
}
