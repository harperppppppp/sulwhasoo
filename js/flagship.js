// Sulwhasoo · Flagship Store
// pages/flagship.html 전용 기능
document.addEventListener('DOMContentLoaded', () => {
  // ---- Hero "Enter" button: smooth scroll to the next section ----
  document.querySelectorAll('[data-scroll-to]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.querySelector(btn.getAttribute('data-scroll-to'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // ---- Gallery: drag-to-scroll horizontal strip ----
  const strip = document.querySelector('[data-drag-scroll]');
  if (strip) {
    let isDown = false;
    let startX = 0;
    let startScroll = 0;

    strip.addEventListener('pointerdown', (e) => {
      isDown = true;
      startX = e.clientX;
      startScroll = strip.scrollLeft;
      strip.setPointerCapture(e.pointerId);
    });
    strip.addEventListener('pointermove', (e) => {
      if (!isDown) return;
      strip.scrollLeft = startScroll - (e.clientX - startX);
    });
    strip.addEventListener('pointerup', () => { isDown = false; });
    strip.addEventListener('pointercancel', () => { isDown = false; });
  }

  // ---- Fade-in on scroll ----
  const revealTargets = document.querySelectorAll('.history-card, .guide__chang, .gallery__item');
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
});
