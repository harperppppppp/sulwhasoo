/**
 * Sulwhasoo — 가로 스크롤 인터랙션
 * 대상: .culture__track, .best_seller__carousel, .review__scroll
 * - 세로 휠은 그대로 페이지 스크롤로 흘려보냄 (호버 중에도 페이지 스크롤 가능)
 * - 실제 가로 스크롤(트랙패드 좌우 스와이프, Shift+휠 등)은 브라우저 기본 동작으로 좌우 모두 스크롤
 * - 마우스 드래그로도 좌우 스크롤 가능
 *
 * .culture__track 자동 스크롤 (dot 진행바 방식):
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
   * Salon — 첫 텍스트는 뷰포트 60% 지점에서 등장, 마지막 텍스트는 20% 지점에서 사라짐.
   * 그 사이 40%p를 행 개수(6개)로 균등 분배(40/6 ≈ 6.667%)해서, i번째 텍스트는
   * (60-step*i)% 에서 (60-step*(i+1))% 까지 드리프트한다.
   *
   * 전환 시점은 "다음 행의 실제 화면 좌표(rect.top)가 현재 텍스트의 도착 지점(%)에
   * 진짜로 닿는 순간"으로 판정한다 — 드리프트 속도(%)와 행의 실제 높이(667px)가
   * 서로 다른 값이라, 둘을 같은 기준(예: 행 높이)으로 묶어서 계산하면 뒤로 갈수록
   * 그리드 선에 닿기 전에 미리 바뀌는 오차가 누적된다. 그래서 드리프트는 목표 %
   * 만큼의 스크롤 거리로 진행하고 도착하면 그 자리에서 대기하다가, 다음 행이 실제로
   * 그 위치에 도달하는 순간에만 전환한다(activeIndex로 현재 행을 추적).
   */
  function setupSalonFixedText(sectionEl, gridEl, rowSelector, overlaySelector, panelSelector) {
    if (!sectionEl || !gridEl) return;
    var rows = sectionEl.querySelectorAll(rowSelector);
    var overlay = sectionEl.querySelector(overlaySelector);
    var panels = overlay ? overlay.querySelectorAll(panelSelector) : [];
    if (!rows.length || !overlay || !panels.length) return;

    var START_PERCENT = 60;
    var END_PERCENT = 20;
    var lastIndex = rows.length - 1;
    var STEP_PERCENT = (START_PERCENT - END_PERCENT) / rows.length;
    var activeIndex = 0;

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

    function startPercent(i) {
      return START_PERCENT - STEP_PERCENT * i;
    }

    function endPercent(i) {
      return START_PERCENT - STEP_PERCENT * (i + 1);
    }

    function update() {
      var vh = window.innerHeight;

      // 첫 행이 시작 기준(60%)에 아직 도달하지 않았으면 등장 전
      if (rows[0].getBoundingClientRect().top > (vh * START_PERCENT) / 100) {
        overlay.classList.remove("is_visible");
        activeIndex = 0;
        return;
      }

      // 다음 행이 실제로 현재 텍스트의 도착 지점에 닿으면 그때만 전환(아래로 스크롤)
      while (activeIndex < lastIndex) {
        var nextTriggerY = (vh * endPercent(activeIndex)) / 100;
        if (rows[activeIndex + 1].getBoundingClientRect().top <= nextTriggerY) {
          activeIndex++;
        } else {
          break;
        }
      }
      // 위로 스크롤해 되돌아갈 때도 자연스럽게 이전 행으로
      while (activeIndex > 0) {
        var backTriggerY = (vh * startPercent(activeIndex)) / 100;
        if (rows[activeIndex].getBoundingClientRect().top > backTriggerY) {
          activeIndex--;
        } else {
          break;
        }
      }

      var stepPx = (vh * STEP_PERCENT) / 100;
      var startY = (vh * startPercent(activeIndex)) / 100;
      var rawProgress = (startY - rows[activeIndex].getBoundingClientRect().top) / stepPx;
      var progress = Math.min(Math.max(rawProgress, 0), 1); // 목표 %까지 이동하면 그 자리에서 대기

      activate(activeIndex);
      overlay.style.top = startPercent(activeIndex) - STEP_PERCENT * progress + "vh";
      overlay.classList.add("is_visible");

      // 마지막 행: 다음 행이 없으므로, 자기 행의 아래쪽 끝이 도착 지점(20%)에 실제로
      // 닿기 전까지는 그 자리에서 대기하다가, 닿는 순간 그리드에 닿은 채로 사라짐
      if (activeIndex === lastIndex && progress >= 1) {
        var endY = (vh * END_PERCENT) / 100;
        if (rows[lastIndex].getBoundingClientRect().bottom <= endY) {
          overlay.classList.remove("is_visible");
        }
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
   * stationery__icon_slot 안에 작게 자리잡고 있다가, 그 슬롯이 뷰포트 40% 지점에
   * 도달하는 순간부터 position:fixed 로 전환되어 화면을 가로질러 이동/확대되며,
   * best_seller__hero_slot 이 같은 40% 지점에 도달하는 순간 그 슬롯 안으로
   * 옮겨져(appendChild) 정적인 히어로 이미지가 된다. 두 슬롯은 이미지가 없을 때도
   * 원래 크기만큼 빈 공간을 유지해 주변 레이아웃(텍스트/스탯)이 흔들리지 않는다.
   * 스크롤을 위로 되돌리면 같은 경계에서 반대로 되돌아간다.
   */
  function setupStationeryMorph(imgEl, startSlotEl, endSlotEl) {
    if (!imgEl || !startSlotEl || !endSlotEl) return;

    var STATE_HOME = "home";
    var STATE_TRAVEL = "travel";
    var STATE_ARRIVED = "arrived";
    var state = STATE_HOME;

    var startRect = null; // 트리거 시점의 슬롯 위치/크기(뷰포트 기준, 세로는 항상 40vh로 고정)
    var startScrollY = 0;
    var endScrollY = 0;

    function measure() {
      var startAbsTop = startSlotEl.getBoundingClientRect().top + window.scrollY;
      var endAbsTop = endSlotEl.getBoundingClientRect().top + window.scrollY;
      var triggerOffset = window.innerHeight * 0.4;

      startScrollY = startAbsTop - triggerOffset;
      endScrollY = endAbsTop - triggerOffset;

      var startSlotRect = startSlotEl.getBoundingClientRect();
      startRect = {
        top: triggerOffset,
        left: startSlotRect.left,
        width: startSlotRect.width,
        height: startSlotRect.height
      };
    }

    function toHome() {
      startSlotEl.appendChild(imgEl);
      imgEl.style.cssText = "";
      imgEl.className = "hero_travel_image hero_travel_image--home";
      state = STATE_HOME;
    }

    function toArrived() {
      endSlotEl.appendChild(imgEl);
      imgEl.style.cssText = "";
      imgEl.className = "hero_travel_image hero_travel_image--arrived";
      state = STATE_ARRIVED;
    }

    function toTravel() {
      document.body.appendChild(imgEl);
      imgEl.className = "hero_travel_image hero_travel_image--travel";
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

  /**
   * Review — 세로 휠 스크롤을 가로 스크롤로 가로채기.
   * review 섹션은 CSS(position:sticky, .review__pin_wrapper)에 의해 자신의 세로
   * 정중앙이 뷰포트 정중앙에 오는 지점(lockStartY)부터 래퍼의 여유 구간이 끝나는
   * 지점(lockEndY)까지 화면에 고정된다. 이 구간 안에서는 아래로 휠을 돌리면
   * 페이지가 내려가는 대신 review__scroll이 오른쪽으로 스크롤되고, 오른쪽 끝까지
   * 다 스크롤된 뒤에야 다음 휠부터 다시 페이지 스크롤로 이어져 다음 섹션으로
   * 넘어간다. 위로 스크롤할 때도 왼쪽 끝에 닿을 때까지는 review가 먼저 왼쪽으로
   * 되감기고, 그 뒤에야 이전 섹션으로 이어진다.
   *
   * lockStartY/lockEndY를 직접 계산해서 쓰는 이유: 트랙패드 플릭처럼 한 번의
   * wheel 이벤트에 큰 deltaY가 실리는 경우, "현재 고정 구간 안에 있는지"만 보고
   * 판단하면 아직 구간 밖(고정 전)이라고 판단한 바로 그 이벤트의 delta가 고정
   * 구간 전체를 그냥 통과해버릴 수 있다(래퍼의 남는 여유 폭이 그 델타보다 작으면
   * review를 오른쪽 끝까지 스크롤하지 못한 채 다음 섹션으로 넘어가 버림). 그래서
   * 구간에 "새로 진입하는" 이벤트는 정확히 경계에서 멈추고, 남은 delta만큼만
   * 가로 스크롤로 돌려 구간을 절대 건너뛰지 않게 한다. 실제 가로 스크롤(트랙패드
   * 좌우 스와이프 등)은 그대로 기본 동작에 맡긴다.
   *
   * 리스너를 review__scroll이 아니라 window에 붙이는 이유: review__scroll이
   * 스크롤에 의해 뷰포트 밖(위/아래)으로 벗어나 있으면 그 위에 마우스가 있을 수 없어
   * wheel 이벤트 자체가 그 엘리먼트에 발생하지 않는다. window로 받아야 커서 위치와
   * 무관하게(예: 아래 섹션에서 위로 스크롤해 올라오는 도중에도) 가로채기가 동작한다.
   */
  function setupReviewWheelScroll(sectionEl, scrollEl, wrapperEl) {
    if (!sectionEl || !scrollEl || !wrapperEl) return;

    var lockStartY = 0;
    var lockEndY = 0;

    function measure() {
      var wrapperRect = wrapperEl.getBoundingClientRect();
      var wrapperAbsTop = wrapperRect.top + window.scrollY;
      var viewportCenter = window.innerHeight / 2;
      var sectionHeight = sectionEl.getBoundingClientRect().height;

      // .review 의 CSS(top: calc(50vh - height/2))와 같은 식으로 고정 시작 지점을 구하고,
      // 래퍼 안에 남는 여유 높이(runway)만큼을 더해 고정이 끝나는 지점을 구한다.
      lockStartY = wrapperAbsTop - (viewportCenter - sectionHeight / 2);
      lockEndY = lockStartY + (wrapperRect.height - sectionHeight);
    }

    function maxScrollLeft() {
      return scrollEl.scrollWidth - scrollEl.clientWidth;
    }

    window.addEventListener(
      "wheel",
      function (e) {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // 실제 가로 스크롤은 기본 동작 유지

        var scrollY = window.scrollY;
        var locked = scrollY >= lockStartY && scrollY <= lockEndY;

        if (!locked) {
          var projected = scrollY + e.deltaY;
          var enteringFromAbove = e.deltaY > 0 && scrollY < lockStartY && projected > lockStartY;
          var enteringFromBelow = e.deltaY < 0 && scrollY > lockEndY && projected < lockEndY;
          if (!enteringFromAbove && !enteringFromBelow) return; // 고정 구간 밖 -> 기본 스크롤 그대로

          var boundary = enteringFromAbove ? lockStartY : lockEndY;
          var leftover = e.deltaY - (boundary - scrollY); // 경계까지 쓰고 남은 만큼만 가로로

          e.preventDefault();
          window.scrollTo(0, boundary);
          scrollEl.scrollLeft = Math.min(maxScrollLeft(), Math.max(0, scrollEl.scrollLeft + leftover));
          return;
        }

        var atStart = scrollEl.scrollLeft <= 0;
        var atEnd = scrollEl.scrollLeft >= maxScrollLeft() - 1;

        if (e.deltaY > 0 && atEnd) return; // 오른쪽 끝 -> 다음 섹션으로 흘려보냄
        if (e.deltaY < 0 && atStart) return; // 왼쪽 끝 -> 이전 섹션으로 흘려보냄

        e.preventDefault();
        scrollEl.scrollLeft += e.deltaY;
      },
      { passive: false }
    );

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var cultureSection = document.querySelector("#culture");
    var cultureTrack = document.querySelector(".culture__track");

    enableHorizontalScroll(cultureTrack);
    enableHorizontalScroll(document.querySelector(".best_seller__carousel"));
    enableHorizontalScroll(document.querySelector(".review__scroll"));

    setupReviewWheelScroll(
      document.querySelector("#review"),
      document.querySelector(".review__scroll"),
      document.querySelector(".review__pin_wrapper")
    );

    setupAutoScroll(cultureSection, cultureTrack, ".culture__panel", ".culture__dot", 2000);

    setupSalonFixedText(
      document.querySelector("#salon"),
      document.querySelector(".salon__grid"),
      "[data-row]",
      ".salon__fixed_text",
      ".salon__panel"
    );

    setupStationeryMorph(
      document.querySelector("#hero_travel_image"),
      document.querySelector(".stationery__icon_slot"),
      document.querySelector(".best_seller__hero_slot")
    );
  });
})();
