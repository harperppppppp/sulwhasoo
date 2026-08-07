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

  // ---- Hero pinned reveal ----
  // Scrolling through .hero_pin keeps .hero stuck to the viewport while the
  // pill-shaped hero_reveal panel grows from the hero_video's exact bounds
  // out to the full hero rect, filling in with the history section's
  // background color (#f5ecd7) on the way — so the transition into the next
  // section reads as one continuous shape morph instead of a hard cut.
  var heroPin = document.querySelector('.hero_pin');
  var hero = document.querySelector('.hero');
  var heroVideo = document.querySelector('.hero_video');
  var heroReveal = document.querySelector('.hero_reveal');
  var heroBox = document.querySelector('.hero_box');
  var badgeStage = hero ? hero.querySelector('.badge_stage') : null;

  if (heroPin && hero && heroVideo && heroReveal && !prefersReducedMotion) {
    var pillRect = null;

    function measurePillRect() {
      pillRect = {
        left: heroVideo.offsetLeft,
        top: heroVideo.offsetTop,
        width: heroVideo.offsetWidth,
        height: heroVideo.offsetHeight
      };
    }

    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp01(v) { return Math.max(0, Math.min(1, v)); }
    function remap(v, start, end) { return clamp01((v - start) / (end - start)); }

    var heroRevealTicking = false;

    function updateHeroReveal() {
      heroRevealTicking = false;
      if (!pillRect) return;

      var pinRect = heroPin.getBoundingClientRect();
      var heroRect = hero.getBoundingClientRect();
      var scrollable = pinRect.height - heroRect.height;
      var progress = scrollable > 0 ? clamp01(-pinRect.top / scrollable) : 0;

      // Phase 1 (0 → .4): the pill fills in with the next section's color.
      // Phase 2 (.4 → 1): that filled pill grows into a full rectangle
      // covering the whole hero, becoming the next section's background.
      var colorProgress = remap(progress, 0, 0.4);
      var shapeProgress = remap(progress, 0.4, 1);
      var contentProgress = remap(progress, 0.1, 0.45);

      var left = lerp(pillRect.left, 0, shapeProgress);
      var top = lerp(pillRect.top, 0, shapeProgress);
      var width = lerp(pillRect.width, hero.clientWidth, shapeProgress);
      var height = lerp(pillRect.height, hero.clientHeight, shapeProgress);
      var radius = lerp(300, 0, shapeProgress);

      heroReveal.style.left = left + 'px';
      heroReveal.style.top = top + 'px';
      heroReveal.style.width = width + 'px';
      heroReveal.style.height = height + 'px';
      heroReveal.style.borderRadius = radius + 'px ' + radius + 'px 0 0';
      heroReveal.style.opacity = colorProgress;

      var contentOpacity = 1 - contentProgress;
      if (heroBox) heroBox.style.opacity = contentOpacity;
      if (badgeStage) badgeStage.style.opacity = contentOpacity;
    }

    function requestHeroRevealUpdate() {
      if (!heroRevealTicking) {
        heroRevealTicking = true;
        window.requestAnimationFrame(updateHeroReveal);
      }
    }

    measurePillRect();
    updateHeroReveal();
    window.addEventListener('scroll', requestHeroRevealUpdate, { passive: true });
    window.addEventListener('resize', function () {
      measurePillRect();
      requestHeroRevealUpdate();
    });
    window.addEventListener('load', function () {
      measurePillRect();
      requestHeroRevealUpdate();
    });
  }

  // ---- History cards: tilt the card being covered backward as the next
  // card pins over it. Progress is how much of the covered card's own
  // height the next (higher z-index) card has risen over — 0 when the next
  // card's top is still at the covered card's bottom edge, 1 once it's
  // fully covered — mapped to a 0-30deg rotateX around the card's bottom
  // edge (see transform-origin on .history_card in flagship.css), plus a
  // matching shrink to 80% scale and fade to 70% opacity. ----
  var historyCards = document.querySelectorAll('.history_card');
  if (historyCards.length > 1 && !prefersReducedMotion) {
    var historyTiltTicking = false;

    function updateHistoryTilt() {
      historyTiltTicking = false;
      for (var i = 0; i < historyCards.length - 1; i++) {
        var card = historyCards[i];
        var coveringTop = historyCards[i + 1].getBoundingClientRect().top;
        var rawProgress = (card.offsetHeight - coveringTop) / card.offsetHeight;
        var progress = Math.max(0, Math.min(1, rawProgress));
        if (progress > 0) {
          var scale = 1 - progress * 0.2;
          card.style.transform = 'perspective(1600px) rotateX(' + (progress * 30) + 'deg) scale(' + scale + ')';
          card.style.opacity = 1 - progress * 0.3;
        } else {
          card.style.transform = '';
          card.style.opacity = '';
        }
      }
    }

    function requestHistoryTiltUpdate() {
      if (!historyTiltTicking) {
        historyTiltTicking = true;
        window.requestAnimationFrame(updateHistoryTilt);
      }
    }

    updateHistoryTilt();
    window.addEventListener('scroll', requestHistoryTiltUpdate, { passive: true });
    window.addEventListener('resize', requestHistoryTiltUpdate);
  }

  // ---- Hero "Enter" button: scroll to the next section ----
  function handleScrollToClick(event) {
    var target = document.querySelector(event.currentTarget.getAttribute('data-scroll-to'));
    if (target) target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }


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
