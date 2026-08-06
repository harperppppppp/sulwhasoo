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

  // ---- Add to cart feedback ----
  const cartBtn = document.querySelector('.hero_cart_btn');

  function handleAddToCart() {
    cartBtn.textContent = '/ Added ✓';
    setTimeout(() => { cartBtn.textContent = '/ Add to Cart'; }, 1800);
  }

  if (cartBtn) {
    cartBtn.addEventListener('click', handleAddToCart);
  }
});
