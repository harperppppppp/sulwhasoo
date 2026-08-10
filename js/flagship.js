// Sulwhasoo · Flagship Store
// pages/flagship.html 전용 기능
document.addEventListener('DOMContentLoaded', () => {
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Responsive stage: scale the fixed 1920px canvas to fit narrower
  // viewports (360 / 768 / 1280) so no breakpoint ever gets a horizontal
  // scrollbar. At >=1920px this is scale(1), i.e. unchanged. ----
  var stage = document.querySelector('[data-scale-stage]');
  var page = stage ? stage.querySelector('.page') : null;

  function handleStageResize() {
    if (!stage || !page) return;
    var scale = Math.min(1, window.innerWidth / 1920);
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
  function stageScale() { return Math.min(1, window.innerWidth / 1920); }

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

  // ---- Hero 인트로 ----
  // 페이지에 들어오면 알약 모양 영상이 재생되고, 그 자리에서 화면이 고정된 채
  // 사용자가 휠을 내릴 때까지 기다립니다. 휠 두 번으로 넘어갑니다. 인트로
  // 자체를 되감지는 않지만, 다 끝난 hero는 문서 맨 위에 그대로 남아 있어서
  // 위로 올리면 언제든 다시 볼 수 있습니다. (아래 "인트로가 끝난 뒤" 참고)
  //
  //   1) 대기      — 알약 모양 영상이 재생을 시작. 여기서 첫 휠을 기다립니다
  //   2) 확대      — (휠 ↓ 1회) 알약이 화면 전체로 커지고 radius가 0이 됨
  //                  (배지와 카피는 확대가 시작되면 먼저 빠집니다)
  //   3) 정지      — 영상이 화면을 다 채운 채로 계속 재생. 두 번째 휠을 기다립니다
  //   4) 컬러 전환 — (휠 ↓ 2회째) #f5ecd7가 점점 물듭니다. 영상은 그 아래에서
  //                  계속 재생됩니다
  //   5) 하강      — 컬러 전환이 DROP_AT(85%)만큼 진행됐을 때 시작. hero
  //                  레이어가 페이지 스크롤과 같은 양만큼 위로 밀려 올라가고,
  //                  그 아래에서 history가 올라옵니다
  //
  // 확대·컬러 전환·하강의 길이와 이징은 예전 자동 재생판과 같습니다. 바뀐 것은
  // "언제 시작하느냐"뿐입니다.
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
    function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    // 인트로 단계. 'idle'과 'full'에서만 휠을 받고, 'grow'와 'outro'는
    // 애니메이션이 끝날 때까지 입력을 받지 않습니다.
    var PHASE_IDLE = 'idle';    // 알약 — 첫 휠 대기
    var PHASE_GROW = 'grow';    // 확대 중
    var PHASE_FULL = 'full';    // 화면을 다 채운 채 — 두 번째 휠 대기
    var PHASE_OUTRO = 'outro';  // 컬러 전환 + 하강

    var introPhase = PHASE_IDLE;
    var growMs = 0;         // 확대 구간의 경과 시간
    var outroMs = 0;        // 컬러 전환 이후의 경과 시간
    var dropTarget = 0;     // 하강으로 이동할 스크롤 거리 (= 화면 높이)

    // 두 구간의 경과 시간으로 인트로 전체를 그립니다. 마지막 프레임이면 true.
    // 대기 중인 구간의 시간은 멈춰 있으므로, 같은 값을 계속 넣으면 화면도
    // 그대로 멈춰 있습니다.
    function renderHero(growElapsed, outroElapsed) {
      var k = stageScale();  // .page와 동일한 배율
      var w = hero.clientWidth;
      var h = hero.clientHeight;
      var pillW = PILL_W * k;
      var pillH = PILL_H * k;
      var pillTop = (h - pillH) / 2;

      // 1단계 — 알약이 화면 전체로. radius는 확대보다 조금 빠르게(x1.15)
      // 떨어져서, 화면을 다 채우기 직전에 이미 각진 사각형이 됩니다.
      var grow = easeInOutCubic(clamp01(growElapsed / GROW_MS));
      var radius = lerp(PILL_R * k, 0, Math.min(1, grow * 1.15));
      heroVideoBox.style.left = lerp((w - pillW) / 2, 0, grow) + 'px';
      heroVideoBox.style.top = lerp(pillTop, 0, grow) + 'px';
      heroVideoBox.style.width = lerp(pillW, w, grow) + 'px';
      heroVideoBox.style.height = lerp(pillH, h, grow) + 'px';
      heroVideoBox.style.borderRadius = radius + 'px ' + radius + 'px 0 0';

      // 2단계 — 컬러 전환. 화면을 다 채운 뒤 휠을 한 번 더 내리면 시작합니다.
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
        heroBadge.style.top = (BADGE_TOP * k) + 'px';
        heroBadge.style.opacity = fade;
        heroBadge.style.transform = 'translateX(-50%) scale(' + k + ') translateY(' + rise + 'px)';
      }
      if (heroTxt) {
        heroTxt.style.top = (pillTop + pillH + TXT_GAP * k) + 'px';
        heroTxt.style.opacity = fade;
        heroTxt.style.transform = 'translateX(-50%) scale(' + k + ') translateY(' + rise + 'px)';
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
      historySection.style.paddingTop = (window.innerHeight / stageScale()) + 'px';
      handleStageResize();
    }

    function armDropSpacer() {
      keepDropSpacer();
      setScroll(0);
      dropTarget = window.innerHeight;
    }

    // ---- 스크롤 잠금 + 인트로 진행 입력 ----
    // 인트로가 끝날 때까지 화면은 고정입니다. 하강 구간에서 스크립트가 직접
    // 스크롤하므로, overflow: hidden 으로 문서를 통째로 잠그지 않고 사용자
    // 입력만 막습니다. (문서를 잠그면 스크립트 스크롤까지 같이 막히고, 잠금을
    // 풀 때 스크롤바가 나타나면서 폭이 틀어집니다)
    //
    // 막은 그 입력을 그대로 인트로를 넘기는 신호로 씁니다 — 아래로 내린 양이
    // INTRO_STEP_PX를 넘으면 다음 구간으로 갑니다. 마우스 휠은 한 칸이 보통
    // 100px 안팎이라 한 번만 굴려도 넘어가고, 트랙패드처럼 잘게 들어오는
    // 입력은 조금 모아야 넘어갑니다.
    var INTRO_STEP_PX = 40;
    var BLOCKED_KEYS = [32, 33, 34, 35, 36, 38, 40];
    var ADVANCE_KEYS = [32, 34, 35, 40];   // Space · PageDown · End · ↓
    var introPush = 0;
    var introTouchY = 0;

    // 다음 구간으로. 확대·컬러 전환이 도는 중에는 아무 일도 하지 않습니다.
    function advanceIntro() {
      if (introPhase === PHASE_IDLE) introPhase = PHASE_GROW;
      else if (introPhase === PHASE_FULL) introPhase = PHASE_OUTRO;
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
      if (introPhase !== PHASE_IDLE && introPhase !== PHASE_FULL) { introPush = 0; return; }
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
      var k = stageScale();
      var w = hero.clientWidth;
      var h = hero.clientHeight;
      var vh = window.innerHeight || 1;
      var s = clamp01((window.scrollY || window.pageYOffset || 0) / vh);

      // 알약 → 화면 전체. 인트로의 확대 구간과 같은 계산이고, 경과 시간 대신
      // 스크롤 위치가 진행률을 정합니다.
      var pillW = PILL_W * k;
      var pillH = PILL_H * k;
      var pillTop = (h - pillH) / 2;
      var grow = easeInOutCubic(clamp01(s / PARK_GROW_TO));
      var radius = lerp(PILL_R * k, 0, Math.min(1, grow * 1.15));
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
        heroBadge.style.top = (BADGE_TOP * k) + 'px';
        heroBadge.style.opacity = fade;
        heroBadge.style.transform = 'translateX(-50%) scale(' + k + ') translateY(' + rise + 'px)';
      }
      if (heroTxt) {
        heroTxt.style.top = (pillTop + PILL_H * k + TXT_GAP * k) + 'px';
        heroTxt.style.opacity = fade;
        heroTxt.style.transform = 'translateX(-50%) scale(' + k + ') translateY(' + rise + 'px)';
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
      // 루프는 인트로가 끝날 때까지 계속 돕니다. 휠을 기다리는 구간에서는
      // 두 시간 모두 그대로라 화면도 멈춰 있습니다.
      var last = window.performance.now();
      (function step(now) {
        var dt = Math.min(250, now - last);
        last = now;

        if (introPhase === PHASE_GROW) {
          growMs += dt;
          if (growMs >= GROW_MS) { growMs = GROW_MS; introPhase = PHASE_FULL; }
        } else if (introPhase === PHASE_OUTRO) {
          outroMs += dt;
        }

        if (renderHero(growMs, outroMs)) { finish(); return; }
        window.requestAnimationFrame(step);
      })(last);
    }

    // 하강이 시작되기 전이라면 화면 크기 변화에 맞춰 여백과 지금 프레임을 다시 잡습니다.
    // (하강 중에는 스크립트가 스크롤을 직접 몰고 있어서 건드리면 어긋나고,
    //  하강이 끝난 뒤에는 parkHero의 resize가 대신 맡습니다)
    window.addEventListener('resize', function () {
      if (heroParked || introPhase === PHASE_OUTRO) return;
      armDropSpacer();
      renderHero(growMs, outroMs);
    });

    lockScroll();
    armDropSpacer();
    renderHero(growMs, outroMs);

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


  // ---- Gallery: 캠페인 전환 + 마우스 트레일 ----
  // 커서가 섹션 위를 지날 때 이동 거리를 누적해, 150px마다 다음 이미지를
  // 커서 위치에 띄웁니다. 각 이미지는 scale .5 -> 1로 커지며 나타났다가
  // 다시 .5로 줄며 사라지고, 나중에 뜬 이미지가 항상 위에 오도록
  // z-index를 1씩 올립니다.
  // 오른쪽 캠페인 버튼을 누르면 제목이 디졸브되며 바뀌고 트레일 이미지 세트도
  // 교체됩니다. 이벤트는 섹션에 한 번만 걸어 두고 이미지 목록만 다시 만들기
  // 때문에, 전환 후에도 트레일은 끊기지 않고 그대로 동작합니다.
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
    var TITLE_FADE = 0.5;   // 제목 디졸브 시간(초)
    var TRAIL_SPEED = 60;   // 하단 이미지 띠가 흐르는 속도(px/초)
    var TRAIL_ITEM_W = 317; // 이미지 한 장 폭(px) — CSS와 같은 값
    var TRAIL_GAP = 20;     // 이미지 사이 간격(px) — CSS와 같은 값
    var trailTween = null;
    var galleryReady = false;

    // 선택된 캠페인의 이미지를 하단에 일렬로 깔고 왼쪽으로 무한히 흘려보냅니다.
    // 같은 세트를 두 벌 이어 붙인 뒤 한 벌 폭만큼만 옮기고 반복하면, 되돌아온
    // 순간의 그림이 직전과 똑같아서 이음매가 보이지 않습니다.
    function buildTrail(campaign) {
      if (trailTween) {
        trailTween.kill();
        trailTween = null;
      }
      galleryTrail.innerHTML = '';

      var track = document.createElement('div');
      track.className = 'gallery_trail_track';

      for (var pass = 0; pass < 2; pass++) {
        campaign.images.forEach(function (name) {
          var item = document.createElement('div');
          item.className = 'gallery_trail_item';
          var img = document.createElement('img');
          img.src = GALLERY_IMG + name + '.png';
          img.alt = '';
          img.draggable = false;
          item.appendChild(img);
          track.appendChild(item);
        });
      }
      galleryTrail.appendChild(track);

      // 한 벌의 폭은 두 번째 벌 첫 장의 위치로 재는 게 가장 정확합니다.
      // (이미지 크기는 CSS로 고정이라 로드 전에도 값이 나옵니다.)
      var count = campaign.images.length;
      var setWidth = track.children[count].offsetLeft - track.children[0].offsetLeft;
      if (!setWidth) setWidth = count * (TRAIL_ITEM_W + TRAIL_GAP);

      gsap.set(galleryTrail, { opacity: 1 });
      gsap.set(track, { x: 0 });
      trailTween = gsap.to(track, {
        x: -setWidth,
        duration: setWidth / TRAIL_SPEED,
        ease: 'none',
        repeat: -1
      });
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
      return 1 / Math.min(1, window.innerWidth / 1920);
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
  // MAP(.location)도 대상입니다. 다만 마지막 정거장이라 잠금이 짧게(한 화면이
  // 아니라 420px) 풀리고, 풀릴 때는 자유 스크롤로 놓아주는 대신 푸터까지 부드럽게
  // 미끄러집니다 — SALON에서 놓아주기만 하면 지도를 지나쳐 푸터로 훅 떨어졌습니다.
  //
  // 좌표 주의: .page에 transform: scale()이 걸려 있어서 getComputedStyle이
  // 돌려주는 padding(1920 캔버스 기준 px)과 화면에서 실제로 차지하는 px이
  // 다릅니다. rect.height / offsetHeight로 배율을 구해 padding에 곱합니다.
  var SNAP_LAST = '.location';   // MAP — 푸터 바로 앞의 마지막 정거장
  var SNAP_SKIP = '.history';    // 카드가 스스로 붙잡는 섹션 (위 설명 참고)
  var snapSections = Array.prototype.slice.call(
    document.querySelectorAll('.page > section')
  ).filter(function (el) { return !el.matches(SNAP_SKIP); });

  if (snapSections.length && !prefersReducedMotion) {
    var SNAP_IDLE_MS = 140;     // 스크롤이 이만큼 조용해지면 "멈췄다"고 봅니다
    var SNAP_MS = 700;          // 중앙으로 붙는 시간
    var SNAP_DEAD_ZONE = 4;     // 이 정도 어긋남은 그냥 둡니다 (되튐 방지)
    var RELEASE_PX = 1080;      // 잠금이 풀리는 스크롤 양 — 캔버스 기준 한 화면
    var MAP_RELEASE_PX = 420;   // MAP은 짧게 — 그 아래는 푸터뿐입니다

    var snapState = 'free';     // free(평소) · moving(붙는 중) · locked(고정)
    var lockedOn = null;        // 지금 고정돼 있는 섹션
    var pushAcc = 0;            // 고정된 뒤 모은 스크롤 양 (부호가 방향)
    var snapIdleTimer = null;
    var userScrolled = false;   // 사용자가 직접 굴린 뒤에만 붙습니다
    var mutedOn = null;         // 방금 잠금을 푼 섹션 — 그 자리에서 다시 잠기지 않게
    var lastLocked = null;      // 직전에 고정했던 섹션 — 새로 붙었는지 가릅니다

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function introDone() { return !hero || hero.classList.contains('is_done'); }
    function isMapSection(el) { return !!el && el.matches(SNAP_LAST); }
    function releasePx() {
      return (isMapSection(lockedOn) ? MAP_RELEASE_PX : RELEASE_PX) * stageScale();
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
      window.sulwhasooSnapMoving = false;
      toggleLenis('stop');

      // 다른 섹션에 있다가 새로 붙은 것이면 나선을 처음부터 다시 보게 합니다.
      // (창 크기를 바꿔서 같은 섹션에 다시 붙는 경우는 그대로 둡니다)
      if (lockedOn !== lastLocked) {
        lastLocked = lockedOn;
        var gl = window.guideGL;
        if (gl && typeof gl.resetRoomProgress === 'function') gl.resetRoomProgress();
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
      toggleLenis('start');
    }

    // MAP에서 아래로 풀 때는 그냥 놓아주지 않고 푸터가 다 보이는 자리까지
    // 붙는 것과 같은 속도·곡선으로 데려다 줍니다. 놓아주기만 하면 남은 거리가
    // 한 화면 남짓이라 휠 한 번에 바닥까지 떨어집니다.
    function glideToFooter() {
      var end = document.documentElement.scrollHeight - window.innerHeight;
      var from = scrollNow();
      unlockSection();
      if (end - from < SNAP_DEAD_ZONE) return;

      var lenis = window.sulwhasooLenis;
      if (lenis && typeof lenis.scrollTo === 'function') {
        lenis.scrollTo(end, { duration: SNAP_MS / 1000, easing: easeOutCubic, force: true });
      } else {
        window.scrollTo({ top: end, behavior: 'smooth' });
      }
    }

    // 밀어낸 만큼이 한 화면을 넘으면 그 방향의 다음 섹션으로 넘어갑니다.
    // 그 방향에 더 이상 섹션이 없으면(첫 섹션 위 · MAP 아래) 잠금을 풉니다 —
    // 위쪽은 hero로 평소처럼, 아래쪽은 푸터까지 부드럽게.
    function advance(dir) {
      var next = snapSections[snapSections.indexOf(lockedOn) + dir];
      if (next) moveTo(next);
      else if (dir > 0 && isMapSection(lockedOn)) glideToFooter();
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
    function addPush(d) {
      if (!d) return;
      if (pushAcc !== 0 && (d > 0) !== (pushAcc > 0)) pushAcc = 0;
      pushAcc += d;
      if (Math.abs(pushAcc) >= releasePx()) advance(pushAcc > 0 ? 1 : -1);
    }

    // BUKCHON ROOM GUIDE — 이 섹션에 고정돼 있는 동안 스크롤은 페이지가 아니라
    // 나선을 돌리는 데 씁니다(js/guide_gl.js의 pushScroll). 커서 위치는 보지
    // 않고 섹션 전체에서 받습니다. 카드를 전부 한 번씩 보고 나면 guide_gl이
    // onRoomCleared로 알려 주고, 그때 스스로 다음 섹션으로 내려갑니다.
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
    function onRoomCleared() {
      if (snapState !== 'locked' || !lockedOn || !lockedOn.matches('.guide')) return;
      advance(1);
    }

    // guide_gl.js는 모듈이라 이 스크립트보다 늦게 뜰 수 있습니다.
    (function waitForGuideGL(waited) {
      if (window.guideGL) { window.guideGL.onRoomCleared = onRoomCleared; return; }
      if (waited >= 5000) return;
      window.setTimeout(function () { waitForGuideGL(waited + 100); }, 100);
    })(0);

    function onSnapWheel(e) {
      if (snapState === 'moving') { e.preventDefault(); return; }
      if (snapState !== 'locked') {
        if (introDone()) userScrolled = true;
        return;
      }
      e.preventDefault();
      var d = wheelPx(e);
      if (handedToRoom(d)) return;
      addPush(d);
    }

    var touchLastX = 0;
    var touchLastY = 0;

    function onSnapTouchStart(e) {
      touchLastX = e.touches[0].clientX;
      touchLastY = e.touches[0].clientY;
    }

    function onSnapTouchMove(e) {
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
      if (handedToRoom(dy)) return;   // 휠과 같은 규칙으로 나선을 돌립니다
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
