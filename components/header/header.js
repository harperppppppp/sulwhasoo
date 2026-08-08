// Sulwhasoo · Header (Arc Navigation)
// header.html에서 분리된 스크립트입니다. 외부 의존성 없음.

(() => {
  'use strict';

  const CX = 960;
  const CY = -125;

  // 링 크기
  const RING_RX = 299.29;
  const RING_RY = RING_RX * (312 / 367.5);

  // 오브 여백
  const PAD_X = 48;
  const PAD_Y = 41;
  const EXTRA_PAD_X = 26;
  const EXTRA_PAD_Y = 22;

  // 휴지 상태 ↔ 호버 상태
  const REST = {
    rx: RING_RX,
    ry: RING_RY
  };

  const HOVER = {
    rx: RING_RX * 1.14,
    ry: RING_RY * 1.14
  };

  const SIDE_OFFSET = 16;
  const DUR = 480;

  const svg = document.getElementById('arc_svg');
  const nav = document.getElementById('arc_nav');
  const wordmark = document.getElementById('wordmark');

  const WORDMARK_Y = parseFloat(
    wordmark.getAttribute('y')
  );

  const orb = document.getElementById('orb');
  const hit = document.getElementById('hit');

  const arcL = document.getElementById('arc_l');
  const arcR = document.getElementById('arc_r');

  const fadeL = document.getElementById('fade_l');
  const fadeR = document.getElementById('fade_r');

  const pathL = document.getElementById('path_l');
  const pathR = document.getElementById('path_r');

  const pathLBig = document.getElementById('path_l_big');
  const pathRBig = document.getElementById('path_r_big');

  const pathLL = document.getElementById('path_ll');
  const pathRR = document.getElementById('path_rr');

  const pathLLBig = document.getElementById('path_ll_big');
  const pathRRBig = document.getElementById('path_rr_big');

  const pathC = document.getElementById('path_c');
  const pathCBig = document.getElementById('path_c_big');

  const labelC = document.getElementById('label_c');
  const labelCSmall = document.getElementById('label_c_small');

  const labelL = document.getElementById('label_l');
  const labelR = document.getElementById('label_r');

  const labelLBig = document.getElementById('label_l_big');
  const labelRBig = document.getElementById('label_r_big');

  const labelLL = document.getElementById('label_ll');
  const labelRR = document.getElementById('label_rr');

  const labelLLBig = document.getElementById('label_ll_big');
  const labelRRBig = document.getElementById('label_rr_big');

  const linkC = document.getElementById('link_c');
  const linkL = document.getElementById('link_l');
  const linkR = document.getElementById('link_r');
  const linkLL = document.getElementById('link_ll');
  const linkRR = document.getElementById('link_rr');

  // --------------------------------------------------
  // 현재 페이지 확인
  // --------------------------------------------------

  const HOME_KEY = (() => {
    const forced = nav.getAttribute('data-home-key');

    if (forced) {
      return forced;
    }

    const map = {
      LL: linkLL,
      L: linkL,
      C: linkC,
      R: linkR,
      RR: linkRR
    };

    const here =
      location.pathname.split('/').pop() || 'index.html';

    for (const key in map) {
      const href = map[key].getAttribute('href');

      if (
        href &&
        href.split('/').pop() === here
      ) {
        return key;
      }
    }

    return 'C';
  })();

  // --------------------------------------------------
  // 반응형 레이아웃
  // --------------------------------------------------

  const LAYOUT = {
    desktop: {
      viewBox: '0 0 1920 260',
      word: 28,
      side: 14,
      big: 23,
      gapDeg: 12,
      labelDeg: 30,
      outerDeg: 60,
      edgeDeg: 80
    },

    mobile: {
      viewBox: '560 -30 800 300',
      word: 44,
      side: 25,
      big: 36,
      gapDeg: 12,
      labelDeg: 31,
      outerDeg: 62,
      edgeDeg: 82
    }
  };

  let L = LAYOUT.desktop;

  // --------------------------------------------------
  // 타원 좌표 계산
  // --------------------------------------------------

  const rad = d => d * Math.PI / 180;

  const pt = (cy, rx, ry, deg) => [
    CX + rx * Math.sin(rad(deg)),
    cy + ry * Math.cos(rad(deg))
  ];

  function arcPath(
    cy,
    rx,
    ry,
    a0,
    a1,
    steps = 48
  ) {
    let d = '';

    for (let i = 0; i <= steps; i++) {
      const [x, y] = pt(
        cy,
        rx,
        ry,
        a0 + (a1 - a0) * i / steps
      );

      d +=
        (i ? 'L' : 'M') +
        x.toFixed(2) +
        ' ' +
        y.toFixed(2) +
        ' ';
    }

    return d.trim();
  }

  // --------------------------------------------------
  // 메뉴 기본 위치
  // --------------------------------------------------

  const BASE_ANGLE = key => {
    switch (key) {
      case 'LL':
        return -L.outerDeg;

      case 'L':
        return -L.labelDeg;

      case 'R':
        return L.labelDeg;

      case 'RR':
        return L.outerDeg;

      default:
        return 0;
    }
  };

  let dialRotation = 0;

  const angleOf = key =>
    BASE_ANGLE(key) + dialRotation;

  // --------------------------------------------------
  // 메뉴 아이템
  // --------------------------------------------------

  const ITEMS = [
    {
      key: 'LL',
      pathSmall: pathLL,
      pathBig: pathLLBig
    },
    {
      key: 'L',
      pathSmall: pathL,
      pathBig: pathLBig
    },
    {
      key: 'C',
      pathSmall: pathC,
      pathBig: pathCBig
    },
    {
      key: 'R',
      pathSmall: pathR,
      pathBig: pathRBig
    },
    {
      key: 'RR',
      pathSmall: pathRR,
      pathBig: pathRRBig
    }
  ];

  const LABEL_BIG_BY_KEY = {
    LL: labelLLBig,
    L: labelLBig,
    C: labelC,
    R: labelRBig,
    RR: labelRRBig
  };

  const GAP_PAD_PX = 6;

  let lastRx = REST.rx;
  let lastRy = REST.ry;

  let angleVal = 0;

  // --------------------------------------------------
  // 렌더링
  // --------------------------------------------------

  function render(t) {
    const rx =
      REST.rx +
      (HOVER.rx - REST.rx) * t;

    const ry =
      REST.ry +
      (HOVER.ry - REST.ry) * t;

    const orbRx =
      rx +
      PAD_X +
      EXTRA_PAD_X * t;

    const orbRy =
      ry +
      PAD_Y +
      EXTRA_PAD_Y * t;

    const SRx = rx + SIDE_OFFSET;
    const SRy = ry + SIDE_OFFSET;

    orb.setAttribute(
      'rx',
      orbRx.toFixed(2)
    );

    orb.setAttribute(
      'ry',
      orbRy.toFixed(2)
    );

    hit.setAttribute(
      'rx',
      orbRx.toFixed(2)
    );

    hit.setAttribute(
      'ry',
      orbRy.toFixed(2)
    );

    // 메뉴 위치
    ITEMS.forEach(
      ({ key, pathSmall, pathBig }) => {
        const angle = angleOf(key);

        pathSmall.setAttribute(
          'd',
          arcPath(
            CY,
            SRx,
            SRy,
            angle - 11,
            angle + 11
          )
        );

        pathBig.setAttribute(
          'd',
          arcPath(
            CY,
            rx,
            ry,
            angle - 16,
            angle + 16
          )
        );
      }
    );

    // 활성 메뉴의 실제 글자 폭
    const activeLabel =
      LABEL_BIG_BY_KEY[activeKey];

    let activeBBox = null;

    if (activeLabel) {
      try {
        activeBBox = activeLabel.getBBox();
      } catch (e) {
        activeBBox = null;
      }
    }

    const gapDeg =
      activeBBox &&
      activeBBox.width > 0
        ? (
            (activeBBox.width / 2 + GAP_PAD_PX) /
            rx
          ) *
          (180 / Math.PI)
        : L.gapDeg;

    const gapStart =
      angleVal - gapDeg;

    const gapEnd =
      angleVal + gapDeg;

    // 왼쪽 호
    arcL.setAttribute(
      'd',
      arcPath(
        CY,
        rx,
        ry,
        -L.edgeDeg,
        gapStart
      )
    );

    // 오른쪽 호
    arcR.setAttribute(
      'd',
      arcPath(
        CY,
        rx,
        ry,
        gapEnd,
        L.edgeDeg
      )
    );

    // 왼쪽 그라디언트
    const [lx1, ly1] =
      pt(
        CY,
        rx,
        ry,
        gapStart
      );

    const [lx2, ly2] =
      pt(
        CY,
        rx,
        ry,
        -L.edgeDeg
      );

    fadeL.setAttribute(
      'x1',
      lx1.toFixed(2)
    );

    fadeL.setAttribute(
      'y1',
      ly1.toFixed(2)
    );

    fadeL.setAttribute(
      'x2',
      lx2.toFixed(2)
    );

    fadeL.setAttribute(
      'y2',
      ly2.toFixed(2)
    );

    // 오른쪽 그라디언트
    const [rx1, ry1] =
      pt(
        CY,
        rx,
        ry,
        gapEnd
      );

    const [rx2, ry2] =
      pt(
        CY,
        rx,
        ry,
        L.edgeDeg
      );

    fadeR.setAttribute(
      'x1',
      rx1.toFixed(2)
    );

    fadeR.setAttribute(
      'y1',
      ry1.toFixed(2)
    );

    fadeR.setAttribute(
      'x2',
      rx2.toFixed(2)
    );

    fadeR.setAttribute(
      'y2',
      ry2.toFixed(2)
    );

    lastRx = rx;
    lastRy = ry;
  }

  // --------------------------------------------------
  // 반응형 적용
  // --------------------------------------------------

  function applyLayout() {
    L =
      window.matchMedia(
        '(max-width: 768px)'
      ).matches
        ? LAYOUT.mobile
        : LAYOUT.desktop;

    svg.setAttribute(
      'viewBox',
      L.viewBox
    );

    wordmark.setAttribute(
      'font-size',
      L.word
    );

    wordmark.setAttribute(
      'y',
      (
        WORDMARK_Y -
        L.word / 2
      ).toFixed(2)
    );

    labelL.setAttribute(
      'font-size',
      L.side
    );

    labelR.setAttribute(
      'font-size',
      L.side
    );

    labelLL.setAttribute(
      'font-size',
      L.side
    );

    labelRR.setAttribute(
      'font-size',
      L.side
    );

    labelCSmall.setAttribute(
      'font-size',
      L.side
    );

    labelC.setAttribute(
      'font-size',
      L.big
    );

    labelLBig.setAttribute(
      'font-size',
      L.big
    );

    labelRBig.setAttribute(
      'font-size',
      L.big
    );

    labelLLBig.setAttribute(
      'font-size',
      L.big
    );

    labelRRBig.setAttribute(
      'font-size',
      L.big
    );

    if (dialAnimRaf) {
      cancelAnimationFrame(
        dialAnimRaf
      );

      dialAnimRaf = null;
    }

    dialRotation =
      -BASE_ANGLE(HOME_KEY);

    dialRestKey = HOME_KEY;
    activeKey = HOME_KEY;

    updateActiveClasses();

    angleVal = angleOf(activeKey);

    render(current);
  }

  // --------------------------------------------------
  // 호버 확대 애니메이션
  // --------------------------------------------------

  const reduced =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );

  let current = 0;
  let target = 0;
  let raf = null;
  let startVal = 0;
  let startTime = 0;

  const easeOutCubic = p =>
    1 - Math.pow(1 - p, 3);

  function tick(now) {
    const p =
      Math.min(
        1,
        (now - startTime) / DUR
      );

    current =
      startVal +
      (target - startVal) *
        easeOutCubic(p);

    render(current);

    raf =
      p < 1
        ? requestAnimationFrame(tick)
        : null;
  }

  function animateTo(v) {
    if (target === v) {
      return;
    }

    target = v;

    if (reduced.matches) {
      current = v;
      render(current);
      return;
    }

    startVal = current;
    startTime = performance.now();

    if (!raf) {
      raf =
        requestAnimationFrame(tick);
    }
  }

  const open = () => animateTo(1);
  const close = () => animateTo(0);

  // --------------------------------------------------
  // 호버
  // --------------------------------------------------

  function handleNavPointerOver(e) {
    if (
      e.target.closest(
        '.hit, .label'
      )
    ) {
      open();
    }
  }

  function handleNavPointerOutClose(e) {
    if (
      !e.relatedTarget ||
      !e.relatedTarget.closest?.(
        '.hit, .label'
      )
    ) {
      close();
    }
  }

  function handleNavFocusIn() {
    open();
  }

  function handleNavFocusOutClose(e) {
    if (
      !nav.contains(
        e.relatedTarget
      )
    ) {
      close();
    }
  }

  function handleWindowResize() {
    applyLayout();
  }

  function handleReducedMotionChange() {
    render(current);
  }

  nav.addEventListener(
    'pointerover',
    handleNavPointerOver
  );

  nav.addEventListener(
    'pointerout',
    handleNavPointerOutClose
  );

  nav.addEventListener(
    'focusin',
    handleNavFocusIn
  );

  nav.addEventListener(
    'focusout',
    handleNavFocusOutClose
  );

  window.addEventListener(
    'resize',
    handleWindowResize,
    {
      passive: true
    }
  );

  reduced.addEventListener?.(
    'change',
    handleReducedMotionChange
  );

  // --------------------------------------------------
  // 스크롤 시 헤더 숨김
  // --------------------------------------------------

  const HEADER_HIDE_TOP = 80;
  const HEADER_HIDE_DELTA = 4;

  let lastScrollY =
    window.scrollY;

  function updateHeaderVisibility() {
    const y =
      window.scrollY;

    const diff =
      y - lastScrollY;

    if (
      y <= HEADER_HIDE_TOP
    ) {
      nav.classList.remove(
        'is_hidden'
      );
    }

    else if (
      nav.contains(
        document.activeElement
      )
    ) {
      nav.classList.remove(
        'is_hidden'
      );
    }

    else if (
      diff > HEADER_HIDE_DELTA
    ) {
      nav.classList.add(
        'is_hidden'
      );
    }

    else if (
      diff < -HEADER_HIDE_DELTA
    ) {
      nav.classList.remove(
        'is_hidden'
      );
    }

    lastScrollY = y;
  }

  function handleWindowScroll() {
    updateHeaderVisibility();
  }

  window.addEventListener(
    'scroll',
    handleWindowScroll,
    {
      passive: true
    }
  );

  // --------------------------------------------------
  // 활성 메뉴
  // --------------------------------------------------

  let activeKey = HOME_KEY;
  let dialRestKey = HOME_KEY;

  let angleStart = 0;
  let angleTarget = 0;
  let angleStartTime = 0;
  let angleRaf = null;

  const ANGLE_DUR = 380;

  function updateActiveClasses() {
    linkC.classList.toggle(
      'is_active',
      activeKey === 'C'
    );

    linkL.classList.toggle(
      'is_active',
      activeKey === 'L'
    );

    linkR.classList.toggle(
      'is_active',
      activeKey === 'R'
    );

    linkLL.classList.toggle(
      'is_active',
      activeKey === 'LL'
    );

    linkRR.classList.toggle(
      'is_active',
      activeKey === 'RR'
    );
  }

  function angleTick(now) {
    const p =
      Math.min(
        1,
        (now - angleStartTime) /
          ANGLE_DUR
      );

    angleVal =
      angleStart +
      (angleTarget - angleStart) *
        easeOutCubic(p);

    render(current);

    angleRaf =
      p < 1
        ? requestAnimationFrame(
            angleTick
          )
        : null;
  }

  function setActive(
    key,
    angleTargetOverride
  ) {
    const nextAngle =
      angleTargetOverride !== undefined
        ? angleTargetOverride
        : angleOf(key);

    if (
      activeKey === key &&
      angleTarget === nextAngle
    ) {
      return;
    }

    activeKey = key;

    updateActiveClasses();

    angleTarget = nextAngle;
    angleStart = angleVal;
    angleStartTime =
      performance.now();

    if (reduced.matches) {
      angleVal = angleTarget;
      render(current);
      return;
    }

    if (!angleRaf) {
      angleRaf =
        requestAnimationFrame(
          angleTick
        );
    }
  }

  // --------------------------------------------------
  // 다이얼 드래그
  // --------------------------------------------------

  const DEG_PER_PX =
    180 /
    (Math.PI * RING_RX);

  const STEP_KEYS = {
    '-2': 'RR',
    '-1': 'R',
    '0': 'C',
    '1': 'L',
    '2': 'LL'
  };

  const LINK_BY_KEY = {
    LL: linkLL,
    L: linkL,
    C: linkC,
    R: linkR,
    RR: linkRR
  };

  const DIAL_DUR = 320;

  let dragging = false;
  let dragPointerId = null;
  let dragStartX = 0;
  let dragStartRotation = 0;

  let dialAnimStart = 0;
  let dialAnimTarget = 0;
  let dialAnimStartTime = 0;
  let dialAnimRaf = null;

  function clampRotation(v) {
    return Math.max(
      -L.outerDeg,
      Math.min(
        L.outerDeg,
        v
      )
    );
  }

  function svgScale() {
    const rect =
      svg.getBoundingClientRect();

    const vbWidth =
      parseFloat(
        L.viewBox.split(' ')[2]
      );

    return rect.width
      ? vbWidth / rect.width
      : 1;
  }

  function dialTick(now) {
    const p =
      Math.min(
        1,
        (now - dialAnimStartTime) /
          DIAL_DUR
      );

    dialRotation =
      dialAnimStart +
      (
        dialAnimTarget -
        dialAnimStart
      ) *
        easeOutCubic(p);

    render(current);

    dialAnimRaf =
      p < 1
        ? requestAnimationFrame(
            dialTick
          )
        : null;
  }

  function animateDialTo(
    targetDeg
  ) {
    if (reduced.matches) {
      dialRotation = targetDeg;
      render(current);
      return;
    }

    dialAnimStart =
      dialRotation;

    dialAnimTarget =
      targetDeg;

    dialAnimStartTime =
      performance.now();

    if (!dialAnimRaf) {
      dialAnimRaf =
        requestAnimationFrame(
          dialTick
        );
    }
  }

  // --------------------------------------------------
  // 가장 가까운 메뉴로 스냅
  // --------------------------------------------------

  function snapDial() {
    const step =
      Math.max(
        -2,
        Math.min(
          2,
          Math.round(
            dialRotation /
              L.labelDeg
          )
        )
      );

    const key =
      STEP_KEYS[String(step)];

    dialRestKey = key;

    animateDialTo(
      step * L.labelDeg
    );

    // 중앙 활성 상태
    setActive(
      key,
      0
    );

    // 스냅 후 해당 페이지로 이동
    window.location.href =
      LINK_BY_KEY[key]
        .getAttribute('href');
  }

  // --------------------------------------------------
  // 드래그 시작
  // --------------------------------------------------

  function handleHitPointerDown(e) {
    if (dragging) {
      return;
    }

    e.preventDefault();

    dragging = true;
    dragPointerId =
      e.pointerId;

    dragStartX =
      e.clientX;

    dragStartRotation =
      dialRotation;

    if (dialAnimRaf) {
      cancelAnimationFrame(
        dialAnimRaf
      );

      dialAnimRaf = null;
    }

    hit.setPointerCapture(
      e.pointerId
    );

    nav.classList.add(
      'is_dragging'
    );
  }

  // --------------------------------------------------
  // 드래그 중
  // --------------------------------------------------

  function handleHitPointerMove(e) {
    if (
      !dragging ||
      e.pointerId !==
        dragPointerId
    ) {
      return;
    }

    const deltaPx =
      (
        e.clientX -
        dragStartX
      ) *
      svgScale();

    dialRotation =
      clampRotation(
        dragStartRotation +
          deltaPx *
            DEG_PER_PX
      );

    render(current);
  }

  // --------------------------------------------------
  // 드래그 종료
  // --------------------------------------------------

  function handleHitPointerUp(e) {
    if (
      !dragging ||
      e.pointerId !==
        dragPointerId
    ) {
      return;
    }

    dragging = false;

    if (
      hit.hasPointerCapture(
        e.pointerId
      )
    ) {
      hit.releasePointerCapture(
        e.pointerId
      );
    }

    nav.classList.remove(
      'is_dragging'
    );

    snapDial();
  }

  hit.addEventListener(
    'pointerdown',
    handleHitPointerDown
  );

  hit.addEventListener(
    'pointermove',
    handleHitPointerMove
  );

  hit.addEventListener(
    'pointerup',
    handleHitPointerUp
  );

  hit.addEventListener(
    'pointercancel',
    handleHitPointerUp
  );

  // --------------------------------------------------
  // 초기화
  // --------------------------------------------------

  updateActiveClasses();
  applyLayout();

})();