/**
 * Sulwhasoo — 가로 스크롤 인터랙션
 * 대상: .culture_track, .best_seller_carousel
 * - 세로 휠은 그대로 페이지 스크롤로 흘려보냄 (호버 중에도 페이지 스크롤 가능)
 * - 실제 가로 스크롤(트랙패드 좌우 스와이프, Shift+휠 등)은 브라우저 기본 동작으로 좌우 모두 스크롤
 * - 마우스 드래그로도 좌우 스크롤 가능
 *
 * .culture_track 자동 스크롤 (dot 진행바 방식):
 * - culture 섹션이 뷰포트에 처음 들어왔을 때 시작 (IntersectionObserver)
 * - 현재 dot이 2초 동안 정속(linear)으로 차오르고, 다 차오르는 순간
 *   dot 전환과 카드 전환이 완전히 동시에(둘 다 애니메이션 없이 즉시) 일어남
 * - 마지막 패널 다음엔 왼쪽으로 역주행하지 않고 다시 첫 패널로 순환.
 *   마우스로 직접 오른쪽으로 계속 스크롤할 때도 6번째 다음 1번째로 이어지도록,
 *   보이지 않는 첫 패널 복제본을 맨 뒤에 붙여두고 그 자리에 도달하면 티 안 나게 0으로 순간 이동
 * - dot을 클릭하면 해당 카드로 바로 이동
 * - 사용자가 직접 스크롤/드래그하는 동안에는 멈춤
 */
