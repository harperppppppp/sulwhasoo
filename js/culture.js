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

    // ---- Our Approach: 컬럼이 먼저 나타나고, 그 다음 이어지는 궤도 구간이
    // 그려지는 순서를 하나의 타임라인으로 묶는다 — 오브 → 컬럼1 나타남 →
    // 구간0 그려짐 → 컬럼2 나타남 → 구간1 그려짐 → 컬럼3 나타남 → 구간2
    // 그려짐 → 구간3(오브로 마무리). 섹션에 충분히 도착했을 때(threshold 0.4)
    // 한 번만 재생한다. ----
    const approachScene = document.querySelector('[data-approach-scene]');
    const orbitSegs = Array.from(document.querySelectorAll('[data-approach-orbit-seg]'));
    const approachOrb = document.querySelector('.approach_orb');
    const approachCols = [1, 2, 3].map((n) => document.querySelector(`.approach_col[data-approach-order="${n}"]`));
    const approachDots = [
      document.querySelector('.approach_dot_l'),
      document.querySelector('.approach_dot_t'),
      document.querySelector('.approach_dot_r'),
    ];

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

    if (approachScene) {
      if (prefersReducedMotion) {
        playApproachSequence();
      } else {
        const approachIo = new IntersectionObserver((entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              playApproachSequence();
              observer.unobserve(entry.target);
            }
          });
        }, { threshold: 0.4 });
        approachIo.observe(approachScene);
      }
    }
  }

  // ---- Hero: Scroll Expand (React Bits ScrollExpand, vanilla JS + GSAP ScrollTrigger port) ----
  initScrollExpand(prefersReducedMotion);

  // ---- Hero: "Brand Story" Stroke Text (React Bits StrokeText, vanilla JS + GSAP port) ----
  initStrokeText(prefersReducedMotion);

  // ---- Hero Stage 3: Detailed Description Falling Text (React Bits FallingText, vanilla JS + Matter.js port) ----
  initFallingQuote(prefersReducedMotion);

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
    const quoteGroup = root.querySelector('[data-falling-text]');
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

        // 인용문이 실제로 거의 다 보였을 때만 FallingText hover 존을 켠다 —
        // 안 그러면 아직 이 문구가 보이지도 않는 Stage 1/2 동안 같은 화면 자리를
        // 지나가는 마우스만으로 단어가 미리 무너져버릴 수 있다.
        if (quoteGroup) quoteGroup.style.pointerEvents = inn > 0.85 ? 'auto' : 'none';
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

// ---- Hero Stage 3: FallingText (React Bits FallingText, vanilla JS + Matter.js port) ----
// hover 한 번으로 인용문의 단어들이 중력에 의해 무너져 내리는 이스터에그.
// hover 전(=기본 상태)은 지금과 완전히 동일한 정적 두 줄 문단이다 — 단어를
// span으로 쪼개는 것조차 hover가 실제로 들어왔을 때 처음 한다. Matter.js가
// CDN에서 로드되지 않았거나 reduced-motion이면 이 함수는 아무 것도 하지 않고
// 조용히 끝나서, 그 경우도 여전히 원래 정적 문단 그대로 남는다.
//
// pointer-events는 이 함수가 아니라 initScrollExpand가 관리한다 — 인용문이
// 실제로 화면에 다 나타났을 때만(Stage 3) hover를 받아야 하기 때문이다.
function initFallingQuote(prefersReducedMotion) {
  if (prefersReducedMotion || typeof Matter === 'undefined') return;

  const groups = document.querySelectorAll('[data-falling-text]');
  if (!groups.length) return;

  groups.forEach((group) => {
    const quotes = Array.from(group.querySelectorAll('[data-falling-quote]'));
    if (!quotes.length) return;

    let started = false;
    group.addEventListener('mouseenter', () => {
      if (started) return;
      started = true;
      dropFallingWords(group, quotes);
    });
  });
}

