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
 * - 마지막 패널 다음엔 왼쪽으로 역주행하지 않고 다시 첫 패널로 순환
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

    function goTo(i) {
      // dot 활성화와 카드 위치 이동을 같은 동기 실행 안에서 처리 —
      // 둘 사이에 애니메이션 지연이 없어 정확히 동시에 바뀐다.
      index = i;
      dots.forEach(function (dot, idx) {
        dot.classList.toggle("is_active", idx === index);
      });
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
    var cultureSection = document.querySelector("#culture");
    var cultureTrack = document.querySelector(".culture__track");

    enableHorizontalScroll(cultureTrack);
    enableHorizontalScroll(document.querySelector(".best_seller__carousel"));
    enableHorizontalScroll(document.querySelector(".review__scroll"));

    setupAutoScroll(cultureSection, cultureTrack, ".culture__panel", ".culture__dot", 2000);
  });
})();
