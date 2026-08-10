/**
 * Hero — 절차적 3D 유리병 (yultest/index2.html 이식)
 * 실측 실루엣(LatheGeometry)과 캔버스로 구운 라벨/유리 그라데이션 텍스처로
 * "Concentrated Ginseng Renewing Cream Rich" 자음생크림 용기를 만든다.
 *
 * 애니메이션은 yultest/index2.html과 같은 방식이다 — 캔버스는 뷰포트 전체에
 * position:fixed로 고정되고, 병 자체가 3D 공간 안에서 회전하며 이동해서
 * "화면 속 목표 지점"으로 움직이는 것처럼 보이게 만든다(DOM 박스를 늘였다 줄였다
 * 하는 대신, 카메라 화각을 이용해 화면 좌표 → 월드 좌표로 매번 환산한다).
 *
 * 진행 순서:
 *   1. 헤드카피가 다 칠해질 때까지(hero_pin_wrapper의 fill+hold 구간) 병은
 *      hero_jar_slot 안에 정적으로 멈춰 있는다(캔버스가 fixed 아님).
 *   2. 채색이 끝나 hero의 sticky 고정이 풀리는 순간부터, 캔버스가 뷰포트 전체를
 *      덮는 position:fixed로 바뀌고, 병은 1.6바퀴 회전하면서 화면상 홈 슬롯
 *      위치에서 3번째 섹션(image_text)의 "S" 자리(image_text_media) 위치까지
 *      아래로 이동한다(setupHeroJarTravel + initHeroJar의 setTravelProgress).
 *   3. 도착하면 캔버스가 그 슬롯 안으로 들어가 정적으로 남는다(더 이상 fixed 아님).
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

  // 몸체 목 상단(0.645, r=0.755)과 뚜껑 시작점(0.690, r=0.800) 사이에 원래 빈 틈이
  // 있었다 — 뚜껑 프로필 맨 아래에 몸체보다 살짝 낮은(0.640) 스커트를 하나 추가해서
  // 그 틈을 뚜껑 자체로 덮는다. 스커트 반지름(0.800)은 그 높이의 몸체 반지름(~0.77)
  // 보다 넓어서 이음매 없이 완전히 가린다. 그 위(0.690~)는 기존 뚜껑 형태 그대로.
  const capProfile = lathePoints([
    [0.000, yy(0.640)], [0.800, yy(0.640)], [0.800, yy(0.690)], [0.819, yy(0.700)],
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
  // 캔버스 크기 — 상태에 따라 홈 슬롯(520x568) / 뷰포트 전체(이동 중) / 도착 슬롯(235x350)
  // 중 하나다. explicitW/H를 넘기면 그 값을 그대로 쓰고, 없을 때만 DOM에서 실측한다.
  // (매 스크롤 프레임마다 getBoundingClientRect()로 다시 재면 강제 동기 레이아웃이
  // 발생해 스크롤 중 화면이 밀리는 원인이 된다 — 이동 중에는 항상 explicitW/H로 넘긴다.)
  // ---------------------------------------------------------------
  function resize(explicitW, explicitH) {
    let w = explicitW, h = explicitH;
    if (w == null || h == null) {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
    }
    w = Math.max(1, w);
    h = Math.max(1, h);
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

  // 화면 픽셀 좌표(px, py) 자리에 물체가 있는 것처럼 보이게 하는 월드 좌표 오프셋을 구한다.
  // 카메라가 정면(광축이 -Z, world (0,0,0)을 바라보는 것)이라고 근사한다 —
  // 실제로는 camera.position.y와 lookAt에 아주 작은 트래킹 오프셋이 있지만
  // 화면 목표 지점에 "대략" 안착시키는 용도라 이 정도 근사면 충분하다.
  function screenToWorldOffset(px, py, viewportW, viewportH, camDist) {
    const vFov = (camera.fov * Math.PI) / 180;
    const visibleH = 2 * camDist * Math.tan(vFov / 2);
    const visibleW = visibleH * (viewportW / viewportH);
    const ndcX = (px / viewportW) * 2 - 1;
    const ndcY = -((py / viewportH) * 2 - 1);
    return { x: ndcX * (visibleW / 2), y: ndcY * (visibleH / 2) };
  }

  const LAYOUT = { scale: 0.92 };
  // 라벨(phi=0)이 카메라(+Z)를 정면으로 보는 회전은 rotY가 360°의 정수배일 때뿐이다.
  // 도착 시점에 옆모습/뒷모습으로 멈추지 않도록, 총 회전량을 딱 맞아떨어지는 값(2바퀴)으로 둔다.
  const TRAVEL_TOTAL_ROTY = Math.PI * 4; // 2바퀴 — 도착 시 정면(phi=0)으로 정확히 복귀

  const target = { rotY: 0, rotX: 0.02, camZ: 5.4, worldX: 0, worldY: 0, sizeFactor: 1 };
  const current = { ...target };

  // 정지 상태(홈 슬롯 안, 스크롤 이동 시작 전) — 제자리에서 살짝 떠 있기만 한다.
  function setHomePose() {
    target.rotY = 0;
    target.rotX = 0.02;
    target.camZ = 5.4;
    target.worldX = 0;
    target.worldY = 0;
    target.sizeFactor = 1;
  }

  // 이동 중 — yultest/index2.html의 포즈 곡선(회전량/스윙 타이밍/카메라 돌리)을 그대로
  // 따르되, 주 위치는 "지금 화면에서 어디로 가야 하는가"(screen)를 매 프레임 월드 좌표로
  // 환산해서 정한다. sizeFactor는 홈 박스 높이 → 도착 박스 높이 비율로 줄어들어서,
  // 캔버스가 항상 뷰포트 전체 크기여도 도착 순간 작은 슬롯 안에 넣었을 때와 크기가
  // 이어지도록(뚝 끊겨 보이지 않도록) 맞춘다.
  function setTravelProgress(p, opts) {
    const progress = Math.min(1, Math.max(0, p));

    target.rotY = progress * TRAVEL_TOTAL_ROTY;
    target.rotX = track(progress, [[0, 0.02], [0.5, -0.16], [1, 0.04]]);
    target.camZ = track(progress, [[0, 5.4], [0.33, 5.2], [0.66, 5.3], [1, 5.6]]);

    // 옆으로 흔들리지 않고 홈 슬롯 자리에서 곧장 도착 자리로 내려가도록, 화면 목표
    // 지점을 그대로 따라간다(추가 스윙 없음). 한 바퀴(rotY=2π, progress=0.5)를 다
    // 돌고 나서 잠깐 화면 기준 4px만큼 더 왼쪽으로 붙었다가, 도착 직전(progress=1)에는
    // 다시 정확히 0으로 되돌아온다 — 그래야 도착 순간 고정 포즈(오프셋 0)로 스냅될
    // 때 어긋난 채 튀지 않고 흐름이 이어진다.
    const EXTRA_LEFT_SHIFT_PX = 4;
    const leftShift = track(progress, [[0, 0], [0.5, 0], [0.8, -EXTRA_LEFT_SHIFT_PX], [1, 0]]);
    const screenX = track(progress, [[0, opts.startScreen.x], [1, opts.endScreen.x]]) + leftShift;
    const screenY = track(progress, [[0, opts.startScreen.y], [1, opts.endScreen.y]]);
    const off = screenToWorldOffset(screenX, screenY, opts.viewportW, opts.viewportH, target.camZ);

    target.worldX = off.x;
    target.worldY = off.y;
    target.sizeFactor = track(progress, [
      [0, opts.homeBoxH / opts.viewportH],
      [1, opts.endBoxH / opts.viewportH]
    ]);
  }

  // 도착 슬롯 안에 정적으로 안착 — 이동이 끝난 마지막 회전값에서 멈추고, 다시 그 작은
  // 박스 자신의 크기가 "화면 속 크기"를 만들어주므로 sizeFactor는 1로 되돌린다.
  function setArrivedPose() {
    target.rotY = TRAVEL_TOTAL_ROTY;
    target.rotX = 0.04;
    target.camZ = 5.6;
    target.worldX = 0;
    target.worldY = 0;
    target.sizeFactor = 1;
  }

  const reducedMotionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  let isReducedMotion = reducedMotionQuery.matches;
  reducedMotionQuery.addEventListener("change", (event) => {
    isReducedMotion = event.matches;
  });

  const clock = new THREE.Clock();
  const LERP = 0.05;

  function tick() {
    const t = clock.getElapsedTime();
    const interpolation = isReducedMotion ? 1 : LERP;

    for (const k in target) current[k] += (target[k] - current[k]) * interpolation;

    product.rotation.y = current.rotY;
    product.rotation.x = current.rotX;
    product.scale.setScalar(LAYOUT.scale * current.sizeFactor);
    product.position.x = current.worldX;
    // 스크롤이 멈춰도 미세하게 떠 있도록 사인파를 얹는다
    const floatingY = isReducedMotion ? 0 : Math.sin(t * 0.8) * 0.035 * LAYOUT.scale * current.sizeFactor;
    product.position.y = current.worldY + floatingY;
    camera.position.z = current.camZ;
    camera.lookAt(current.worldX * 0.15, current.worldY * 0.08 + 0.1, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  // 캔버스가 다른 크기의 슬롯으로 옮겨붙는 순간(toHome/toTravel/toArrived) sizeFactor의
  // 기준(분모)이 되는 캔버스 픽셀 크기 자체가 바뀐다. current는 lerp로 target을 뒤늦게
  // 쫓아가므로, 그 경계에서는 "새 캔버스 크기 × 옛 sizeFactor"로 한두 프레임 동안 잘못된
  // 크기가 그려져 병이 순간적으로 커졌다 줄어드는 팝이 생긴다. 전환 직후 이걸 호출해
  // current를 target에 즉시 스냅시키면 팝 없이 이어진다.
  function snap() {
    Object.assign(current, target);
  }

  resize();
  tick();

  return { resize, setHomePose, setTravelProgress, setArrivedPose, snap };
}

/**
 * Hero jar 이동 컨트롤러 — yultest/index2.html처럼 캔버스를 뷰포트 전체에 고정하고,
 * "화면 속 어디로 가야 하는가"만 계산해서 initHeroJar에 넘긴다.
 *
 *   scrollY <= startScrollY : 홈 슬롯(hero_jar_slot) 안에 정적으로 놓인 캔버스, 회전 없음
 *   startScrollY ~ endScrollY : 캔버스가 position:fixed로 뷰포트 전체를 덮고, 병은
 *     회전하면서 화면상 홈 슬롯 위치 → "S" 자리(image_text_media) 위치로 이동한다
 *   scrollY >= endScrollY : 도착 슬롯(image_text_media) 안에 정적으로 안착. 이후에는
 *     캔버스가 슬롯 안에서 스크롤과 함께 화면 위로 밀려 올라간다 — 그래서 소멸 구간
 *     (endScrollY ~ vanishScrollY)은 "슬롯이 뷰포트 상단을 완전히 벗어나기까지 걸리는
 *     스크롤 양"으로 잡아, 화면 밖으로 나가기 전에 축소·투명화가 다 끝나도록 한다
 *     (scrollY가 다시 줄어들면 그대로 되돌아온다).
 */
