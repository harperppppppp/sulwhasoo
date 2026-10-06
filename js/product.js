// Sulwhasoo · Product List
// pages/product.html 전용 기능

(function () {
  'use strict';

  // ---- Responsive stage: keep the desktop artwork proportional on tablet,
  // but let the <=600px CSS breakpoint render a true mobile layout. Scaling
  // the entire 1920px canvas at phone width made every product and label
  // unreadably small compared with the responsive header and footer. ----
  function initScaleStage() {
    var stage = document.querySelector('[data-scale-stage]');
    var page = stage ? stage.querySelector('.page') : null;
    if (!stage || !page) return;

    function handleStageResize() {
      var isMobile = window.matchMedia('(max-width: 600px)').matches;
      if (isMobile) {
        document.documentElement.style.setProperty('--stage-scale', 1);
        page.style.transform = 'none';
        stage.style.height = 'auto';
        return;
      }

      var scale = Math.min(1, window.innerWidth / 1920);
      document.documentElement.style.setProperty('--stage-scale', scale);
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

  // Product Line / Product Type / Skin Concern only become endless, draggable
  // rows in the true mobile layout. Desktop keeps the original finite product
  // sets. Best Seller is a separate finite, wrapping grid at every size.
  function initLoopingProductRows() {
    var mobileQuery = window.matchMedia('(max-width: 600px)');
    var rowCleanups = [];

    function setupRows() {
      if (rowCleanups.length) return;

      var rows = document.querySelectorAll(
        '.product_line_row, .product_type_row, .product_concern_row'
      );

      rows.forEach(function (row) {
      var track = document.createElement('div');
      track.className = 'product_loop_track';
      row.parentNode.insertBefore(track, row);
      track.appendChild(row);

      var originalItems = Array.prototype.slice.call(row.children);
      if (!originalItems.length) return;

      originalItems.forEach(function (item) {
        var clone = item.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.querySelectorAll('a, button, [tabindex]').forEach(function (control) {
          control.setAttribute('tabindex', '-1');
        });
        row.appendChild(clone);
      });

      var reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      var speed = 28;
      var setWidth = 0;
      var offset = 0;
      var lastTime = null;
      var isHovering = false;
      var isDragging = false;
      var dragMoved = false;
      var pointerId = null;
      var startX = 0;
      var startOffset = 0;
      var animationFrameId = null;
      var resizeObserver = null;

      function measure() {
        var rowStyle = getComputedStyle(row);
        var gap = parseFloat(rowStyle.columnGap || rowStyle.gap) || 0;

        setWidth = originalItems.reduce(function (sum, item) {
          var width = item.getBoundingClientRect().width;
          if (!width) width = parseFloat(getComputedStyle(item).width) || 0;
          return sum + width + gap;
        }, 0);

        var firstWidth = originalItems[0].getBoundingClientRect().width ||
          parseFloat(getComputedStyle(originalItems[0]).width) || 0;
        var edgeSpace = Math.max(0, (track.clientWidth - firstWidth) / 2);
        row.style.setProperty('--loop-edge', edgeSpace + 'px');
        offset = wrap(offset);
      }

      function wrap(value) {
        if (setWidth <= 0) return value;
        return ((value % setWidth) + setWidth) % setWidth;
      }

      function tick(now) {
        if (lastTime === null) lastTime = now;
        var dt = (now - lastTime) / 1000;
        lastTime = now;

        if (!reducedMotionQuery.matches && !isHovering && !isDragging) {
          offset = wrap(offset + speed * dt);
        }

        row.style.transform = 'translateX(' + (-offset) + 'px)';
        animationFrameId = requestAnimationFrame(tick);
      }

      measure();
      window.addEventListener('resize', measure);
      if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(track);
      }
      animationFrameId = requestAnimationFrame(tick);

      function handleMouseEnter() { isHovering = true; }
      function handleMouseLeave() { isHovering = false; }

      function handlePointerDown(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        isDragging = true;
        dragMoved = false;
        pointerId = e.pointerId;
        startX = e.clientX;
        startOffset = offset;
      }

      function handlePointerMove(e) {
        if (!isDragging || e.pointerId !== pointerId) return;

        var dx = e.clientX - startX;
        if (!dragMoved && Math.abs(dx) > 4) {
          dragMoved = true;
          track.classList.add('is_dragging');
          if (track.setPointerCapture) track.setPointerCapture(pointerId);
        }

        if (dragMoved) {
          offset = wrap(startOffset - dx);
        }
      }

      function endDrag(e) {
        if (!isDragging || e.pointerId !== pointerId) return;
        isDragging = false;
        track.classList.remove('is_dragging');

        if (
          track.releasePointerCapture &&
          dragMoved &&
          track.hasPointerCapture(pointerId)
        ) {
          track.releasePointerCapture(pointerId);
        }
      }

      function handleLostPointerCapture() {
        isDragging = false;
        track.classList.remove('is_dragging');
      }

      function handleClick(e) {
        if (!dragMoved) return;
        e.preventDefault();
        e.stopPropagation();
        dragMoved = false;
      }

      function preventNativeDrag(e) { e.preventDefault(); }

      track.addEventListener('mouseenter', handleMouseEnter);
      track.addEventListener('mouseleave', handleMouseLeave);
      track.addEventListener('pointerdown', handlePointerDown);
      track.addEventListener('pointermove', handlePointerMove);
      track.addEventListener('pointerup', endDrag);
      track.addEventListener('pointercancel', endDrag);
      track.addEventListener('lostpointercapture', handleLostPointerCapture);
      track.addEventListener('click', handleClick, true);
      track.addEventListener('dragstart', preventNativeDrag);

      rowCleanups.push(function () {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', measure);
        if (resizeObserver) resizeObserver.disconnect();

        track.removeEventListener('mouseenter', handleMouseEnter);
        track.removeEventListener('mouseleave', handleMouseLeave);
        track.removeEventListener('pointerdown', handlePointerDown);
        track.removeEventListener('pointermove', handlePointerMove);
        track.removeEventListener('pointerup', endDrag);
        track.removeEventListener('pointercancel', endDrag);
        track.removeEventListener('lostpointercapture', handleLostPointerCapture);
        track.removeEventListener('click', handleClick, true);
        track.removeEventListener('dragstart', preventNativeDrag);

        Array.prototype.slice.call(row.children, originalItems.length).forEach(function (clone) {
          clone.remove();
        });
        row.style.removeProperty('transform');
        row.style.removeProperty('--loop-edge');
        track.parentNode.insertBefore(row, track);
        track.remove();
      });
      });
    }

    function destroyRows() {
      rowCleanups.forEach(function (cleanup) { cleanup(); });
      rowCleanups = [];
    }

    function syncRowsWithViewport() {
      if (mobileQuery.matches) setupRows();
      else destroyRows();
    }

    syncRowsWithViewport();
    if (mobileQuery.addEventListener) {
      mobileQuery.addEventListener('change', syncRowsWithViewport);
    } else {
      mobileQuery.addListener(syncRowsWithViewport);
    }
  }

  function initPlayfulProductImages() {
    var items = document.querySelectorAll(
      '.product_card, .product_line_item, .product_type_item, .product_concern_item'
    );

    items.forEach(function (item) {
      var animationTimer = null;

      item.addEventListener('click', function () {
        item.classList.remove('is_playful');
        // Restart the short animation even when the same product is tapped
        // several times in succession.
        void item.offsetWidth;
        item.classList.add('is_playful');

        window.clearTimeout(animationTimer);
        animationTimer = window.setTimeout(function () {
          item.classList.remove('is_playful');
        }, 720);
      });
    });
  }

  function init() {
    initScaleStage();
    initTabs();
    initSubtabs();
    initPlayfulProductImages();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