// 실제 물리 트리거: 문단을 단어 span으로 쪼개고, 지금 위치를 얼린 뒤,
// Matter.js 바디로 바꿔치기해서 중력으로 떨어뜨린다.
function dropFallingWords(group, quotes) {
  const { Engine, Runner, World, Bodies, Body, Mouse, MouseConstraint, Events } = Matter;

  // 아직 아무것도 손대지 않은, 정적 레이아웃 상태에서 크기를 먼저 잰다.
  const groupRect = group.getBoundingClientRect();
  const width = group.clientWidth;
  const height = group.clientHeight;
  // 단어들이 absolute로 빠져나가도 이 박스가 차지하던 자리(=주변 레이아웃)가
  // 흔들리지 않도록 지금 높이로 고정해둔다.
  group.style.height = `${height}px`;

  // 문단 텍스트를 단어(공백은 그대로 텍스트 노드로 보존) 단위 span으로 재구성.
  const words = [];
  quotes.forEach((quote) => {
    const text = quote.textContent;
    quote.textContent = '';
    text.split(/(\s+)/).forEach((token) => {
      if (!token) return;
      if (/^\s+$/.test(token)) {
        quote.appendChild(document.createTextNode(token));
        return;
      }
      const span = document.createElement('span');
      span.className = 'ft_word';
      span.textContent = token;
      quote.appendChild(span);
      words.push(span);
    });
  });

  // 아직 static인 상태에서 각 단어의 실제 위치(group 기준 좌표)를 캡처 —
  // 이 값 그대로 absolute+transform으로 옮겨 붙이면 전환 순간 한 프레임도 튀지 않는다.
  // tilt는 물리 회전과 별개로 미리 정해두는 고정 기울기(-5~5도) — 아래에서
  // 회전은 물리에 맡기지 않고 이 값 하나로만 표현해 "차분하게" 유지한다.
  const frames = words.map((word) => {
    const r = word.getBoundingClientRect();
    return {
      word,
      left: r.left - groupRect.left,
      top: r.top - groupRect.top,
      width: r.width,
      height: r.height,
      tilt: (Math.random() * 2 - 1) * 5,
    };
  });

  frames.forEach(({ word, left, top, width: w, height: h }) => {
    word.style.width = `${w}px`;
    word.style.height = `${h}px`;
    word.style.transform = `translate(${left}px, ${top}px)`;
    word.classList.add('ft_word_dropped');
  });

  // 문단 높이(정적 상태의 2줄 텍스트, ~150px)만으로는 떨어질 공간이 없어서
  // 실제로 낙하하는 느낌 없이 제자리에서 살짝 기울어지기만 했다 — 보이지 않는
  // 낙하 여유를 아래로 더 확보한다. 히어로 프레임(.scroll_expand) 자체가
  // overflow:hidden이라 여유를 넉넉히 줘도 프레임 밖으로 새지 않고 잘려서 안전하다.
  const FALL_ROOM = 320;
  const floorY = height + FALL_ROOM;

  const engine = Engine.create();
  engine.enableSleeping = true; // 다 떨어져서 멈춘 뒤에는 계산을 쉰다
  engine.world.gravity.y = 0.56;

  const ground = Bodies.rectangle(width / 2, floorY + 25, width * 2, 50, { isStatic: true });
  const leftWall = Bodies.rectangle(-25, floorY / 2, 50, floorY * 2, { isStatic: true });
  const rightWall = Bodies.rectangle(width + 25, floorY / 2, 50, floorY * 2, { isStatic: true });

  const bodies = frames.map(({ left, top, width: w, height: h }) => {
    const body = Bodies.rectangle(left + w / 2, top + h / 2, w, h, {
      restitution: 0.35,
      friction: 0.4,
      frictionAir: 0.02,
    });
    // 회전은 물리(충돌 토크)에 맡기지 않고 위에서 정한 고정 tilt로만 표현한다 —
    // 안 그러면 충돌마다 제각각 빙글빙글 돌아서 "차분한" 느낌과 멀어진다.
    Body.setInertia(body, Infinity);
    // 원래 나란히 붙어 있던 같은 줄 단어들이 뭉친 채로 겹쳐 내려앉지 않도록,
    // 살짝의 랜덤 수평 속도를 줘서 떨어지며 자연스럽게 벌어지게 한다.
    Body.setVelocity(body, { x: (Math.random() * 2 - 1) * 1.2, y: 0 });
    return body;
  });

  World.add(engine.world, [ground, leftWall, rightWall, ...bodies]);

  // 다 떨어진 뒤에도 마우스로 단어를 집어서 흩뜨릴 수 있게(원본 mouseConstraintStiffness와 동일한 취지)
  const mouse = Mouse.create(group);
  mouse.pixelRatio = 1;
  const mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: { stiffness: 0.9 },
  });
  World.add(engine.world, mouseConstraint);

  const runner = Runner.create();
  Runner.run(runner, engine);

  Events.on(engine, 'afterUpdate', () => {
    bodies.forEach((body, i) => {
      const { word, width: w, height: h, tilt } = frames[i];
      // 벽이 단어를 group 폭 안에 가둬주긴 하지만, 회전된 모서리가 살짝 튀어나오는
      // 경우까지 대비해 렌더링 좌표를 한 번 더 clamp — 오른쪽 끝 단어가 화면
      // 밖으로 잘리는 문제를 원인과 무관하게 막아준다.
      const left = Math.min(Math.max(body.position.x - w / 2, 0), width - w);
      const top = body.position.y - h / 2;
      word.style.transform = `translate(${left}px, ${top}px) rotate(${tilt}deg)`;
    });
  });
}

