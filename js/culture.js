// Sulwhasoo · Culture page interactions
document.addEventListener('DOMContentLoaded', handleDomContentLoaded);

function handleDomContentLoaded() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Responsive stage: scale the fixed 1920px canvas to fit narrower
  // viewports (360 / 768 / 1280) so no breakpoint ever gets a horizontal
  // scrollbar. At >=1920px this is scale(1), i.e. unchanged.
  //
  // .stage/.page는 이제 문서 전체에 하나가 아니라 두 조각으로 나뉘어 있다
  // (hero / approach~green_results) — OUR HERITAGE를 이 조각들 "사이"의
  // 최상위 형제로 뺐기 때문이다. 왜: GSAP ScrollTrigger의 pin은 pin 대상이
  // scale된 조상(.page의 transform:scale) 안에 있으면 — pinType을
  // 'transform'으로 바꿔도 — 전혀 고정되지 않고 스크롤과 함께 흘러가 버린다
  // (js/detail.js에서 같은 문제를 겪고 확인된 GSAP 자체의 한계, product_detail.html
  // 참고). 그래서 pin 대상(.heritage_pin)과 그 트리거 <section>은 scale
  // 조상이 전혀 없는 곳에 real px로 두고, 그 안의 1920px 디자인 좌표
  // 콘텐츠(.heritage_pin_inner)만 --stage-scale을 직접 적용해 축소한다.
  // 그래서 [data-scale-stage] 전부를 순회하며 각자 독립적으로 스케일한다. ----
  const stagePairs = Array.from(document.querySelectorAll('[data-scale-stage]'))
    .map((stage) => ({ stage, page: stage.querySelector('.page') }))
    .filter((pair) => pair.page);
  if (stagePairs.length) {
    const handleStageResize = () => {
      const scale = Math.min(1, window.innerWidth / 1920);
      stagePairs.forEach(({ stage, page }) => {
        // scale(1)은 시각적으로 변화가 없지만, transform 자체가 걸리는 순간
        // position:fixed/sticky 자식들의 containing block이 바뀌어 GSAP pin,
        // 스크롤 스티키 리빌 등이 깨진다. 데스크톱(스케일 불필요)에서는
        // transform을 아예 걸지 않아 이 부작용을 피한다.
        page.style.transform = scale < 1 ? 'scale(' + scale + ')' : '';
        stage.style.height = scale < 1 ? (page.scrollHeight * scale) + 'px' : '';
      });
      // --stage-scale: :root에 전역으로 노출해 .page 조각들뿐 아니라 그
      // "사이"에 있는 .heritage_pin_inner도 같은 값을 상속받아 쓸 수 있게
      // 한다. window.innerWidth는 OS 디스플레이 배율(Windows 125%/150% 등)이
      // 반영된 논리 해상도라 1920px 실물 모니터에서도 scale<1이 흔히 걸린다.
      document.documentElement.style.setProperty('--stage-scale', scale < 1 ? scale : 1);
      // 이 함수의 첫 호출(DOMContentLoaded 시점)은 아직 initScrollExpand/
      // initHeritageArchive 등이 pin을 만들기 전이라 .page.scrollHeight가
      // 작게 잡힌다 — 그래서 .stage 높이가 한 번 더 보정되는 'load' 호출
      // 시점엔 이미 각 초기화 함수가 자기 트리거의 start/end를 그 "작았던"
      // 레이아웃 기준으로 캐시해둔 뒤다. 캐시된 값을 그대로 두면 heritage
      // 같은 뒤쪽 트리거의 시작 지점이 실제 렌더 위치보다 한참 당겨져
      // 있어(스크롤 시작부터 이미 진행률이 몇십%인 것처럼 어긋난다) —
      // GSAP 표준 API인 refresh()로 전체 트리거를 지금 레이아웃 기준으로
      // 다시 계산시킨다(트리거가 아직 하나도 없으면 아무 효과 없이 끝난다).
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    };
    handleStageResize();
    window.addEventListener('resize', handleStageResize);
    window.addEventListener('load', handleStageResize);
  }

  // ---- Play-button lightbox (placeholder for real video embeds) ----
  const lightbox = document.createElement('div');
  lightbox.className = 'culture_lightbox';
  lightbox.innerHTML = `
    <button class="culture_lightbox_close" aria-label="Close">✕</button>
    <img class="culture_lightbox_img" src="" alt="">
  `;
  document.body.appendChild(lightbox);

  const lightboxImg = lightbox.querySelector('.culture_lightbox_img');
  const closeBtn = lightbox.querySelector('.culture_lightbox_close');

  let lightboxCloseTimer = null;

  function openLightbox(src, alt) {
    if (lightboxCloseTimer) { window.clearTimeout(lightboxCloseTimer); lightboxCloseTimer = null; }
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    lightbox.classList.add('is_open');
    document.body.style.overflow = 'hidden';
    // 두 프레임 뒤에 클래스를 추가해야 display:none → flex 전환 직후에도
    // opacity/transform 트랜지션이 정상적으로 재생된다 (같은 틱에 두 상태를
    // 한 번에 바꾸면 브라우저가 시작 상태를 스타일 계산에 반영하지 못함).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => lightbox.classList.add('is_open_anim'));
    });
  }

  function closeLightbox() {
    lightbox.classList.remove('is_open_anim');
    document.body.style.overflow = '';
    lightboxCloseTimer = window.setTimeout(() => {
      lightbox.classList.remove('is_open');
      lightboxImg.src = '';
      lightboxCloseTimer = null;
    }, 450);
  }

  function handleCloseButtonClick() {
    closeLightbox();
  }

  function handleLightboxClick(e) {
    if (e.target === lightbox) closeLightbox();
  }

  function handleDocumentKeydown(e) {
    if (e.key === 'Escape') closeLightbox();
  }

  function handleVideoTriggerClick(e) {
    const frame = e.currentTarget.closest('[data-video-frame]');
    const img = frame ? frame.querySelector('img') : null;
    if (img) openLightbox(img.src, img.alt);
  }

  closeBtn.addEventListener('click', handleCloseButtonClick);
  lightbox.addEventListener('click', handleLightboxClick);
  document.addEventListener('keydown', handleDocumentKeydown);

  document.querySelectorAll('[data-video-trigger]').forEach((trigger) => {
    trigger.addEventListener('click', handleVideoTriggerClick);
  });

  // ---- Fade-in on scroll for content blocks ----
  // .will_reveal / .will_reveal_scale는 HTML에 이미 붙어 있는 요소(제품 이미지,
  // 오브 등 위계를 다르게 주고 싶은 것들)이고, 나머지는 여기서 기본 페이드를 붙인다.
  const revealTargets = document.querySelectorAll(
    '.will_reveal, .will_reveal_scale, .philosophy_card, .gr_card'
  );

  function handleRevealIntersect(entries, observer) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is_visible');
        if (entry.target.classList.contains('gr_card') && !prefersReducedMotion) {
          const statEl = entry.target.querySelector('.gr_card_stat');
          if (statEl) animateCountUp(statEl);
        }
        observer.unobserve(entry.target);
      }
    });
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(handleRevealIntersect, { threshold: 0.15 });
    revealTargets.forEach((el) => {
      if (!el.classList.contains('will_reveal') && !el.classList.contains('will_reveal_scale')) {
        el.classList.add('will_reveal');
      }
      io.observe(el);
    });

    // ---- 그룹 단위 순차 리빌: 컨테이너에 is_visible이 붙으면 CSS가 자식들을
    // 지정된 지연(transition-delay)으로 하나씩 등장시킨다 (인삼 조각 6개) ----
    const groupRevealTargets = document.querySelectorAll('.skin_science_drugs');
    const groupIo = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is_visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    groupRevealTargets.forEach((el) => groupIo.observe(el));
  }

  // ---- Hero: Scroll Expand (React Bits ScrollExpand, vanilla JS + GSAP ScrollTrigger port) ----
  // initApproachOrbit(아래)이 이보다 먼저 ScrollTrigger를 만들면, 이 함수가
  // 나중에 만드는 scroll_expand의 pin-spacer(2304px 만큼 문서를 늘림)가
  // 아직 존재하지 않는 상태에서 approach의 'top top' 시작 위치를 측정해버려,
  // 그만큼 어긋난 값으로 굳어버리는 문제가 있었다(ScrollTrigger.refresh()로도
  // 안 고쳐짐 — GSAP이 새로 생기는 트리거를 나중에 refresh할 때 이미 만들어진
  // 앞쪽 트리거들 순서대로 다시 계산하는데, approach가 scroll_expand보다 먼저
  // 만들어져 있으면 그 시점 기준으로 계산되는 것으로 보인다). 그래서
  // scroll_expand의 pin이 실제로 만들어진 뒤에 approach의 pin을 만든다.
  initScrollExpand(prefersReducedMotion);

  // ---- Our Approach: 컬럼이 먼저 나타나고, 그 다음 이어지는 궤도 구간이
  // 그려지는 순서를 하나의 타임라인으로 묶는다 — 오브 → 컬럼1 나타남 →
  // 구간0 그려짐 → 컬럼2 나타남 → 구간1 그려짐 → 컬럼3 나타남 → 구간2
  // 그려짐 → 구간3(오브로 마무리). 시퀀스가 총 9초 가까이 걸려서, 화면에
  // 들어오면 no1/ritual/benefit(js/detail.js)과 같은 패턴으로 화면을
  // 고정(pin)해두고 그 상태에서 1회 자동재생(스크럽 아님)한 뒤 끝나면
  // 스크롤을 풀어준다. pin 대상(.approach_pin)이 .stage/.page(반응형 scale
  // 조상) 밖의 real px라 no1과 동일한 이유로 기본 pinType("fixed")이 정상
  // 동작한다. ----
  initApproachOrbit(prefersReducedMotion);

  // ---- Hero: "Brand Story" Stroke Text (React Bits StrokeText, vanilla JS + GSAP port) ----
  initStrokeText(prefersReducedMotion);

  // ---- Green Results 카드 호버: 오렌지 버블이 올라와 서로 뭉치는 리퀴드 인터랙션 ----
  initGreenResultsLiquid(prefersReducedMotion);

  // ---- Our Heritage: Interactive Archive Timeline (스크롤 = 시간의 이동) ----
  initHeritageArchive(prefersReducedMotion);

  // ---- Raw Material Story: 콜라주 4장 = 스크롤 패럴랙스(수직 이동) +
  // 커서를 따라가는 3D 틸트를 하나의 transform으로 합성. GSAP scrub과
  // mousemove가 둘 다 각 이미지의 transform을 직접 건드리면 서로 덮어써
  // 버벅이므로, 두 값을 상태로만 저장해두고 매 프레임 하나의 문자열로
  // 합쳐서 적용한다. ----
  const rmCollage = document.querySelector('.raw_material_collage');
  const rmImages = document.querySelectorAll('.rm_img');
  if (rmCollage && rmImages.length) {
    const rmState = Array.from(rmImages).map(() => ({ y: 0, rx: 0, ry: 0 }));
    const rmTiltDepth = [10, 7, 13, 18];

    function applyRmTransform(i) {
      const img = rmImages[i];
      const s = rmState[i];
      img.style.transform = `translateY(${s.y.toFixed(2)}px) rotateX(${s.rx.toFixed(2)}deg) rotateY(${s.ry.toFixed(2)}deg)`;
    }

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && !prefersReducedMotion) {
      const rmRanges = [26, -22, 18, -30];
      rmImages.forEach((img, i) => {
        const range = rmRanges[i % rmRanges.length];
        gsap.fromTo(
          rmState[i],
          { y: -range },
          {
            y: range,
            ease: 'none',
            scrollTrigger: {
              trigger: '.raw_material',
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
            onUpdate: () => applyRmTransform(i),
          }
        );
      });
    }

    if (!prefersReducedMotion) {
      let rmRaf = null;
      function handleRmMouseMove(e) {
        const rect = rmCollage.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width - 0.5;
        const ny = (e.clientY - rect.top) / rect.height - 0.5;
        if (rmRaf) return;
        rmRaf = requestAnimationFrame(() => {
          rmImages.forEach((img, i) => {
            const depth = rmTiltDepth[i % rmTiltDepth.length];
            rmState[i].rx = ny * -depth;
            rmState[i].ry = nx * depth;
            applyRmTransform(i);
          });
          rmRaf = null;
        });
      }
      function handleRmMouseLeave() {
        rmImages.forEach((img, i) => {
          rmState[i].rx = 0;
          rmState[i].ry = 0;
          applyRmTransform(i);
        });
      }
      rmCollage.addEventListener('mousemove', handleRmMouseMove);
      rmCollage.addEventListener('mouseleave', handleRmMouseLeave);
    }

    // ---- 연구보드 실선: 각 path의 실제 길이를 재서 stroke-dasharray/
    // dashoffset에 넣어야 진짜로 "그려지는" 애니메이션이 된다 (Our Approach
    // 궤도와 동일한 기법). CSS는 --len 커스텀 프로퍼티만 읽는다. ----
    document.querySelectorAll('.rm_string_seg').forEach((seg) => {
      const len = seg.getTotalLength();
      seg.style.setProperty('--len', String(len));
    });

    // ---- 진입 시 이미지별로 방향이 다른 커튼(clip-path) 리빌 ----
    if ('IntersectionObserver' in window) {
      const rmIo = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is_visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      rmIo.observe(rmCollage);
    } else {
      rmCollage.classList.add('is_visible');
    }
  }

  // ---- Cultural Philosophy: 배경 영상은 reduced-motion이면 정지 프레임으로 둔다.
  // CSS는 켄번즈(확대) 애니메이션만 멈출 수 있고 실제 재생/루프는 HTML autoplay
  // 속성이 트리거하므로, 재생 자체를 막으려면 JS에서 pause해야 한다. ----
  const philosophyHeroVideo = document.querySelector('.philosophy_hero_kenburns video');
  if (philosophyHeroVideo && prefersReducedMotion) {
    philosophyHeroVideo.pause();
    philosophyHeroVideo.removeAttribute('loop');
  }

  // ---- Cultural Philosophy: 타이틀 커튼 리빌 ----
  const philosophyHeroTxt = document.querySelector('.philosophy_hero_txt');
  if (philosophyHeroTxt) {
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      philosophyHeroTxt.classList.add('is_visible');
    } else {
      const philosophyIo = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is_visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      philosophyIo.observe(philosophyHeroTxt);
    }
  }

  // ---- Cultural Philosophy: 히어로 배경에 느린 수직 드리프트 패럴랙스
  // (켄번즈 확대는 CSS 애니메이션이 img에 걸어두므로, 여기서는 래퍼에
  // translateY만 적용해 두 transform이 충돌하지 않게 한다) ----
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && !prefersReducedMotion) {
    const philosophyHeroImg = document.querySelector('.philosophy_hero_kenburns');
    if (philosophyHeroImg) {
      gsap.fromTo(
        philosophyHeroImg,
        { yPercent: -8 },
        {
          yPercent: 8,
          ease: 'none',
          scrollTrigger: {
            trigger: '.philosophy_hero',
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      );
    }
  }
}

function smoothstep(edge0, edge1, x) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

// ---- Green Results: 통계 숫자 카운트업 ("10-ton", "1,524-ton", "55%", "2,473 ton" 등
// 접미사는 그대로 두고 앞의 숫자만 0에서 목표값까지 애니메이션) ----
function animateCountUp(el) {
  const raw = el.textContent.trim();
  const match = raw.match(/^([\d,]+)(.*)$/);
  if (!match) return;

  const target = parseInt(match[1].replace(/,/g, ''), 10);
  const suffix = match[2];
  if (Number.isNaN(target)) return;

  const duration = 1200;
  const start = performance.now();

  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(target * eased);
    el.textContent = value.toLocaleString('en-US') + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function initScrollExpand(prefersReducedMotion) {
  const roots = document.querySelectorAll('[data-scroll-expand]');
  if (!roots.length) return;

  const START_WIDTH = 42;
  const START_HEIGHT = 58;
  const START_RADIUS = 24;
  const END_RADIUS = 0;
  const MEDIA_ZOOM = 1.35;
  const OVERLAY_SCRIM = 0.45;

  // 프레임 확장은 전체 스크롤 구간의 앞쪽 45%에서만 일어나고, 그 이후로는
  // 고정(clip 100%)된 채 텍스트 3단계(Brand Story → eyebrow 필/타이틀 →
  // Detailed Description)만 순서대로 재생된다.
  const EXPAND_END = 0.45;

  roots.forEach((root) => {
    const frame = root.querySelector('[data-scroll-expand-frame]');
    const media = root.querySelector('[data-scroll-expand-media]');
    const scrim = root.querySelector('[data-scroll-expand-scrim]');
    const brand = root.querySelector('[data-scroll-expand-brand]');
    const stageMain = root.querySelector('[data-scroll-expand-stage-main]');
    const stageDesc = root.querySelector('[data-scroll-expand-stage-desc]');
    const eyebrowEl = root.querySelector('[data-scroll-expand-eyebrow]');
    const titleMain = root.querySelector('[data-scroll-expand-title-main]');
    if (!frame || !media) return;

    function applyProgress(p) {
      const expandP = Math.min(p / EXPAND_END, 1);
      const e = smoothstep(0, 1, expandP);
      const w = START_WIDTH + (100 - START_WIDTH) * e;
      const h = START_HEIGHT + (100 - START_HEIGHT) * e;
      const ix = Math.max(0, (100 - w) / 2);
      const iy = Math.max(0, (100 - h) / 2);
      const r = START_RADIUS + (END_RADIUS - START_RADIUS) * e;
      frame.style.clipPath = `inset(${iy}% ${ix}% ${iy}% ${ix}% round ${r}px)`;
      media.style.transform = `scale(${MEDIA_ZOOM + (1 - MEDIA_ZOOM) * e})`;
      if (scrim) scrim.style.opacity = String(OVERLAY_SCRIM * e);

      // Stage 1 · Brand Story — 진입 직후 잠깐 머물다가 스크롤이 시작되면 사라짐
      if (brand) {
        const out = smoothstep(0.03, 0.12, p);
        brand.style.opacity = String(1 - out);
      }

      // Stage 2 · "Beauty that defies the passage of time" → "Holistic Beauty"
      // 순서로 흰색에서 오렌지로 채워짐. 타이틀은 흰색으로 나타난 뒤 같은
      // 방식으로 채워진다.
      if (stageMain) {
        const inn = smoothstep(0.08, 0.22, p);
        const out = smoothstep(0.66, 0.8, p);
        stageMain.style.opacity = String(Math.max(0, inn - out));

        if (eyebrowEl) {
          const fill = smoothstep(0.1, 0.3, p);
          eyebrowEl.style.setProperty('--fill', `${fill * 100}%`);
        }
        if (titleMain) {
          const titleIn = smoothstep(0.28, 0.4, p);
          titleMain.style.opacity = String(titleIn);
          titleMain.style.transform = `translate3d(0, ${(1 - titleIn) * 16}px, 0)`;

          const titleFill = smoothstep(0.42, 0.6, p);
          titleMain.style.setProperty('--fill', `${titleFill * 100}%`);
        }
      }

      // Stage 3 · 프레임은 고정된 채, 설명 문구가 아래에서 위로 슬라이드 인
      if (stageDesc) {
        const inn = smoothstep(0.72, 0.95, p);
        stageDesc.style.opacity = String(inn);
        stageDesc.style.transform = `translate3d(0, ${(1 - inn) * 48}px, 0)`;
      }
    }

    if (prefersReducedMotion || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      applyProgress(1);
      return;
    }

    applyProgress(0);

    ScrollTrigger.create({
      trigger: root,
      start: 'top top',
      end: () => `+=${Math.round(root.offsetHeight * 2.4)}`,
      scrub: 0.4,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => applyProgress(self.progress),
    });
  });
}

// ---- Our Approach: 오브 → 컬럼1 → 궤도 → 컬럼2 → 궤도 → 컬럼3 → 궤도 순서로
// 한 번만 재생되는 순차 리빌. 시퀀스가 총 9초 가까이 걸려서, 화면에 40%만
// 들어오면 재생만 시키고 스크롤은 그냥 흘러가게 두던 예전 방식으로는
// 스크롤 중에 다 못 보고 지나가 버렸다. no1/ritual/benefit(js/detail.js)과
// 같은 패턴으로, 섹션 진입 시 화면을 고정(pin)해두고 그 상태에서 기존
// 타임라인을 그대로(스크럽 아님, 자체 타이밍으로 1회 자동재생) 재생한 뒤
// 끝나면 스크롤을 풀어준다.
//
// 반드시 initScrollExpand보다 나중에 호출해야 한다 — scroll_expand도 pin을
// 쓰는데, 이 함수가 그보다 먼저 ScrollTrigger를 만들면 scroll_expand의
// pin-spacer(문서를 그만큼 늘림)가 아직 없는 상태에서 approach의
// 'top top' 시작 위치를 측정해버려 그만큼 어긋난 값으로 굳어버린다
// (ScrollTrigger.refresh()로도 안 고쳐짐 — GSAP 격리 테스트로 확인).
function initApproachOrbit(prefersReducedMotion) {
  const approachScene = document.querySelector('[data-approach-scene]');
  const approachSection = document.querySelector('#approach');
  const approachPinTarget = document.querySelector('[data-approach-pin]');
  const orbitSegs = Array.from(document.querySelectorAll('[data-approach-orbit-seg]'));
  const approachOrb = document.querySelector('.approach_orb');
  const approachCols = [1, 2, 3].map((n) => document.querySelector(`.approach_col[data-approach-order="${n}"]`));
  const approachDots = [
    document.querySelector('.approach_dot_l'),
    document.querySelector('.approach_dot_t'),
    document.querySelector('.approach_dot_r'),
  ];
  if (!approachScene || !approachSection || !approachPinTarget) return;

  orbitSegs.forEach((seg) => {
    const len = seg.getTotalLength();
    seg.style.strokeDasharray = String(len);
    seg.style.strokeDashoffset = String(len);
  });

  function playApproachSequence() {
    if (prefersReducedMotion || typeof gsap === 'undefined') {
      orbitSegs.forEach((seg) => { seg.style.strokeDashoffset = '0'; });
      if (approachOrb) { approachOrb.style.opacity = '1'; approachOrb.style.transform = 'none'; }
      approachCols.forEach((col) => { if (col) { col.style.opacity = '1'; col.style.transform = 'none'; } });
      approachDots.forEach((dot) => { if (dot) dot.style.opacity = '0.55'; });
      return;
    }

    // 순서: 오브 → 구간0 그려짐 → 컬럼1 나타남 → 구간1 그려짐 → 컬럼2 나타남 →
    // 구간2 그려짐 → 컬럼3 나타남 → 구간3(마지막, 오브로 마무리) 그려짐.
    // 즉 선이 먼저 그 지점까지 도달한 다음, 그 자리의 콘텐츠가 나타난다.
    const tl = gsap.timeline();
    tl.to(approachOrb, { opacity: 1, scale: 1, duration: 0.9, ease: 'power2.out' })
      .to(orbitSegs[0], { strokeDashoffset: 0, duration: 1.1, ease: 'power1.inOut' }, '+=0.3')
      .to(approachDots[0], { opacity: 0.55, duration: 0.4 }, '-=0.3')
      .to(approachCols[0], { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' })
      .to(orbitSegs[1], { strokeDashoffset: 0, duration: 1.1, ease: 'power1.inOut' }, '+=0.3')
      .to(approachDots[1], { opacity: 0.55, duration: 0.4 }, '-=0.3')
      .to(approachCols[1], { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' })
      .to(orbitSegs[2], { strokeDashoffset: 0, duration: 1.1, ease: 'power1.inOut' }, '+=0.3')
      .to(approachDots[2], { opacity: 0.55, duration: 0.4 }, '-=0.3')
      .to(approachCols[2], { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' })
      .to(orbitSegs[3], { strokeDashoffset: 0, duration: 1.1, ease: 'power1.inOut' }, '+=0.3');
  }

  if (prefersReducedMotion || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    playApproachSequence(); // GSAP/ScrollTrigger 없으면 pin 없이 최종 상태만 즉시 보여준다(playApproachSequence 내부 분기)
    return;
  }

  let played = false;
  // onEnter 시점에 kill()로 트리거를 없애면 막 pin이 시작되자마자 풀려버려서
  // 전혀 고정되지 않는다 — 그래서 여기서는 지우지 않고 played 플래그로만
  // "재생은 한 번만" 보장한다. 위로 스크롤했다가 다시 내려오면 pin은 한 번
  // 더 걸리지만(구간 안에 있으면 항상 그런다), 이미 최종 상태로 완성돼 있어
  // 재생되는 것 없이 그대로 보이다가 end 지점을 지나면 다시 풀린다.
  ScrollTrigger.create({
    trigger: approachSection,
    start: 'top top',
    end: () => '+=' + window.innerHeight * 3, // 9초 안팎인 시퀀스를 다 볼 시간을 스크롤 거리로 환산(넉넉하게)
    pin: approachPinTarget,
    anticipatePin: 1,
    onEnter: () => {
      if (played) return;
      played = true;
      playApproachSequence();
    },
  });
}

// ---- Hero "Brand Story" Stroke Text (React Bits StrokeText, vanilla JS + GSAP port) ----
// [data-stroke-text] span의 텍스트 노드를 SVG(글자별 stroke tspan + fill tspan)로
// 교체하고, 페이지 진입과 동시에(trigger="mount") 윤곽선이 글자 단위로 그려진 뒤
// 흰색으로 채워지는 타임라인을 1회 재생한다. 이 요소를 감싼 .se_brand의 opacity
// 페이드아웃(initScrollExpand, 스크롤 진행률 기반)은 그대로 별개로 동작 — 서로
// 다른 속성(부모 opacity vs 자식 stroke-dashoffset/opacity)을 건드리므로 충돌 없음.
// GSAP/getBBox를 쓸 수 없거나 reduced-motion이면 즉시 "다 그려진" 상태로 두거나,
// 아예 SVG로 바꾸지 않고 원래 텍스트 노드(+ 기존 .se_brand 스타일)를 그대로 둔다.
function initStrokeText(prefersReducedMotion) {
  const nodes = document.querySelectorAll('[data-stroke-text]');
  if (!nodes.length) return;

  nodes.forEach((el) => {
    if (typeof document.createElementNS !== 'function') return;

    const rawText = el.textContent.trim();
    if (!rawText) return;
    const chars = Array.from(rawText.toUpperCase());

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'stroke_text_svg');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('aria-hidden', 'true');

    const strokeText = document.createElementNS(svgNS, 'text');
    strokeText.setAttribute('class', 'stroke_text_stroke');
    strokeText.setAttribute('x', '0');
    strokeText.setAttribute('y', '0');

    const fillText = document.createElementNS(svgNS, 'text');
    fillText.setAttribute('class', 'stroke_text_fill');
    fillText.setAttribute('x', '0');
    fillText.setAttribute('y', '0');

    const strokeTspans = [];
    const fillTspans = [];
    chars.forEach((ch) => {
      const glyph = ch === ' ' ? ' ' : ch;

      const st = document.createElementNS(svgNS, 'tspan');
      st.textContent = glyph;
      strokeText.appendChild(st);
      strokeTspans.push(st);

      const ft = document.createElementNS(svgNS, 'tspan');
      ft.textContent = glyph;
      fillText.appendChild(ft);
      fillTspans.push(ft);
    });

    svg.appendChild(strokeText);
    svg.appendChild(fillText);

    // getBBox()로 실제 글자 크기를 재려면 DOM에 붙어 있어야 하므로, 텍스트
    // 노드를 지우고 SVG를 넣은 다음 측정한다 — 실패하면(getBBox 미지원 등)
    // 아무것도 건드리지 않고 원래 텍스트로 되돌려 fallback을 유지한다.
    const originalText = el.textContent;
    el.textContent = '';
    el.appendChild(svg);

    let bbox = null;
    try {
      bbox = strokeText.getBBox();
    } catch (err) {
      bbox = null;
    }
    if (!bbox || !bbox.width) {
      el.textContent = originalText;
      return;
    }

    el.classList.add('stroke_text');
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', rawText);

    // 실제 렌더링된 font-size/stroke-width를 읽어서 여백·dash 길이를 비례시킨다 —
    // 고정값을 쓰면 CSS에서 폰트 크기를 바꿀 때마다 윤곽선이 잘리거나(여백 부족)
    // dash보다 길어져 선이 끊겨 보이는 문제가 생긴다
    // (React Bits 원본의 fontSize*0.1 여백 / fontSize*7 dash 공식과 동일한 취지).
    const strokeStyle = getComputedStyle(strokeText);
    const computedFontSize = parseFloat(strokeStyle.fontSize) || 48;
    const computedStrokeWidth = parseFloat(strokeStyle.strokeWidth) || 1;

    const pad = Math.max(computedStrokeWidth, computedFontSize * 0.1);
    const box = {
      x: bbox.x - pad,
      y: bbox.y - pad,
      width: bbox.width + pad * 2,
      height: bbox.height + pad * 2,
    };
    svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
    svg.style.setProperty('--stroke-text-height', Math.round(box.height) + 'px');

    const DASH = Math.max(computedFontSize * 7, 200);
    const DRAW_DURATION = 1.3;
    const STAGGER = 0.045;

    if (prefersReducedMotion || typeof gsap === 'undefined') {
      strokeTspans.forEach((t) => {
        t.style.strokeDasharray = String(DASH);
        t.style.strokeDashoffset = '0';
      });
      fillTspans.forEach((t) => { t.style.opacity = '1'; });
      return;
    }

    gsap.set(strokeTspans, { strokeDasharray: DASH, strokeDashoffset: DASH });
    gsap.set(fillTspans, { opacity: 0 });

    const tl = gsap.timeline({ delay: 0.2 });
    tl.to(strokeTspans, {
      strokeDashoffset: 0,
      duration: DRAW_DURATION,
      ease: 'power2.out',
      stagger: STAGGER,
    }, 0);
    // 윤곽선만 있는 상태를 잠깐(0.2s) 눈에 담을 시간을 준 다음 채움이 시작되도록,
    // 드로우인이 끝나는 시점보다 뒤에서 채움을 시작한다 (이전엔 -0.3s 겹쳐서
    // 채워지는 순간이 거의 안 보였다).
    tl.to(fillTspans, {
      opacity: 1,
      duration: 0.6,
      ease: 'power2.out',
      stagger: STAGGER,
    }, '>+0.2');
  });
}

// ---- Our Heritage: Interactive Archive Timeline (자동재생, 무한 루프) ----
// 스크롤로 진행률을 끌고 가던 이전 버전(pin+scrub)을 걷어내고, 진행률 p(0~1)를
// 이제 타이머가 만든다 — 그 p를 받아 스타일을 매기는 applyProgress(p)는 그대로
// 재사용한다:
// ① heritage_track을 translateX해 현재 연혁을 항상 화면 중앙에 두고
// ② 중앙에서 멀어질수록 scale/opacity/grayscale을 낮춰 흐리게 만들고
// ③ 중앙 아이템의 연도 아래 설명만 슬라이드 인시키고
// ④ 하단 progress fill과 active dot을 같은 p로 갱신한다.
// 매 프레임 inline style로 직접 쓰고 CSS transition은 걸지 않는다 — GSAP
// 트윈(gsap.to(state, {p:...}))이 p를 애니메이션하면서 onUpdate로 매 프레임
// applyProgress를 부르는 식이라, 이 자리에서 또 CSS transition까지 걸리면
// 서로 경합해 버벅인다(hero scroll-expand와 동일 원칙).
//
// 자동 진행: HOLD초마다 다음 연혁으로 슬라이드(gsap.to로 부드럽게), 마지막
// 다음엔 처음으로 무한 루프 — 다만 마지막→처음은 10칸을 거꾸로 쭉 슬라이드하면
// 어색해서 살짝 페이드로 점프한다. 마우스를 올리면 정지, 벗어나면 재생, 화면
// 밖으로 스크롤되면(IntersectionObserver) 정지해 불필요한 연산을 막는다. dot을
// 클릭하면 그 연혁으로 바로 슬라이드하고 타이머를 리셋한다.
//
// 위치 계산은 전부 items[0].offsetWidth / viewport.clientWidth를 사용한다 — 이 값들은
// transform(scale 포함)의 영향을 받지 않는 레이아웃 값이라, 1920px 미만 화면에서도
// 별도 분기 없이 같은 좌표계로 동작한다. .heritage가 culture.html에서
// .stage/.page(반응형 scale 조상) 밖에 있는 건 이제 pin 때문이 아니라(더 이상 pin을
// 쓰지 않는다) 그 구조를 유지해도 무해하기 때문 — .heritage_pin_inner의
// --stage-scale 축소는 pin 여부와 무관하게 계속 필요하다.
function initHeritageArchive(prefersReducedMotion) {
  const section = document.querySelector('[data-heritage]');
  const viewport = document.querySelector('[data-heritage-viewport]');
  const track = document.querySelector('[data-heritage-track]');
  const items = Array.from(document.querySelectorAll('[data-heritage-item]'));
  const timelineFill = document.querySelector('[data-heritage-fill]');
  const dots = Array.from(document.querySelectorAll('[data-heritage-dot]'));
  if (!section || !viewport || !track || !items.length) return;

  const N = items.length;
  const images = items.map((item) => item.querySelector('.heritage_item_img img'));
  const copies = items.map((item) => item.querySelector('[data-heritage-copy]'));

  const ACTIVE_SCALE = 1;
  const INACTIVE_SCALE = 0.78;
  const INACTIVE_OPACITY = 0.4;
  const INACTIVE_GRAY = 38; // %
  const SEGMENT_SECONDS = 2; // 연혁 하나를 지나가는 데 걸리는 시간(멈췄다 훅 넘어가지 않고 쉬지 않고 일정한 속도로 계속 이동)
  const FIRST_STEP_DELAY = 0.3; // 섹션 진입 직후 움직이기 시작할 때까지의 대기 시간(들어오자마자 바로 시작하는 느낌)
  const LOOP_FADE_SECONDS = 0.3; // 마지막→처음 무한 루프 시 점프에 쓰는 페이드 시간

  function applyProgress(p) {
    const activeFloat = p * (N - 1);
    const activeIndex = Math.round(activeFloat);

    const itemWidth = items[0].offsetWidth || 460;
    const viewportWidth = viewport.clientWidth || itemWidth * N;
    const trackShift = viewportWidth / 2 - itemWidth / 2 - activeFloat * itemWidth;
    track.style.transform = `translate3d(${trackShift}px, 0, 0)`;

    items.forEach((item, i) => {
      const distance = Math.abs(activeFloat - i);
      const closeness = 1 - smoothstep(0, 1, distance);
      const scale = INACTIVE_SCALE + (ACTIVE_SCALE - INACTIVE_SCALE) * closeness;
      const opacity = INACTIVE_OPACITY + (1 - INACTIVE_OPACITY) * closeness;
      const gray = INACTIVE_GRAY * (1 - closeness);

      item.style.transform = `scale(${scale.toFixed(3)})`;
      item.style.opacity = opacity.toFixed(3);
      if (images[i]) images[i].style.filter = `sepia(0.12) saturate(0.88) grayscale(${gray.toFixed(1)}%)`;

      // 텍스트는 이미지보다 좁은 구간에서만 보이도록 해 "지금 이 연혁"에서만
      // 또렷하게 등장하는 느낌을 준다 (이미지처럼 이웃까지 은은히 걸치지 않음).
      const textCloseness = 1 - smoothstep(0.12, 0.5, distance);
      if (copies[i]) {
        copies[i].style.opacity = textCloseness.toFixed(3);
        copies[i].style.transform = `translate3d(0, ${((1 - textCloseness) * 12).toFixed(1)}px, 0)`;
      }
    });

    if (timelineFill) timelineFill.style.width = `${(p * 100).toFixed(2)}%`;
    dots.forEach((dot, i) => dot.classList.toggle('is_active', i === activeIndex));
  }

  if (prefersReducedMotion || typeof gsap === 'undefined') {
    // reduced-motion에서는 css/culture.css가 heritage_viewport를 가로 스크롤 목록으로
    // 바꾸고 모든 아이템을 강제로 ACTIVE 상태로 보여준다 — 여기서는 인라인 style을
    // 아예 건드리지 않고 dot만 전부 켜서 "전부 지나온 상태"로 맞춘다. 자동재생
    // 자체도 켜지 않는다(계속 움직이는 콘텐츠는 reduced-motion 취지에 어긋남).
    dots.forEach((dot) => dot.classList.add('is_active'));
    return;
  }

  const state = { p: 0 };
  let cycleTween = null;
  let paused = false; // hover 중
  // IntersectionObserver가 실제로 판정하기 전까지는 "아직 안 보인다"로 둔다.
  // 예전엔 true로 시작해서 페이지 로드 즉시(화면 밖인데도) 자동재생 타이머가
  // 돌기 시작했고, 나중에 실제로 스크롤해 들어왔을 땐 이미 몇 칸 지나가
  // 버려서 1932(첫 연혁)가 아니라 엉뚱한 연혁부터 보이는 문제가 있었다.
  let inView = false;

  applyProgress(0);

  const LAP_SECONDS = (N - 1) * SEGMENT_SECONDS; // 처음(1932)부터 마지막까지 한 바퀴 도는 전체 시간

  // p를 fromP에서 1(마지막 연혁)까지 쉬지 않고 일정한 속도(ease:'none')로
  // 계속 채운다 — 예전처럼 "한 칸 도착 후 잠깐 멈췄다가(HOLD) 훅
  // 넘어가는(TRANSITION)" 2단계 방식이 아니라, 트윈 하나가 끝까지 끊김
  // 없이 진행률을 밀어준다(자연스럽게 계속 움직이는 느낌). 끝에 닿으면
  // 살짝 페이드로 처음(p=0)으로 되돌아가 다음 바퀴를 새로 시작한다.
  function startLap(fromP, delay = 0) {
    if (cycleTween) cycleTween.kill();
    cycleTween = gsap.to(state, {
      p: 1,
      duration: Math.max(0.001, (1 - fromP) * LAP_SECONDS),
      delay,
      ease: 'none',
      onUpdate: () => applyProgress(state.p),
      onComplete: () => {
        gsap.to(track, {
          opacity: 0,
          duration: LOOP_FADE_SECONDS,
          ease: 'power1.in',
          onComplete: () => {
            state.p = 0;
            applyProgress(0);
            gsap.to(track, { opacity: 1, duration: LOOP_FADE_SECONDS * 1.3, ease: 'power1.out' });
            if (!paused && inView) startLap(0);
          },
        });
      },
    });
  }

  function stopCycle() {
    if (cycleTween) { cycleTween.kill(); cycleTween = null; }
  }

  // delay를 생략하면 지금 있는 자리(state.p)에서 바로 이어서 움직인다(hover
  // 해제 후 재개 등 — 처음으로 되돌아가지 않는다). 섹션에 막 들어온 경우만
  // 호출하는 쪽에서 state.p를 0으로 먼저 돌려둔 뒤 FIRST_STEP_DELAY를 넘겨
  // 들어오자마자 정지 화면처럼 안 보이고 바로 움직이기 시작하는 것처럼 한다.
  function maybeResumeCycle(delay) {
    if (!paused && inView) startLap(state.p, delay);
  }

  // 자동재생은 여기서 바로 시작하지 않는다 — 아래 IntersectionObserver가
  // 실제로 화면에 들어온 걸 확인한 시점에 (매번 1932부터) 시작한다.

  // 이미지를 올리면 정지, 벗어나면 재생 재개 — 섹션 전체(제목/타임라인 등
  // 여백 포함)가 아니라 실제 사진 위에 있을 때만 반응한다. 자동재생 중엔
  // 사진이 계속 움직이지만 pause되는 순간 트랙 자체가 멈추므로, 마우스가
  // 가만히 있어도 사진이 그 밑에서 빠져나가 mouseleave가 씹히는 일은 없다.
  items.forEach((item) => {
    const img = item.querySelector('.heritage_item_img');
    if (!img) return;
    img.addEventListener('mouseenter', () => { paused = true; stopCycle(); });
    img.addEventListener('mouseleave', () => { paused = false; maybeResumeCycle(); });
  });

  // 아래로 스크롤해 이 섹션에 처음 들어오는 순간, 스크롤을 잠깐(LOCK_MS)
  // 잠가 한 박자 눈에 담게 한다 — GSAP ScrollTrigger pin은 쓰지 않는다(그건
  // "스크롤이 진행률을 끄는" 방식이라 자동재생과 성격이 다르고, .stage/.page
  // 반응형 scale 조상과 얽히는 문제도 있다 — product_detail.html에서 실측
  // 확인된 사례). 대신 wheel/touch/키보드 스크롤 입력을 짧게 막는 가벼운
  // 방식으로 "한 번만 붙잡아 보여주는" 효과만 낸다 — 자동재생 타이머는 그대로
  // 계속 돈다. 세션당 한 번만 동작하고(hasLockedOnEntry), 위로 스크롤해
  // 들어오거나 이미 한 번 잠갔던 뒤에는 다시 걸지 않아 방해되지 않는다.
  const ENTRY_LOCK_MS = 1200;
  let lastScrollY = window.scrollY;
  let scrollingDown = true;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    scrollingDown = y >= lastScrollY;
    lastScrollY = y;
  }, { passive: true });

  let hasLockedOnEntry = false;
  const SCROLL_KEYS = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Spacebar'];
  function lockScrollOnce() {
    if (hasLockedOnEntry) return;
    hasLockedOnEntry = true;
    const preventWheelTouch = (e) => e.preventDefault();
    const preventKeyScroll = (e) => { if (SCROLL_KEYS.includes(e.key)) e.preventDefault(); };
    window.addEventListener('wheel', preventWheelTouch, { passive: false });
    window.addEventListener('touchmove', preventWheelTouch, { passive: false });
    window.addEventListener('keydown', preventKeyScroll);
    window.setTimeout(() => {
      window.removeEventListener('wheel', preventWheelTouch);
      window.removeEventListener('touchmove', preventWheelTouch);
      window.removeEventListener('keydown', preventKeyScroll);
    }, ENTRY_LOCK_MS);
  }

  // 화면 밖으로 스크롤되면 정지해 안 보이는 애니메이션에 리소스를 안 쓴다.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const wasInView = inView;
        inView = entry.isIntersecting;
        if (inView) {
          if (!wasInView) {
            // 화면에 들어올 때마다(처음 진입이든, 위로 스크롤했다 다시
            // 내려왔든) 항상 1932(첫 연혁)부터 다시 시작한다 — 안 보이는
            // 동안엔 트윈이 멈춰 있으니 사실 state.p가 이미 0이어야
            // 정상이지만, 혹시 모를 어긋남에 대비해 매번 명시적으로 되돌린다.
            stopCycle();
            gsap.killTweensOf(state);
            gsap.set(track, { opacity: 1 }); // 화면 밖으로 나가는 도중 루프 페이드가 끊겼을 경우 대비
            state.p = 0;
            applyProgress(0);
          }
          // wasInView가 false였던 경우(=방금 들어옴)엔 FIRST_STEP_DELAY로 빨리
          // 움직이기 시작하고, 이미 보이고 있던 채로(예: hover 해제) 재개하는
          // 경우엔 지금 있던 자리에서 바로 이어서 움직인다.
          maybeResumeCycle(wasInView ? undefined : FIRST_STEP_DELAY);
          if (scrollingDown) lockScrollOnce();
        } else {
          stopCycle();
        }
      });
    }, { threshold: 0.2 });
    io.observe(section);
  } else {
    // IntersectionObserver 미지원 브라우저: 가시성 판정 없이 그냥 바로 재생.
    inView = true;
    startLap(0, FIRST_STEP_DELAY);
  }

  // dot 클릭: 그 연혁으로 바로 슬라이드하고(멀리 있어도 거쳐가는 슬라이드가
  // 오히려 "몇 칸 이동했는지"를 보여줘서 자연스럽다 — 중간 연혁들을 그대로
  // 스쳐 지나가며 이동한다) 도착하면 자동재생을 그 자리에서 이어간다.
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      if (cycleTween) cycleTween.kill();
      const target = i / (N - 1);
      const distanceSteps = Math.abs(target - state.p) * (N - 1);
      const jumpDuration = Math.min(1.2, Math.max(0.35, distanceSteps * 0.12));
      gsap.to(state, {
        p: target,
        duration: jumpDuration,
        ease: 'power2.inOut',
        onUpdate: () => applyProgress(state.p),
        onComplete: () => maybeResumeCycle(),
      });
    });
  });
}

