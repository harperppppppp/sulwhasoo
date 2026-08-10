// Sulwhasoo · Product List
// pages/product.html 전용 기능

(function () {
  'use strict';

  // ---- Responsive stage: scale the fixed 1920px canvas to fit narrower
  // viewports (360 / 768 / 1280) so no breakpoint ever gets a horizontal
  // scrollbar. At >=1920px this is scale(1), i.e. unchanged. ----
  function initScaleStage() {
    var stage = document.querySelector('[data-scale-stage]');
    var page = stage ? stage.querySelector('.page') : null;
    if (!stage || !page) return;

    function handleStageResize() {
      var scale = Math.min(1, window.innerWidth / 1920);
      page.style.transform = 'scale(' + scale + ')';
      stage.style.height = (page.scrollHeight * scale) + 'px';
    }
    handleStageResize();
    window.addEventListener('resize', handleStageResize);
    window.addEventListener('load', handleStageResize);
  }

  function initTabs() {
    var tabs = document.querySelectorAll('.product_tabs [data-tab]');
    if (!tabs.length) return;

    var panels = document.querySelectorAll('[data-tab-panel]');

    tabs.forEach(function (tab) {
      if (tab.disabled) return;

      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          t.classList.remove('is_active');
          t.classList.add('product_tab_sub');
          t.classList.remove('product_tab');
        });
        tab.classList.add('is_active', 'product_tab');
        tab.classList.remove('product_tab_sub');

        var subtabs = document.querySelector('[data-subtabs-for="' + tab.dataset.tab + '"]');
        document.querySelectorAll('.product_subtabs').forEach(function (group) {
          group.hidden = group !== subtabs;
        });

        panels.forEach(function (panel) {
          panel.hidden = panel.dataset.tabPanel !== tab.dataset.tab;
        });
      });
    });
  }

  // Generic across every product_subtabs group (Product Line, Skin
  // Concern, …): each group's data-subtabs-for="<tab>" names the
  // matching panel attribute data-<tab>-panel="<subtab>" to toggle.
  function initSubtabs() {
    var groups = document.querySelectorAll('.product_subtabs');
    if (!groups.length) return;

    groups.forEach(function (group) {
      var panelAttr = 'data-' + group.dataset.subtabsFor + '-panel';
      var subtabs = group.querySelectorAll('.product_subtab');

      subtabs.forEach(function (subtab) {
        if (subtab.disabled) return;

        subtab.addEventListener('click', function () {
          subtabs.forEach(function (s) { s.classList.remove('is_active'); });
          subtab.classList.add('is_active');

          var targetPanel = document.querySelector('[' + panelAttr + '="' + subtab.dataset.subtab + '"]');
          document.querySelectorAll('[' + panelAttr + ']').forEach(function (panel) {
            panel.classList.toggle('is_active', panel === targetPanel);
          });
        });
      });
    });
  }

  // Best Seller cards reveal their ring/enlarged-shot/View More state
  // via pure CSS :hover / :focus-within (see product.css) — no JS
  // needed for that; it used to be click-toggled but hover now
  // matches the Product Line tab's interaction.

  // ---- Best Seller: 왼쪽으로 끊김 없이 계속 흐르는 자동 슬라이드 ----
  // pages/product_detail.html의 reviews 마퀴(detail.js initReviewsMarquee)와
  // 동일한 기법: 원본 카드 세트를 한 번 더 복제해 뒤에 이어붙인 뒤, translateX를
  // 원본 세트 폭만큼 이동할 때마다 0으로 되돌려서 시각적으로 끊김 없이 반복한다.
  function initBestSellerMarquee() {
    // .product_grid_track: 자르는 창(overflow:hidden, transform 없음).
    // .product_grid: 실제로 translateX 애니메이션이 걸리는 카드 flex 묶음.
    var track = document.querySelector('.product_grid_track');
    var inner = document.querySelector('.product_grid');
    if (!track || !inner) return;

    var reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotionQuery.matches) return;

    var originalCards = Array.prototype.slice.call(inner.children);
    if (!originalCards.length) return;

    originalCards.forEach(function (card) {
      var clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      inner.appendChild(clone);
    });

    var speed = 40; // px per second, matches reviews marquee
    var setWidth = 0;
    var offset = 0;
    var lastTime = null;
    var isHovering = false;
    var isDragging = false;
    var dragMoved = false;
    var dragPointerId = null;
    var dragStartX = 0;
    var dragStartOffset = 0;

    function measure() {
      var gap = parseFloat(getComputedStyle(inner).columnGap || getComputedStyle(inner).gap) || 0;
      setWidth = originalCards.reduce(function (sum, card) {
        return sum + card.getBoundingClientRect().width + gap;
      }, 0);
    }

    // Wrap into [0, setWidth) from either direction so dragging right
    // (offset going negative) loops back into the cloned tail exactly
    // like overshooting left loops back to the head.
    function wrap(value) {
      if (setWidth <= 0) return value;
      return ((value % setWidth) + setWidth) % setWidth;
    }

    function tick(now) {
      if (lastTime === null) lastTime = now;
      var dt = (now - lastTime) / 1000;
      lastTime = now;

      if (!isHovering && !isDragging) {
        offset = wrap(offset + speed * dt);
      }

      inner.style.transform = 'translateX(' + (-offset) + 'px)';
      requestAnimationFrame(tick);
    }

    measure();
    window.addEventListener('resize', measure);
    requestAnimationFrame(tick);

    // ---- Hover: pause the auto-scroll while the pointer is over the row ----
    track.addEventListener('mouseenter', function () { isHovering = true; });
    track.addEventListener('mouseleave', function () { isHovering = false; });

    // ---- Drag: grab with the mouse and swipe the row left/right ----
    // Pointer capture is deferred until movement actually crosses the drag
    // threshold below (not set on pointerdown itself): capturing immediately
    // retargets the resulting click's compatibility mouse events to `track`,
    // which silently swallowed clicks on the Serum VI card's "View More"
    // link underneath. A plain click (no movement) never captures, so it
    // reaches the link normally.
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      isDragging = true;
      dragMoved = false;
      dragPointerId = e.pointerId;
      dragStartX = e.clientX;
      dragStartOffset = offset;
    });

    track.addEventListener('pointermove', function (e) {
      if (!isDragging) return;
      var dx = e.clientX - dragStartX;
      if (!dragMoved && Math.abs(dx) > 3) {
        dragMoved = true;
        track.classList.add('is_dragging');
        if (track.setPointerCapture) track.setPointerCapture(dragPointerId);
      }
      if (dragMoved) offset = wrap(dragStartOffset - dx);
    });

    function endDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      track.classList.remove('is_dragging');
      if (track.releasePointerCapture && dragMoved && track.hasPointerCapture(dragPointerId)) {
        track.releasePointerCapture(dragPointerId);
      }
    }
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

    // A real drag shouldn't also fire the card's "View More" link underneath it.
    track.addEventListener('click', function (e) {
      if (dragMoved) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    // Prevent the browser's native image-drag ghost from fighting the
    // pointer-based drag above.
    track.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  function init() {
    initScaleStage();
    initTabs();
    initSubtabs();
    initBestSellerMarquee();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
