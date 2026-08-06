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

  // ---- Hero "Enter" button: scroll to the next section ----
  function handleScrollToClick(event) {
    var target = document.querySelector(event.currentTarget.getAttribute('data-scroll-to'));
    if (target) target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }
  document.querySelectorAll('[data-scroll-to]').forEach((btn) => {
    btn.addEventListener('click', handleScrollToClick);
  });

  // ---- Gallery: drag-to-scroll horizontal strip ----
  var strip = document.querySelector('[data-drag-scroll]');
  if (strip) {
    var isDragging = false;
    var dragStartX = 0;
    var dragStartScroll = 0;

    function handlePointerDown(event) {
      isDragging = true;
      dragStartX = event.clientX;
      dragStartScroll = strip.scrollLeft;
      strip.setPointerCapture(event.pointerId);
    }
    function handlePointerMove(event) {
      if (!isDragging) return;
      strip.scrollLeft = dragStartScroll - (event.clientX - dragStartX);
    }
    function handlePointerUp() {
      isDragging = false;
    }

    strip.addEventListener('pointerdown', handlePointerDown);
    strip.addEventListener('pointermove', handlePointerMove);
    strip.addEventListener('pointerup', handlePointerUp);
    strip.addEventListener('pointercancel', handlePointerUp);
  }

  // ---- Fade-in on scroll ----
  var revealTargets = document.querySelectorAll('.history_card, .guide_chang, .gallery_item');
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
