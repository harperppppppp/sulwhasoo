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

    function updateNo1() {
      const rect = no1.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;

      const scale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * progress;
      no1Figure.style.transform = `scale(${scale})`;

      const labelProgress = Math.min(Math.max((progress - 0.8) / 0.2, 0), 1);
      no1Label.style.opacity = String(labelProgress);
      no1Figure.style.opacity = String(1 - labelProgress * 0.6);
    }

    updateNo1();
    window.addEventListener('scroll', updateNo1, { passive: true });
    window.addEventListener('resize', updateNo1);
  }

  // ---- Ingredient carousel dots ----
  function setupCarousel(trackSelector, dotsSelector, cardSelector) {
    const track = document.querySelector(trackSelector);
    const dotsWrap = document.querySelector(dotsSelector);
    if (!track || !dotsWrap) return;

    const cards = Array.from(track.querySelectorAll(cardSelector));
    cards.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => {
        track.scrollTo({ left: cards[i].offsetLeft, behavior: 'smooth' });
      });
      dotsWrap.appendChild(dot);
    });

    const dots = Array.from(dotsWrap.children);

    function updateActiveDot() {
      const index = Math.round(track.scrollLeft / track.clientWidth);
      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
    }

    updateActiveDot();
    track.addEventListener('scroll', updateActiveDot, { passive: true });
  }

  setupCarousel('[data-ingredient-track]', '[data-ingredient-dots]', '.ingredient__card');
  setupCarousel('[data-ritual-track]', '[data-ritual-dots]', '.ritual__card');

  // ---- Fade-in on scroll ----
  const revealTargets = document.querySelectorAll('.review, .benefit__row');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealTargets.forEach((el) => {
      el.classList.add('will-reveal');
      io.observe(el);
    });
  }

  // ---- Add to cart feedback ----
  const cartBtn = document.querySelector('.hero__cart-btn');
  if (cartBtn) {
    cartBtn.addEventListener('click', () => {
      cartBtn.textContent = '/ Added ✓';
      setTimeout(() => { cartBtn.textContent = '/ Add to Cart'; }, 1800);
    });
  }
});