// ---- Our Heritage: Interactive Archive Timeline ----
// "스크롤 = 시간의 이동" — 섹션 전체를 pin한 뒤 스크롤 진행률(p, 0~1) 하나로
// ① heritage_track을 translateX해 현재 연혁을 항상 화면 중앙에 두고
// ② 중앙에서 멀어질수록 scale/opacity/grayscale을 낮춰 흐리게 만들고
// ③ 중앙 아이템의 연도 아래 설명만 슬라이드 인시키고
// ④ 하단 progress fill과 active dot을 같은 p로 갱신한다.
// hero의 scroll-expand(initScrollExpand)와 동일하게 "progress 하나 → 여러 스타일"
// 패턴을 그대로 따른다 — 매 프레임 inline style로 직접 쓰고 CSS transition은
// 걸지 않아, 위/아래 어느 방향으로 스크럽해도 버벅임 없이 그대로 되감긴다.
//
// 위치 계산은 전부 items[0].offsetWidth / viewport.clientWidth를 사용한다 — 이 값들은
// .page(1920px 고정 캔버스) 안에서는 실제 뷰포트 폭과 무관하게 항상 같은 값이라
// (transform:scale은 레이아웃 폭을 바꾸지 않는다), 1920px 미만 화면에서도 별도
// 분기 없이 같은 좌표계로 동작한다. pin 자체는 기존 hero pin과 동일한 설정
// (pin:true, invalidateOnRefresh:true)이라 .page의 반응형 scale 구조와도 같은
// 방식으로 맞물린다.
function initHeritageArchive(prefersReducedMotion) {
  const section = document.querySelector('[data-heritage]');
  const pinEl = document.querySelector('[data-heritage-pin]');
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
  const SCROLL_PER_STEP = 460; // 연혁 1칸 전환당 확보하는 스크롤 거리(디자인 기준 px)

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

  // dot을 클릭하면 해당 연혁이 정확히 ACTIVE가 되는 스크롤 위치로 이동한다.
  // 이 사이트는 Lenis(js/common.js)가 스크롤을 가로채므로 window.scrollTo가 아니라
  // lenis.scrollTo를 써야 실제로 반영된다(js/flagship.js와 동일한 패턴).
  function goToIndex(scrollTrigger, index) {
    const target = scrollTrigger.start + (scrollTrigger.end - scrollTrigger.start) * (index / (N - 1));
    const lenis = window.sulwhasooLenis;
    if (lenis && typeof lenis.scrollTo === 'function') {
      lenis.scrollTo(target, { duration: prefersReducedMotion ? 0 : 1 });
    } else {
      window.scrollTo({ top: target, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  }

  if (prefersReducedMotion || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    // reduced-motion에서는 css/culture.css가 heritage_viewport를 가로 스크롤 목록으로
    // 바꾸고 모든 아이템을 강제로 ACTIVE 상태로 보여준다 — 여기서는 인라인 style을
    // 아예 건드리지 않고 dot만 전부 켜서 "전부 지나온 상태"로 맞춘다.
    dots.forEach((dot) => dot.classList.add('is_active'));
    return;
  }

  applyProgress(0);

  const st = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => `+=${Math.round(SCROLL_PER_STEP * (N - 1))}`,
    scrub: 0.5,
    pin: true,
    // .page(반응형 canvas)가 좁은 뷰포트에서 transform:scale()로 축소되는데,
    // 그 밑에서 pin이 기본값(position:fixed)을 쓰면 고정 기준점이 실제
    // 뷰포트가 아니라 .page가 되어버려 화면 밖(빈 화면)으로 밀려난다 —
    // 1920px 이상에서는 안 보이던 문제라 narrow-viewport 테스트에서만 드러남.
    // 'transform'으로 강제하면 .page의 좌표계 안에서 고정돼 항상 화면에 보인다.
    pinType: 'transform',
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => applyProgress(self.progress),
  });

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => goToIndex(st, i));
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

    // 액체 표면의 미세한 물결 2개 — mass의 자식으로 둬서 top:0 기준이 mass의
    // "현재 높이"를 자동으로 따라간다(mass가 자라면 이 top:0도 같이 위로
    // 올라감 — 따로 위치 계산할 필요 없음). yPercent(-50)로 그 경계에 절반씩
    // 걸치게 하고, 세로 흔들림은 y(px)만 따로 얹어서 잔물결을 만든다.
    const wave1 = document.createElement('span');
    wave1.className = 'gr_card_liquid_wave';
    wave1.style.width = '86px';
    wave1.style.height = '22px';
    wave1.style.left = '26%';
    gsap.set(wave1, { xPercent: -50, yPercent: -50, opacity: 0 });
    const wave2 = document.createElement('span');
    wave2.className = 'gr_card_liquid_wave';
    wave2.style.width = '64px';
    wave2.style.height = '18px';
    wave2.style.left = '64%';
    gsap.set(wave2, { xPercent: -50, yPercent: -50, opacity: 0 });
    mass.appendChild(wave1);
    mass.appendChild(wave2);

    let tl = null;
    let waveTweens = [];
    let bubbles = []; // 매 hover마다 새로 만드는 <span> 엘리먼트들

    function clearBubbles() {
      bubbles.forEach((el) => el.remove());
      bubbles = [];
    }

    function startWaveBob() {
      waveTweens.forEach((t) => t.kill());
      gsap.set([wave1, wave2], { opacity: 1, y: 0 });
      // 서로 다른 주기/위상으로 몇 px만 위아래로 — 파도가 아니라 잔물결.
      waveTweens = [
        gsap.to(wave1, { y: -4, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
        gsap.to(wave2, { y: 3, duration: 1.9, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: .3 }),
      ];
    }
    function stopWaveBob() {
      waveTweens.forEach((t) => t.kill());
      waveTweens = [];
      gsap.set([wave1, wave2], { opacity: 0, y: 0 });
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
      // 버블이 어느 정도 쌓인 뒤(0.35s)부터 바닥의 mass가 차오르기 시작해,
      // 버블 상승이 끝나갈 즈음(1.25s) 카드 전체를 덮는다 — 처음부터
      // 사각형이 차오르는 게 보이지 않게 일부러 늦게 시작한다. 이후 타임라인은
      // 상대 offset('-=')이 아니라 timeline 시작 기준 절대 초 단위로 배치해
      // 순서를 헷갈리지 않게 한다.
      tl.to(mass, { height: '70%', duration: .5, ease: 'sine.in' }, .35)   // 0.35 → 0.85
        .to(mass, { height: '100%', duration: .45, ease: 'sine.out' }, .8) // 0.80 → 1.25
        .add(() => card.classList.add('is_liquid_filled'), .95) // 텍스트를 흰색으로 — mass가 거의 다 찼을 때
        .to(bubbles, { opacity: 0, duration: .35 }, .95) // 남은 버블 형태는 mass에 흡수되듯 페이드(0.95 → 1.30)
        .add(stopWaveBob, 1.2); // 표면이 카드 꼭대기까지 다 차면 물결도 멈춘다(더 이상 보이는 표면이 없음)
    }

    function leave() {
      if (tl) tl.kill();
      card.classList.remove('is_liquid_filled');
      const leavingBubbles = bubbles;
      startWaveBob(); // 액체가 가라앉는 동안에도 표면이 다시 나타나 살짝 흔들리며 빠진다
      tl = gsap.timeline({
        onComplete: () => { clearBubbles(); liquid.classList.remove('is_gooey'); stopWaveBob(); },
      });
      // mass가 가라앉고, 남아있던 버블도 같이 옅어지며 가라앉는다(완전 즉시
      // 소멸이 아니라 "액체가 빠지는" 느낌으로 역재생).
      tl.to(mass, { height: 0, duration: .5, ease: 'sine.in' })
        .to(leavingBubbles, { opacity: 0, y: '+=20', duration: .35, ease: 'sine.in', stagger: .015 }, 0);
    }

    card.addEventListener('mouseenter', enter);
    card.addEventListener('mouseleave', leave);
  });
}
