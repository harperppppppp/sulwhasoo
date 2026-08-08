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

  function openLightbox(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    lightbox.classList.add('is_open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('is_open');
    lightboxImg.src = '';
    document.body.style.overflow = '';
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
  const revealTargets = document.querySelectorAll(
    '.skin_science_row, .philosophy_card, .gr_card, .raw_material_collage'
  );

  function handleRevealIntersect(entries, observer) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is_visible');
        observer.unobserve(entry.target);
      }
    });
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(handleRevealIntersect, { threshold: 0.15 });
    revealTargets.forEach((el) => {
      el.classList.add('will_reveal');
      io.observe(el);
    });
  }

  // ---- Hero: Scroll Expand (React Bits ScrollExpand, vanilla JS + GSAP ScrollTrigger port) ----
  // Must run BEFORE the Our Heritage pin below: GSAP measures each pinned trigger's
  // start position (and inserts its pin-spacer) at creation time. If Our Heritage were
  // created first, its cached start would be based on the hero's un-pinned height and
  // would end up overlapping the hero pins once their spacers push it further down.
  initScrollExpand(prefersReducedMotion);

  // ---- Our Heritage: turn vertical scroll into horizontal pin scroll ----
  const heritageViewport = document.querySelector('[data-heritage-viewport]');
  const heritageTrack = document.querySelector('[data-heritage-track]');

  if (heritageViewport && heritageTrack && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && !prefersReducedMotion) {
    const scrollDistance = heritageTrack.scrollWidth - heritageViewport.clientWidth;

    if (scrollDistance > 0) {
      gsap.to(heritageTrack, {
        x: -scrollDistance,
        ease: 'none',
        scrollTrigger: {
          trigger: '.heritage',
          start: 'top top',
          end: () => `+=${scrollDistance}`,
          scrub: true,
          pin: true,
          invalidateOnRefresh: true,
        },
      });
    }
  }
}

function smoothstep(edge0, edge1, x) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
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
