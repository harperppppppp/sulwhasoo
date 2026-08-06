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
  const GAP_HALF    = 20; // 활성 항목 자리에서 호가 벌어지는 폭(각도의 절반) — 곡선 텍스트 폭(±16)보다 여유 있게
  const DUR = 480;

  const svg       = document.getElementById('arc_svg');
  const nav       = document.getElementById('arc_nav');
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
  const labelC    = document.getElementById('label_c');
  const labelCSmall = document.getElementById('label_c_small');
  const labelL    = document.getElementById('label_l');
  const labelR    = document.getElementById('label_r');
  const labelLBig = document.getElementById('label_l_big');
  const labelRBig = document.getElementById('label_r_big');
  const linkC     = document.getElementById('link_c');
  const linkL     = document.getElementById('link_l');
  const linkR     = document.getElementById('link_r');

  // 브레이크포인트별 배치값. 도형 좌표는 그대로 두고 viewBox와 타이포만 바꾼다.
  // edgeDeg는 호버 상태에서도 선의 끝점이 화면 위(y<0) 밖으로 나가도록 넉넉히 잡는다 —
  // 페이드가 아니라 실제로 뷰포트 밖에서 끝나야 끝선이 전혀 보이지 않는다
  const LAYOUT = {
    desktop: { viewBox:'0 0 1920 260',    word:42, side:14, big:23, gapDeg:7.5,  labelDeg:40, edgeDeg:74 },
    mobile:  { viewBox:'560 -30 800 300', word:66, side:25, big:36, gapDeg:11.5, labelDeg:42, edgeDeg:78 }
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

  const angleOf = key => key === 'L' ? -L.labelDeg : key === 'R' ? L.labelDeg : 0;

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

    // 호가 벌어지는 지점 — 지금 활성화된 항목의 각도(angleVal)를 중심으로 한 틈
    const gapStart = angleVal - GAP_HALF;
    const gapEnd   = angleVal + GAP_HALF;

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

    // 작은(서브메뉴) 라벨 경로 — 글자가 읽히는 방향으로, 선에 가깝게
    const half = L.labelDeg;
    pathL.setAttribute('d', arcPath(CY, SRx, SRy, -(half + 11), -(half - 11)));
    pathR.setAttribute('d', arcPath(CY, SRx, SRy,  (half - 11),  (half + 11)));

    // 큰(활성) 라벨 — ABOUT은 호 위 정중앙에 직선으로
    const [cx0, cy0] = pt(CY, rx, ry, 0);
    labelC.setAttribute('x', cx0.toFixed(2));
    labelC.setAttribute('y', cy0.toFixed(2));

    // PRODUCTS/FLAGSHIP 큰 버전 — 작은 버전과 같은 방식으로, 호와 같은 반지름 위를 곡선으로 흐른다
    pathLBig.setAttribute('d', arcPath(CY, rx, ry, -(half + 16), -(half - 16)));
    pathRBig.setAttribute('d', arcPath(CY, rx, ry,  (half - 16),  (half + 16)));

    // 작은(서브메뉴) ABOUT — 선 아래로 내려간다
    labelCSmall.setAttribute('y', (CY + ry + SIDE_OFFSET).toFixed(2));

    lastRx = rx; lastRy = ry;
  }

  function applyLayout(){
    L = window.matchMedia('(max-width: 768px)').matches ? LAYOUT.mobile : LAYOUT.desktop;
    svg.setAttribute('viewBox', L.viewBox);
    document.getElementById('wordmark').setAttribute('font-size', L.word);
    labelL.setAttribute('font-size', L.side);
    labelR.setAttribute('font-size', L.side);
    labelCSmall.setAttribute('font-size', L.side);
    labelC.setAttribute('font-size', L.big);
    labelLBig.setAttribute('font-size', L.big);
    labelRBig.setAttribute('font-size', L.big);
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
    if (target === v) { updateScrollState(); return; }
    target = v;
    updateScrollState();
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

  /* ── 스크롤 20% 지점부터 선·메뉴 숨기기 — 로고 호버 중이면 예외 ──
     "20%"는 문서 전체 높이가 아니라 한 화면(뷰포트) 높이 기준입니다.
     문서 전체 높이 기준으로 재면 페이지가 길어질수록(예: culture처럼
     14000px 넘는 페이지) 실제로 한참 스크롤해야 반응하는 문제가 있었습니다. */
  function updateScrollState(){
    const shouldHide = window.scrollY >= window.innerHeight * 0.2 && target === 0; // 스크롤 됐고, 지금 호버 중이 아닐 때만 숨긴다
    nav.classList.toggle('is_scrolled', shouldHide);
  }
  function handleWindowScroll(){ updateScrollState(); }
  window.addEventListener('scroll', handleWindowScroll, { passive:true });
  updateScrollState();

  /* ── 활성 항목 전환 — 호가 벌어지는 위치를 부드럽게 이동시킨다 ── */
  let activeKey = 'C';
  let angleStart = 0, angleTarget = 0, angleStartTime = 0, angleRaf = null;
  const ANGLE_DUR = 380;

  function updateActiveClasses(){
    linkC.classList.toggle('is_active', activeKey === 'C');
    linkL.classList.toggle('is_active', activeKey === 'L');
    linkR.classList.toggle('is_active', activeKey === 'R');
  }

  function angleTick(now){
    const p = Math.min(1, (now - angleStartTime) / ANGLE_DUR);
    angleVal = angleStart + (angleTarget - angleStart) * easeOutCubic(p);
    render(current);
    angleRaf = p < 1 ? requestAnimationFrame(angleTick) : null;
  }

  function setActive(key){
    if (activeKey === key) return;
    activeKey = key;
    updateActiveClasses();
    angleTarget = angleOf(key);
    angleStart = angleVal;
    angleStartTime = performance.now();
    if (reduced.matches){ angleVal = angleTarget; render(current); return; }
    if (!angleRaf) angleRaf = requestAnimationFrame(angleTick);
  }

  function handleLinkLActivate(){ setActive('L'); }
  function handleLinkRActivate(){ setActive('R'); }
  function handleLinkCActivate(){ setActive('C'); }

  linkL.addEventListener('pointerenter', handleLinkLActivate);
  linkR.addEventListener('pointerenter', handleLinkRActivate);
  linkC.addEventListener('pointerenter', handleLinkCActivate);
  linkL.addEventListener('focus', handleLinkLActivate);
  linkR.addEventListener('focus', handleLinkRActivate);
  linkC.addEventListener('focus', handleLinkCActivate);

  // 오렌지 영역을 완전히 벗어나면 기본값(ABOUT)으로 되돌아간다
  function handleNavPointerOutReset(e){
    if (!e.relatedTarget || !e.relatedTarget.closest?.('.hit, .label')) setActive('C');
  }
  function handleNavFocusOutReset(e){
    if (!nav.contains(e.relatedTarget)) setActive('C');
  }
  nav.addEventListener('pointerout', handleNavPointerOutReset);
  nav.addEventListener('focusout', handleNavFocusOutReset);

  updateActiveClasses();
  applyLayout();
})();