(function () {
  "use strict";

  function setupAutoScroll(sectionEl, el, panelSelector, dotSelector, fillMs) {
    if (!sectionEl || !el) return;
    var panels = el.querySelectorAll(panelSelector);
    var dots = sectionEl.querySelectorAll(dotSelector);
    if (!panels.length) return;

    var panelWidth = panels[0].offsetWidth;
    var count = panels.length;
    var index = 0;
    var timer = null;
    var wrapperBg = sectionEl.querySelector(".culture_wrapper_bg");

    // 첫 패널의 복제본을 맨 뒤에 붙여, 마우스로 직접 오른쪽 끝까지 스크롤해도
    // "6번째 다음 1번째"로 자연스럽게 이어지는 것처럼 보이게 한다.
    var clone = panels[0].cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    clone.setAttribute("inert", "");
    el.appendChild(clone);

    function activateDot(i) {
      dots.forEach(function (dot, idx) {
        dot.classList.toggle("is_active", idx === i);
      });
      if (wrapperBg) {
        var bgImg = panels[i].querySelector(".culture_bg");
        if (bgImg) wrapperBg.src = bgImg.src;
      }
    }

    function goTo(i) {
      // dot 활성화와 카드 위치 이동을 같은 동기 실행 안에서 처리 —
      // 둘 사이에 애니메이션 지연이 없어 정확히 동시에 바뀐다.
      index = i;
      activateDot(index);
      el.scrollLeft = index * panelWidth;
    }

    function tick() {
      goTo((index + 1) % count); // dot이 2초 동안 다 차오르는 순간 호출됨
    }

    function start() {
      stop();
      timer = setInterval(tick, fillMs);
    }

    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    function resync() {
      // 사용자가 직접 스크롤/드래그해 위치가 바뀐 경우, 그 위치를 기준으로 이어서 자동 재생
      goTo(Math.round(el.scrollLeft / panelWidth) % count);
      start();
    }

    goTo(0); // 첫 패널이 보여지는 초기 상태

    el.addEventListener("mouseenter", stop);
    el.addEventListener("mouseleave", resync);
    el.addEventListener("pointerdown", stop);
    el.addEventListener("pointerup", resync);

    var resumeTimeout = null;
    el.addEventListener("wheel", function (e) {
      // 세로 휠(=페이지 스크롤)까지 자동재생을 멈추지 않도록, 실제 가로 스크롤일 때만 반응
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      stop();
      clearTimeout(resumeTimeout);
      resumeTimeout = setTimeout(resync, fillMs);
    });

    // 마우스로 직접 스크롤해 복제본(=가짜 1번째) 자리까지 도달하면,
    // 스크롤이 멈춘 순간 티 안 나게 진짜 1번째 위치(0)로 순간 이동
    el.addEventListener("scrollend", function () {
      if (el.scrollLeft >= count * panelWidth - 1) {
        index = 0;
        activateDot(0);
        el.scrollLeft = 0;
      }
    });

    // dot 클릭 시 해당 카드로 바로 이동
    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () {
        stop();
        goTo(i);
        start();
      });
    });

    // culture 섹션이 뷰포트에 처음 들어왔을 때만 자동 스크롤 시작
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            start();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(sectionEl);
  }

  /**
   * Salon — 첫 텍스트는 뷰포트 60% 지점에서 등장하고, 마지막 텍스트는 20% 지점에서
   * 사라짐. 그 사이 40%p를 행 개수(6개)로 균등 분배해 이동폭을 계산함(40/6 ≈ 6.667%).
   * i번째 행: (60-step*i)% 에서 시작해 (60-step*(i+1))% 에서 다음 행에 넘겨줌.
   */
  function setupSalonFixedText(sectionEl, gridEl, rowSelector, overlaySelector, panelSelector) {
    if (!sectionEl || !gridEl) return;
    var rows = sectionEl.querySelectorAll(rowSelector);
    var overlay = sectionEl.querySelector(overlaySelector);
    var panels = overlay ? overlay.querySelectorAll(panelSelector) : [];
    if (!rows.length || !overlay || !panels.length) return;

    var START_PERCENT = 60;
    var END_PERCENT = 20;
    var STEP_PERCENT = (START_PERCENT - END_PERCENT) / rows.length;
    var rowHeight = rows[0].offsetHeight;

    function activate(i) {
      panels.forEach(function (panel, idx) {
        panel.classList.toggle("is_active", idx === i);
      });
    }

    // 오버레이가 가운데 열(텍스트 칸) 중앙에 오도록 좌표를 매 리사이즈마다 다시 계산
    function positionOverlay() {
      var rect = gridEl.getBoundingClientRect();
      var contentWidth = 439 + 980 + 439;
      var sideOffset = (rect.width - contentWidth) / 2;
      var col2Center = rect.left + sideOffset + 439 + 980 / 2;
      overlay.style.left = col2Center + "px";
    }

    function update() {
      var thresholdY = window.innerHeight * (START_PERCENT / 100);
      var lastIndex = rows.length - 1;
      var found = false;

      for (var i = 0; i < rows.length; i++) {
        var rect = rows[i].getBoundingClientRect();
        var progress = (thresholdY - rect.top) / rowHeight; // 이 행이 60% 선을 지난 뒤 얼마나 스크롤했는지(0~1)

        if (progress >= 0 && progress < 1) {
          activate(i);
          overlay.style.top = START_PERCENT - STEP_PERCENT * i - STEP_PERCENT * progress + "vh";
          overlay.classList.add("is_visible");
          found = true;
          break;
        }

        // 마지막 행은 다음 행이 없으므로, 자기 행의 아래쪽 끝이 도착 지점(END_PERCENT)에
        // 닿기 전까지는 그 자리에 그대로 있다가, 닿는 순간 그리드에 닿은 채로 사라짐
        if (i === lastIndex && progress >= 1) {
          var endY = window.innerHeight * (END_PERCENT / 100);
          if (rect.bottom > endY) {
            activate(i);
            overlay.style.top = END_PERCENT + "vh";
            overlay.classList.add("is_visible");
            found = true;
          }
        }
      }

      if (!found) {
        overlay.classList.remove("is_visible");
      }
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        update();
        ticking = false;
      });
    }

    positionOverlay();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () {
      positionOverlay();
      update();
    });
  }

  /**
   * Stationery -> Best Seller 히어로 이동
   * 이미지 엘리먼트는 실제로 단 하나뿐이다(hero_travel_image). 평소에는
   * stationery_icon_slot 안에 작게 자리잡고 있다가, .stationery_pin_wrapper의 고정
   * (sticky) 구간이 다 끝나는 순간부터(=stationery 섹션이 더 이상 화면에 붙박여
   * 있지 않고 다시 스크롤에 따라 움직이기 시작하는 시점) position:fixed 로 전환되어
   * 화면을 가로질러 이동/확대되며, best_seller_hero_slot 이 뷰포트 40% 지점에
   * 도달하는 순간 그 슬롯 안으로 옮겨져(appendChild) 정적인 히어로 이미지가 된다.
   * 두 슬롯은 이미지가 없을 때도 원래 크기만큼 빈 공간을 유지해 주변 레이아웃
   * (텍스트/스탯)이 흔들리지 않는다. 스크롤을 위로 되돌리면 같은 경계에서 반대로
   * 되돌아간다.
   */
  function setupStationeryMorph(imgEl, startSlotEl, endSlotEl, pinWrapperEl, pinnedSectionEl) {
    if (!imgEl || !startSlotEl || !endSlotEl || !pinWrapperEl || !pinnedSectionEl) return;

    var STATE_HOME = "home";
    var STATE_TRAVEL = "travel";
    var STATE_ARRIVED = "arrived";
    var state = STATE_HOME;

    var startRect = null; // 트리거(=고정 해제) 시점의 슬롯 위치/크기(뷰포트 기준)
    var startScrollY = 0;
    var endScrollY = 0;

    function measure() {
      var wrapperRect = pinWrapperEl.getBoundingClientRect();
      var wrapperAbsTop = wrapperRect.top + window.scrollY;
      var sectionRect = pinnedSectionEl.getBoundingClientRect();

      // sticky 고정이 풀리는 스크롤 지점 = 래퍼 안에 남겨둔 여유 높이(hold 구간)를
      // 다 스크롤한 시점. 그 전까지는 화면이 그대로 붙박여 있으므로 이미지도 움직이지 않는다.
      startScrollY = wrapperAbsTop + (wrapperRect.height - sectionRect.height);

      var endAbsTop = endSlotEl.getBoundingClientRect().top + window.scrollY;
      var triggerOffset = window.innerHeight * 0.4;
      endScrollY = endAbsTop - triggerOffset;

      // 고정된 동안 섹션의 화면 top은 항상 0이므로, 슬롯이 화면에 보이는 위치는
      // "섹션 안에서 슬롯까지의 상대 오프셋"과 같다(스크롤과 무관한 값).
      var startSlotRect = startSlotEl.getBoundingClientRect();
      startRect = {
        top: startSlotRect.top - sectionRect.top,
        left: startSlotRect.left,
        width: startSlotRect.width,
        height: startSlotRect.height
      };
    }

    function toHome() {
      startSlotEl.appendChild(imgEl);
      imgEl.style.cssText = "";
      imgEl.className = "hero_travel_image hero_travel_image_home";
      state = STATE_HOME;
    }

    function toArrived() {
      endSlotEl.appendChild(imgEl);
      imgEl.style.cssText = "";
      imgEl.className = "hero_travel_image hero_travel_image_arrived";
      state = STATE_ARRIVED;
    }

    function toTravel() {
      document.body.appendChild(imgEl);
      imgEl.className = "hero_travel_image hero_travel_image_travel";
      state = STATE_TRAVEL;
    }

    function update() {
      var scrollY = window.scrollY;

      if (scrollY <= startScrollY || endScrollY <= startScrollY) {
        if (state !== STATE_HOME) toHome();
        return;
      }

      if (scrollY >= endScrollY) {
        if (state !== STATE_ARRIVED) toArrived();
        return;
      }

      if (state !== STATE_TRAVEL) toTravel();

      var progress = (scrollY - startScrollY) / (endScrollY - startScrollY);
      var endRect = endSlotEl.getBoundingClientRect();

      imgEl.style.top = startRect.top + (endRect.top - startRect.top) * progress + "px";
      imgEl.style.left = startRect.left + (endRect.left - startRect.left) * progress + "px";
      imgEl.style.width = startRect.width + (endRect.width - startRect.width) * progress + "px";
      imgEl.style.height = startRect.height + (endRect.height - startRect.height) * progress + "px";
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        update();
        ticking = false;
      });
    }

    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () {
      measure();
      update();
    });
    window.addEventListener("load", function () {
      measure();
      update();
    });
  }

  /**
   * Hero 헤드카피 — 스크롤에 맞춰 글자가 앞에서부터 픽셀 단위로 오렌지색으로
   * 물드는 효과. .hero_pin_wrapper(CSS) 안에서 .hero가 position:sticky로 고정된
   * 채 남는 runway 구간을 스크롤하는 동안, 그 진행률(0~1)을 헤드카피 전체 글자폭
   * 기준의 "채워진 폭"으로 환산한다. 각 span은 DOM 순서(읽는 순서)대로 등장하며,
   * 채워진 폭이 그 span의 시작 지점을 넘는 만큼만 왼쪽부터 오렌지로 칠해진다.
   * 글자 하나가 통째로 뚝뚝 끊겨 칠해지지 않도록, background-clip:text로 입힌
   * linear-gradient의 경계에 약간의 blend 폭(FEATHER)을 둬서 색이 번지듯 자연스럽게
   * 이어지게 한다.
   */
  function setupHeroTextReveal(wrapperEl, heroEl, spans) {
    if (!wrapperEl || !heroEl || !spans.length) return;

    var FEATHER = 6; // 색이 번지는 경계 폭(각 span 자기 폭 기준 %)
    var ORANGE = "#f47321"; // 폰트컬러/orange_normal
    var BASE = "#eaceb0";

    var lockStartY = 0;
    var fillEndY = 0; // 채색이 끝나는 스크롤 지점(그 뒤로는 hold 구간이 이어짐)
    var segWidths = [];
    var totalWidth = 0;

    function measure() {
      var wrapperRect = wrapperEl.getBoundingClientRect();
      var wrapperAbsTop = wrapperRect.top + window.scrollY;
      var wrapperStyle = getComputedStyle(wrapperEl);
      // CSS(.hero_pin_wrapper)의 --hero_reveal_fill을 그대로 읽어와, 채색 진행률
      // 계산 구간과 실제 고정(sticky) 유지 구간(fill + hold)의 스크롤 거리 기준을
      // 하나로 맞춘다.
      var fillRunwayPx = parseFloat(wrapperStyle.getPropertyValue("--hero_reveal_fill")) || 0;

      lockStartY = wrapperAbsTop;
      fillEndY = wrapperAbsTop + fillRunwayPx;

      totalWidth = 0;
      segWidths = spans.map(function (span) {
        var w = span.offsetWidth;
        totalWidth += w;
        return w;
      });
    }

    function update() {
      var range = fillEndY - lockStartY;
      var progress = range > 0 ? (window.scrollY - lockStartY) / range : 0;
      progress = Math.min(1, Math.max(0, progress));

      var filledWidth = progress * totalWidth;
      var offset = 0;

      spans.forEach(function (span, i) {
        var segWidth = segWidths[i];
        var filled = Math.min(segWidth, Math.max(0, filledWidth - offset));
        var fillPct = segWidth > 0 ? (filled / segWidth) * 100 : 0;

        // fillPct가 0/100인 구간(아직 시작 전 / 이미 다 칠해짐)에서는 blend 폭을
        // 적용하지 않는다. 안 그러면 아직 스크롤을 시작하지 않았는데도 모든 span의
        // 맨 앞(예: "Where"와 "Wisdom" 둘 다의 W)이 FEATHER 폭만큼 미리 오렌지로
        // 보이는 문제가 생긴다. 실제로 그 span의 채우기 경계가 진행 중일 때만
        // (0 < fillPct < 100) 경계에 번지는 효과를 준다.
        var start, end;
        if (fillPct <= 0) {
          start = 0;
          end = 0;
        } else if (fillPct >= 100) {
          start = 100;
          end = 100;
        } else {
          start = Math.max(0, fillPct - FEATHER);
          end = Math.min(100, fillPct + FEATHER);
        }

        span.style.backgroundImage =
          "linear-gradient(to right, " + ORANGE + " " + start + "%, " + BASE + " " + end + "%)";

        offset += segWidth;
      });
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        update();
        ticking = false;
      });
    }

    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () {
      measure();
      update();
    });
    window.addEventListener("load", function () {
      measure();
      update();
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        measure();
        update();
      });
    }
  }

  function enableHorizontalScroll(el) {
    if (!el) return;

    // 세로 휠은 그대로 페이지 스크롤로 흘려보내고(가로로 가로채지 않음),
    // 실제 가로 스크롤(트랙패드 좌우 스와이프, Shift+휠 등 deltaX)은
    // overflow-x:auto 컨테이너가 브라우저 기본 동작으로 알아서 처리한다.

    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;

    el.addEventListener("pointerdown", function (e) {
      isDown = true;
      el.classList.add("is_dragging");
      startX = e.clientX;
      startScrollLeft = el.scrollLeft;
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener("pointermove", function (e) {
      if (!isDown) return;
      el.scrollLeft = startScrollLeft - (e.clientX - startX);
    });

    function endDrag() {
      isDown = false;
      el.classList.remove("is_dragging");
    }

    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("pointerleave", endDrag);
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupHeroTextReveal(
      document.querySelector(".hero_pin_wrapper"),
      document.querySelector("#hero"),
      Array.prototype.slice.call(document.querySelectorAll(".hero_reveal"))
    );

    var cultureSection = document.querySelector("#culture");
    var cultureTrack = document.querySelector(".culture_track");

    enableHorizontalScroll(cultureTrack);
    enableHorizontalScroll(document.querySelector(".best_seller_carousel"));

    setupAutoScroll(cultureSection, cultureTrack, ".culture_panel", ".culture_dot", 2000);

    setupSalonFixedText(
      document.querySelector("#salon"),
      document.querySelector(".salon_grid"),
      "[data-row]",
      ".salon_fixed_text",
      ".salon_panel"
    );

    setupStationeryMorph(
      document.querySelector("#hero_travel_image"),
      document.querySelector(".stationery_icon_slot"),
      document.querySelector(".best_seller_hero_slot"),
      document.querySelector(".stationery_pin_wrapper"),
      document.querySelector("#stationery")
    );
  });
})();
