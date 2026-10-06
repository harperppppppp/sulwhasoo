// Sulwhasoo · Flagship Store
// pages/flagship.html 전용 기능
document.addEventListener('DOMContentLoaded', () => {
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 반응형 구간. css/flagship.css의 @media와 같은 값입니다.
  //   1025px 이상 — 1920 캔버스를 scale로 축소 (기존 그대로)
  //   1024px 이하 — 태블릿, 600px 이하 — 모바일: scale 없이 실제 화면 폭 기준
  //                 레이아웃 (섹션마다 CSS가 태블릿·모바일 배치를 따로 가짐)
  var tabletMq = window.matchMedia('(max-width: 1024px)');
  var mobileMq = window.matchMedia('(max-width: 600px)');

  // ---- Responsive stage: 1025px 이상에서는 1920px 고정 캔버스를 뷰포트
  // 폭에 맞춰 scale로 줄여 가로 스크롤이 생기지 않게 합니다. 1920px 이상은
  // scale(1)이라 그대로입니다. 1024px 이하에서는 scale을 걸지 않습니다. ----
  var stage = document.querySelector('[data-scale-stage]');
  var page = stage ? stage.querySelector('.page') : null;

  function handleStageResize() {
    if (!stage || !page) return;
    if (tabletMq.matches) {
      page.style.transform = '';
      stage.style.height = '';
      return;
    }
    var scale = Math.min(1, window.innerWidth / 1920);
      document.documentElement.style.setProperty('--stage-scale', scale);
    page.style.transform = 'scale(' + scale + ')';
    stage.style.height = (page.scrollHeight * scale) + 'px';
  }
  if (stage && page) {
    handleStageResize();
    window.addEventListener('resize', handleStageResize);
    window.addEventListener('load', handleStageResize);
  }

  // ---- 스크롤 공용 도구 ----
  // hero 인트로와 섹션 스냅이 같이 씁니다.

  // .page에 걸리는 축소 배율. 1920 캔버스 기준 px을 화면 px로 바꿀 때 곱합니다.
  // 1024px 이하에서는 .page에 scale이 없으므로 1입니다.
  function stageScale() {
    return tabletMq.matches ? 1 : Math.min(1, window.innerWidth / 1920);
  }

  // Lenis(js/common.js)가 스크롤 잠금을 뚫고 스크롤하지 않도록 같이 멈춥니다.
  // Lenis를 못 불러온 페이지에서도 돌아가야 하므로 존재 여부를 확인합니다.
  function toggleLenis(method) {
    var lenis = window.sulwhasooLenis;
    if (lenis && typeof lenis[method] === 'function') lenis[method]();
  }

  // 스크롤 위치를 직접 옮길 때는 반드시 이 함수를 씁니다.
  // Lenis는 자기 내부에 목표 스크롤값을 따로 들고 매 프레임 그 값을 다시
  // 써넣습니다. window.scrollTo로 네이티브 스크롤만 옮기면 다음 프레임에
  // Lenis가 예전 값(잠글 때의 0)으로 되돌려버려서, 인계 이동이 맨 위로
  // 끌려가고 hero가 알약부터 다시 나타납니다 — 인트로가 한 번 더 시작되는
  // 것처럼 보이는 원인입니다. lenis.scrollTo(immediate)로 옮기면 내부값까지
  // 같이 맞춰집니다. force는 stop() 상태에서도 먹히게 하는 옵션입니다.
  function setScroll(y) {
    var lenis = window.sulwhasooLenis;
    if (lenis && typeof lenis.scrollTo === 'function') {
      lenis.scrollTo(y, { immediate: true, force: true });
    } else {
      window.scrollTo(0, y);
    }
  }

  // ---- 맨 위로 버튼 (오른쪽 아래) ----
  // 인트로가 끝나면(finish) 나타납니다. hero가 없는 환경에서는 바로 보입니다.
  var toTopBtn = document.querySelector('.to_top');

  // ---- Hero 인트로 ----
  // 페이지에 들어오면 알약 모양 영상이 재생되고, 그 자리에서 화면이 고정된 채
  // 사용자가 휠을 내릴 때까지 기다립니다. 휠 한 번이면 아래 세 구간이 중간에
  // 멈추는 곳 없이 한 번에 이어져 카드 섹션까지 내려갑니다. 인트로 자체를
  // 되감지는 않지만, 다 끝난 hero는 문서 맨 위에 그대로 남아 있어서 위로
  // 올리면 언제든 다시 볼 수 있습니다. (아래 "인트로가 끝난 뒤" 참고)
  //
  //   1) 대기      — 알약 모양 영상이 재생을 시작. 여기서 휠을 기다립니다
  //   2) 확대      — (휠 ↓) 알약이 화면 전체로 커지고 radius가 0이 됨
  //                  (배지와 카피는 확대가 시작되면 먼저 빠집니다)
  //   3) 컬러 전환 — 확대가 WASH_AT(75%)만큼 진행됐을 때 시작. #f5ecd7가 점점
  //                  물들고, 영상은 그 아래에서 계속 재생됩니다
  //   4) 하강      — 컬러 전환이 DROP_AT(85%)만큼 진행됐을 때 시작. hero
  //                  레이어가 페이지 스크롤과 같은 양만큼 위로 밀려 올라가고,
  //                  그 아래에서 history가 올라옵니다
  //
  // 세 구간은 서로 조금씩 겹칩니다 — 확대가 끝난 뒤에 색을 덮으면 영상이 화면을
  // 다 채운 자리에서 한 박자 멈추고, 색이 완전히 바뀐 뒤에 내려가면 크림색
  // 화면에서 또 한 박자 멈춥니다. 겹쳐야 휠 한 번이 한 동작으로 보입니다.
  // 각 구간의 길이와 이징은 그대로입니다. 바뀐 것은 "언제 시작하느냐"뿐입니다.
  var hero = document.getElementById('hero');
  var heroVideoBox = hero ? hero.querySelector('.hero_video') : null;
  var heroVideo = hero ? hero.querySelector('video') : null;
  var heroWash = hero ? hero.querySelector('.hero_wash') : null;
  var heroBadge = hero ? hero.querySelector('.badge_stage') : null;
  var heroTxt = hero ? hero.querySelector('.hero_txt') : null;
  var historySection = document.getElementById('history');

  if (hero && heroVideoBox && heroVideo && heroWash && historySection) {
    var GROW_MS = 2000;     // 화면 전체로 커지는 시간
    var FADE_MS = 1200;     // #f5ecd7로 물드는 시간
    var WASH_AT = 0.75;     // 확대가 이만큼 진행됐을 때 컬러 전환 시작
    var DROP_AT = 0.85;     // 컬러 전환이 이만큼 진행됐을 때 하강 시작
    var DROP_MS = 1100;     // BUKCHON HISTORY로 내려가는 시간
    var COPY_OUT_AT = 0.45; // 배지·카피가 빠지는 구간 (확대 시간 대비)
    var PILL_W = 260;       // 1920 캔버스 기준 알약 크기 — .page와 같은 배율로
    var PILL_H = 427;       // 축소해서 실제 페이지 비율과 맞춥니다
    var PILL_R = 300;
    var BADGE_TOP = -40;    // 캔버스 기준 배지 y (아래 호만 화면 위로 걸치도록)
    var TXT_GAP = 50;       // 영상과 카피 사이 간격

    function clamp01(v) { return Math.max(0, Math.min(1, v)); }
    function lerp(a, b, t) { return a + (b - a) * t; }

    // ---- 모바일: hero 영역 자체를 짧게 ----
    // 600px 이하에서는 hero가 화면 전체 높이가 아니라 "헤더 아래 여백 + 알약 + 카피 +
    // 아래 여백"만큼만 차지합니다. 알약은 폭(좌우 24px 여백)을 다 쓰고 높이는 폭의
    // MOBILE_PILL_RATIO배입니다. 높이는 카피 높이에 따라 달라지므로 CSS가 아니라 여기서
    // 인라인으로 정합니다. hero 높이에 기대는 값(history 위 여백, 하강 거리, 인트로
    // 뒤의 진행도)은 화면 높이 대신 heroViewH()를 씁니다.
    var MOBILE_PILL_RATIO = 1.1;   // 알약 높이 / 폭
    var MOBILE_TOP_PAD = 64;       // 공용 헤더(.arc_nav) 아래부터 알약까지
    var MOBILE_GAP = 28;           // 알약과 카피 사이
    var MOBILE_BOTTOM_PAD = 40;    // 카피 아래 여백
    var syncedHeroH = null;

    function mobileHeroMetrics() {
      var txtH = heroTxt ? heroTxt.offsetHeight : 0;
      var pillW = Math.max(120, window.innerWidth - 48);
      var pillH = Math.round(pillW * MOBILE_PILL_RATIO);
      return {
        pillW: pillW,
        pillH: pillH,
        total: MOBILE_TOP_PAD + pillH + MOBILE_GAP + txtH + MOBILE_BOTTOM_PAD
      };
    }

    // hero가 실제로 차지하는 높이. 데스크톱·태블릿은 화면 전체(기존 그대로)입니다.
    function heroViewH() {
      if (mobileMq.matches) return hero.clientHeight || window.innerHeight;
      return window.innerHeight;
    }

    // 모바일이면 hero 높이를 맞추고, 아니면 CSS(100vh)에 맡깁니다. 높이가 바뀌면 history
    // 위 여백과 하강 거리도 같이 갈아 끼웁니다(폰트가 늦게 올 때 카피 높이가 바뀜).
    function syncHeroHeight() {
      var next = null;
      if (mobileMq.matches) next = Math.round(mobileHeroMetrics().total);
      if (next === syncedHeroH) return;
      syncedHeroH = next;
      hero.style.height = next === null ? '' : next + 'px';
      historySection.style.paddingTop = (heroViewH() / stageScale()) + 'px';
      if (introPhase === PHASE_IDLE) dropTarget = heroViewH();
    }

    // 알약·카피·배지의 크기와 자리. 인트로(renderHero)와 인트로 뒤
    // (renderParkedHero)가 같이 씁니다.
    //   · 1025px 이상: 1920 캔버스 기준 값에 .page와 같은 배율을 곱합니다.
    //   · 1024px 이하: 카피는 CSS 크기 그대로(배율 1)이고, 알약이 카피 높이와
    //     화면 높이에 맞춰 줄어듭니다. 알약+카피 묶음이 헤더 아래 남는 자리의
    //     한가운데에 오도록 놓아서, 가로로 눕힌 태블릿처럼 화면이 낮아도
    //     카피가 화면 밖으로 밀려나지 않습니다.
    //   · 배지(.badge_stage)는 이번 작업 범위가 아니라 예전 배율을 그대로 씁니다.
    function heroGeometry(h) {
      var badgeK = Math.min(1, window.innerWidth / 1920);   // 예전 배율 그대로
      if (!tabletMq.matches) {
        var pillH = PILL_H * badgeK;
        var pillTop = (h - pillH) / 2;
        return {
          pillW: PILL_W * badgeK, pillH: pillH, pillR: PILL_R * badgeK, pillTop: pillTop,
          txtTop: pillTop + pillH + TXT_GAP * badgeK, txtK: badgeK, badgeK: badgeK
        };
      }
      var mobile = mobileMq.matches;
      var gap = mobile ? 28 : 40;          // 알약과 카피 사이
      var topPad = mobile ? 64 : 110;      // 공용 헤더(.arc_nav)가 차지하는 자리
      var bottomPad = 48;
      var maxPillH = 491;
      var txtH = heroTxt ? heroTxt.offsetHeight : 0;
      var avail = h - topPad - bottomPad;
      var pillHc, pillWc;
      if (mobile) {
        // 모바일은 hero 높이가 알약·카피에 맞춰 정해지므로(syncHeroHeight) 알약 크기는
        // 화면 높이가 아니라 폭에서 정합니다.
        var mm = mobileHeroMetrics();
        pillWc = mm.pillW;
        pillHc = mm.pillH;
      } else {
        pillHc = Math.max(160, Math.min(maxPillH, avail - txtH - gap));
        pillWc = pillHc * (PILL_W / PILL_H);
      }
      // 모바일은 헤더 바로 아래에서 시작합니다 — 세로로 긴 화면에서 가운데에 두면
      // 알약 위에 빈 자리가 너무 길게 남습니다. 태블릿은 가운데 정렬 그대로입니다.
      var topC = mobile ? topPad : topPad + Math.max(0, (avail - (pillHc + gap + txtH)) / 2);
      return {
        pillW: pillWc, pillH: pillHc, pillR: PILL_R * (pillWc / PILL_W), pillTop: topC,
        txtTop: topC + pillHc + gap, txtK: 1, badgeK: badgeK
      };
    }
    function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    // 인트로 단계. 'idle'에서만 휠을 받고, 'run'은 카드 섹션에 닿을 때까지
    // 입력을 받지 않습니다.
    var PHASE_IDLE = 'idle';    // 알약 — 휠 대기
    var PHASE_RUN = 'run';      // 확대 → 컬러 전환 → 하강, 한 번에

    var introPhase = PHASE_IDLE;
    var runMs = 0;          // 휠을 받은 뒤의 경과 시간 (인트로 전체의 시계)
    var dropTarget = 0;     // 하강으로 이동할 스크롤 거리 (= 화면 높이)

    // 컬러 전환·하강이 시작되는 시점 (runMs 기준).
    var washStartMs = GROW_MS * WASH_AT;
    var dropStartMs = washStartMs + FADE_MS * DROP_AT;

    // 경과 시간 하나로 인트로 전체를 그립니다. 마지막 프레임이면 true.
    // 대기 중에는 시간이 멈춰 있으므로, 같은 값을 계속 넣으면 화면도 그대로
    // 멈춰 있습니다.
    function renderHero(elapsed) {
      var growElapsed = elapsed;
      var outroElapsed = elapsed - washStartMs;   // 겹치는 만큼 늦게 출발합니다
      syncHeroHeight();
      var w = hero.clientWidth;
      var h = hero.clientHeight;
      var g = heroGeometry(h);
      var pillW = g.pillW;
      var pillH = g.pillH;
      var pillTop = g.pillTop;

      // 1단계 — 알약이 화면 전체로. radius는 확대보다 조금 빠르게(x1.15)
      // 떨어져서, 화면을 다 채우기 직전에 이미 각진 사각형이 됩니다.
      var grow = easeInOutCubic(clamp01(growElapsed / GROW_MS));
      var radius = lerp(g.pillR, 0, Math.min(1, grow * 1.15));
      heroVideoBox.style.left = lerp((w - pillW) / 2, 0, grow) + 'px';
      heroVideoBox.style.top = lerp(pillTop, 0, grow) + 'px';
      heroVideoBox.style.width = lerp(pillW, w, grow) + 'px';
      heroVideoBox.style.height = lerp(pillH, h, grow) + 'px';
      heroVideoBox.style.borderRadius = radius + 'px ' + radius + 'px 0 0';

      // 2단계 — 컬러 전환. 확대가 거의 다 된 시점(WASH_AT)에 출발합니다.
      // 선형으로 덮으면 시작이 툭 끊겨 보여서, ease-in-out을 걸어 영상에서
      // 색으로 미끄러지듯 이어지게 합니다. 영상 채도도 같이 낮춰 녹아들게 합니다.
      var wash = easeInOutCubic(clamp01(outroElapsed / FADE_MS));
      heroWash.style.opacity = wash;
      heroVideoBox.style.filter = wash > 0 && wash < 1
        ? 'saturate(' + (1 - wash * 0.7) + ') brightness(' + (1 + wash * 0.25) + ')'
        : '';

      // 배지와 카피는 확대가 시작되면 먼저 빠집니다.
      var fade = 1 - clamp01(growElapsed / (GROW_MS * COPY_OUT_AT));
      var rise = -24 * (1 - fade);
      if (heroBadge) {
        heroBadge.style.top = (BADGE_TOP * g.badgeK) + 'px';
        heroBadge.style.opacity = fade;
        heroBadge.style.transform = 'translateX(-50%) scale(' + g.badgeK + ') translateY(' + rise + 'px)';
      }
      if (heroTxt) {
        heroTxt.style.top = g.txtTop + 'px';
        heroTxt.style.opacity = fade;
        heroTxt.style.transform = 'translateX(-50%) scale(' + g.txtK + ') translateY(' + rise + 'px)';
      }

      // 3단계 — 하강. 컬러 전환이 거의 다 된 시점에 출발합니다. 색이 완전히
      // 바뀐 뒤에 출발하면 크림색 화면에서 한 박자 멈추고, 같이 출발하면
      // 영상이 아직 보이는 채로 내려가버립니다. 조금 겹쳐야 이어집니다.
      //
      // 페이지를 내리는 양과 hero를 밀어 올리는 양이 같은 값(dropTarget)이라,
      // hero 아랫변과 history 카드 윗변이 정확히 붙은 채로 함께 움직입니다.
      // hero를 걷어내는 게 아니라 같이 올라가는 것입니다.
      var dropDelay = FADE_MS * DROP_AT;
      if (outroElapsed >= dropDelay) {
        var drop = easeInOutCubic(clamp01((outroElapsed - dropDelay) / DROP_MS));
        setScroll(drop * dropTarget);
        hero.style.transform = 'translateY(' + (-drop * dropTarget) + 'px)';
      }

      return outroElapsed >= Math.max(FADE_MS, dropDelay + DROP_MS);
    }

    // ---- hero의 자리 ----
    // history 위쪽에 화면 한 장 높이의 여백을 넣어 둡니다. (.page가 축소돼
    // 있으므로 캔버스 좌표로 환산해서 넣습니다) 하강하는 동안에는 내려갈
    // 구간이 되고, 하강이 끝난 뒤에는 그대로 hero가 얹혀 있는 자리가 됩니다 —
    // 그래서 인트로가 끝나도 위로 올리면 hero를 다시 볼 수 있습니다.
    // 창 크기가 바뀌면 화면 한 장의 높이도 달라지므로 다시 잡아줍니다.
    function keepDropSpacer() {
      syncHeroHeight();
      historySection.style.paddingTop = (heroViewH() / stageScale()) + 'px';
      handleStageResize();
    }

    function armDropSpacer() {
      keepDropSpacer();
      setScroll(0);
      dropTarget = heroViewH();
    }

    // ---- 스크롤 잠금 + 인트로 진행 입력 ----
    // 인트로가 끝날 때까지 화면은 고정입니다. 하강 구간에서 스크립트가 직접
    // 스크롤하므로, overflow: hidden 으로 문서를 통째로 잠그지 않고 사용자
    // 입력만 막습니다. (문서를 잠그면 스크립트 스크롤까지 같이 막히고, 잠금을
    // 풀 때 스크롤바가 나타나면서 폭이 틀어집니다)
    //
    // 막은 그 입력을 그대로 인트로를 시작하는 신호로 씁니다 — 아래로 내린 양이
    // INTRO_STEP_PX를 넘으면 확대부터 카드 섹션 도착까지 한 번에 돕니다. 마우스
    // 휠은 한 칸이 보통 100px 안팎이라 한 번만 굴려도 출발하고, 트랙패드처럼
    // 잘게 들어오는 입력은 조금 모아야 출발합니다.
    var INTRO_STEP_PX = 40;
    var BLOCKED_KEYS = [32, 33, 34, 35, 36, 38, 40];
    var ADVANCE_KEYS = [32, 34, 35, 40];   // Space · PageDown · End · ↓
    var introPush = 0;
    var introTouchY = 0;

    // 인트로 시작. 이미 도는 중이면 아무 일도 하지 않습니다.
    function advanceIntro() {
      if (introPhase === PHASE_IDLE) introPhase = PHASE_RUN;
    }

    // 휠 한 칸의 단위는 브라우저·설정에 따라 픽셀/줄/페이지로 다릅니다.
    function introWheelPx(e) {
      if (e.deltaMode === 1) return e.deltaY * 16;                  // 줄 단위
      if (e.deltaMode === 2) return e.deltaY * window.innerHeight;  // 페이지 단위
      return e.deltaY;
    }

    // 아래로 내린 양만 셉니다. 위로 올리면 모아둔 양을 되돌려서, 위아래로
    // 흔들다가 얼떨결에 넘어가지 않게 합니다.
    function pushIntro(d) {
      if (introPhase !== PHASE_IDLE) { introPush = 0; return; }
      if (d <= 0) { introPush = 0; return; }
      introPush += d;
      if (introPush < INTRO_STEP_PX) return;
      introPush = 0;
      advanceIntro();
    }

    function handleIntroWheel(e) {
      e.preventDefault();
      pushIntro(introWheelPx(e));
    }

    function handleIntroTouchStart(e) { introTouchY = e.touches[0].clientY; }

    function handleIntroTouchMove(e) {
      if (e.target.closest('.arc_nav')) return;
      e.preventDefault();
      var y = e.touches[0].clientY;
      pushIntro(introTouchY - y);   // 손가락을 위로 = 아래로 스크롤 = 양수
      introTouchY = y;
    }

    // 키보드는 한 번 누를 때마다 한 구간씩 — 눌러서 INTRO_STEP_PX를 모으게
    // 하면 키보드로만 쓰는 사람에게는 넘어갈 방법이 없는 것과 같습니다.
    function handleIntroKeyDown(e) {
      if (BLOCKED_KEYS.indexOf(e.keyCode) === -1) return;
      e.preventDefault();
      if (ADVANCE_KEYS.indexOf(e.keyCode) > -1) advanceIntro();
    }

    function lockScroll() {
      // 새로고침 시 브라우저가 이전 스크롤 위치를 복원합니다. 복원은 load
      // 이후에 일어나서 여기서 setScroll(0)만 해두면 다시 끌려가므로,
      // 복원 자체를 꺼두고 맨 위로 되돌립니다.
      if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
      setScroll(0);
      toggleLenis('stop');
      window.addEventListener('wheel', handleIntroWheel, { passive: false });
      window.addEventListener('touchstart', handleIntroTouchStart, { passive: true });
      window.addEventListener('touchmove', handleIntroTouchMove, { passive: false });
      window.addEventListener('keydown', handleIntroKeyDown, { passive: false });
    }

    function unlockScroll() {
      toggleLenis('start');
      window.removeEventListener('wheel', handleIntroWheel, { passive: false });
      window.removeEventListener('touchstart', handleIntroTouchStart, { passive: true });
      window.removeEventListener('touchmove', handleIntroTouchMove, { passive: false });
      window.removeEventListener('keydown', handleIntroKeyDown, { passive: false });
    }

    var introStarted = false;
    var heroParked = false;   // 인트로가 끝나 hero가 문서 맨 위에 자리잡은 뒤

    function finish() {
      heroParked = true;
      // is_done이 붙으면 hero는 fixed에서 absolute(top: 0)로 바뀝니다. 하강이
      // 끝난 순간의 스크롤 위치가 정확히 화면 한 장(= 여백 높이)이라, 바뀌는
      // 순간에도 화면은 그대로입니다.
      hero.classList.add('is_done');
      if (toTopBtn) toTopBtn.classList.add('is_ready');
      hero.style.transform = '';
      keepDropSpacer();
      unlockScroll();
      parkHero();
    }

    // ---- 인트로가 끝난 뒤 — hero는 사라지지 않고 맨 위에 남습니다 ----
    // 지금 모습은 스크롤 위치가 정합니다. s = 스크롤 / 화면 높이 이고,
    // 0이면 hero가 화면을 가득 채운 자리, 1이면 history가 화면 맨 위입니다.
    //   · s = 0 이면 인트로 첫 장면 그대로입니다 — 알약 모양 영상에 배지와
    //     카피가 얹힌 모습
    //   · 알약은 s가 PARK_GROW_TO에 닿을 때까지 화면 전체로 커지고,
    //     배지·카피는 인트로와 같은 비율(COPY_OUT_AT)로 먼저 빠집니다
    //   · #f5ecd7 wash는 PARK_WASH_FROM~PARK_WASH_TO 사이에서 물들어,
    //     history로 넘어갈 때 인트로와 같은 색 전환을 그대로 보여줍니다
    // 되감기가 아니라 스크롤에 그대로 붙은 값이라, 아무 데서나 멈춰도 그
    // 자리의 모습이 나옵니다 — 맨 위로 올리면 항상 첫 장면입니다.
    var PARK_GROW_TO = 0.45;    // 알약이 화면 전체로 커지는 지점
    var PARK_WASH_FROM = 0.45;  // 다 커진 뒤부터 물들기 시작
    var PARK_WASH_TO = 0.8;
    var parkFrame = 0;

    function renderParkedHero() {
      syncHeroHeight();
      var w = hero.clientWidth;
      var h = hero.clientHeight;
      var vh = heroViewH() || 1;
      var s = clamp01((window.scrollY || window.pageYOffset || 0) / vh);

      // 알약 → 화면 전체. 인트로의 확대 구간과 같은 계산이고, 경과 시간 대신
      // 스크롤 위치가 진행률을 정합니다.
      var g = heroGeometry(h);
      var pillW = g.pillW;
      var pillH = g.pillH;
      var pillTop = g.pillTop;
      var grow = easeInOutCubic(clamp01(s / PARK_GROW_TO));
      var radius = lerp(g.pillR, 0, Math.min(1, grow * 1.15));
      heroVideoBox.style.left = lerp((w - pillW) / 2, 0, grow) + 'px';
      heroVideoBox.style.top = lerp(pillTop, 0, grow) + 'px';
      heroVideoBox.style.width = lerp(pillW, w, grow) + 'px';
      heroVideoBox.style.height = lerp(pillH, h, grow) + 'px';
      heroVideoBox.style.borderRadius = radius + 'px ' + radius + 'px 0 0';

      var wash = easeInOutCubic(clamp01((s - PARK_WASH_FROM) / (PARK_WASH_TO - PARK_WASH_FROM)));
      heroWash.style.opacity = wash;
      heroVideoBox.style.filter = wash > 0 && wash < 1
        ? 'saturate(' + (1 - wash * 0.7) + ') brightness(' + (1 + wash * 0.25) + ')'
        : '';

      // 배지와 카피는 확대가 시작되면 먼저 빠집니다 (인트로와 같은 비율).
      var fade = 1 - clamp01(s / (PARK_GROW_TO * COPY_OUT_AT));
      var rise = -24 * (1 - fade);
      if (heroBadge) {
        heroBadge.style.top = (BADGE_TOP * g.badgeK) + 'px';
        heroBadge.style.opacity = fade;
        heroBadge.style.transform = 'translateX(-50%) scale(' + g.badgeK + ') translateY(' + rise + 'px)';
      }
      if (heroTxt) {
        heroTxt.style.top = g.txtTop + 'px';
        heroTxt.style.opacity = fade;
        heroTxt.style.transform = 'translateX(-50%) scale(' + g.txtK + ') translateY(' + rise + 'px)';
      }

      // 화면에 걸쳐 있을 때만 재생합니다 — 안 보이는 영상을 계속 디코딩할
      // 이유가 없고, 다시 올라오면 이어서 돕니다.
      if (!prefersReducedMotion) {
        if (s < 1 && heroVideo.paused) {
          var playing = heroVideo.play();
          if (playing && playing.catch) playing.catch(function () {});
        } else if (s >= 1 && !heroVideo.paused) {
          heroVideo.pause();
        }
      }
    }

    function requestParkedHero() {
      if (parkFrame) return;
      parkFrame = window.requestAnimationFrame(function () {
        parkFrame = 0;
        renderParkedHero();
      });
    }

    function parkHero() {
      renderParkedHero();
      window.addEventListener('scroll', requestParkedHero, { passive: true });
      window.addEventListener('resize', function () {
        keepDropSpacer();
        requestParkedHero();
      });
    }

    function playIntro() {
      // loadeddata와 1.5초 폴백이 겹쳐 두 번 불릴 수 있으므로, 인트로는
      // 페이지당 한 번만 시작되도록 막아둡니다.
      if (introStarted) return;
      introStarted = true;

      // 뒤로가기(bfcache)나 새로고침으로 돌아오면 영상이 재생 위치를 그대로
      // 물고 들어오는 경우가 있습니다. 알약 구간은 항상 영상의 처음부터
      // 보여야 하므로 되감아 둡니다.
      try { heroVideo.currentTime = 0; } catch (e) {}

      var playPromise = heroVideo.play();
      if (playPromise && playPromise.catch) playPromise.catch(function () {});

      // 경과 시간을 절대 시각이 아니라 프레임 간격을 누적해 재고, 한 프레임의
      // 간격을 250ms로 제한합니다. 탭이 백그라운드에 있다 돌아왔을 때 인트로가
      // 끝까지 건너뛰지 않게 하기 위해서입니다. (250ms = 4fps까지는 지정한
      // 길이 그대로 재생되고, 그보다 더 끊길 때만 느려집니다.)
      //
      // 루프는 인트로가 끝날 때까지 계속 돕니다. 휠을 기다리는 동안에는 시계가
      // 멈춰 있어서 화면도 그대로입니다.
      var last = window.performance.now();
      (function step(now) {
        var dt = Math.min(250, now - last);
        last = now;

        if (introPhase === PHASE_RUN) runMs += dt;

        if (renderHero(runMs)) { finish(); return; }
        window.requestAnimationFrame(step);
      })(last);
    }

    // 하강이 시작되기 전이라면 화면 크기 변화에 맞춰 여백과 지금 프레임을 다시 잡습니다.
    // (하강 중에는 스크립트가 스크롤을 직접 몰고 있어서 건드리면 어긋나고,
    //  하강이 끝난 뒤에는 parkHero의 resize가 대신 맡습니다)
    window.addEventListener('resize', function () {
      if (heroParked || runMs >= dropStartMs) return;
      armDropSpacer();
      renderHero(runMs);
    });

    // 폰트가 늦게 들어오면 카피 높이가 바뀌어 알약 자리가 달라집니다.
    // 인트로 중에는 프레임마다 다시 그리지만, 인트로 뒤에는 스크롤 때만 그리므로
    // 폰트가 준비되면 한 번 더 그려 줍니다.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (heroParked) requestParkedHero(); });
    }

    lockScroll();
    armDropSpacer();
    renderHero(runMs);

    if (prefersReducedMotion) {
      // 움직임을 줄이는 설정이면 인트로를 건너뛰고 바로 history로 넘깁니다.
      finish();
    } else if (heroVideo.readyState >= 2) {
      playIntro();
    } else {
      // 첫 프레임이 빈 화면으로 보이지 않도록 영상이 준비되면 시작하되,
      // 로딩이 늦어지면 1.5초 뒤 그냥 시작합니다. (playIntro가 중복 실행을
      // 막으므로 둘 다 불려도 한 번만 시작됩니다)
      heroVideo.addEventListener('loadeddata', playIntro, { once: true });
      window.setTimeout(playIntro, 1500);
    }
  }

  // ---- History cards ----
  // 카드가 화면 맨 위에 붙어 있는 동안(= 카드 한 장 높이만큼 스크롤하는 동안)
  // 다음 카드가 아래에서 올라와 덮습니다. 덮이는 카드는 그 진행도에 맞춰
  //
  //   · 위쪽 10% 지점을 축으로 뒤로 눕고 (rotateX 0 -> 40deg)
  //   · 0.7배로 줄고 (화면 안쪽으로 물러나 보입니다)
  //   · 살짝 비뚤어지고 (rotateZ, 카드마다 +-5deg 안에서 한 번 정해집니다)
  //   · 마지막 1/4 구간에서 사라집니다
  //
  // 눕는 세 값은 처음이 느리고 뒤로 갈수록 빨라지는 곡선(easeInQuad)을 씁니다 —
  // 다음 카드가 밑변에 닿는 순간에는 거의 움직이지 않다가, 덮이는 마지막에
  // 훅 물러나야 두 카드가 겹치는 동안 어색한 틈이 보이지 않습니다.
  // 원근은 카드가 아니라 .history_slide의 perspective가 만듭니다. (flagship.css)
  //
  // 진행도 = 1 - (다음 자리의 화면상 top / 이 자리의 화면상 높이).
  // 다음 자리의 윗변이 이 카드 아랫변에 있을 때 0, 화면 맨 위에 닿으면 1입니다.
  // 둘 다 getBoundingClientRect 값이라 .page의 scale이 서로 상쇄됩니다.
  var historySlides = document.querySelectorAll('.history_slide');
  if (historySlides.length > 1 && !prefersReducedMotion) {
    var HISTORY_TILT_DEG = 40;    // 다 눕혔을 때의 rotateX
    var HISTORY_MIN_SCALE = 0.7;  // 다 눕혔을 때의 크기
    var HISTORY_FADE_FROM = 0.75; // 이 진행도부터 사라지기 시작합니다
    var historyTiltTicking = false;

    // 카드마다 비뚤어지는 방향이 달라야 한 장씩 손으로 내려놓은 것처럼 보입니다.
    var historyTiltZ = [];
    for (var h = 0; h < historySlides.length; h++) {
      historyTiltZ.push((Math.random() - 0.5) * 10);
    }

    function historyEaseIn(t) { return t * t; }
    function historyEaseInOut(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function updateHistoryTilt() {
      historyTiltTicking = false;

      // 모바일은 카드가 sticky로 붙지 않고 다음 카드가 위로 겹쳐 올라오는 배치(CSS)라서
      // 눕히는 효과를 걸지 않습니다. 진행도 계산(다음 자리의 화면상 top)은 sticky를
      // 전제로 한 것이어서, 그대로 두면 카드가 읽히는 동안에도 기울고 사라집니다.
      if (mobileMq.matches) {
        for (var m = 0; m < historySlides.length; m++) {
          var flat = historySlides[m].querySelector('.history_card');
          if (!flat) continue;
          flat.style.transform = '';
          flat.style.opacity = '';
          flat.style.visibility = '';
        }
        return;
      }

      for (var i = 0; i < historySlides.length - 1; i++) {
        var slide = historySlides[i];
        var card = slide.querySelector('.history_card');
        if (!card) continue;

        var slideHeight = slide.getBoundingClientRect().height;
        var coveringTop = historySlides[i + 1].getBoundingClientRect().top;
        var progress = slideHeight > 0
          ? Math.max(0, Math.min(1, 1 - coveringTop / slideHeight))
          : 0;

        if (progress <= 0) {
          card.style.transform = '';
          card.style.opacity = '';
          card.style.visibility = '';
          continue;
        }

        var eased = historyEaseIn(progress);
        card.style.transform =
          'rotateX(' + (eased * HISTORY_TILT_DEG) + 'deg)' +
          ' rotateZ(' + (eased * historyTiltZ[i]) + 'deg)' +
          ' scale(' + (1 - eased * (1 - HISTORY_MIN_SCALE)) + ')';

        // 사라지는 구간은 눕는 구간과 별개로 뒤쪽 1/4에만 걸립니다.
        var fade = (progress - HISTORY_FADE_FROM) / (1 - HISTORY_FADE_FROM);
        var alpha = fade <= 0 ? 1 : 1 - historyEaseInOut(Math.min(1, fade));
        card.style.opacity = alpha;
        // 다 지워진 카드는 그리지도 않습니다 (opacity: 0은 계속 합성됩니다)
        card.style.visibility = alpha <= 0 ? 'hidden' : 'visible';
      }
    }

    function requestHistoryTiltUpdate() {
      if (!historyTiltTicking) {
        historyTiltTicking = true;
        window.requestAnimationFrame(updateHistoryTilt);
      }
    }

    updateHistoryTilt();
    window.addEventListener('scroll', requestHistoryTiltUpdate, { passive: true });
    window.addEventListener('resize', requestHistoryTiltUpdate);
  }

  // ---- Hero "Enter" button: scroll to the next section ----
  function handleScrollToClick(event) {
    var target = document.querySelector(event.currentTarget.getAttribute('data-scroll-to'));
    if (target) target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }


  // ---- Gallery: 캠페인 전환 + 이미지 자동 등장 ----
  // 섹션에 들어오면(또는 스냅이 섹션에 붙으면) 이미지가 왼쪽 위에서 오른쪽 아래로
  // 대각선 물결을 그리며 한 장씩 부드럽게 나타납니다. 섹션을 이미지 한 장 크기의
  // 칸으로 나누어 칸 전부를 채우고, 등록한 이미지가 칸보다 적으면 같은 이미지를
  // 반복해서 씁니다 — 옆 칸에 같은 이미지가 붙지 않도록 섞어서 놓습니다.
  // 나타난 이미지는 사라지지 않고 그 자리에 남습니다. 칸이 전부 차면 "수행 완료"로
  // 보고 섹션 고정을 풀어 줍니다(아래 스냅 코드의 onGalleryCleared).
  // 오른쪽 캠페인 버튼을 누르면 제목이 디졸브되며 바뀌고 이미지 세트도
  // 교체되어 같은 방식으로 다시 쌓입니다.
  var GALLERY_IMG = '../assets/flagship/images/';

  var GALLERY_CAMPAIGNS = [
    {
      title: '[Yoonjo’s Aesthetic\nSense: Aesthetic of\nYoonjo]',
      images: [
        'gallery-01', 'gallery-02', 'gallery-03', 'gallery-04', 'gallery-05',
        'gallery-01', 'gallery-02', 'gallery-03', 'gallery-04', 'gallery-05'
      ]
    },
    {
      title: '[ROOMS OF WOMEN,ROOMS OF WOMEN]',
      images: [
        'img_box01', 'img_box02', 'img_box03', 'img_box04', 'img_box05', 'img_box06',
        'img_box07', 'img_box08', 'img_box09', 'img_box10', 'img_box11'
      ]
    }
  ];

  var gallerySection = document.querySelector('.gallery');
  var galleryTrail = gallerySection ? gallerySection.querySelector('.gallery_trail') : null;
  var galleryTitle = gallerySection ? gallerySection.querySelector('.gallery_title') : null;
  var campaignButtons = gallerySection ? gallerySection.querySelectorAll('.gallery_campaign') : [];

  if (galleryTrail && galleryTitle && window.gsap) {
    var TITLE_FADE = 0.5;    // 제목 디졸브 시간(초)
    var TRAIL_ITEM_W = 317;  // 이미지 한 장 폭(px) — CSS와 같은 값
    var TRAIL_ITEM_H = 174;  // 이미지 한 장 높이(px) — CSS와 같은 값
    var TRAIL_GAP = 30;      // 이미지끼리 벌어져 있어야 하는 최소 간격(px, 상하좌우)
    var TRAIL_OPACITY = 0.25; // 이미지가 다 나타난 뒤의 투명도 (25%)
    var TRAIL_FILL = 0.85;    // 이미지 영역이 .gallery_range 높이에서 차지하는 최대 비율
    var TRAIL_IN = prefersReducedMotion ? 0 : 0.55;   // 한 장이 커지며 나타나는 시간(초)
    var TRAIL_WAVE_STEP = 0.15;   // 대각선 한 줄이 나온 뒤 다음 줄까지(초)
    var TRAIL_WAVE_SPREAD = 0.03; // 같은 줄 안에서 칸마다 조금씩 늦게(초) — 물결이 부드럽게
    var TRAIL_LEAD = 0.3;         // 섹션에 들어온 뒤 첫 장까지(초) — 붙는 움직임이 끝나길 기다립니다

    // 이미지 한 장의 크기와 간격. 위 상수는 1025px 이상(1920 캔버스) 값이고,
    // 태블릿·모바일은 CSS(.gallery_trail_item)와 같은 값을 따로 씁니다.
    function trailDims() {
      if (mobileMq.matches) return { w: 120, h: 66, gap: 10 };
      if (tabletMq.matches) return { w: 230, h: 126, gap: 16 };
      return { w: TRAIL_ITEM_W, h: TRAIL_ITEM_H, gap: TRAIL_GAP };
    }

    var trailCampaign = null;   // 지금 고른 캠페인
    var trailItems = [];        // 칸마다 하나씩 만든 이미지 요소 (읽는 순서 그대로)
    var trailCells = [];        // 칸 정보 { el, r, c, key } — key는 대각선 번호(r + c)
    var trailNames = null;      // 칸마다 정해 둔 이미지 이름 [행][열] — 창 크기가 바뀌어도 유지
    var trailTimeline = null;   // 등장 연출
    var trailPlaying = false;   // 등장 연출이 도는 중인지
    var trailCleared = false;   // 칸이 전부 찼는지
    var galleryReady = false;
    var galleryInView = false;  // 이미지 영역이 화면에 걸쳐 있는 동안 true — 들어올 때 한 번만 시작
    var galleryObserved = false; // 화면 관찰이 켜져 있는지 — 켜져 있으면 "새로 들어옴"은 그쪽이 챙깁니다
    var galleryRange = gallerySection.querySelector('.gallery_range') || gallerySection;

    // 이미지 영역을 "이미지 한 장 + 간격" 크기의 칸으로 나눕니다. 이미지 영역은
    // 글자가 놓인 범위(.gallery_range) 높이의 TRAIL_FILL(85%) 안에 딱 들어가는
    // 줄 수만큼만 쓰고, 그 아래 남는 자리는 이미지 없이 비워 둡니다(패딩).
    // 줄은 위에서부터 쌓고, 가로 칸은 가운데로 모읍니다. 이미지 영역의 위·아래
    // 바깥 여백(marginY)은 간격의 80%입니다.
    function trailGrid() {
      var w = galleryTrail.offsetWidth;
      var rangeH = galleryRange.offsetHeight;
      var d = trailDims();
      var stepX = d.w + d.gap;
      var stepY = d.h + d.gap;
      var marginY = Math.round(d.gap * 0.8);
      var cols = Math.max(1, Math.floor((w + d.gap) / stepX));
      // 모바일은 이미지가 제목 블록 가운데에서 32px 아래(제목 마지막 줄 부근)까지만
      // 나타납니다. 그 선에 가장 가까운 줄 경계에서 끝나도록 줄 수를 반올림합니다.
      var rows = mobileMq.matches
        ? Math.max(1, Math.round((rangeH * 0.5 + 32 - 2 * marginY + d.gap) / stepY))
        : Math.max(1, Math.floor((rangeH * TRAIL_FILL - 2 * marginY + d.gap) / stepY));
      return {
        cols: cols,
        rows: rows,
        stepX: stepX,
        stepY: stepY,
        originX: (w - (cols * stepX - d.gap)) / 2,
        originY: marginY,
        height: rows * stepY - d.gap + 2 * marginY
      };
    }

    // 이미지 영역의 위·아래 가장자리가 배경으로 서서히 사라지게 하는 마스크.
    // 줄 위치를 기준으로 계산해서 화면 크기가 달라도 같은 모양이 됩니다.
    //   · 위: 첫째 줄의 37% 지점에서 시작해 둘째 줄 시작에서 완전히 보입니다.
    //         (첫째 줄은 거의 안 보이고, 둘째 줄부터 또렷합니다)
    //   · 아래: 마지막에서 두 번째 줄 끝에서 시작해 마지막 줄의 51% 지점에서
    //           완전히 사라집니다. (마지막 줄은 반쯤 흐리고 그 아래는 비어 있습니다)
    // 선형이 아니라 제곱 곡선이라, 사라지는 끝이 더 부드럽게 번집니다.
    function trailMask(g, d) {
      var a = g.originY + 0.37 * d.h;                 // 위: 보이기 시작
      var b = g.originY + g.stepY;                    // 위: 완전히 보임 (둘째 줄 시작)
      var c = g.originY + (g.rows - 1) * g.stepY - d.gap;   // 아래: 흐려지기 시작
      var e = g.originY + (g.rows - 1) * g.stepY + 0.51 * d.h;   // 아래: 완전히 사라짐
      if (g.rows < 2) { b = a + d.h; c = b; e = c + d.h; }
      function px(v) { return Math.round(v * 10) / 10 + 'px'; }
      function stop(alpha, y) { return 'rgba(0,0,0,' + alpha + ') ' + px(y); }

      var stops = [
        stop(0, 0), stop(0, a),
        stop(0.0625, a + (b - a) * 0.25), stop(0.25, a + (b - a) * 0.5),
        stop(0.5625, a + (b - a) * 0.75), stop(1, b),
        stop(1, c),
        stop(0.5625, c + (e - c) * 0.25), stop(0.25, c + (e - c) * 0.5),
        stop(0.0625, c + (e - c) * 0.75), stop(0, e)
      ];
      return 'linear-gradient(to bottom, ' + stops.join(', ') + ')';
    }

    // 칸마다 어떤 이미지를 넣을지 정합니다. 같은 이미지를 반복해 쓰되
    //   · 왼쪽·위·왼쪽 위·오른쪽 위 칸과 같은 이미지는 피하고
    //   · 그 안에서는 지금까지 가장 적게 쓴 이미지를 우선해 고르게 퍼지게 하고
    //   · 같은 조건의 후보 중에서는 무작위로 고릅니다.
    // keep이 있으면(창 크기만 바뀐 경우) 이미 정해 둔 칸은 그 이미지를 그대로 쓰고,
    // 새로 생긴 칸만 채웁니다 — 보고 있던 배치가 갑자기 뒤섞이지 않게 하기 위해서입니다.
    function pickTrailImages(cols, rows, names, keep) {
      var uniq = names.filter(function (n, i) { return names.indexOf(n) === i; });
      var used = {};
      uniq.forEach(function (n) { used[n] = 0; });
      var grid = [];

      for (var r = 0; r < rows; r++) {
        grid.push([]);
        for (var c = 0; c < cols; c++) {
          if (keep && keep[r] && keep[r][c] && used[keep[r][c]] !== undefined) {
            used[keep[r][c]]++;
            grid[r].push(keep[r][c]);
            continue;
          }
          var near = [
            grid[r][c - 1],
            r > 0 ? grid[r - 1][c] : undefined,
            r > 0 ? grid[r - 1][c - 1] : undefined,
            r > 0 ? grid[r - 1][c + 1] : undefined
          ];
          var cands = uniq.filter(function (n) { return near.indexOf(n) === -1; });
          if (!cands.length) cands = uniq;
          var fewest = Math.min.apply(null, cands.map(function (n) { return used[n]; }));
          var pool = cands.filter(function (n) { return used[n] === fewest; });
          var pick = pool[Math.floor(Math.random() * pool.length)];
          used[pick]++;
          grid[r].push(pick);
        }
      }
      return grid;
    }

    // 칸 수만큼 이미지 요소를 만들어 제자리에 놓고 숨겨 둡니다. 칸의 개수는 화면
    // 크기에 따라 달라지므로 처음 상태로 돌릴 때마다 다시 만듭니다.
    function layoutTrail(keepNames) {
      galleryTrail.innerHTML = '';
      trailItems = [];
      trailCells = [];
      if (!trailCampaign) return;

      var g = trailGrid();
      var d = trailDims();
      var names = pickTrailImages(g.cols, g.rows, trailCampaign.images, keepNames ? trailNames : null);
      trailNames = names;

      // 이미지 영역은 줄 수에 맞춘 높이만 차지합니다 — 그 아래는 패딩입니다.
      // 위·아래 흐림 마스크도 이 높이에 맞춰 줄 위치 기준으로 다시 만듭니다.
      var mask = trailMask(g, d);
      galleryTrail.style.height = g.height + 'px';
      galleryTrail.style.webkitMaskImage = mask;
      galleryTrail.style.maskImage = mask;

      for (var r = 0; r < g.rows; r++) {
        for (var c = 0; c < g.cols; c++) {
          var item = document.createElement('div');
          item.className = 'gallery_trail_item';
          var img = document.createElement('img');
          img.src = GALLERY_IMG + names[r][c] + '.png';
          img.alt = '';
          img.draggable = false;
          item.appendChild(img);
          galleryTrail.appendChild(item);
          trailItems.push(item);
          trailCells.push({ el: item, r: r, c: c, key: r + c });
        }
      }

      // 나중에 뜨는 것이 위에 오도록 읽는 순서대로 z-index를 올립니다.
      gsap.set(trailItems, { opacity: 0, scale: 0.5, zIndex: 1 });
      trailCells.forEach(function (cell) {
        gsap.set(cell.el, { x: g.originX + cell.c * g.stepX, y: g.originY + cell.r * g.stepY });
      });
    }

    // 선택한 캠페인으로 갈아 끼웁니다. 이미지 파일은 미리 받아 둡니다 — 나타나는
    // 순간에 처음 내려받으면 한 장씩 늦게 뜹니다.
    function buildTrail(campaign) {
      trailCampaign = campaign;
      campaign.images.forEach(function (name) {
        var pre = new Image();
        pre.src = GALLERY_IMG + name + '.png';
      });

      gsap.set(galleryTrail, { opacity: 1 });
      resetTrail();

      // 애니메이션을 꺼 둔 사용자에게는 연출 없이 처음부터 다 보여줍니다.
      // 캠페인 버튼으로 세트를 바꿀 때는 같은 방식으로 다시 쌓입니다. (첫 렌더는
      // 섹션에 들어올 때 시작합니다)
      if (prefersReducedMotion) showTrailInstant();
      else if (galleryReady) startTrailAuto();
    }

    // 전부 숨기고 처음 상태로. 캠페인을 바꿀 때와 섹션에 다시 들어올 때 부릅니다.
    function resetTrail() {
      stopTrailAuto();
      layoutTrail();
      trailCleared = false;
      gallerySection.classList.remove('is_gallery_cleared');
    }

    function stopTrailAuto() {
      if (trailTimeline) {
        trailTimeline.kill();
        trailTimeline = null;
      }
      trailPlaying = false;
    }

    // 연출 없이 칸 전부를 보여준 상태로 만듭니다. (움직임을 줄인 설정, 창 크기 변경)
    function showTrailInstant() {
      gsap.set(trailItems, { opacity: TRAIL_OPACITY, scale: 1 });
      trailCleared = true;
      gallerySection.classList.add('is_gallery_cleared');
    }

    // 대각선 물결 — 왼쪽 위 칸(key 0)부터 오른쪽 아래 칸까지, 줄(key)마다
    // TRAIL_WAVE_STEP씩 늦게 시작합니다. 같은 줄 안에서는 왼쪽 칸이 조금 먼저입니다.
    // 마지막 칸까지 다 나타나면 clearTrail이 섹션 고정을 풀어 줍니다.
    function startTrailAuto() {
      if (prefersReducedMotion || trailCleared || !trailCells.length) return;
      stopTrailAuto();
      trailPlaying = true;

      trailTimeline = gsap.timeline({
        delay: TRAIL_LEAD,
        onComplete: function () {
          trailTimeline = null;
          trailPlaying = false;
          clearTrail();
        }
      });
      trailCells.forEach(function (cell) {
        trailTimeline.to(cell.el, {
          scale: 1,
          opacity: TRAIL_OPACITY,
          duration: TRAIL_IN,
          ease: 'power2.out'
        }, cell.key * TRAIL_WAVE_STEP + cell.c * TRAIL_WAVE_SPREAD);
      });
    }

    // 처음부터 다시 보여줍니다. 이미 도는 중이면 그대로 둡니다.
    function playGallery() {
      if (trailPlaying) return;
      resetTrail();
      startTrailAuto();
    }

    // 스냅이 섹션에 붙었을 때. 화면 관찰이 켜져 있으면 "새로 들어옴"은 그쪽이 챙기므로,
    // 이미 다 펼쳐진 상태는 건드리지 않습니다 — 보고 있는 도중에 스냅이 붙었다고
    // 다시 시작하면 새로고침처럼 보입니다.
    function enterGallery() {
      if (trailCleared && galleryObserved) return;
      playGallery();
    }

    // 남은 연출을 건너뛰고 지금 바로 다 보여줍니다. (한 화면만큼 밀어서 넘기려 할 때)
    function revealAllTrail() {
      if (trailCleared) return;
      stopTrailAuto();
      gsap.killTweensOf(trailItems);
      gsap.to(trailItems, {
        scale: 1,
        opacity: TRAIL_OPACITY,
        duration: prefersReducedMotion ? 0 : 0.35,
        ease: 'power2.out'
      });
      clearTrail();
    }

    // 칸을 다 채운 순간 — 섹션 고정을 풀어 달라고 알립니다.
    function clearTrail() {
      if (trailCleared) return;
      trailCleared = true;
      gallerySection.classList.add('is_gallery_cleared');
      var api = window.sulwhasooGallery;
      if (api && typeof api.onCleared === 'function') api.onCleared();
    }

    // 이전 제목을 복제해 같은 자리에 겹쳐 두고, 잔상은 사라지고 새 제목은
    // 나타나게 해서 두 글자가 겹치며 넘어가도록 합니다.
    function setGalleryTitle(text, animate) {
      if (galleryTitle.textContent === text) return;

      if (!animate) {
        galleryTitle.textContent = text;
        return;
      }

      // 연달아 눌렀을 때 잔상이 쌓이지 않도록 남아 있던 것은 먼저 정리합니다.
      var stale = galleryTitle.parentNode.querySelectorAll('.gallery_title_ghost');
      Array.prototype.forEach.call(stale, function (el) {
        gsap.killTweensOf(el);
        el.remove();
      });

      var ghost = galleryTitle.cloneNode(true);
      ghost.classList.add('gallery_title_ghost');
      ghost.setAttribute('aria-hidden', 'true');
      // 진짜 제목 뒤에 넣습니다 — 앞에 넣으면 .gallery_title로 찾을 때
      // 잔상이 먼저 잡힙니다. absolute라 어차피 위에 그려집니다.
      galleryTitle.parentNode.insertBefore(ghost, galleryTitle.nextSibling);

      galleryTitle.textContent = text;

      gsap.killTweensOf(galleryTitle);
      gsap.fromTo(galleryTitle, { opacity: 0 }, { opacity: 1, duration: TITLE_FADE, ease: 'power2.out' });
      gsap.to(ghost, {
        opacity: 0,
        duration: TITLE_FADE,
        ease: 'power2.out',
        onComplete: function () { ghost.remove(); }
      });
    }

    function selectCampaign(index) {
      var campaign = GALLERY_CAMPAIGNS[index];
      if (!campaign) return;

      setGalleryTitle(campaign.title, galleryReady);

      Array.prototype.forEach.call(campaignButtons, function (btn, i) {
        var on = i === index;
        btn.classList.toggle('is_active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      buildTrail(campaign);
    }

    Array.prototype.forEach.call(campaignButtons, function (btn) {
      btn.addEventListener('click', function () {
        selectCampaign(Number(btn.getAttribute('data-campaign')));
      });
    });

    // 섹션 고정을 푸는 쪽(스냅 코드)에서 진행 상태를 보고 다룹니다.
    window.sulwhasooGallery = {
      enter: enterGallery,
      reset: resetTrail,
      revealAll: revealAllTrail,
      isCleared: function () { return trailCleared; },
      onCleared: null
    };

    // 이미지 영역(.gallery_trail)이 화면의 60% 이상 들어오면 시작합니다. 그 아래의
    // 빈 자리와 섹션 위아래 여백(padding)은 관찰 대상이 아니라서 진입 범위에 들지
    // 않습니다. 스냅이 붙기를
    // 기다리지 않는 것은 빨리 스크롤해서 와도(또는 스냅이 못 붙어도) 이미지가
    // 나타나게 하기 위해서이고, 이미 도는 중이면 playGallery가 그대로 둬서 스냅이
    // 뒤이어 붙어도 끊기지 않습니다.
    // 영역이 화면에서 완전히 벗어나야 다시 "새로 들어오는 것"으로 칩니다 — 펼쳐진
    // 채로 머무르는 동안에는 위아래로 조금 움직여도 처음부터 다시 시작하지 않습니다.
    if ('IntersectionObserver' in window && !prefersReducedMotion) {
      galleryObserved = true;
      var galleryIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            galleryInView = false;
          } else if (entry.intersectionRatio >= 0.6 && !galleryInView) {
            galleryInView = true;
            playGallery();
          }
        });
      }, { threshold: [0, 0.6] });
      galleryIo.observe(galleryTrail);
    }

    // 창 크기(또는 기기 방향)가 바뀌면 칸의 개수와 크기가 달라집니다. 연출이 도는
    // 동안은 건드리지 않고, 멈춰 있을 때만 칸의 자리를 다시 잡습니다. 이미 정해 둔
    // 칸의 이미지는 그대로 두고(섞지 않음), 다 보여준 상태였다면 새 칸도 연출 없이
    // 다 보여줍니다 — 모바일 주소창이 오르내리는 정도로는 화면이 새로고침되지 않습니다.
    var trailResizeTimer = 0;
    window.addEventListener('resize', function () {
      window.clearTimeout(trailResizeTimer);
      trailResizeTimer = window.setTimeout(function () {
        if (trailPlaying || !trailCampaign) return;
        var wasCleared = trailCleared;
        layoutTrail(true);
        if (wasCleared) showTrailInstant();
      }, 150);
    });

    selectCampaign(0);
    galleryReady = true;   // 첫 렌더는 디졸브 없이, 이후 클릭부터 적용
  }

  // ---- SALON 슬라이더 ----
  // 프로젝트 6개를 드래그로 넘깁니다. 사진은 프레임보다 늦게 따라오고(parallax),
  // 활성 카드가 아닌 카드는 흐려집니다. 숫자는 슬라이더 밖 number_box 하나가
  // 받아서 슬라이드가 바뀔 때마다 갈아끼웁니다.
  var salonEl = document.querySelector('.salon_swiper');

  function initSalonSwiper() {
    var salonCurrent = document.querySelector('.salon_count_current');
    var salonTotal = document.querySelector('.salon_count_total');

    // 이 페이지는 1920 캔버스를 scale()로 줄여서 보여줍니다. 그래서 화면에서 잰
    // 드래그 거리(px)와 Swiper가 쓰는 레이아웃 px이 축소 배율만큼 어긋납니다.
    // touchRatio로 그만큼 되돌려야 잡은 지점이 손가락을 그대로 따라옵니다.
    function salonTouchRatio() {
      return 1 / stageScale();
    }

    var salonSwiper = new Swiper(salonEl, {
      slidesPerView: 1,
      spaceBetween: 0,
      speed: 600,
      grabCursor: true,
      parallax: true,
      resistanceRatio: 0.85,
      followFinger: true,
      keyboard: { enabled: true },
      a11y: { enabled: true },
      on: {
        init: function () {
          if (salonTotal) salonTotal.textContent = String(this.slides.length);
          if (salonCurrent) salonCurrent.textContent = String(this.realIndex + 1);
        },
        // 전환이 끝난 뒤가 아니라 넘어가기 시작하는 시점에 바로 바꿉니다.
        slideChange: function () {
          if (salonCurrent) salonCurrent.textContent = String(this.realIndex + 1);
        },
      },
    });

    // 배율은 초기화 때 한 번 재두면 창 크기가 바뀔 때 어긋납니다. 잡는 순간에
    // 재면 항상 맞습니다. Swiper가 이동거리를 계산하기 전에 값이 들어가야
    // 하므로 capture 단계에서 받습니다.
    salonEl.addEventListener('pointerdown', function () {
      salonSwiper.params.touchRatio = salonTouchRatio();
    }, true);
  }

  if (salonEl) {
    // Swiper는 CDN에서 받아옵니다. 환경에 따라 DOMContentLoaded는 물론 load보다도
    // 늦게 도착하는 경우가 있어서, 잠깐 기다렸다가 붙입니다. 끝내 못 받으면
    // Swiper 없이 가로 스크롤로 넘어갑니다(css의 :not(.swiper-initialized) 규칙)
    // — 카드 6장은 어떤 경우에도 다 볼 수 있어야 합니다.
    if (window.Swiper) {
      initSalonSwiper();
    } else {
      var salonWaited = 0;
      var salonWait = setInterval(function () {
        if (window.Swiper) {
          clearInterval(salonWait);
          initSalonSwiper();
        } else if ((salonWaited += 100) >= 5000) {
          clearInterval(salonWait);
        }
      }, 100);
    }

    // 뷰포트에 들어오면 scale(1.05)/opacity 0.75가 풀립니다.
    if ('IntersectionObserver' in window && !prefersReducedMotion) {
      var salonIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          salonEl.classList.toggle('is_in_view', entry.isIntersecting);
        });
      }, { threshold: 0.25 });
      salonIo.observe(salonEl);
    } else {
      salonEl.classList.add('is_in_view');
    }
  }

  // ---- 섹션 중앙 스냅 + 고정 ----
  // 스크롤이 멈추면 지금 화면 정중앙에 가장 가까운 섹션을 골라, 그 섹션의
  // "패딩을 뺀 높이(content box)"의 중간이 화면 정중앙에 오도록 붙이고 그대로
  // 스크롤을 잠급니다. 잠금은 휠·터치로 한 화면(캔버스 기준 1080px)만큼 더
  // 밀어야 풀리고, 풀리는 순간 그 방향의 다음 섹션 중앙으로 넘어갑니다.
  // 헤더·푸터·hero는 대상이 아닙니다.
  //
  // BUKCHON HISTORY(.history)도 대상이 아닙니다 — 카드가 sticky로 한 장씩
  // 붙었다 넘어가는 동안 이미 화면이 붙잡혀 있어서, 섹션 고정까지 걸면 같은
  // 자리에서 두 번 잡힙니다. 이 섹션은 평소대로 스크롤되고, 아래로는 GALLERY
  // 중앙에 닿는 순간부터 스냅이 시작됩니다. GALLERY에서 위로 풀면 다시
  // 자유 스크롤이 되어 카드를 거슬러 올라갈 수 있습니다.
  //
  // MAP(.location)도 대상입니다. 내려오다 중앙에 닿으면 한 번 붙잡아 주소·시간·
  // 연락처를 읽게 하고, 그 뒤 휠 한 칸(100px)이면 놓아줍니다. 놓아준 뒤로는
  // 푸터까지 평소 스크롤입니다 — 마지막 섹션에서까지 화면을 끌고 다니면
  // "그만 보고 내려가라"고 떠미는 느낌이 납니다.
  //   · 붙은 직후 MAP_SETTLE_MS 동안은 세지 않습니다. 트랙패드 관성만으로
  //     한 칸이 넘어가서, 붙자마자 풀려버립니다(SALON과 같은 이유).
  //   · 붙잡는 동안 지도 iframe은 클릭·휠을 받지 않습니다. iframe 위에서 굴린
  //     휠은 구글 지도가 삼켜서 이 창까지 오지 않고, 그러면 커서가 지도 위에
  //     있는 동안 잠금을 풀 길이 없습니다. 지도를 만지고 싶으면 한 번 클릭하면
  //     그때부터 평소 지도로 돌아옵니다.
  //
  // SALON(.salon)도 대상이지만 붙잡는 힘이 약합니다. 카드를 넘겨 보는 사람에게만
  // 필요한 고정이라, 슬라이더를 만지지 않고 그냥 스크롤하면 휠 한 칸(110px)에
  // 풀려서 바로 다음 섹션으로 내려갑니다. 반대로 카드를 끌고 있는 동안(그리고 막 넘긴 직후)
  // 에는 아무리 굴려도 세지 않으므로, 여섯 장을 다 보는 동안 화면이 붙어 있습니다.
  //
  // 좌표 주의: .page에 transform: scale()이 걸려 있어서 getComputedStyle이
  // 돌려주는 padding(1920 캔버스 기준 px)과 화면에서 실제로 차지하는 px이
  // 다릅니다. rect.height / offsetHeight로 배율을 구해 padding에 곱합니다.
  // 맨 위로 버튼이 섹션 고정을 먼저 풀 수 있도록, 스냅 블록 안에서 채웁니다.
  var releaseSnapForTop = null;

  var SNAP_LAST = '.location';   // MAP — 푸터 바로 앞의 마지막 정거장
  var SNAP_SKIP = '.history';    // 카드가 스스로 붙잡는 섹션 (위 설명 참고)
  var SNAP_SALON = '.salon';     // 슬라이더를 만질 때만 붙잡는 섹션 (위 설명 참고)
  var snapSections = Array.prototype.slice.call(
    document.querySelectorAll('.page > section')
  ).filter(function (el) { return !el.matches(SNAP_SKIP); });

  if (snapSections.length && !prefersReducedMotion) {
    var SNAP_IDLE_MS = 140;     // 스크롤이 이만큼 조용해지면 "멈췄다"고 봅니다
    var SNAP_MS = 700;          // 중앙으로 붙는 시간
    var SNAP_DEAD_ZONE = 4;     // 이 정도 어긋남은 그냥 둡니다 (되튐 방지)
    var RELEASE_PX = 1080;      // 잠금이 풀리는 스크롤 양 — 캔버스 기준 한 화면
    var MAP_RELEASE_PX = 100;   // MAP도 짧게 — 휠 한 칸이면 놓아줍니다
    var MAP_SETTLE_MS = 320;    // 막 붙은 직후 남은 관성으로 곧장 풀리지 않게
    var SALON_RELEASE_PX = 110; // SALON은 더 짧게 — 휠 한 칸이면 놓아줍니다
    var SALON_SETTLE_MS = 260;  // 막 붙은 직후 남은 관성으로 곧장 풀리지 않게
    var SALON_HOLD_MS = 600;    // 카드를 넘긴 직후 이 시간 동안은 세지 않습니다

    var snapState = 'free';     // free(평소) · moving(붙는 중) · locked(고정)
    var lockedOn = null;        // 지금 고정돼 있는 섹션
    var pushAcc = 0;            // 고정된 뒤 모은 스크롤 양 (부호가 방향)
    var snapIdleTimer = null;
    var userScrolled = false;   // 사용자가 직접 굴린 뒤에만 붙습니다
    var mutedOn = null;         // 방금 잠금을 푼 섹션 — 그 자리에서 다시 잠기지 않게
    var lastLocked = null;      // 직전에 고정했던 섹션 — 새로 붙었는지 가릅니다
    var lockedAt = 0;           // 고정된 시각 — SALON의 관성 무시에 씁니다
    var salonDragging = false;  // 지금 SALON 카드를 끌고 있는지
    var salonTouchedAt = 0;     // 마지막으로 카드를 놓은(넘긴) 시각

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function introDone() { return !hero || hero.classList.contains('is_done'); }
    function isMapSection(el) { return !!el && el.matches(SNAP_LAST); }
    function isSalonSection(el) { return !!el && el.matches(SNAP_SALON); }
    function now() { return Date.now(); }

    // SALON 카드를 지금 보고 있는 중인가 — 끌고 있거나, 방금 놓았거나.
    // 이 동안에는 모아둔 스크롤을 계속 0으로 되돌려 고정을 유지합니다.
    function salonBusy() {
      return salonDragging || (now() - salonTouchedAt) < SALON_HOLD_MS;
    }

    function releasePx() {
      var px = isMapSection(lockedOn) ? MAP_RELEASE_PX
             : isSalonSection(lockedOn) ? SALON_RELEASE_PX
             : RELEASE_PX;
      // 1080은 1920 캔버스의 한 화면 높이입니다. scale이 없는 1024px 이하에서는
      // 실제 화면 높이가 한 화면입니다.
      var screens = tabletMq.matches ? window.innerHeight / 1080 : stageScale();
      return px * screens;
    }

    // 막 붙은 직후 스크롤을 세지 않는 시간. 잠금이 짧게 풀리는 섹션(MAP·SALON)만
    // 필요합니다 — 한 화면을 모아야 하는 섹션은 관성만으로 넘어가지 않습니다.
    function settleMs(el) {
      return isMapSection(el) ? MAP_SETTLE_MS
           : isSalonSection(el) ? SALON_SETTLE_MS
           : 0;
    }

    // MAP에 붙어 있는 동안 지도 iframe이 휠·클릭을 삼키지 않게 합니다.
    // (CSS: .location.is_map_locked .location_map iframe { pointer-events: none })
    var mapSection = document.querySelector(SNAP_LAST);
    function setMapLocked(on) {
      if (mapSection) mapSection.classList.toggle('is_map_locked', !!on);
    }
    // 지도를 만지려고 누른 사람에게는 그 자리에서 지도를 돌려줍니다.
    // 잠금 자체는 그대로라, 커서를 지도 밖으로 옮기면 다시 굴려서 빠져나갑니다.
    if (mapSection) {
      mapSection.addEventListener('pointerdown', function (e) {
        if (e.target.closest('.location_map')) setMapLocked(false);
      });
    }
    function scrollNow() { return window.scrollY || window.pageYOffset || 0; }

    // 섹션의 "패딩을 뺀 높이"와 그 중간이 화면 좌표계에서 어디인지.
    function contentBoxOf(el) {
      var rect = el.getBoundingClientRect();
      var k = el.offsetHeight ? rect.height / el.offsetHeight : 1;   // .page의 scale
      var cs = getComputedStyle(el);
      var top = rect.top + parseFloat(cs.paddingTop) * k;
      var bottom = rect.bottom - parseFloat(cs.paddingBottom) * k;
      return { center: (top + bottom) / 2, height: bottom - top };
    }

    // 화면 정중앙이 첫 섹션의 중앙보다 위(hero 쪽)이거나 마지막 섹션의 중앙보다
    // 아래(푸터 쪽)면 아무것도 고르지 않습니다 — 그 바깥은 평소대로 스크롤되어야
    // 푸터를 볼 수 있습니다.
    function pickSection() {
      var viewCenter = window.innerHeight / 2;
      var first = contentBoxOf(snapSections[0]).center;
      var last = contentBoxOf(snapSections[snapSections.length - 1]).center;
      if (viewCenter < first - 1 || viewCenter > last + 1) return null;

      var best = null;
      var bestDist = Infinity;
      for (var i = 0; i < snapSections.length; i++) {
        var dist = Math.abs(contentBoxOf(snapSections[i]).center - viewCenter);
        if (dist < bestDist) { bestDist = dist; best = snapSections[i]; }
      }
      return best;
    }

    // 섹션 중앙으로 옮기고, 도착하면 그 자리에 고정합니다.
    function moveTo(el, immediate) {
      var delta = contentBoxOf(el).center - window.innerHeight / 2;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var y = Math.max(0, Math.min(max, scrollNow() + delta));

      lockedOn = el;
      pushAcc = 0;
      // 붙는 동안에도 지도는 휠을 삼키면 안 됩니다 — 이동 중에 커서가 지도
      // 위에 있으면 도착하자마자 굴려도 이 창까지 오지 않습니다.
      setMapLocked(isMapSection(el));

      if (immediate || Math.abs(y - scrollNow()) < SNAP_DEAD_ZONE) {
        setScroll(y);
        lockSection();
        return;
      }

      snapState = 'moving';
      // 이 이동은 사용자가 굴린 스크롤이 아닙니다. BUKCHON ROOM GUIDE의 룸
      // 캐러셀은 페이지 스크롤 거리로 카드를 넘기므로(js/guide_gl.js), 이
      // 표시를 보고 스냅으로 움직인 거리는 세지 않습니다.
      window.sulwhasooSnapMoving = true;

      var settled = false;
      function done() {
        if (settled) return;
        settled = true;
        lockSection();
      }

      var lenis = window.sulwhasooLenis;
      if (lenis && typeof lenis.scrollTo === 'function') {
        // force — 앞선 고정 때 Lenis를 stop()해 둔 상태에서도 움직여야 합니다.
        // lock — 붙는 700ms 동안은 사용자 입력이 끼어들지 않게 합니다.
        lenis.scrollTo(y, {
          duration: SNAP_MS / 1000,
          easing: easeOutCubic,
          force: true,
          lock: true,
          onComplete: done,
        });
        window.setTimeout(done, SNAP_MS + 150);   // onComplete가 안 올 때의 보험
      } else {
        window.scrollTo({ top: y, behavior: 'smooth' });
        window.setTimeout(done, SNAP_MS + 150);
      }
    }

    function lockSection() {
      snapState = 'locked';
      pushAcc = 0;
      lockedAt = now();
      window.sulwhasooSnapMoving = false;
      toggleLenis('stop');

      // 다른 섹션에 있다가 새로 붙은 것이면 나선과 갤러리 이미지를 처음부터
      // 다시 보게 합니다. (창 크기를 바꿔서 같은 섹션에 다시 붙는 경우는 그대로)
      if (lockedOn !== lastLocked) {
        lastLocked = lockedOn;
        var gl = window.guideGL;
        if (gl && typeof gl.resetRoomProgress === 'function') gl.resetRoomProgress();
        var gal = window.sulwhasooGallery;
        if (gal && lockedOn && lockedOn.matches('.gallery')) {
          // 이미 도는 중이면 그대로 두고, 아니면 처음부터 다시 보여줍니다.
          if (typeof gal.enter === 'function') gal.enter();
          else gal.reset();
        }
      }
    }

    function unlockSection() {
      snapState = 'free';
      // 잠금을 푼 자리는 아직 그 섹션의 정중앙입니다. 그대로 두면 스크롤이
      // 멈추는 순간 같은 섹션이 다시 골라져서 영영 못 빠져나갑니다. 다른
      // 섹션으로 넘어가거나 범위 밖으로 나갈 때까지 이 섹션만 쉽니다.
      mutedOn = lockedOn;
      lockedOn = null;
      pushAcc = 0;
      userScrolled = true;
      window.sulwhasooSnapMoving = false;
      setMapLocked(false);   // 놓아준 뒤에는 지도를 평소대로 쓸 수 있게
      toggleLenis('start');
    }

    // 맨 위로 버튼 — 고정돼 있으면 먼저 풀고(Lenis도 다시 켬), 고정 잠금이 방금 풀린
    // 섹션을 기억하지 않게 비웁니다. 맨 위로 가는 동안 스냅이 다시 붙지 않도록 사용자
    // 스크롤 표시도 내립니다(맨 위는 어느 섹션의 중앙도 아니라서 어차피 붙지 않지만,
    // 지나가는 도중에 멈춘 것으로 오인되지 않게 하기 위해서입니다).
    releaseSnapForTop = function () {
      window.clearTimeout(snapIdleTimer);
      if (snapState !== 'free') unlockSection();
      mutedOn = null;
      userScrolled = false;
      lastLocked = null;
    };

    // 밀어낸 만큼이 한 화면을 넘으면 그 방향의 다음 섹션으로 넘어갑니다.
    // 그 방향에 더 이상 섹션이 없으면(첫 섹션 위) 잠금을 풉니다 — hero로
    // 평소처럼 올라갑니다.
    //
    // SALON·MAP만은 다음 섹션으로 데려가지 않고 붙잡고 있던 손을 놓기만 합니다.
    // 카드를 넘겨 볼 생각이 없는 사람에게는 "여기서 멈춰라"도, "이제 저기로
    // 가라"도 다 참견입니다. 잠금이 풀린 뒤로는 평소 스크롤이고, 아래 MAP은
    // 중앙에 닿는 순간 스냅이 평소대로 받습니다. MAP 아래는 푸터뿐이라
    // 놓아주면 그대로 자연스럽게 내려갑니다.
    function advance(dir) {
      // MAP은 아래로만 놓아줍니다. 위로는 평소대로 SALON 중앙으로 데려갑니다.
      if (isSalonSection(lockedOn) || (isMapSection(lockedOn) && dir > 0)) {
        unlockSection();
        return;
      }
      var next = snapSections[snapSections.indexOf(lockedOn) + dir];
      if (next) moveTo(next);
      else unlockSection();
    }

    // 휠 한 칸의 단위는 브라우저·설정에 따라 픽셀/줄/페이지로 다릅니다.
    // 모두 픽셀로 맞춰야 RELEASE_PX가 같은 의미를 갖습니다.
    function wheelPx(e) {
      if (e.deltaMode === 1) return e.deltaY * 16;                  // 줄 단위
      if (e.deltaMode === 2) return e.deltaY * window.innerHeight;  // 페이지 단위
      return e.deltaY;
    }

    // 고정된 뒤 모으는 양. 방향이 바뀌면 처음부터 다시 셉니다 — 위아래로
    // 흔들다가 얼떨결에 다음 섹션으로 넘어가지 않도록.
    //
    // 잠금이 짧게 풀리는 섹션(MAP·SALON)은 붙은 직후 잠깐(settleMs) 스크롤을
    // 세지 않습니다 — 휠 한 칸은 트랙패드 관성만으로도 넘겨서, 붙자마자
    // 풀려버립니다. SALON은 카드를 끌고 있거나 방금 넘긴 직후(salonBusy)도
    // 세지 않습니다 — 카드를 보는 동안에는 화면이 붙어 있어야 합니다.
    function addPush(d) {
      if (!d) return;
      if (now() - lockedAt < settleMs(lockedOn) ||
          (isSalonSection(lockedOn) && salonBusy())) {
        pushAcc = 0;
        return;
      }
      if (pushAcc !== 0 && (d > 0) !== (pushAcc > 0)) pushAcc = 0;
      pushAcc += d;
      if (Math.abs(pushAcc) >= releasePx()) advance(pushAcc > 0 ? 1 : -1);
    }

    // SALON 슬라이더를 가로로 끌고 있는 동안은 "카드를 보는 중"입니다. 끌기
    // 시작하면 모아둔 양을 되돌리고, 놓은 뒤로도 잠깐(SALON_HOLD_MS)은 세지
    // 않습니다 — 카드가 미끄러져 자리를 잡는 중에 화면이 빠져나가면 방금 넘긴
    // 카드를 볼 새가 없습니다.
    //
    // 가로가 세로보다 클 때만 끌기로 봅니다. 슬라이더가 화면을 거의 다 덮고
    // 있어서, 누르기만 해도 붙잡아 버리면 터치 기기에서 카드 위를 세로로
    // 쓸어내리는 손이 섹션을 빠져나갈 수 없게 됩니다. 손을 슬라이더 밖에서
    // 떼는 경우가 있어 놓는 것은 창에서 받습니다.
    if (salonEl) {
      var SALON_DRAG_PX = 6;      // 이만큼 끌어야 "끌었다"고 봅니다
      var salonHeld = false;      // 슬라이더 위에서 눌려 있는지
      var salonStartX = 0;
      var salonStartY = 0;

      salonEl.addEventListener('pointerdown', function (e) {
        salonHeld = true;
        salonDragging = false;
        salonStartX = e.clientX;
        salonStartY = e.clientY;
      }, true);

      salonEl.addEventListener('pointermove', function (e) {
        if (!salonHeld || salonDragging) return;
        var dx = Math.abs(e.clientX - salonStartX);
        var dy = Math.abs(e.clientY - salonStartY);
        if (dx < SALON_DRAG_PX || dx <= dy) return;
        salonDragging = true;
        salonTouchedAt = now();
        pushAcc = 0;
      }, true);

      ['pointerup', 'pointercancel'].forEach(function (type) {
        window.addEventListener(type, function () {
          salonHeld = false;
          if (!salonDragging) return;
          salonDragging = false;
          salonTouchedAt = now();
          pushAcc = 0;
        }, true);
      });
    }

    // BUKCHON ROOM GUIDE — 이 섹션에 고정돼 있는 동안 스크롤은 페이지가 아니라
    // 나선을 돌리는 데 씁니다(js/guide_gl.js의 pushScroll). 커서 위치는 보지
    // 않고 섹션 전체에서 받습니다. 카드를 전부 한 번씩 보고 나면 guide_gl이
    // onRoomCleared로 알려 주고, 그때 고정을 풀어 놓아줍니다 — 다음 한 칸은
    // 사용자가 굴립니다.
    //   · 아래로 — 아직 볼 카드가 남았으면 나선으로
    //   · 위로   — 되감을 카드가 남았으면 나선으로, 처음까지 되감았으면 페이지로
    //              (이전 섹션으로 올라갈 길을 막지 않습니다)
    function roomGL() {
      var gl = window.guideGL;
      if (!lockedOn || !lockedOn.matches('.guide')) return null;
      if (!gl || typeof gl.pushScroll !== 'function' || typeof gl.roomProgress !== 'function') return null;
      if (!gl.controls || !gl.controls.isRoomMode) return null;
      return gl;
    }

    function roomWants(d) {
      var gl = roomGL();
      if (!gl || !d) return null;
      if (d > 0 && gl.roomCleared) return null;
      if (d < 0 && gl.roomProgress() <= 0) return null;
      return gl;
    }

    function handedToRoom(d) {
      var gl = roomWants(d);
      if (!gl) return false;
      gl.pushScroll(d);
      pushAcc = 0;   // 나선을 돌리는 동안 모아둔 양은 되돌립니다
      return true;
    }

    // 키보드는 거리를 잴 것이 없으므로 딱 한 칸만 넘깁니다.
    function handedToRoomStep(dir) {
      var gl = roomWants(dir);
      if (!gl || typeof gl.stepRoom !== 'function') return false;
      gl.stepRoom(dir);
      pushAcc = 0;
      return true;
    }

    // 나선을 한 바퀴 다 돌았을 때 guide_gl이 부릅니다.
    // 다 본 카드를 두고 다음 섹션으로 끌고 내려가면 "다 봤으니 넘어가라"고
    // 떠미는 느낌이 납니다. 대신 붙잡고 있던 손을 놓기만 합니다 — 그 다음
    // 한 칸은 사용자가 굴리는 것이고, 페이지는 평소처럼 따라 내려갑니다.
    // (아래 섹션은 평소대로 중앙에 닿는 순간 스냅이 다시 받습니다)
    function onRoomCleared() {
      if (snapState !== 'locked' || !lockedOn || !lockedOn.matches('.guide')) return;
      unlockSection();
      // 다음에 이 섹션에 다시 붙을 때는 나선을 처음부터 보게 합니다. 놓아준
      // 뒤에도 lastLocked가 .guide로 남아 있으면 lockSection이 "같은 섹션에
      // 다시 붙었다"고 보고 되감지 않습니다.
      lastLocked = null;
    }

    // guide_gl.js는 모듈이라 이 스크립트보다 늦게 뜰 수 있습니다.
    (function waitForGuideGL(waited) {
      if (window.guideGL) { window.guideGL.onRoomCleared = onRoomCleared; return; }
      if (waited >= 5000) return;
      window.setTimeout(function () { waitForGuideGL(waited + 100); }, 100);
    })(0);

    // SULWHASOO GALLERY — 이 섹션에 고정되면 갤러리 코드가 이미지를 왼쪽 위에서
    // 오른쪽 아래로 대각선 물결처럼 한 장씩 띄웁니다. 칸이 전부 차면 갤러리
    // 코드가 onGalleryCleared로 알려 주고, 그때 고정을 풀어 다시 스크롤할 수 있게
    // 합니다(.guide와 같은 방식).
    //
    // 다 나오기 전의 "아래로" 휠·터치는 페이지를 움직이지 않고 흘려보냅니다.
    // 다만 기다리기 싫은 사람을 위해, 한 화면만큼 밀면 남은 장을 한꺼번에 띄우고
    // 놓아줍니다. 위로 올라가는 길은 막지 않습니다.
    var galleryPush = 0;

    function galleryHolds(d) {
      var g = window.sulwhasooGallery;
      if (d <= 0 || !lockedOn || !lockedOn.matches('.gallery')) return false;
      return !!(g && typeof g.isCleared === 'function' && !g.isCleared());
    }

    function handedToGallery(d) {
      if (!galleryHolds(d)) { galleryPush = 0; return false; }
      pushAcc = 0;   // 이미지를 보는 동안 모아둔 양은 되돌립니다
      galleryPush += d;
      if (galleryPush >= releasePx()) {
        galleryPush = 0;
        window.sulwhasooGallery.revealAll();   // 다 띄우면 아래 콜백이 풀어 줍니다
      }
      return true;
    }

    // 등록한 이미지를 다 띄웠을 때 갤러리 코드가 부릅니다.
    function onGalleryCleared() {
      galleryPush = 0;
      if (snapState !== 'locked' || !lockedOn || !lockedOn.matches('.gallery')) return;
      unlockSection();
      // 다음에 다시 붙을 때 처음부터 보게 합니다 — 놓아준 뒤에도 lastLocked가
      // .gallery로 남아 있으면 lockSection이 되돌리지 않습니다.
      lastLocked = null;
    }

    if (window.sulwhasooGallery) window.sulwhasooGallery.onCleared = onGalleryCleared;

    function onSnapWheel(e) {
      if (snapState === 'moving') { e.preventDefault(); return; }
      if (snapState !== 'locked') {
        if (introDone()) userScrolled = true;
        return;
      }
      e.preventDefault();
      var d = wheelPx(e);
      if (handedToRoom(d)) return;
      if (handedToGallery(d)) return;
      addPush(d);
    }

    var touchLastX = 0;
    var touchLastY = 0;

    function onSnapTouchStart(e) {
      touchLastX = e.touches[0].clientX;
      touchLastY = e.touches[0].clientY;
    }

    function onSnapTouchMove(e) {
      if (e.target.closest('.arc_nav')) return;
      if (snapState === 'moving') { e.preventDefault(); return; }
      if (snapState !== 'locked') {
        if (introDone()) userScrolled = true;
        return;
      }
      var x = e.touches[0].clientX;
      var y = e.touches[0].clientY;
      var dx = touchLastX - x;
      var dy = touchLastY - y;   // 손가락을 위로 = 아래로 스크롤 = 양수
      touchLastX = x;
      touchLastY = y;
      // 가로로 끄는 동작은 SALON 슬라이더 몫입니다. 세로가 더 클 때만 셉니다.
      if (Math.abs(dy) <= Math.abs(dx)) return;
      e.preventDefault();
      if (handedToRoom(dy)) return;     // 휠과 같은 규칙으로 나선을 돌립니다
      if (handedToGallery(dy)) return;  // 갤러리도 마찬가지 — 다 볼 때까지 붙잡습니다
      addPush(dy);
    }

    // 키보드는 한 번 누를 때마다 한 섹션씩 — 눌러서 1080px을 모으게 하면
    // 키보드로만 쓰는 사람에게는 빠져나갈 방법이 없는 것과 같습니다.
    var SNAP_KEYS_DOWN = [40, 34, 32, 35];   // ↓ · PageDown · Space · End
    var SNAP_KEYS_UP = [38, 33, 36];         // ↑ · PageUp · Home

    function onSnapKeyDown(e) {
      var dir = SNAP_KEYS_DOWN.indexOf(e.keyCode) > -1 ? 1
              : SNAP_KEYS_UP.indexOf(e.keyCode) > -1 ? -1 : 0;
      if (!dir) return;
      if (snapState !== 'locked') {
        if (introDone() && snapState === 'free') userScrolled = true;
        return;
      }
      e.preventDefault();
      // ↑↓는 나선을 한 칸씩 넘깁니다. PageUp/Down·Space·Home/End는 그대로
      // 섹션을 넘겨서, 나선을 다 돌지 않고도 빠져나갈 길을 남겨 둡니다.
      if ((e.keyCode === 40 || e.keyCode === 38) && handedToRoomStep(dir)) return;
      advance(dir);
    }

    function trySnap() {
      if (snapState !== 'free' || !userScrolled || !introDone()) return;
      var target = pickSection();
      if (target !== mutedOn) mutedOn = null;
      if (!target || mutedOn) return;
      userScrolled = false;
      moveTo(target);
    }

    function onSnapScroll() {
      if (snapState !== 'free' || !userScrolled) return;
      window.clearTimeout(snapIdleTimer);
      snapIdleTimer = window.setTimeout(trySnap, SNAP_IDLE_MS);
    }

    window.addEventListener('scroll', onSnapScroll, { passive: true });
    window.addEventListener('wheel', onSnapWheel, { passive: false });
    window.addEventListener('touchstart', onSnapTouchStart, { passive: true });
    window.addEventListener('touchmove', onSnapTouchMove, { passive: false });
    window.addEventListener('keydown', onSnapKeyDown, { passive: false });

    // 창 크기가 바뀌면 섹션 중앙도 바뀝니다. 고정 중이면 새 중앙으로 다시
    // 맞춥니다(애니메이션 없이 — 크기를 바꾸는 중에 화면이 흐르면 어지럽습니다).
    window.addEventListener('resize', function () {
      if (snapState === 'locked' && lockedOn) moveTo(lockedOn, true);
    });
  }

  // ---- 맨 위로 버튼 동작 ----
  // 고정된 섹션이 있으면 먼저 풀고, Lenis로 부드럽게 맨 위로 올라갑니다. 올라가는 동안
  // sulwhasooSnapMoving을 켜서 guide의 룸 캐러셀이 이 스크롤을 카드 넘김으로 세지
  // 않게 합니다. 맨 위에 닿으면 hero가 문서 맨 위에 그대로 남아 있어 다시 보입니다.
  if (toTopBtn) {
    if (!hero) toTopBtn.classList.add('is_ready');

    toTopBtn.addEventListener('click', function () {
      if (hero && !hero.classList.contains('is_done')) return;   // 인트로 중에는 무시
      if (typeof releaseSnapForTop === 'function') releaseSnapForTop();

      window.sulwhasooSnapMoving = true;
      function done() { window.sulwhasooSnapMoving = false; }

      var lenis = window.sulwhasooLenis;
      if (lenis && typeof lenis.scrollTo === 'function') {
        lenis.scrollTo(0, { duration: 1.2, force: true, onComplete: done });
        window.setTimeout(done, 1600);   // onComplete가 안 올 때의 보험
      } else {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        window.setTimeout(done, 1200);
      }
    });
  }

  // ---- Fade-in on scroll ----
  var revealTargets = document.querySelectorAll('.history_card, .guide_chang');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    function handleReveal(entries, observer) {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is_visible');
          observer.unobserve(entry.target);
        }
      });
    }
    var io = new IntersectionObserver(handleReveal, { threshold: 0.15 });
    revealTargets.forEach((el) => {
      el.classList.add('will_reveal');
      io.observe(el);
    });
  }
});
