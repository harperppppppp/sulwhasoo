// Sulwhasoo · Product Detail
// pages/product_detail.html 전용 기능
document.addEventListener('DOMContentLoaded', () => {

  // ---- NO.1 pinned scroll-zoom ----
  const no1 = document.querySelector('[data-no1]');
  const no1Figure = document.querySelector('[data-no1-figure]');
  const no1Label = document.querySelector('[data-no1-label]');

  if (no1 && no1Figure && no1Label) {
    const MIN_SCALE = 1;
    const MAX_SCALE = 13;

    function handleNo1Scroll() {
      const rect = no1.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;

      const scale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * progress;
      no1Figure.style.transform = `scale(${scale})`;

      const labelProgress = Math.min(Math.max((progress - 0.8) / 0.2, 0), 1);
      no1Label.style.opacity = String(labelProgress);
      no1Figure.style.opacity = String(1 - labelProgress * 0.6);
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

  // ---- Ingredient / ritual carousel dots ----
  function setupCarousel(trackSelector, dotsSelector, cardSelector) {
    const track = document.querySelector(trackSelector);
    const dotsWrap = document.querySelector(dotsSelector);
    if (!track || !dotsWrap) return;

    const cards = Array.from(track.querySelectorAll(cardSelector));

    function handleDotClick(index) {
      track.scrollTo({ left: cards[index].offsetLeft, behavior: 'smooth' });
    }

    cards.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel_dot';
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => handleDotClick(i));
      dotsWrap.appendChild(dot);
    });

    const dots = Array.from(dotsWrap.children);

    function handleTrackScroll() {
      const index = Math.round(track.scrollLeft / track.clientWidth);
      dots.forEach((dot, i) => dot.classList.toggle('is_active', i === index));
    }

    handleTrackScroll();
    track.addEventListener('scroll', handleTrackScroll, { passive: true });
  }

  setupCarousel('[data-ingredient-track]', '[data-ingredient-dots]', '.ingredient_card');
  setupCarousel('[data-ritual-track]', '[data-ritual-dots]', '.ritual_card');

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

  document.querySelectorAll('.cube3d').forEach(initCube3D);

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