function setupHeroJarTravel(canvas, homeSlotEl, endSlotEl, pinWrapperEl, pinnedSectionEl, jar) {
  if (!canvas || !homeSlotEl || !endSlotEl || !pinWrapperEl || !pinnedSectionEl) return;

  const STATE_HOME = "home";
  const STATE_TRAVEL = "travel";
  const STATE_ARRIVED = "arrived";
  let state = STATE_HOME;

  const reducedMotionQuery = matchMedia("(prefers-reduced-motion: reduce)");

  let startScrollY = 0;
  let endScrollY = 0;
  let vanishHoldScrollY = 0; // 도착 직후 줄어들지 않고 그대로 버티는 구간의 끝
  let vanishScrollY = 0; // 도착 후 완전히 사라지는 스크롤 지점
  let sRevealScrollY = 0; // 병이 다 사라진 뒤 오렌지 "S"가 다 떠오르는 스크롤 지점
  let revealScrollY = 0; // timeless_top(eyebrow/subhead)이 다 떠오르는 스크롤 지점
  let discoverStartScrollY = 0; // "Discover Our Story" CTA가 뜨기 시작하는 스크롤 지점
  let discoverEndScrollY = 0; // CTA가 다 떠오르는 스크롤 지점
  let startScreen = null; // 홈 슬롯이 화면에 고정돼 있는 동안의 뷰포트 중심 좌표(px)
  let endScreen = null; // 도착 트리거 시점의 "S" 슬롯 뷰포트 중심 좌표(px)
  let homeBoxSize = null; // 홈 슬롯 크기(px) — sizeFactor 계산용
  let endBoxSize = null; // 도착 슬롯 크기(px) — sizeFactor 계산용

  // "(S)ulwhasoo" 줄 전체(괄호+캔버스 슬롯+텍스트) — 도착 후 이 줄을 position:sticky로
  // 화면에 붙잡아 두고, 그 안에서 병이 스크롤에 따라 축소·소멸하게 한다(applyVanish는
  // 그대로 scrollY 기반이라 손댈 필요 없음 — 화면이 멈춘 것처럼 "보이기만" 하면 된다).
  const wordEl = endSlotEl.parentElement;
  const imageTextEl = wordEl.parentElement;
  // hero_jar가 사라지는 동안 그 자리(endSlotEl)에서 이어받는 오렌지 "S". 정지 상태에서
  // bottom:0으로 endSlotEl(overflow:hidden)의 바닥에 맞닿아 있어, 그 부모의 클리핑
  // 경계선 자체가 "S의 최종 위치 바닥"에 고정된 와이프 라인이 된다 — translateY로
  // 그 라인 아래에서 밀고 올라오면, 라인 위로 넘어온 부분만 그 즉시 불투명하게
  // 드러난다(별도 페이드 없음, 경계선은 항상 곧은 수평선).
  const arrivalSEl = endSlotEl.querySelector(".image_text_s");
  function resetArrivalS() {
    if (!arrivalSEl) return;
    arrivalSEl.style.transform = "translateY(100%)";
  }
  // 병이 다 사라진 뒤 같은 고정 구간 안에서 이어서 떠오르는 timeless 카피(원래
  // timeless 섹션에 있던 걸 image_text 쪽으로 옮겨왔다 — index.html 참고).
  const timelessTopEl = imageTextEl.querySelector(".timeless_top");
  const timelessEyebrowEl = timelessTopEl && timelessTopEl.querySelector(".timeless_eyebrow");
  const timelessSubheadEl = timelessTopEl && timelessTopEl.querySelector(".timeless_subhead");
  // timeless_top(eyebrow/subhead)이 다 뜬 뒤, 같은 고정 구간 안에서 이어서 나타나는
  // "Discover Our Story" CTA(Figma node 4496:2195) — index.html 참고.
  const discoverStoryEl = imageTextEl.querySelector(".discover_story");
  const REVEAL_WINDOW = 560; // eyebrow/subhead가 다 떠오르는 데 필요한 스크롤 거리
  const S_REVEAL_WINDOW = 420; // 병이 완전히 사라진 뒤 "S"가 다 떠오르는 데 필요한 스크롤 거리
  // Figma(node 4469:407)의 top_txt(eyebrow+subhead) 하단 ~ middle_txt(워드마크)
  // 상단 사이 간격 실측값 — eyebrow/subhead는 워드마크를 대체하는 게 아니라 그 위에
  // 얹혀서 함께 보인다.
  const TOP_TXT_GAP = 40;
  // 워드마크 줄 바닥 ~ "Discover Our Story" CTA 사이 간격
  const DISCOVER_GAP = 70;
  // eyebrow/subhead가 다 뜬 뒤 CTA가 뜨기 시작하기까지 잠깐 멈춰 있는 구간 —
  // 두 리빌이 겹치지 않고 순서대로 이어지게 한다.
  const DISCOVER_DELAY = 200;
  const DISCOVER_REVEAL_WINDOW = 500; // CTA가 다 떠오르는 데 필요한 스크롤 거리
  // CTA가 다 뜬 뒤, 화면이 곧장 풀리지 않고 한 번 더 스크롤할 만큼 그대로 붙박여
  // 있다가 다음 섹션(culture)으로 넘어간다.
  const DISCOVER_HOLD_WINDOW = 900;

  function measure() {
    // 이전 계산이 남아있으면 자연스러운 문서 흐름 위치를 기준으로 다시 재기 위해
    // sticky/margin/height 오버라이드를 잠깐 다 풀어둔다.
    wordEl.style.top = "";
    if (timelessTopEl) {
      timelessTopEl.style.top = "";
      timelessTopEl.style.marginTop = "";
    }
    if (discoverStoryEl) {
      discoverStoryEl.style.top = "";
    }
    imageTextEl.style.height = "";

    const wrapperRect = pinWrapperEl.getBoundingClientRect();
    const wrapperAbsTop = wrapperRect.top + window.scrollY;
    const sectionRect = pinnedSectionEl.getBoundingClientRect();

    // sticky 고정이 풀리는 스크롤 지점 = 헤드카피 채색(fill+hold)이 다 끝난 시점.
    // 이 지점부터 곧바로 회전 + 이동이 함께 시작된다.
    startScrollY = wrapperAbsTop + (wrapperRect.height - sectionRect.height);

    const endSlotRect = endSlotEl.getBoundingClientRect();
    const endAbsTop = endSlotRect.top + window.scrollY;
    const triggerOffset = window.innerHeight * 0.4;
    endScrollY = endAbsTop - triggerOffset;

    // 소멸 구간 길이 — image_text 자체 높이를 아래에서 필요한 만큼 늘려주기 때문에
    // (예전처럼 남은 공간에 맞춰 줄일 필요 없이) 원하는 길이를 그대로 쓴다.
    // 도착하자마자 바로 줄어들지 않도록 먼저 버티는 구간(HOLD)을 두고, 그 뒤로
    // 실제 축소는 예전보다 더 넉넉한 거리에 걸쳐 천천히 진행되게 한다.
    const VANISH_HOLD = window.innerHeight * 0.35;
    const shrinkWindow = (triggerOffset + endSlotRect.height) * 1.8;
    vanishHoldScrollY = endScrollY + VANISH_HOLD;
    const desiredVanishWindow = VANISH_HOLD + shrinkWindow;
    vanishScrollY = endScrollY + desiredVanishWindow;
    // 병이 완전히 사라진 뒤(vanishScrollY)에야 비로소 "S"가 떠오르기 시작하고,
    // 그게 다 끝난 뒤(sRevealScrollY)에야 eyebrow/subhead가 이어서 떠오른다 —
    // 세 애니메이션이 겹치지 않고 순서대로 이어진다.
    sRevealScrollY = vanishScrollY + S_REVEAL_WINDOW;
    revealScrollY = sRevealScrollY + REVEAL_WINDOW;
    // eyebrow/subhead가 다 뜬 뒤(revealScrollY) 잠깐 멈췄다가 CTA가 이어서 떠오른다.
    discoverStartScrollY = revealScrollY + DISCOVER_DELAY;
    discoverEndScrollY = discoverStartScrollY + DISCOVER_REVEAL_WINDOW;

    // "(S)ulwhasoo" 줄의 세로 중심이 병의 도착 목표 지점과 겹치도록 top을 정한다 —
    // sticky는 "이 줄의 위쪽 끝"을 고정하는 것이라 중심 기준으로 보정. 뷰포트 정중앙
    // (50%)에 고정되도록 하고, 병의 도착 목표(endScreen)도 같은 지점을 쓰게 해
    // "(" ")" 사이에 병이 어긋나지 않고 맞춰 도착하게 한다.
    const targetCenterY = window.innerHeight * 0.5;
    const wordRect = wordEl.getBoundingClientRect();
    const wordTop = Math.max(0, targetCenterY - wordRect.height / 2);
    wordEl.style.top = wordTop + "px";

    // 컨테이너 자체의 문서상 절대 top — sticky 요소가 "몇 스크롤 지점에 풀려야
    // 하는지"를 역산해 정확한 필요 높이를 구하는 데 쓴다. 자식의 margin은 컨테이너의
    // top이 아니라 height(자연 높이)에만 영향을 주므로, 이 시점에 재도 안전하다.
    const imageTextRect = imageTextEl.getBoundingClientRect();
    const imageTextAbsTop = imageTextRect.top + window.scrollY;
    let neededHeight = imageTextRect.height;

    if (timelessTopEl) {
      // timeless_top은 원래 문서 흐름상 이 줄 바로 아래라 자연스러운 위치가 너무
      // 가까워서, top 오프셋만으로는 "소멸이 다 끝난 뒤에" 고정을 시작하게 만들
      // 수 없다(둘 다 몇백px 남짓 되는 top 값이라 그 차이로는 desiredVanishWindow
      // 만큼의 시간차를 못 만든다). 그래서 마진으로 실제 문서상 거리를 소멸 구간
      // 길이만큼 벌려 놓는다 — 그러면 "고정 시작 지점"도 그만큼 뒤로 밀린다.
      const spacer = Math.max(0, desiredVanishWindow - wordRect.height);
      timelessTopEl.style.marginTop = spacer + "px";

      // 워드마크 자리를 대신 차지하는 게 아니라, 그 바로 위(TOP_TXT_GAP만큼 띄워서)에
      // 얹힌다 — Figma 레이아웃대로 워드마크는 계속 보이는 채로 eyebrow/subhead가
      // 그 위에 추가로 나타난다.
      const timelessTopRect = timelessTopEl.getBoundingClientRect();
      timelessTopEl.style.top = Math.max(0, wordTop - TOP_TXT_GAP - timelessTopRect.height) + "px";

      // discover_story가 없는 경우를 위한 최소 보장 높이 — eyebrow/subhead가 다 뜬 뒤
      // REVEAL_WINDOW만큼은 최소한 더 버틸 수 있게 한다. discover_story가 있으면 아래
      // 블록이 훨씬 더 정확한(그리고 보통 더 큰) 높이로 다시 계산해 덮어쓴다.
      const timelessTopNaturalTop = timelessTopRect.top - imageTextRect.top;
      neededHeight = Math.max(neededHeight, timelessTopNaturalTop + timelessTopRect.height + REVEAL_WINDOW);
    }

    if (discoverStoryEl) {
      // 워드마크 줄 바로 아래(DISCOVER_GAP만큼 띄워서)에 자리 잡는다 — timeless_top이
      // 워드마크 위에 얹히는 것과 대칭되는 배치.
      const discoverTop = wordTop + wordRect.height + DISCOVER_GAP;
      discoverStoryEl.style.top = discoverTop + "px";

      // sticky는 "컨테이너 바닥이 (뷰포트 top + top 오프셋 + 자기 높이) 지점을 지나칠
      // 때" 풀린다. discover_story의 자연스러운 문서 위치는 top 오프셋과 무관하게
      // 정해지므로, "몇 px를 더 버틸지"를 고정 상수 합으로 근사하면 sticky가 실제로
      // 얼마나 일찍 들러붙는지에 따라 오차가 생겨 의도한 hold가 통째로 사라질 수
      // 있다. 그래서 "CTA가 다 뜬 뒤(discoverEndScrollY) + HOLD 만큼 스크롤한 시점에
      // 풀린다"는 목표 스크롤 지점으로부터 필요한 컨테이너 높이를 직접 역산한다.
      const discoverRect = discoverStoryEl.getBoundingClientRect();
      const unstickAt = discoverEndScrollY + DISCOVER_HOLD_WINDOW;
      const discoverNeededHeight = unstickAt - imageTextAbsTop + discoverTop + discoverRect.height;
      neededHeight = Math.max(neededHeight, discoverNeededHeight);
    }

    imageTextEl.style.height = neededHeight + "px";

    endScreen = {
      x: endSlotRect.left + endSlotRect.width / 2,
      y: targetCenterY
    };
    endBoxSize = { w: endSlotRect.width, h: endSlotRect.height };

    const homeRect = homeSlotEl.getBoundingClientRect();
    const homeTop = homeRect.top - sectionRect.top; // sticky 고정 시점 기준으로 보정
    startScreen = { x: homeRect.left + homeRect.width / 2, y: homeTop + homeRect.height / 2 };
    homeBoxSize = { w: homeRect.width, h: homeRect.height };
  }

  function toHome() {
    homeSlotEl.appendChild(canvas);
    canvas.style.cssText = "";
    canvas.classList.remove("is_traveling");
    state = STATE_HOME;
    jar.setHomePose();
    jar.resize();
    jar.snap();
    resetArrivalS();
  }

  function toArrived() {
    endSlotEl.appendChild(canvas);
    canvas.style.cssText = "";
    canvas.classList.remove("is_traveling");
    canvas.style.transformOrigin = "center center";
    state = STATE_ARRIVED;
    jar.setArrivedPose();
    jar.resize();
    jar.snap();
  }

  function toTravel() {
    document.body.appendChild(canvas);
    canvas.classList.add("is_traveling"); // CSS가 뷰포트 전체 크기(100vw/100vh)를 준다
    canvas.style.transform = "";
    canvas.style.opacity = "";
    state = STATE_TRAVEL;
    // 이동 중엔 캔버스가 항상 뷰포트 크기라 스크롤로는 안 바뀐다 — resize 이벤트에서만 다시 잰다.
    jar.resize(window.innerWidth, window.innerHeight);
    resetArrivalS();
  }

  function applyVanish(scrollY) {
    // vanishHoldScrollY까지는 도착한 크기 그대로 버티다가, 그 지점을 지나야 줄어들기
    // 시작한다 — 도착하자마자 바로 작아지는 느낌을 없앤다.
    const range = vanishScrollY - vanishHoldScrollY;
    const t = scrollY <= vanishHoldScrollY
      ? 0
      : (range <= 0 ? 1 : Math.min(1, Math.max(0, (scrollY - vanishHoldScrollY) / range)));

    // 모션 최소화 설정에서는 애니메이션(과정)만 건너뛰고, 다 사라져야 하는 지점(t>=1)에
    // 도달하면 결과(숨김)는 그대로 적용한다 — 예전엔 여기서 매번 style을 초기화해
    // 버려서 스크롤을 아무리 내려도 절대 사라지지 않는 버그가 있었다.
    if (reducedMotionQuery.matches) {
      const hidden = t >= 1;
      canvas.style.transform = hidden ? "scale(0)" : "";
      canvas.style.opacity = hidden ? "0" : "";
      canvas.style.pointerEvents = hidden ? "none" : "";
      return;
    }

    const eased = t * t * (3 - 2 * t); // smoothstep
    const scale = 1 - eased;
    canvas.style.transform = `scale(${scale})`;
    canvas.style.opacity = String(1 - eased);
    canvas.style.pointerEvents = eased >= 1 ? "none" : "";
  }

  // 병이 완전히 사라진 뒤(vanishScrollY)부터 오렌지 "S"가 같은 자리에서 아래에서
  // 위로 밀고 올라온다 — 병이 줄어드는 동안에는 t가 0으로 묶여 있어 나타나지 않는다.
  // translateY만 움직이고 opacity는 건드리지 않는다 — 드러나는 순간부터 완전히
  // 불투명하고, endSlotEl의 overflow:hidden이 만드는 곧은 수평 경계선(= S의 최종
  // 위치 바닥)만으로 아래쪽이 가려졌다 드러났다 한다.
  function applySReveal(scrollY) {
    if (!arrivalSEl) return;
    const range = sRevealScrollY - vanishScrollY;
    const t = range <= 0 ? 1 : Math.min(1, Math.max(0, (scrollY - vanishScrollY) / range));

    if (reducedMotionQuery.matches) {
      arrivalSEl.style.transform = t > 0 ? "translateY(0)" : "translateY(100%)";
      return;
    }

    const eased = t * t * (3 - 2 * t); // smoothstep
    arrivalSEl.style.transform = `translateY(${((1 - eased) * 100).toFixed(2)}%)`;
  }

  // "S"가 다 떠오른 뒤(sRevealScrollY) 같은 고정 구간 안에서 eyebrow/subhead가
  // 이어서 떠오른다 — t가 음수/1 초과로 나가도 알아서 0/1로 잘리므로 상태와 무관하게
  // 매 프레임 그냥 불러도 안전하다(뒤로 스크롤하면 자연히 다시 가라앉는다).
  function applyReveal(scrollY) {
    if (!timelessTopEl) return;
    const range = revealScrollY - sRevealScrollY;
    const t = range <= 0 ? 1 : Math.min(1, Math.max(0, (scrollY - sRevealScrollY) / range));

    if (reducedMotionQuery.matches) {
      const shown = t > 0;
      timelessTopEl.style.opacity = shown ? "1" : "0";
      if (timelessEyebrowEl) { timelessEyebrowEl.style.opacity = shown ? "1" : "0"; timelessEyebrowEl.style.transform = ""; }
      if (timelessSubheadEl) { timelessSubheadEl.style.opacity = shown ? "1" : "0"; timelessSubheadEl.style.transform = ""; }
      return;
    }

    // "( )ulwhasoo" 워드마크는 Figma 레이아웃대로 계속 그대로 보인다 — eyebrow/subhead는
    // 그걸 대체하는 게 아니라 위쪽에 추가로 떠오른다.
    timelessTopEl.style.opacity = "1"; // 컨테이너는 항상 보이고, 각 줄이 개별로 페이드+상승한다

    // eyebrow가 살짝 먼저, subhead가 조금 늦게 뜨도록 스태거
    const eyebrowT = Math.min(1, t / 0.7);
    const subheadT = Math.max(0, Math.min(1, (t - 0.25) / 0.75));
    const eyebrowE = eyebrowT * eyebrowT * (3 - 2 * eyebrowT);
    const subheadE = subheadT * subheadT * (3 - 2 * subheadT);

    if (timelessEyebrowEl) {
      timelessEyebrowEl.style.opacity = String(eyebrowE);
      timelessEyebrowEl.style.transform = `translateY(${((1 - eyebrowE) * 24).toFixed(1)}px)`;
    }
    if (timelessSubheadEl) {
      timelessSubheadEl.style.opacity = String(subheadE);
      timelessSubheadEl.style.transform = `translateY(${((1 - subheadE) * 24).toFixed(1)}px)`;
    }
  }

  // eyebrow/subhead가 다 뜬 뒤(revealScrollY) 잠깐(DISCOVER_DELAY) 멈췄다가, 같은 고정
  // 구간 안에서 "Discover Our Story" CTA가 이어서 떠오른다.
  function applyDiscoverReveal(scrollY) {
    if (!discoverStoryEl) return;
    const range = discoverEndScrollY - discoverStartScrollY;
    const t = range <= 0 ? 1 : Math.min(1, Math.max(0, (scrollY - discoverStartScrollY) / range));

    if (reducedMotionQuery.matches) {
      const shown = t > 0;
      discoverStoryEl.style.opacity = shown ? "1" : "0";
      discoverStoryEl.style.transform = "";
      discoverStoryEl.style.pointerEvents = shown ? "auto" : "none";
      return;
    }

    const eased = t * t * (3 - 2 * t); // smoothstep
    discoverStoryEl.style.opacity = String(eased);
    discoverStoryEl.style.transform = `translateY(${((1 - eased) * 24).toFixed(1)}px)`;
    discoverStoryEl.style.pointerEvents = eased >= 1 ? "auto" : "none";
  }

  function update() {
    const scrollY = window.scrollY;
    // 늘 최신 스크롤 값 기준으로 클램프되므로 어느 상태에서 불러도 안전
    applySReveal(scrollY);
    applyReveal(scrollY);
    applyDiscoverReveal(scrollY);

    if (scrollY <= startScrollY || endScrollY <= startScrollY) {
      if (state !== STATE_HOME) toHome();
      return;
    }

    if (scrollY >= endScrollY) {
      if (state !== STATE_ARRIVED) toArrived();
      applyVanish(scrollY);
      return;
    }

    const enteringTravel = state !== STATE_TRAVEL;
    if (enteringTravel) toTravel();

    // 도착 직전 TRAVEL_SETTLE_PX만큼은 목표 포즈를 미리 도착 값으로 고정해 둔다 —
    // LERP로 뒤따라가는 current가 실제 도착(toArrived → jar.snap())이 일어나기 전에
    // 이미 목표를 거의 다 따라잡게 하기 위해서다. 이 여유가 없으면 스크롤이
    // endScrollY를 넘는 순간 current가 아직 목표에서 먼 채로 남아있다가 snap()에
    // 의해 그 차이만큼 한 프레임에 훅 튀어 보인다.
    const travelSpan = endScrollY - startScrollY;
    const settlePx = Math.min(260, travelSpan * 0.4);
    const effectiveSpan = Math.max(1, travelSpan - settlePx);
    const progress = (scrollY - startScrollY) / effectiveSpan;
    jar.setTravelProgress(progress, {
      startScreen,
      endScreen,
      homeBoxH: homeBoxSize.h,
      endBoxH: endBoxSize.h,
      viewportW: window.innerWidth,
      viewportH: window.innerHeight
    });
    // toTravel()이 캔버스를 방금 뷰포트 전체 크기로 되키운 프레임에서는 target이
    // 위에서 막 새로 계산됐으므로, 이 프레임에 한해 current를 바로 그 값으로
    // 스냅시켜야 홈/도착 슬롯과의 경계에서 팝 없이 이어진다.
    if (enteringTravel) jar.snap();
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
    if (state === STATE_TRAVEL) jar.resize(window.innerWidth, window.innerHeight);
    update();
  });
  window.addEventListener("load", () => {
    measure();
    update();
  });
}