// ---- Green Results 카드 호버: "orange liquid bubbles rising" ----
// 카드 하단에서 작은 오렌지 버블들이 생성돼 떠오르며 서로 겹치고, 뒤이어
// 바닥에서부터 오렌지 mass가 차올라 마지막엔 버블과 이어져 카드 전체를
// 채운다(기존 CSS ::after 사각형 wipe와 최종 결과는 동일). 버블끼리 겹치는
// 부분이 자연스럽게 하나로 이어붙어 보이도록 순수 CSS filter(blur+contrast)
// "goo" 트릭을 함께 쓴다(SVG/WebGL 미사용 — css/culture.css .is_gooey 참고).
//
// gr_card_accent도 이제 다른 카드와 같은 기본 peach 배경에서 시작하므로
// 더 이상 예외 없이 전체 .gr_card가 대상이다. GSAP이 없거나 reduced-motion이면
// 아무 것도 하지 않고 조용히 끝나며, 이 경우 css/culture.css의 순수 CSS
// 사각형 wipe(:hover::after)가 그대로 fallback으로 동작한다.
function initGreenResultsLiquid(prefersReducedMotion) {
  const section = document.querySelector('.green_results');
  const cards = document.querySelectorAll('.gr_card');
  if (!section || !cards.length) return;
  if (prefersReducedMotion || typeof gsap === 'undefined') return;

  section.classList.add('gr_liquid_js'); // 순수 CSS wipe(::after)를 끄고 이 JS가 전담하도록

  // 작은/중간/큰 버블을 8:6:2 비율 정도로 섞는다(작은 게 더 자주 나오도록) —
  // 8~16px(작음) / 20~40px(중간) / 50~80px(큼) 세 구간.
  function randomBubbleSize() {
    const r = Math.random();
    if (r < 0.5) return 8 + Math.random() * 8;
    if (r < 0.85) return 20 + Math.random() * 20;
    return 50 + Math.random() * 30;
  }
  const BUBBLE_COUNT = window.innerWidth < 768 ? 10 : 18; // 모바일은 절반 수준으로 단순화

  cards.forEach((card) => {
    const liquid = document.createElement('div');
    liquid.className = 'gr_card_liquid';
    const mass = document.createElement('div');
    mass.className = 'gr_card_liquid_mass';
    liquid.appendChild(mass);
    card.insertBefore(liquid, card.firstChild); // 항상 title/desc/stat보다 먼저(=아래) 오도록 첫 자식으로

    // 액체 표면의 미세한 물결 — mass의 자식으로 둬서 top:0 기준이 mass의
    // "현재 높이"를 자동으로 따라간다(mass가 자라면 이 top:0도 같이 위로
    // 올라감 — 따로 위치 계산할 필요 없음). yPercent(-50)로 그 경계에 절반씩
    // 걸치게 하고, 세로 흔들림은 y(px)만 따로 얹어서 잔물결을 만든다.
    // 카드 폭에 비례해 개수를 정하고 폭 전체에 고르게 흩뿌려야, 넓은
    // 카드에서 물결 없는 구간이 일자 직선으로 남는 문제가 안 생긴다.
    const cardW = card.clientWidth;
    const WAVE_COUNT = cardW < 400 ? 3 : cardW < 600 ? 4 : 5;
    const waves = [];
    for (let i = 0; i < WAVE_COUNT; i++) {
      const el = document.createElement('span');
      el.className = 'gr_card_liquid_wave';
      const w = 60 + Math.random() * 50; // 60~110px
      el.style.width = w + 'px';
      el.style.height = (w * 0.24 + Math.random() * 6) + 'px'; // 납작한 타원 비율 유지
      // i번째 물결을 폭 전체에 고르게 나눠 배치하되, 칸 안에서 랜덤 오프셋을 줘
      // 기계적인 균등 배열처럼 보이지 않게 한다.
      const slot = ((i + 0.5) / WAVE_COUNT) * 100;
      el.style.left = Math.min(96, Math.max(4, slot + (Math.random() - 0.5) * (80 / WAVE_COUNT))) + '%';
      gsap.set(el, { xPercent: -50, yPercent: -50, opacity: 0 });
      mass.appendChild(el);
      waves.push({
        el,
        amp: 3 + Math.random() * 4, // 3~7px — 큰 파도가 아니라 잔물결
        duration: 1.3 + Math.random() * 1.1, // 1.3~2.4s
        delay: Math.random() * 0.7,
        lift: 0, // 가운데 잔물결은 mass 표면 높이 그대로, 얹혀서 흔들리기만 한다
      });
    }

    // "양옆에서 차오르는" 느낌: 카드 왼쪽/오른쪽 벽에 걸쳐 자리한 더 큰 서지
    // 2개 — 일반 잔물결과 같은 방식(mass 자식, top:0 기준 자동 추적)이지만
    // 항상 mass 표면보다 더 높게(lift) 떠 있어서 "물이 양쪽 벽을 타고 먼저
    // 올라와 있다"는 인상을 준다. left:0%/100% + xPercent:-50으로 절반은
    // 카드 밖으로 나가지만 liquid 레이어의 overflow:hidden이 그 절반을
    // 잘라내 벽에 반원처럼 들러붙은 모양이 된다. delay를 거의 0으로 둬서
    // 가운데 잔물결보다 먼저 자리잡는다.
    const sideW = Math.max(100, cardW * 0.24);
    [0, 100].forEach((leftPct) => {
      const el = document.createElement('span');
      el.className = 'gr_card_liquid_wave';
      el.style.width = sideW + 'px';
      el.style.height = (sideW * 0.32) + 'px';
      el.style.left = leftPct + '%';
      gsap.set(el, { xPercent: -50, yPercent: -50, opacity: 0 });
      mass.appendChild(el);
      waves.push({
        el,
        amp: 5 + Math.random() * 3, // 5~8px — 가운데보다 조금 더 크게 출렁
        duration: 1.7 + Math.random() * 0.6,
        delay: Math.random() * 0.15,
        lift: 20 + Math.random() * 8, // 20~28px — 항상 mass 표면보다 이만큼 더 높이 떠 있는다
      });
    });

    let tl = null;
    let waveTweens = [];
    let bubbles = []; // 매 hover마다 새로 만드는 <span> 엘리먼트들

    function clearBubbles() {
      bubbles.forEach((el) => el.remove());
      bubbles = [];
    }

    function startWaveBob() {
      waveTweens.forEach((t) => t.kill());
      // 각자의 기본 높이(lift)에서 시작해, 거기서 몇 px 더 위아래로 흔들린다
      // — 가운데 잔물결은 lift:0(표면에 붙어서만 출렁), 양옆 서지는 lift가
      // 커서 늘 표면 위로 솟아있는 상태로 흔들린다. opacity는 순간 팝인이
      // 아니라 각자의 delay에 맞춰 짧게 페이드인(특히 큰 양옆 서지가 갑자기
      // 튀어나오지 않도록).
      waves.forEach((w) => gsap.set(w.el, { opacity: 0, y: -w.lift }));
      // fade-in 트윈도 반드시 waveTweens에 같이 담아둔다 — delay가 아직 안
      // 지나 대기 중인 fade-in 트윈을 stopWaveBob()이 못 죽이면, opacity:0을
      // 강제로 찍어놔도 뒤늦게 그 fade-in이 시작되며 다시 1로 되돌려버리는
      // 버그가 있었다(호버 해제 후에도 물결/서지가 계속 남아 보이던 원인).
      waveTweens = [];
      waves.forEach((w) => {
        waveTweens.push(gsap.to(w.el, { opacity: 1, duration: .4, delay: w.delay, ease: 'sine.out' }));
        waveTweens.push(gsap.to(w.el, { y: -(w.lift + w.amp), duration: w.duration, delay: w.delay, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
      });
    }
    function stopWaveBob() {
      waveTweens.forEach((t) => t.kill());
      waveTweens = [];
      gsap.set(waves.map((w) => w.el), { opacity: 0, y: 0 });
    }

    // 버블마다 크기/시작 위치/속도/지연/좌우 흔들림을 조금씩 다르게 뽑아서
    // 전부 똑같이 움직이지 않게 한다 — "비눗방울"이 아니라 "액체 속 기포가
    // 제각각 천천히 올라오는" 느낌을 위함.
    function buildBubbles() {
      clearBubbles();
      const w = card.clientWidth;
      const h = card.clientHeight;
      for (let i = 0; i < BUBBLE_COUNT; i++) {
        const size = randomBubbleSize();
        const el = document.createElement('span');
        el.className = 'gr_card_bubble';
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        el.style.left = Math.random() * Math.max(0, w - size) + 'px';
        el.style.bottom = -size + 'px'; // 카드 바깥 아래에서 시작(bottom: -size)
        liquid.appendChild(el);
        el._rise = {
          duration: 0.7 + Math.random() * 0.6, // 0.7~1.3s
          delay: Math.random() * 0.5, // 순차적으로(stagger 대신 개별 랜덤 지연) 올라오도록
          drift: (Math.random() - 0.5) * 28, // 약하게 좌우로만 흔들림(-14~14px)
          riseTo: -(h * (0.55 + Math.random() * 0.55) + size), // 버블마다 다른 높이까지만 올라가고, 나머지는 mass가 채운다
        };
        bubbles.push(el);
      }
    }

    function enter() {
      if (tl) tl.kill();
      liquid.classList.add('is_gooey');
      buildBubbles();
      gsap.set(mass, { height: 0 });
      startWaveBob();

      tl = gsap.timeline();
      bubbles.forEach((el) => {
        const r = el._rise;
        gsap.set(el, { x: 0, y: 0, opacity: 0, scale: .6 });
        tl.to(el, {
          x: r.drift,
          y: r.riseTo,
          opacity: 1,
          scale: 1,
          duration: r.duration,
          ease: 'sine.out',
        }, r.delay);
      });
      // 버블이 먼저 어느 정도 쌓인 뒤(0.3s)부터 바닥의 mass가 차오르기
      // 시작해, 하나의 느린 트윈(1.5s)으로 처음부터 끝까지 균일하게 부드럽게
      // 올라간다 — 예전처럼 "70%까지 훅 올라갔다가 나머지를 채우는" 2단계
      // 방식은 초반이 너무 급해 보여서, sine.inOut 하나로 통일했다. 이후
      // 타임라인은 상대 offset('-=')이 아니라 timeline 시작 기준 절대 초
      // 단위로 배치해 순서를 헷갈리지 않게 한다.
      tl.to(mass, { height: '100%', duration: 1.5, ease: 'sine.inOut' }, .3) // 0.3 → 1.8
        .add(() => card.classList.add('is_liquid_filled'), 1.55) // 텍스트를 흰색으로 — mass가 거의 다 찼을 때
        .to(bubbles, { opacity: 0, duration: .35 }, 1.55) // 남은 버블 형태는 mass에 흡수되듯 페이드
        .add(stopWaveBob, 1.75); // 표면이 카드 꼭대기까지 다 차면 물결도 멈춘다(더 이상 보이는 표면이 없음)
    }

    function leave() {
      if (tl) tl.kill();
      card.classList.remove('is_liquid_filled');
      const leavingBubbles = bubbles;
      startWaveBob(); // 액체가 가라앉는 동안에도 표면이 다시 나타나 살짝 흔들리며 빠진다
      tl = gsap.timeline({
        onComplete: () => { clearBubbles(); liquid.classList.remove('is_gooey'); stopWaveBob(); },
      });
      // mass가 천천히 가라앉고, 남아있던 버블도 같이 옅어지며 가라앉는다
      // (완전 즉시 소멸이 아니라 "액체가 빠지는" 느낌으로 역재생. 올라올 때와
      // 통일감 있게 sine.inOut + 조금 더 느린 속도로 맞췄다).
      tl.to(mass, { height: 0, duration: .7, ease: 'sine.inOut' })
        .to(leavingBubbles, { opacity: 0, y: '+=20', duration: .4, ease: 'sine.in', stagger: .015 }, 0);
    }

    card.addEventListener('mouseenter', enter);
    card.addEventListener('mouseleave', leave);
  });
}
