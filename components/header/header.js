// Sulwhasoo · Header (Arc Navigation)
// header.html에서 분리된 스크립트입니다. 외부 의존성 없음.

(() => {
  'use strict';

  const CX = 960;          // 로고 중심 x
  const CY = -125;         // 오브와 흰 호가 공유하는 중심 y — 위로 끌어올려 처음 버전 높이에 맞춤

  // 오브(가로 735 · 세로 624, 비율 1.178:1)와 링 — 링은 오브와 같은 비율로 맞춰
  // 아래로 더 깊게 떨어지도록 조정 (원래 실측 598.58×287.93은 오브보다 훨씬 납작했음)
  const RING_RX = 299.29;
  const RING_RY = RING_RX * (312 / 367.5);   // ≈254.06 — 오브와 동일한 1.178:1 비율

  const PAD_X = 48;   // 오브를 살짝만 더 크게
  const PAD_Y = 41;
  const EXTRA_PAD_X = 26; // 호버 시 오브에만 더 얹는 여유분 — 오렌지가 링보다 더 크게 퍼지도록
  const EXTRA_PAD_Y = 22;

  // 휴지 상태 ↔ 호버 상태 — 링(rx,ry)만 애니메이션하고 오브는 항상 링 + PAD를 따라간다
  const REST  = { rx:RING_RX,        ry:RING_RY };
  const HOVER = { rx:RING_RX * 1.14, ry:RING_RY * 1.14 };

  const SIDE_OFFSET = 16; // 작은(서브메뉴) 라벨 — 선에 가깝게 붙인다
  const DUR = 480;

  const svg       = document.getElementById('arc_svg');
  const nav       = document.getElementById('arc_nav');
  const wordmark  = document.getElementById('wordmark');
  const WORDMARK_Y = parseFloat(wordmark.getAttribute('y')); // 원래 마크업에 지정된 기준 y(베이스라인)
  const orb       = document.getElementById('orb');
  const hit       = document.getElementById('hit');
  const arcL      = document.getElementById('arc_l');
  const arcR      = document.getElementById('arc_r');
  const fadeL     = document.getElementById('fade_l');
  const fadeR     = document.getElementById('fade_r');
  const pathL     = document.getElementById('path_l');
  const pathR     = document.getElementById('path_r');
  const pathLBig  = document.getElementById('path_l_big');
  const pathRBig  = document.getElementById('path_r_big');
  const pathLL    = document.getElementById('path_ll');
  const pathRR    = document.getElementById('path_rr');
  const pathLLBig = document.getElementById('path_ll_big');
  const pathRRBig = document.getElementById('path_rr_big');
  const pathC     = document.getElementById('path_c');
  const pathCBig  = document.getElementById('path_c_big');
  const labelC    = document.getElementById('label_c');
  const labelCSmall = document.getElementById('label_c_small');
  const labelL    = document.getElementById('label_l');
  const labelR    = document.getElementById('label_r');
  const labelLBig = document.getElementById('label_l_big');
  const labelRBig = document.getElementById('label_r_big');
  const labelLL    = document.getElementById('label_ll');
  const labelRR    = document.getElementById('label_rr');
  const labelLLBig = document.getElementById('label_ll_big');
  const labelRRBig = document.getElementById('label_rr_big');
  const linkC     = document.getElementById('link_c');
  const linkL     = document.getElementById('link_l');
  const linkR     = document.getElementById('link_r');
  const linkLL    = document.getElementById('link_ll');
  const linkRR    = document.getElementById('link_rr');

  // 지금 보고 있는 페이지가 5개 항목 중 어디에 해당하는지 — 그 항목이 처음부터
  // ABOUT 자리(가운데)에서 활성 상태로 시작해야 한다. href의 마지막 파일명만
  // 비교하므로 페이지마다 상대경로 깊이가 달라도(예: "flagship.html" vs
  // "../../pages/flagship.html") 문제없다. 매치되는 항목이 없으면(홈 화면 등) 'C'.
  // product_detail.html처럼 5개 메뉴 href 중 어디와도 파일명이 일치하지 않는
  // 하위 페이지는 <header data-home-key="…">로 직접 지정할 수 있다.
  const HOME_KEY = (() => {
    const forced = nav.getAttribute('data-home-key');
    if (forced) return forced;
    const map = { LL: linkLL, L: linkL, C: linkC, R: linkR, RR: linkRR };
    const here = location.pathname.split('/').pop() || 'index.html';
    for (const key in map){
      const href = map[key].getAttribute('href');
      if (href && href.split('/').pop() === here) return key;
    }
    return 'C';
  })();

  // 브레이크포인트별 배치값. 도형 좌표는 그대로 두고 viewBox와 타이포만 바꾼다.
  // edgeDeg는 호버 상태에서도 선의 끝점이 화면 위(y<0) 밖으로 나가도록 넉넉히 잡는다 —
  // 페이드가 아니라 실제로 뷰포트 밖에서 끝나야 끝선이 전혀 보이지 않는다
  // outerDeg: BRANDSTORY/CULTURE(바깥쪽 항목) 자리. gapDeg: 활성 항목 자리에서 호가 벌어지는 폭의 절반 —
  // 항목 사이 간격의 절반보다 작게 잡아야 옆 항목과 겹치지 않는다
  const LAYOUT = {
    desktop: { viewBox:'0 0 1920 260',    word:28, side:14, big:23, gapDeg:12, labelDeg:30, outerDeg:60, edgeDeg:80 },
    mobile:  { viewBox:'560 -30 800 300', word:44, side:25, big:36, gapDeg:12, labelDeg:31, outerDeg:62, edgeDeg:82 }
  };
  let L = LAYOUT.desktop;

  const rad = d => d * Math.PI / 180;
  // 각도 0 = 타원의 최하단, 양수 = 오른쪽. rx/ry를 따로 받아 타원 곡선을 그린다
  const pt = (cy, rx, ry, deg) => [
    CX + rx * Math.sin(rad(deg)),
    cy + ry * Math.cos(rad(deg))
  ];

  // 타원호를 폴리라인으로. textPath가 그대로 따라갈 수 있다.
  function arcPath(cy, rx, ry, a0, a1, steps = 48){
    let d = '';
    for (let i = 0; i <= steps; i++){
      const [x, y] = pt(cy, rx, ry, a0 + (a1 - a0) * i / steps);
      d += (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
    }
    return d.trim();
  }

  // 항목별 "제자리" 각도 — 다이얼을 돌리지 않은 기본 배치
  const BASE_ANGLE = key => {
    switch (key){
      case 'LL': return -L.outerDeg;
      case 'L':  return -L.labelDeg;
      case 'R':  return  L.labelDeg;
      case 'RR': return  L.outerDeg;
      default:   return 0;
    }
  };

  let dialRotation = 0; // 오렌지 영역을 드래그로 돌린 만큼(도) — 5개 항목이 함께 이 값만큼 회전한다
  const angleOf = key => BASE_ANGLE(key) + dialRotation;

  // 5개 항목 — 모두 같은 방식(작은 곡선 라벨 + 큰 활성 라벨)으로 렌더링된다
  const ITEMS = [
    { key:'LL', pathSmall: pathLL, pathBig: pathLLBig },
    { key:'L',  pathSmall: pathL,  pathBig: pathLBig  },
    { key:'C',  pathSmall: pathC,  pathBig: pathCBig  },
    { key:'R',  pathSmall: pathR,  pathBig: pathRBig  },
    { key:'RR', pathSmall: pathRR, pathBig: pathRRBig },
  ];

  // 활성(큰) 라벨 요소 — 끊긴 흰 선의 틈을 이 라벨의 실제 글자 폭에 맞추기 위해 필요하다
  const LABEL_BIG_BY_KEY = { LL: labelLLBig, L: labelLBig, C: labelC, R: labelRBig, RR: labelRRBig };
  const GAP_PAD_PX = 6; // 끊긴 흰 선과 활성 텍스트 사이 여백

  let lastRx = REST.rx, lastRy = REST.ry;
  let angleVal = 0; // 호가 벌어지는 위치(각도) — 애니메이션으로 부드럽게 이동한다

  function render(t){
    const rx = REST.rx + (HOVER.rx - REST.rx) * t;
    const ry = REST.ry + (HOVER.ry - REST.ry) * t;
    const orbRx = rx + PAD_X + EXTRA_PAD_X * t;
    const orbRy = ry + PAD_Y + EXTRA_PAD_Y * t;
    const SRx = rx + SIDE_OFFSET;
    const SRy = ry + SIDE_OFFSET;

    orb.setAttribute('rx', orbRx.toFixed(2));
    orb.setAttribute('ry', orbRy.toFixed(2));
    hit.setAttribute('rx', orbRx.toFixed(2));
    hit.setAttribute('ry', orbRy.toFixed(2));

    // 5개 항목 모두 동일한 방식으로 배치 — 각자의 현재 각도(제자리 각도 + 다이얼 회전)를 따라 곡선 위에 놓인다
    // (아래 틈 계산이 활성 라벨의 이번 프레임 글자 폭을 읽어야 하므로 먼저 실행한다)
    ITEMS.forEach(({ key, pathSmall, pathBig }) => {
      const angle = angleOf(key);
      pathSmall.setAttribute('d', arcPath(CY, SRx, SRy, angle - 11, angle + 11));
      pathBig.setAttribute('d', arcPath(CY, rx, ry, angle - 16, angle + 16));
    });

    // 호가 벌어지는 지점 — 지금 활성화된(가운데, 큰) 라벨의 실제 글자 폭 + 6px 여백을 반지름 기준으로
    // 각도로 환산해 틈을 맞춘다. 라벨이 아직 그려지지 않아 폭을 읽을 수 없을 때만 고정폭(L.gapDeg)으로 대신한다.
    const activeBBox = LABEL_BIG_BY_KEY[activeKey] ? LABEL_BIG_BY_KEY[activeKey].getBBox() : null;
    const gapDeg = activeBBox && activeBBox.width > 0
      ? ((activeBBox.width / 2 + GAP_PAD_PX) / rx) * (180 / Math.PI)
      : L.gapDeg;

    const gapStart = angleVal - gapDeg;
    const gapEnd   = angleVal + gapDeg;

    arcL.setAttribute('d', arcPath(CY, rx, ry, -L.edgeDeg, gapStart));
    arcR.setAttribute('d', arcPath(CY, rx, ry,  gapEnd,     L.edgeDeg));

    // 페이드 그라디언트 — 틈 쪽(불투명)에서 바깥쪽 끝(투명, 화면 밖)으로
    const [lx1, ly1] = pt(CY, rx, ry, gapStart);
    const [lx2, ly2] = pt(CY, rx, ry, -L.edgeDeg);
    fadeL.setAttribute('x1', lx1.toFixed(2)); fadeL.setAttribute('y1', ly1.toFixed(2));
    fadeL.setAttribute('x2', lx2.toFixed(2)); fadeL.setAttribute('y2', ly2.toFixed(2));

    const [rx1, ry1] = pt(CY, rx, ry, gapEnd);
    const [rx2, ry2] = pt(CY, rx, ry, L.edgeDeg);
    fadeR.setAttribute('x1', rx1.toFixed(2)); fadeR.setAttribute('y1', ry1.toFixed(2));
    fadeR.setAttribute('x2', rx2.toFixed(2)); fadeR.setAttribute('y2', ry2.toFixed(2));

    lastRx = rx; lastRy = ry;
  }

  function applyLayout(){
    L = window.matchMedia('(max-width: 768px)').matches ? LAYOUT.mobile : LAYOUT.desktop;
    svg.setAttribute('viewBox', L.viewBox);
    wordmark.setAttribute('font-size', L.word);
    // 글자 높이(대략 font-size)의 절반만큼 위로 올린다
    wordmark.setAttribute('y', (WORDMARK_Y - L.word / 2).toFixed(2));
    labelL.setAttribute('font-size', L.side);
    labelR.setAttribute('font-size', L.side);
    labelLL.setAttribute('font-size', L.side);
    labelRR.setAttribute('font-size', L.side);
    labelCSmall.setAttribute('font-size', L.side);
    labelC.setAttribute('font-size', L.big);
    labelLBig.setAttribute('font-size', L.big);
    labelRBig.setAttribute('font-size', L.big);
    labelLLBig.setAttribute('font-size', L.big);
    labelRRBig.setAttribute('font-size', L.big);
    if (dialAnimRaf){ cancelAnimationFrame(dialAnimRaf); dialAnimRaf = null; }
    // 화면 폭이 바뀌면(브레이크포인트 전환) 다이얼 회전은 초기화하되, 지금 페이지(HOME_KEY)가
    // 계속 가운데(활성) 자리에 남아 있어야 한다 — 항상 'C'/ABOUT로 되돌리지 않는다
    dialRotation = -BASE_ANGLE(HOME_KEY);
    dialRestKey = HOME_KEY;
    activeKey = HOME_KEY;
    updateActiveClasses();
    angleVal = angleOf(activeKey);
    render(current);
  }

  /* ── 링 열림/닫힘 애니메이션 (호버로 오브·링이 커지는 것) ── */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0, target = 0, raf = null, startVal = 0, startTime = 0;

  const easeOutCubic = p => 1 - Math.pow(1 - p, 3);

  function tick(now){
    const p = Math.min(1, (now - startTime) / DUR);
    current = startVal + (target - startVal) * easeOutCubic(p);
    render(current);
    raf = p < 1 ? requestAnimationFrame(tick) : null;
  }

  function animateTo(v){
    if (target === v) return;
    target = v;
    if (reduced.matches){
      current = v; render(current); return;
    }
    startVal = current;
    startTime = performance.now();
    if (!raf) raf = requestAnimationFrame(tick);
  }

  const open  = () => animateTo(1);
  const close = () => animateTo(0);

  function handleNavPointerOver(e){ if (e.target.closest('.hit, .label')) open(); }
  function handleNavPointerOutClose(e){
    if (!e.relatedTarget || !e.relatedTarget.closest?.('.hit, .label')) close();
  }
  function handleNavFocusIn(){ open(); }
  function handleNavFocusOutClose(e){
    if (!nav.contains(e.relatedTarget)) close();
  }
  function handleWindowResize(){ applyLayout(); }
  function handleReducedMotionChange(){ render(current); }

  // 오렌지 영역 전체가 호버 트리거
  nav.addEventListener('pointerover', handleNavPointerOver);
  nav.addEventListener('pointerout',  handleNavPointerOutClose);

  // 키보드 사용자도 동일하게
  nav.addEventListener('focusin',  handleNavFocusIn);
  nav.addEventListener('focusout', handleNavFocusOutClose);

  window.addEventListener('resize', handleWindowResize, { passive:true });
  reduced.addEventListener?.('change', handleReducedMotionChange);

  /* ── 스크롤 방향에 따라 헤더 자체를 숨기기/보이기 ── */
  const HEADER_HIDE_TOP = 80;   // 맨 위 근처에서는 항상 보이게 둔다
  const HEADER_HIDE_DELTA = 4;  // 아주 작은 흔들림에는 반응하지 않는다
  let lastScrollY = window.scrollY;

  function updateHeaderVisibility(){
    const y = window.scrollY;
    const diff = y - lastScrollY;

    if (y <= HEADER_HIDE_TOP){
      nav.classList.remove('is_hidden');
    } else if (nav.contains(document.activeElement)){
      // 키보드로 헤더 안에 포커스가 있으면 화면 밖으로 숨기지 않는다
      nav.classList.remove('is_hidden');
    } else if (diff > HEADER_HIDE_DELTA){
      nav.classList.add('is_hidden');
    } else if (diff < -HEADER_HIDE_DELTA){
      nav.classList.remove('is_hidden');
    }
    lastScrollY = y;
  }

  function handleWindowScroll(){ updateHeaderVisibility(); }
  window.addEventListener('scroll', handleWindowScroll, { passive:true });

  /* ── 활성 항목 전환 — 호가 벌어지는 위치를 부드럽게 이동시킨다 ── */
  let activeKey = HOME_KEY;
  let dialRestKey = HOME_KEY; // 다이얼을 마지막으로 스냅한 자리 — 활성(큰) 상태는 항상 이 자리(중앙)에만 있다
  let angleStart = 0, angleTarget = 0, angleStartTime = 0, angleRaf = null;
  const ANGLE_DUR = 380;

  function updateActiveClasses(){
    linkC.classList.toggle('is_active', activeKey === 'C');
    linkL.classList.toggle('is_active', activeKey === 'L');
    linkR.classList.toggle('is_active', activeKey === 'R');
    linkLL.classList.toggle('is_active', activeKey === 'LL');
    linkRR.classList.toggle('is_active', activeKey === 'RR');
  }

  function angleTick(now){
    const p = Math.min(1, (now - angleStartTime) / ANGLE_DUR);
    angleVal = angleStart + (angleTarget - angleStart) * easeOutCubic(p);
    render(current);
    angleRaf = p < 1 ? requestAnimationFrame(angleTick) : null;
  }

  // angleTargetOverride: 값을 지정하면 angleOf(key) 대신 그 각도로 틈을 정확히 맞춘다 —
  // 다이얼 스냅처럼 "최종적으로 항상 중앙(0)" 임이 미리 정해져 있을 때, 아직 회전 애니메이션이
  // 끝나지 않아 dialRotation이 목표값에 도달하기 전이라도 틈은 정확한 목표로 바로 움직이게 한다
  function setActive(key, angleTargetOverride){
    const nextAngle = angleTargetOverride !== undefined ? angleTargetOverride : angleOf(key);
    if (activeKey === key && angleTarget === nextAngle) return;
    activeKey = key;
    updateActiveClasses();
    angleTarget = nextAngle;
    angleStart = angleVal;
    angleStartTime = performance.now();
    if (reduced.matches){ angleVal = angleTarget; render(current); return; }
    if (!angleRaf) angleRaf = requestAnimationFrame(angleTick);
  }

  // 항목에 마우스를 올리거나 포커스해도 활성(큰) 상태로 바뀌지 않는다 —
  // 활성화는 오직 다이얼을 돌려 그 항목이 중앙에 왔을 때만 일어난다 (아래 드래그 섹션의 snapDial 참고).
  // 옅은 hover 강조(.label:hover, CSS)만 그대로 남는다.

  /* ── 오렌지 영역을 잡고 드래그하면 다이얼처럼 5개 항목이 함께 회전한다 ──
     놓으면 가장 가까운 자리로 스냅되고, 그 자리(ABOUT 자리)에 온 항목이
     지금 클릭(활성)한 상태와 같아진다 */
  const DEG_PER_PX = 180 / (Math.PI * RING_RX); // 드래그 거리(px) → 회전 각도 변환 감도
  const STEP_KEYS = { '-2':'RR', '-1':'R', '0':'C', '1':'L', '2':'LL' };
  const LINK_BY_KEY = { LL:linkLL, L:linkL, C:linkC, R:linkR, RR:linkRR };
  const DIAL_DUR = 320;

  let dragging = false;
  let dragPointerId = null;
  let dragStartX = 0;
  let dragStartRotation = 0;
  let dialAnimStart = 0, dialAnimTarget = 0, dialAnimStartTime = 0, dialAnimRaf = null;

  function clampRotation(v){
    return Math.max(-L.outerDeg, Math.min(L.outerDeg, v));
  }

  function svgScale(){
    const rect = svg.getBoundingClientRect();
    const vbWidth = parseFloat(L.viewBox.split(' ')[2]);
    return rect.width ? vbWidth / rect.width : 1;
  }

  function dialTick(now){
    const p = Math.min(1, (now - dialAnimStartTime) / DIAL_DUR);
    dialRotation = dialAnimStart + (dialAnimTarget - dialAnimStart) * easeOutCubic(p);
    render(current);
    dialAnimRaf = p < 1 ? requestAnimationFrame(dialTick) : null;
  }

  function animateDialTo(targetDeg){
    if (reduced.matches){ dialRotation = targetDeg; render(current); return; }
    dialAnimStart = dialRotation;
    dialAnimTarget = targetDeg;
    dialAnimStartTime = performance.now();
    if (!dialAnimRaf) dialAnimRaf = requestAnimationFrame(dialTick);
  }

  // 놓으면 가장 가까운 자리로 스냅 — 그 자리에 온 항목이 ABOUT처럼 중앙(활성) 상태가 되고,
  // 곧바로 그 항목의 페이지로 이동한다 (클릭이 아니라 "중앙에 와서 활성화"가 곧 이동 트리거).
  // 스냅이 끝나면 항목의 각도는 정확히 0(중앙)이 되므로, 회전 애니메이션이 끝나기 전이라도
  // 틈(gap)의 목표를 0으로 직접 지정해 ABOUT이 중앙에 있을 때와 완전히 같은 간격으로 맞춘다
  function snapDial(){
    const step = Math.max(-2, Math.min(2, Math.round(dialRotation / L.labelDeg)));
    const key = STEP_KEYS[String(step)];
    dialRestKey = key;
    animateDialTo(step * L.labelDeg);
    setActive(key, 0);
    // 주의: 이 <a>는 SVG 안에 있어 SVGAElement다 — .href는 문자열이 아니라
    // SVGAnimatedString 객체이므로 getAttribute('href')로 실제 경로 문자열을 읽어야 한다
    window.location.href = LINK_BY_KEY[key].getAttribute('href');
  }

  function handleHitPointerDown(e){
    if (dragging) return;
    e.preventDefault(); // 드래그 중 텍스트 선택 등 브라우저 기본 동작 방지
    dragging = true;
    dragPointerId = e.pointerId;
    dragStartX = e.clientX;
    dragStartRotation = dialRotation;
    if (dialAnimRaf){ cancelAnimationFrame(dialAnimRaf); dialAnimRaf = null; }
    hit.setPointerCapture(e.pointerId);
    nav.classList.add('is_dragging');
  }
  function handleHitPointerMove(e){
    if (!dragging || e.pointerId !== dragPointerId) return;
    const deltaPx = (e.clientX - dragStartX) * svgScale();
    dialRotation = clampRotation(dragStartRotation + deltaPx * DEG_PER_PX);
    render(current);
  }
  function handleHitPointerUp(e){
    if (!dragging || e.pointerId !== dragPointerId) return;
    dragging = false;
    hit.releasePointerCapture(e.pointerId);
    nav.classList.remove('is_dragging');
    snapDial();
  }

  hit.addEventListener('pointerdown', handleHitPointerDown);
  hit.addEventListener('pointermove', handleHitPointerMove);
  hit.addEventListener('pointerup', handleHitPointerUp);
  hit.addEventListener('pointercancel', handleHitPointerUp);

  updateActiveClasses();
  applyLayout();
})();
