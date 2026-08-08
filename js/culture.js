// Sulwhasoo · Culture page interactions
document.addEventListener('DOMContentLoaded', handleDomContentLoaded);

function handleDomContentLoaded() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  // ---- Our Heritage: 박물관 전시대처럼 스크롤과 무관하게 자동으로 무한 루프
  // 재생되는 가로 마퀴. 콘텐츠를 통째로 복제해 이어붙이고 트랙을 정확히
  // 자기 너비의 50%만큼 계속 이동시키면, 절반 지점(=복제본 시작 지점)에서
  // 다음 루프로 넘어가도 이음매가 보이지 않는다. 호버 시 일시정지. ----
  const heritageViewport = document.querySelector('[data-heritage-viewport]');
  const heritageTrack = document.querySelector('[data-heritage-track]');

  if (heritageViewport && heritageTrack && typeof gsap !== 'undefined' && !prefersReducedMotion) {
    const PIXELS_PER_SECOND = 55;
    const halfWidth = heritageTrack.scrollWidth / 2;

    if (halfWidth > 0) {
      const duration = halfWidth / PIXELS_PER_SECOND;
      const marquee = gsap.to(heritageTrack, {
        xPercent: -50,
        ease: 'none',
        duration,
        repeat: -1,
      });

      heritageViewport.addEventListener('mouseenter', () => marquee.pause());
      heritageViewport.addEventListener('mouseleave', () => marquee.resume());
    }
  }

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
