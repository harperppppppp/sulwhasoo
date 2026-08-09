// Sulwhasoo · Product Detail
// pages/product_detail.html 전용 기능
document.addEventListener('DOMContentLoaded', () => {

  // ---- Responsive stage: scale the fixed 1920px canvas to fit narrower
  // viewports (360 / 768 / 1280) so no breakpoint ever gets a horizontal
  // scrollbar. At >=1920px this is scale(1), i.e. unchanged. ----
  const stage = document.querySelector('[data-scale-stage]');
  const page = stage ? stage.querySelector('.page') : null;
  if (stage && page) {
    const handleStageResize = () => {
      const scale = Math.min(1, window.innerWidth / 1920);
      // scale(1)은 시각적으로 변화가 없지만, transform 자체가 걸리는 순간
      // position:fixed/sticky 자식들의 containing block이 바뀌어 GSAP pin,
      // 스크롤 스티키 리빌 등이 깨진다. 데스크톱(스케일 불필요)에서는
      // transform을 아예 걸지 않아 이 부작용을 피한다.
      page.style.transform = scale < 1 ? 'scale(' + scale + ')' : '';
      stage.style.height = scale < 1 ? (page.scrollHeight * scale) + 'px' : '';
    };
    handleStageResize();
    window.addEventListener('resize', handleStageResize);
    window.addEventListener('load', handleStageResize);
  }

  // ---- NO.1 pinned scroll-zoom → golden image → benefit_img handoff ----
  // NO.1(확대 1→13배 + 라벨 등장, 기존 400vh 몫)에 이어 같은 .no1_pin sticky
  // 컨테이너 안에서 golden image(benefit-img.png 재사용, 신규 300vh 몫)가
  // 등장→유지→축소·이동한다. 같은 pin 안에서 이어지므로 섹션이 바뀌며
  // 끊기는 대신 스크롤 내내 하나의 컨테이너 위에서 자연스럽게 이어진다.
  // phase1(확대/라벨)의 진행률 공식은 기존 그대로이고, .no1 섹션이 늘어나도
  // 페이싱이 달라지지 않도록 분모만 고정값(innerHeight*3, 오늘의 400vh 섹션
  // - 100vh pin과 수치상 동일)으로 분리했다.
  const no1 = document.querySelector('[data-no1]');
  const no1Figure = document.querySelector('[data-no1-figure]');
  const no1Label = document.querySelector('[data-no1-label]');
  const no1GoldenImg = document.querySelector('[data-no1-golden-img]');
  const benefitSection = document.querySelector('.benefit');
  const benefitImgEl = document.querySelector('.benefit_img');
  const pageEl = document.querySelector('.page');

  if (no1 && no1Figure && no1Label) {
    const MIN_SCALE = 1;
    const MAX_SCALE = 13;
    // 라벨(ANTI-AGING SERUM / IN KOREA)은 확대 초반(LABEL_START)부터 서서히
    // 나타나 LABEL_END 이후로는 확대가 끝날 때까지 계속 보인다(확대 마지막
    // 20%에만 반짝 보이던 이전 방식 대신, "확대되는 동안 계속 보이게").
    const LABEL_START = 0.35;
    const LABEL_END = 0.6;
    // phase2(golden image) 타임라인: 확대가 끝난 뒤 TEXT_HOLD까지는 라벨이
    // 그대로 유지되다가("완료시" 바로 바뀌지 않고 한 박자 쉬고), TEXT_HOLD~
    // FADE_END 구간에서 텍스트→이미지로 자연스럽게 전환되고, HOLD_END까지
    // 이미지가 크게 유지된 뒤 1까지 benefit_img 자리로 축소·이동한다.
    const TEXT_HOLD = 0.08;
    const FADE_END = 0.26;
    const HOLD_END = 0.6;

    function getStageScale() {
      // .page가 좁은 화면에서 transform:scale()이 걸리면 position:fixed 자식의
      // containing block이 .page로 바뀌므로, 실제 렌더 좌표를 이 배율로
      // 나눠서 넣어야 화면에 보이는 위치가 맞는다. 데스크톱(scale 없음)은 1.
      if (!pageEl || !pageEl.offsetWidth) return 1;
      return pageEl.getBoundingClientRect().width / pageEl.offsetWidth || 1;
    }

    // phase1(확대/라벨)이 쓰는 스크롤 거리 — rect.top/rect.height는 항상
    // getBoundingClientRect()의 "렌더된(스케일 적용 후)" 좌표이므로, 좁은
    // 화면에서 .page에 걸리는 반응형 축소(stageScale)도 같이 곱해줘야
    // scrolled와 같은 단위가 되어 비교가 맞는다. 데스크톱(stageScale=1)에서는
    // innerHeight*3 그대로라 기존 페이싱과 동일하다.
    function getPhase1Range(stageScale) {
      return window.innerHeight * 3 * stageScale;
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    function handleNo1Scroll() {
      const rect = no1.getBoundingClientRect();
      const scrolled = Math.max(-rect.top, 0);
      const stageScale = getStageScale();
      const phase1Range = getPhase1Range(stageScale);
      const p1 = Math.min(Math.max(scrolled / phase1Range, 0), 1);

      const scale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * p1;
      no1Figure.style.transform = `scale(${scale})`;

      const labelProgress = Math.min(Math.max((p1 - LABEL_START) / (LABEL_END - LABEL_START), 0), 1);
      no1Label.style.opacity = String(labelProgress);
      no1Figure.style.opacity = String(1 - labelProgress * 0.6);

      if (!no1GoldenImg || !benefitSection || !benefitImgEl) return;

      const stickRange = rect.height - window.innerHeight;
      const phase2Range = Math.max(stickRange - phase1Range, 1);
      const p2 = Math.min(Math.max((scrolled - phase1Range) / phase2Range, 0), 1);

      // golden image는 benefit_img 자리에 도착(p2>=1, shrinkT=1)한 뒤로는
      // 그 자리를 영구적으로 대신한다 — benefit_img 안에는 실제 <img>가
      // 없으므로(삭제됨) 여기서부터는 매 프레임 실제 benefit_img div의 현재
      // 화면 좌표를 그대로 따라간다(스크롤이 더 진행돼 Product_Benefit이
      // 화면 위로 넘어가면 golden image도 함께 화면 밖으로 나간다).
      if (p2 >= 1) {
        no1Figure.style.opacity = '0';
        no1Label.style.opacity = '0';
        const liveRect = benefitImgEl.getBoundingClientRect();
        no1GoldenImg.style.left = liveRect.left + 'px';
        no1GoldenImg.style.top = liveRect.top + 'px';
        no1GoldenImg.style.width = liveRect.width + 'px';
        no1GoldenImg.style.height = liveRect.height + 'px';
        no1GoldenImg.style.transform = 'none';
        no1GoldenImg.style.opacity = '1';
        return;
      }

      // NO.1 문구 → golden image: 확대가 끝난 뒤 TEXT_HOLD까지는 문구가 그대로
      // 유지되다가, TEXT_HOLD~FADE_END 구간에서 같은 자리에서 문구가 옅어지며
      // 이미지가 짙어진다(별개의 fade-out/fade-in이 아니라 "확대→유지→전환→
      // 유지→이동" 시퀀스의 한 구간).
      const fade = p2 <= TEXT_HOLD ? 0 : Math.min((p2 - TEXT_HOLD) / (FADE_END - TEXT_HOLD), 1);
      no1Figure.style.opacity = String((1 - labelProgress * 0.6) * (1 - fade));
      no1Label.style.opacity = String(labelProgress * (1 - fade));

      if (fade <= 0) {
        no1GoldenImg.style.opacity = '0';
        return;
      }

      // "크게 유지"되는 시작 상태 — Figma에 없는 신규 구간이라 뷰포트 기준으로
      // 정한 값(정사각형, benefit-img.png 원본 비율 1:1 유지, 임의 px 없음).
      const largeSize = Math.min(window.innerWidth, window.innerHeight) * 0.6;
      const largeRect = {
        left: (window.innerWidth - largeSize) / 2,
        top: (window.innerHeight - largeSize) / 2,
        width: largeSize,
        height: largeSize,
      };

      // 도착 지점(benefit_img)은 실측값. .no1 pin이 끝나는 순간 .benefit
      // 상단이 뷰포트 top(0)에 맞물리므로(현재도 그렇게 다음 섹션으로 이어짐),
      // benefit_img가 benefit 상단에서 떨어진 상대 오프셋이 곧 최종 화면
      // 좌표가 된다. 좌표를 하드코딩하지 않고 매 프레임 실측한다.
      const benefitImgRect = benefitImgEl.getBoundingClientRect();
      const benefitRect = benefitSection.getBoundingClientRect();
      const targetRect = {
        left: benefitImgRect.left,
        top: benefitImgRect.top - benefitRect.top,
        width: benefitImgRect.width,
        height: benefitImgRect.height,
      };

      // no1GoldenImg는 .page(반응형 스케일이 걸리는 조상) 바깥, body 최상위에
      // 있으므로 getBoundingClientRect() 값을 그대로 써도 된다 — 스케일
      // 보정(stageScale 나누기)이 필요 없다(sul_scene_canvas와 동일한 이유).
      no1GoldenImg.style.left = targetRect.left + 'px';
      no1GoldenImg.style.top = targetRect.top + 'px';
      no1GoldenImg.style.width = targetRect.width + 'px';
      no1GoldenImg.style.height = targetRect.height + 'px';
      no1GoldenImg.style.opacity = String(fade);

      // FLIP: 기준 박스를 benefit_img(target)에 두고, "크게 유지" 상태를
      // translate+scale로 흉내낸 뒤 진행률에 따라 identity(=target)로 되돌린다.
      const dx = largeRect.left - targetRect.left;
      const dy = largeRect.top - targetRect.top;
      const scaleX = largeRect.width / targetRect.width;
      const scaleY = largeRect.height / targetRect.height;

      const shrinkT = Math.min(Math.max((p2 - HOLD_END) / (1 - HOLD_END), 0), 1);
      const tx = dx * (1 - shrinkT);
      const ty = dy * (1 - shrinkT);
      const sx = lerp(scaleX, 1, shrinkT);
      const sy = lerp(scaleY, 1, shrinkT);
      no1GoldenImg.style.transform = `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`;
    }

    handleNo1Scroll();
    window.addEventListener('scroll', handleNo1Scroll, { passive: true });
    window.addEventListener('resize', handleNo1Scroll);
  }

  // ---- message_title word-by-word reveal (pinned scroll) ----
  // message_reveal 섹션이 스크롤 동안 고정(position: sticky)되고, 그 사이
  // message_title의 각 단어가 순서대로 #BFBFBF → 검정(#2c2d32)으로 바뀐다.
  // 단어 색이 다 채워지고 나면(progress > WORDS_END) 이어서 message_desc가
  // 나타난다. ContentBlock 3(message_round_img)도 이 안에 있어, 같은 구간 동안
  // js/detail_scene.js가 3D 병을 그 자리에 고정된 것처럼 계속 그려준다.
  const messageReveal = document.querySelector('[data-message-reveal]');
  const revealWords = document.querySelectorAll('[data-reveal-title] .reveal_word');
  const revealDesc = document.querySelector('[data-reveal-desc]');

  if (messageReveal && revealWords.length) {
    const GRAY = [0xbf, 0xbf, 0xbf];
    const INK = [0x2c, 0x2d, 0x32];
    const WORDS_END = 0.7; // 단어 리빌은 진행률의 70%까지만 쓰고, 나머지 30%에 desc가 나타난다

    function lerpColor(from, to, amount) {
      const r = Math.round(from[0] + (to[0] - from[0]) * amount);
      const g = Math.round(from[1] + (to[1] - from[1]) * amount);
      const b = Math.round(from[2] + (to[2] - from[2]) * amount);
      return `rgb(${r}, ${g}, ${b})`;
    }

    function smoothstep(value) {
      const t = Math.min(Math.max(value, 0), 1);
      return t * t * (3 - 2 * t);
    }

    function handleRevealScroll() {
      const rect = messageReveal.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;

      const count = revealWords.length;
      revealWords.forEach((word, index) => {
        const start = (index / count) * WORDS_END;
        const end = ((index + 1) / count) * WORDS_END;
        const amount = smoothstep((progress - start) / (end - start));
        word.style.color = lerpColor(GRAY, INK, amount);
      });

      if (revealDesc) {
        const amount = smoothstep((progress - WORDS_END) / (1 - WORDS_END));
        revealDesc.style.opacity = String(amount);
        revealDesc.style.transform = `translateY(${(1 - amount) * 16}px)`;
      }
    }

    handleRevealScroll();
    window.addEventListener('scroll', handleRevealScroll, { passive: true });
    window.addEventListener('resize', handleRevealScroll);
  }

  // ---- JAUM Ingredient: 일반 스크롤 리빌 (pin 없음) ----
  // 화면을 붙잡지 않는다 — 5개 성분이 문서 흐름 그대로 쌓여 있고, 각각
  // 뷰포트에 들어오면 .review/.benefit_row와 같은 1회성 IntersectionObserver
  // 리빌로 아래→위(opacity+translateY) 나타난다. 하단 진행바/목록은 no1/sales와
  // 같은 방식(hand-rolled scroll 리스너 + getBoundingClientRect progress)으로
  // "지금 보고 있는 성분"만 갱신한다 — ScrollTrigger.pin 미사용.
  function initJaumIngredient() {
    const section = document.querySelector('[data-ingredient]');
    const slides = document.querySelectorAll('[data-ingredient-slide]');
    const listItems = document.querySelectorAll('[data-ingredient-list] li');
    const barFill = document.querySelector('[data-ingredient-bar-fill]');
    if (!section || !slides.length) return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (reducedMotionQuery.matches || !('IntersectionObserver' in window)) {
      // reduced-motion(또는 IntersectionObserver 미지원) fallback: 애니메이션 없이
      // 전부 바로 보이게 둔다(CSS의 prefers-reduced-motion 규칙과 동일한 결과).
      slides.forEach((slide) => slide.classList.add('is_visible'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is_visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      slides.forEach((slide) => io.observe(slide));
    }

    if (!listItems.length && !barFill) return;

    let activeIndex = -1;

    function updateHud() {
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;
      if (barFill) barFill.style.transform = `scaleX(${progress})`;

      // 뷰포트 중앙에 가장 가까운 성분을 "지금 보고 있는 성분"으로 표시한다.
      const viewportCenter = window.innerHeight / 2;
      let closestIndex = 0;
      let closestDist = Infinity;
      slides.forEach((slide, i) => {
        const r = slide.getBoundingClientRect();
        const dist = Math.abs(r.top + r.height / 2 - viewportCenter);
        if (dist < closestDist) { closestDist = dist; closestIndex = i; }
      });
      if (closestIndex !== activeIndex) {
        activeIndex = closestIndex;
        listItems.forEach((li, i) => li.classList.toggle('is_active', i === closestIndex));
      }
    }

    updateHud();
    window.addEventListener('scroll', updateHud, { passive: true });
    window.addEventListener('resize', updateHud);
  }

  initJaumIngredient();

  // ---- RITUAL / HOW TO USE: scroll-driven Step 1→2→3 transition ----
  // Figma 디자이너 노트대로 좌우 캐러셀 대신, ingredient 섹션과 같은 패턴
  // (섹션 진입 시 pin, 스크롤 진행률 0~1을 3등분)으로 Step을 전환한다.
  // kicker/heading은 세 Step에서 동일해 그대로 두고, 이미지·설명·Step
  // 표시(is_active)만 인덱스에 맞춰 토글한다.
  function initRitual() {
    const section = document.querySelector('[data-ritual]');
    const pinTarget = document.querySelector('[data-ritual-pin]');
    const card = document.querySelector('[data-ritual-card]');
    const slides = document.querySelectorAll('[data-ritual-slide]');
    const descs = document.querySelectorAll('[data-ritual-desc]');
    const stepItems = document.querySelectorAll('[data-ritual-steps] li');
    if (!section || !pinTarget || !slides.length) return;

    // .ritual_pin은 항상 100vh(+overflow:hidden)라, 뷰포트가 1080px보다 낮으면
    // 1920x1080 카드가 그대로는 넘쳐서 잘린다(Step 표시가 화면 밖으로 사라지는
    // 원인). NO.1 섹션의 getStageScale()과 같은 방식으로 .page의 현재
    // width 스케일을 구해 "로컬 좌표계 기준 가용 높이"를 계산하고, 그 안에
    // 1080px가 다 들어오도록 카드를 축소한다 — gsap/pin 여부와 무관하게
    // 항상 적용해야 reduced-motion fallback에서도 잘리지 않는다.
    function updateCardScale() {
      if (!card) return;
      const pageEl = document.querySelector('.page');
      let stageScale = 1;
      if (pageEl && pageEl.offsetWidth) {
        stageScale = (pageEl.getBoundingClientRect().width / pageEl.offsetWidth) || 1;
      }
      const availableLocalHeight = window.innerHeight / stageScale;
      const scale = Math.min(1, availableLocalHeight / 1080);
      card.style.transform = `scale(${scale})`;
    }
    updateCardScale();
    window.addEventListener('resize', updateCardScale);

    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    // reduced-motion에서는 pin으로 스크롤을 가두지 않는다 — Step 1이 보이는
    // 정적인 섹션으로 두고, 콘텐츠는 그대로 다 보이게 fallback한다.
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotionQuery.matches) return;

    const total = slides.length;
    let activeIndex = 0;

    function setActive(index) {
      activeIndex = index;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is_active', i === index);
        slide.classList.toggle('is_prev', i < index);
      });
      descs.forEach((desc, i) => {
        desc.classList.toggle('is_active', i === index);
        desc.classList.toggle('is_prev', i < index);
      });
      stepItems.forEach((li, i) => li.classList.toggle('is_active', i === index));
    }

    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => '+=' + window.innerHeight * total, // Step 1개당 화면 높이만큼 스크롤
      pin: pinTarget,
      scrub: true,
      onUpdate(self) {
        let index = Math.floor(self.progress * total);
        if (index >= total) index = total - 1;
        if (index !== activeIndex) setActive(index);
      },
    });
  }

  initRitual();

  // ---- Fade-in on scroll ----
  const revealTargets = document.querySelectorAll('.review, .benefit_row');

  function handleReveal(entries, observer) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is_visible');
        observer.unobserve(entry.target);
      }
    });
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(handleReveal, { threshold: 0.15 });
    revealTargets.forEach((el) => {
      el.classList.add('will_reveal');
      io.observe(el);
    });
  }

  // ---- Cube 3D: hover 시 정육면체 회전 (cube3d_body 하나만 GSAP으로 제어) ----
  // otsuka-air.jp/product/zeroz "/ Purchase" 버튼의 원리를 참고: 회전은 항상
  // 큐브 전체(.cube3d_body)에 한 번에 걸고, 각 면을 따로 움직이지 않는다.
  // CSS transition이 아니라 GSAP으로 매 프레임 transform을 직접 쓰는 이유는
  // 브라우저의 transform 보간 로직에 기대지 않고 값을 그대로 확정하기 위함.
  // [data-cube-hover]로 범위를 한정한다 — .cube3d는 sales 큐브(스크롤로 회전)에도
  // 재사용되는 "perspective 껍데기" 클래스라, hover 동작까지 같이 붙으면 안 된다.
  function initCube3D(root) {
    const body = root.querySelector('.cube3d_body');
    if (!body) return;

    const state = { rx: 0 };

    function render() {
      body.style.transform = `rotateX(${state.rx}deg)`;
    }

    function rotateTo(value) {
      if (typeof gsap !== 'undefined') {
        gsap.to(state, { rx: value, duration: 0.6, ease: 'power3.out', onUpdate: render, overwrite: true });
      } else {
        // GSAP이 없는 경우를 위한 폴백: 즉시 반영
        state.rx = value;
        render();
      }
    }

    root.addEventListener('mouseenter', () => rotateTo(180));
    root.addEventListener('mouseleave', () => rotateTo(0));
    root.addEventListener('focusin', () => rotateTo(180));
    root.addEventListener('focusout', () => rotateTo(0));

    render();
  }

  document.querySelectorAll('[data-cube-hover]').forEach(initCube3D);

  // ---- Sales cube: 스크롤에 맞춰 Y축으로 회전하며 01→02→03 전환 ----
  // otsuka-air.jp/product/zeroz의 Feature 섹션처럼, 이미지(cube)는 sticky로
  // 고정되고 텍스트(.sales_item ×3)는 일반 문서 흐름으로 쌓여 있어 스크롤로
  // 자연스럽게 밀려 올라온다 — 그래서 텍스트 쪽은 opacity 토글이 필요 없다.
  // 회전 진행률은 no1 섹션과 같은 방식(getBoundingClientRect)으로 구한다:
  // .sales_scroller가 화면에 자리잡기 전까지는 rect.top이 양수라 progress가
  // 0으로 고정되므로, 스크롤 진입 즉시가 아니라 섹션이 실제로 제자리에 온
  // 뒤부터 회전이 시작된다.
  function initSalesCube() {
    const pinWrap = document.querySelector('[data-sales-pin]');
    const body = document.querySelector('[data-sales-cube] .cube3d_body');
    if (!pinWrap || !body) return;

    function handleSalesScroll() {
      const rect = pinWrap.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;
      body.style.transform = `rotateY(${-180 * progress}deg)`;
    }

    handleSalesScroll();
    window.addEventListener('scroll', handleSalesScroll, { passive: true });
    window.addEventListener('resize', handleSalesScroll);
  }

  initSalesCube();

  // ---- Add to cart feedback ----
  // 큐브(hero_cart)가 앞/뒷면에 각각 버튼을 하나씩 담고 있으므로(총 2개),
  // 어느 면이 보이든 눌렀을 때 둘 다 같은 피드백을 보여준다.
  const cartBtns = document.querySelectorAll('.hero_cart_btn');

  function handleAddToCart() {
    cartBtns.forEach((btn) => { btn.textContent = '/ Added ✓'; });
    setTimeout(() => {
      cartBtns.forEach((btn) => { btn.textContent = '/ Add to Cart'; });
    }, 1800);
  }

  cartBtns.forEach((btn) => { btn.addEventListener('click', handleAddToCart); });
});
