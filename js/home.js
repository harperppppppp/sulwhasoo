/**
 * Sulwhasoo — 가로 스크롤/드래그 인터랙션
 * 대상: .culture_track(가로 스크롤), .best_seller_dial(아치형 다이얼 회전)
 * - 세로 휠은 그대로 페이지 스크롤로 흘려보냄 (호버 중에도 페이지 스크롤 가능)
 * - 실제 가로 스크롤(트랙패드 좌우 스와이프, Shift+휠 등)은 브라우저 기본 동작으로 좌우 모두 스크롤
 * - 마우스 드래그로도 좌우 스크롤 가능
 *
 * .culture_track 자동 스크롤 (dot 진행바 방식):
 * - culture 섹션이 뷰포트에 처음 들어왔을 때 시작 (IntersectionObserver)
 * - 현재 dot이 2초 동안 정속(linear)으로 차오르고, 다 차오르는 순간
 *   dot 전환과 카드 전환이 완전히 동시에(둘 다 애니메이션 없이 즉시) 일어남
 * - 마지막 패널 다음엔 다시 첫 패널로, 첫 패널 이전엔 다시 마지막 패널로 순환.
 *   마우스로 직접 양쪽 끝까지 스크롤/드래그해도 6→1, 1→6으로 자연스럽게 이어지도록,
 *   보이지 않는 복제본(맨 앞엔 마지막 패널, 맨 뒤엔 첫 패널)을 붙여두고 그 자리에
 *   도달하면 티 안 나게 반대쪽 끝의 진짜 위치로 순간 이동
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

    // 마지막 패널의 복제본을 맨 앞에, 첫 패널의 복제본을 맨 뒤에 붙여, 마우스로
    // 직접 양쪽 끝까지 스크롤/드래그해도 "6번째 다음 1번째", "1번째 이전 6번째"로
    // 자연스럽게 이어지는 것처럼 보이게 한다. 진짜 패널들이 복제본 하나만큼(OFFSET)
    // 뒤로 밀려나므로, 이후 모든 scrollLeft 계산은 OFFSET을 기준점으로 삼는다.
    var lastClone = panels[count - 1].cloneNode(true);
    lastClone.setAttribute("aria-hidden", "true");
    lastClone.setAttribute("inert", "");
    el.insertBefore(lastClone, panels[0]);

    var firstClone = panels[0].cloneNode(true);
    firstClone.setAttribute("aria-hidden", "true");
    firstClone.setAttribute("inert", "");
    el.appendChild(firstClone);

    var OFFSET = panelWidth;

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
      el.scrollLeft = OFFSET + index * panelWidth;
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
      // 사용자가 직접 스크롤/드래그해 위치가 바뀐 경우, 그 위치를 기준으로 이어서 자동 재생.
      // 왼쪽 복제본(마지막 패널) 구간까지 드래그했을 때도 음수 나머지가 아닌
      // count-1로 정확히 떨어지도록 모듈로를 양수로 보정한다.
      var raw = Math.round((el.scrollLeft - OFFSET) / panelWidth);
      goTo(((raw % count) + count) % count);
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

    // 마우스로 직접 스크롤/드래그해 앞뒤 복제본 자리까지 도달하면, 스크롤이 멈춘
    // 순간 티 안 나게 반대쪽 끝의 진짜 위치로 순간 이동한다.
    el.addEventListener("scrollend", function () {
      if (el.scrollLeft >= OFFSET + count * panelWidth - 1) {
        // 오른쪽 끝 복제본(=가짜 1번째) → 진짜 1번째로
        index = 0;
        activateDot(0);
        el.scrollLeft = OFFSET;
      } else if (el.scrollLeft <= 1) {
        // 왼쪽 끝 복제본(=가짜 마지막) → 진짜 마지막으로
        index = count - 1;
        activateDot(index);
        el.scrollLeft = OFFSET + index * panelWidth;
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
   * Flagship — 카드 자동 전환 (culture dot과 동일한 방식):
   * flagship 섹션이 뷰포트에 처음 들어오면 시작, 카운터의 원형 stroke가 2초 동안
   * 정속으로 차오르고 다 차오르는 순간 카드(card01/card02)와 숫자가 즉시 전환됨.
   * 카드가 2개뿐이라 (index + 1) % 2로 01 <-> 02가 계속 왕복 반복된다.
   */
  function setupFlagshipCardCycle(sectionEl, slideEls, ringEl, numEl, fillMs) {
    if (!sectionEl || !slideEls.length || !ringEl) return;
    var count = slideEls.length;
    var index = 0;
    var timer = null;

    function activate(i) {
      slideEls.forEach(function (slide, idx) {
        slide.classList.toggle("is_active", idx === i);
      });
      if (numEl) numEl.textContent = (i + 1) + " / " + count;

      // is_active를 뺐다 다시 붙여, stroke가 즉시 빈 상태로 스냅된 뒤 처음부터 다시 채워지게 한다
      ringEl.classList.remove("is_active");
      void ringEl.offsetWidth; // 강제 리플로우로 transition을 재시작
      ringEl.classList.add("is_active");
    }

    function tick() {
      index = (index + 1) % count;
      activate(index);
    }

    function start() {
      if (timer) clearInterval(timer);
      timer = setInterval(tick, fillMs);
    }

    activate(0);

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
   * Flagship — 커서를 따라다니는 'Click' 배지 (Figma node 4456:383).
   * .flagship_link(섹션 전체를 덮는 <a>) 위에서만 움직이고, 진입/이탈 시
   * fade in/out. fixed 배지라 clientX/Y를 그대로 좌표로 쓴다.
   */
  function setupFlagshipCursor(sectionEl, cursorEl, linkEl) {
    if (!sectionEl || !cursorEl || !linkEl) return;

    function moveCursor(event) {
      cursorEl.style.transform = "translate(" + event.clientX + "px, " + event.clientY + "px) translate(-50%, -50%)";
    }

    function handleEnter(event) {
      sectionEl.classList.add("is_cursor_active");
      moveCursor(event);
    }

    function handleLeave() {
      sectionEl.classList.remove("is_cursor_active");
    }

    linkEl.addEventListener("mouseenter", handleEnter);
    linkEl.addEventListener("mousemove", moveCursor);
    linkEl.addEventListener("mouseleave", handleLeave);
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
   * Salon 클로징 문구 — sticky(.salon_final_pin)가 뷰포트 상단에 닿아 실제로 고정되는
   * 순간(wrapper.top <= 0)을 스크롤마다 확인하다가, 그 순간이 오면 더 이상 스크롤과
   * 무관하게 title → desc → cta 순서로 시간차를 두고 나타난다. culture/flagship
   * 섹션의 IntersectionObserver와 동일하게 한 번만 트리거되고 리스너를 정리한다.
   */
  function setupSalonFinalReveal(wrapperEl, panelEl) {
    if (!wrapperEl || !panelEl) return;
    var titleEl = panelEl.querySelector(".salon_final_title");
    var descEl = panelEl.querySelector(".salon_final_desc");
    var ctaEl = panelEl.querySelector(".salon_final_cta");
    var STAGGER_MS = 300;
    var revealed = false;

    function reveal() {
      if (revealed) return;
      revealed = true;
      if (titleEl) titleEl.classList.add("is_active");
      setTimeout(function () {
        if (descEl) descEl.classList.add("is_active");
      }, STAGGER_MS);
      setTimeout(function () {
        if (ctaEl) ctaEl.classList.add("is_active");
      }, STAGGER_MS * 2);
      window.removeEventListener("scroll", onScroll);
    }

    var ticking = false;
    function check() {
      ticking = false;
      if (wrapperEl.getBoundingClientRect().top <= 0) reveal();
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(check);
    }

    check();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /**
   * Salon 이미지 — Frame(.salon_image_box, overflow: hidden으로 크기 고정)은 뷰포트,
   * 그 안의 <img>는 top: 0에서 시작해 스크롤 진행도에 따라 translateY로만 위→아래로
   * 이동하는 "팬(pan)" 인터랙션. Frame 자체 크기/위치는 절대 바뀌지 않는다.
   *
   * 실제 원본 이미지들은 Frame(439x667)보다 세로 비율이 짧아 폭 기준으로 채우면
   * 빈 공간이 남는다. 그래서 object-fit: cover와 동일하게 "Frame을 완전히 덮는
   * 최소 배율"을 구한 뒤 PAN_SCALE만큼 더 확대해, 세로로 이동할 수 있는 여유
   * 공간(=이동 거리 = 확대된 이미지 높이 - Frame 높이)을 만든다. 가로는 중앙 정렬로
   * 고정하고(overflow: hidden이 좌우도 잘라줌), 세로 위치만 움직인다.
   *
   * 진행도는 각 Frame이 뷰포트 하단에 걸리는 순간(0)부터 상단으로 완전히 빠져나가는
   * 순간(1)까지를 기준으로 자기 자신의 getBoundingClientRect만으로 계산하므로,
   * 여러 Frame이 있어도 서로 무관하게 독립적으로 동작하고 스크롤을 되돌리면 그대로
   * 역재생된다. 다른 스크롤 연동 효과(setupSalonFixedText 등)와 동일하게 스크롤마다
   * rAF로 한 번만 갱신해 레이아웃 스래싱 없이 가볍게 돈다(Frame이 6개뿐이라
   * IntersectionObserver로 대상을 추려낼 만큼 계산량이 크지 않음).
   */
  function setupSalonImagePan(sectionEl, boxSelector) {
    if (!sectionEl) return;
    var boxes = Array.prototype.slice.call(sectionEl.querySelectorAll(boxSelector));
    if (!boxes.length) return;

    var PAN_SCALE = 1.15;

    var items = boxes.reduce(function (acc, box) {
      var img = box.querySelector("img");
      if (img) acc.push({ box: box, img: img, maxTranslate: 0 });
      return acc;
    }, []);
    if (!items.length) return;

    function measure(item) {
      var frameW = item.box.clientWidth;
      var frameH = item.box.clientHeight;
      var naturalW = item.img.naturalWidth;
      var naturalH = item.img.naturalHeight;
      // 리사이즈 도중 등 일시적으로 크기를 잴 수 없는 순간에는 maxTranslate를 0으로
      // 지워버리지 않고 마지막으로 측정된 값을 그대로 둔다(다음 리사이즈에서 다시 잴 것).
      if (!frameW || !frameH || !naturalW || !naturalH) {
        return;
      }

      var coverScale = Math.max(frameW / naturalW, frameH / naturalH);
      var scale = coverScale * PAN_SCALE;
      var renderedW = naturalW * scale;
      var renderedH = naturalH * scale;

      item.img.style.width = renderedW + "px";
      item.img.style.height = renderedH + "px";
      item.img.style.left = (frameW - renderedW) / 2 + "px";
      item.maxTranslate = Math.max(0, renderedH - frameH);
    }

    function applyTransform(item) {
      if (item.maxTranslate <= 0) {
        item.img.style.transform = "translateY(0)";
        return;
      }

      var rect = item.box.getBoundingClientRect();
      var vh = window.innerHeight;
      var progress = (vh - rect.top) / (vh + rect.height);
      progress = progress < 0 ? 0 : progress > 1 ? 1 : progress;
      item.img.style.transform = "translateY(" + -(item.maxTranslate * progress) + "px)";
    }

    function measureAndApply(item) {
      measure(item);
      applyTransform(item);
    }

    function updateAll() {
      items.forEach(applyTransform);
    }

    items.forEach(function (item) {
      if (item.img.complete && item.img.naturalWidth) {
        measureAndApply(item);
      } else {
        item.img.addEventListener("load", function () {
          measureAndApply(item);
        });
      }
    });

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        updateAll();
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () {
      items.forEach(measureAndApply);
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

      // 섹션(.stationery)의 sticky top이 0이 아닐 수 있으므로(예: 고정 위치를
      // 위로 올리기 위한 top:-10vh), 고정된 동안 섹션이 실제로 화면 어디에 붙는지는
      // 이 값을 기준으로 계산해야 한다.
      var sectionTopOffset = parseFloat(getComputedStyle(pinnedSectionEl).top) || 0;

      // sticky 고정이 풀리는 스크롤 지점 = 래퍼 안에 남겨둔 여유 높이(hold 구간)를
      // 다 스크롤한 시점. 그 전까지는 화면이 그대로 붙박여 있으므로 이미지도 움직이지 않는다.
      startScrollY = wrapperAbsTop + (wrapperRect.height - sectionRect.height) - sectionTopOffset;

      var endAbsTop = endSlotEl.getBoundingClientRect().top + window.scrollY;
      var triggerOffset = window.innerHeight * 0.4;
      endScrollY = endAbsTop - triggerOffset;

      // 고정된 동안 섹션의 화면 top은 항상 sectionTopOffset이므로, 슬롯이 화면에
      // 보이는 위치는 그 오프셋에 "섹션 안에서 슬롯까지의 상대 오프셋"(스크롤과
      // 무관한 값)을 더한 값이 된다.
      var startSlotRect = startSlotEl.getBoundingClientRect();
      startRect = {
        top: sectionTopOffset + (startSlotRect.top - sectionRect.top),
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
      // 카드 위 이미지/텍스트를 잡았을 때 브라우저 기본 동작(이미지 네이티브
      // 드래그, 텍스트 선택)이 먼저 끼어들면 pointermove가 끊겨 드래그가
      // 안 먹는 것처럼 느껴진다. preventDefault로 그 기본 동작을 막아
      // 카드 어디를 잡아도 항상 스크롤 드래그로 이어지게 한다.
      e.preventDefault();
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
   * Best Seller — 섹션 고정 + 스크롤 연동 다이얼 캐러셀
   * components/header/header.js의 아치 내비게이션과 같은 시각 방식(각 슬라이드가
   * 고정 각도 baseAngle을 유지한 채, 하나의 값 dialRotation만큼 다 같이 큰 타원
   * 궤도를 따라 움직인다: angle = baseAngle + dialRotation)을 쓰되, 조작 방식은
   * 드래그가 아니라 "섹션 고정 스크롤"이다.
   * hero/stationery와 같은 pin-wrapper 패턴 — .best_seller_pin_wrapper 안에서
   * .best_seller가 position:sticky로 화면에 붙박여 있는 동안, 그 안에 남겨둔
   * 여유 스크롤 구간(runway, 슬라이드 전환당 STEP_RUNWAY_PX)의 진행률(0~1)을
   * 슬라이드 인덱스(0~n-1)로 반올림해서 매핑한다. 인덱스가 바뀔 때(=스크롤이
   * 한 칸 경계를 넘을 때)마다 그 슬라이드가 각도 0(정중앙)에 오도록 이징
   * 애니메이션으로 스냅한다 — 스크롤 픽셀에 그대로 물려 움직이는 게 아니라,
   * "한 칸 넘어가면 자동으로 가운데까지 애니메이션되어 멈추는" 방식이다.
   * 중앙에서 멀어질수록(각도가 1스텝 이상 벌어질수록) 옆으로 밀려나며 궤도를
   * 따라 작아지고 흐려지고 살짝 기운다. 슬라이드1(세럼)이 기본 상태(스크롤
   * 진행률 0)에서 각도 0이 되도록 초기화해, stationery 모프 애니메이션의
   * 도착지(.best_seller_hero_slot)가 항상 이동/회전 없는 정위치에 있도록 한다.
   */
  function setupBestSellerDial(wrapperEl, sectionEl, dialEl, slides) {
    if (!wrapperEl || !sectionEl || !dialEl || !slides.length) return;

    var STEP_DEG = 24; // 슬라이드 사이 각도 간격
    var RX = 1500; // 궤도 타원의 가로 반지름
    var RY = 1000; // 궤도 타원의 세로 반지름
    var DUR = 420; // 스냅 애니메이션 시간(ms)
    var STEP_RUNWAY_PX = 650; // 슬라이드 한 칸을 넘기는 데 필요한 스크롤 거리

    var n = slides.length;
    var mid = (n - 1) / 2;
    var baseAngle = slides.map(function (_, i) {
      return (i - mid) * STEP_DEG;
    });

    // 슬라이드0(세럼)이 각도 0에 오는 회전값 = 다이얼이 도달할 수 있는 최댓값.
    // 즉 세럼이 다이얼의 "시작점" — 그보다 더 오른쪽으로는 돌릴 수 없다.
    var minRotation = -baseAngle[n - 1];
    var maxRotation = -baseAngle[0];
    var dialRotation = maxRotation;
    var currentIndex = 0;

    var animStart = 0;
    var animTarget = dialRotation;
    var animStartTime = 0;
    var animRaf = null;

    function easeOutCubic(p) {
      return 1 - Math.pow(1 - p, 3);
    }

    function clampRotation(v) {
      return Math.max(minRotation, Math.min(maxRotation, v));
    }

    function render() {
      var rect = dialEl.getBoundingClientRect();
      var baseY = rect.height / 2;
      var cy = baseY - RY;

      slides.forEach(function (slide, i) {
        var angle = baseAngle[i] + dialRotation;
        var rad = (angle * Math.PI) / 180;
        var x = RX * Math.sin(rad);
        var y = cy + RY * Math.cos(rad) - baseY;
        // 한 스텝(STEP_DEG) 벌어진 이웃 슬라이드에서 이미 최대로 옅어지고
        // 작아지도록 정규화 — Figma 참조(node 4217:1436)의 이웃 슬라이드
        // opacity 0.5 / 축소된 크기와 맞춘다.
        var stepA = Math.min(1, Math.abs(angle) / STEP_DEG);
        var scale = 1 - stepA * 0.55;
        var opacity = 1 - stepA * 0.5;
        // Figma(node 4217:1436) 기준: 중앙 왼쪽 이웃은 시계방향(+15deg), 오른쪽
        // 이웃은 반시계방향(-15deg)으로 기운다 — angle 부호와는 반대 방향.
        var tilt = Math.max(-15, Math.min(15, angle * -0.6));

        slide.style.transform =
          "translate(-50%, -50%) translate(" +
          x.toFixed(1) +
          "px, " +
          y.toFixed(1) +
          "px) rotate(" +
          tilt.toFixed(1) +
          "deg) scale(" +
          scale.toFixed(3) +
          ")";
        slide.style.opacity = opacity.toFixed(3);
        slide.style.zIndex = String(Math.round((1 - stepA) * 100));
        slide.classList.toggle("is_active", Math.abs(angle) < 0.5);
      });
    }

    function tick(now) {
      var p = Math.min(1, (now - animStartTime) / DUR);
      dialRotation = animStart + (animTarget - animStart) * easeOutCubic(p);
      render();
      animRaf = p < 1 ? requestAnimationFrame(tick) : null;
    }

    function animateTo(target) {
      animStart = dialRotation;
      animTarget = clampRotation(target);
      animStartTime = performance.now();
      if (animRaf) cancelAnimationFrame(animRaf);
      animRaf = requestAnimationFrame(tick);
    }

    function goToIndex(i) {
      currentIndex = i;
      animateTo(-baseAngle[i]);
    }

    // ---- 스크롤 연동: pin wrapper의 여유 구간(runway)을 지나는 동안 스크롤
    // 진행률(0~1)을 슬라이드 인덱스로 환산한다 ----
    var runwayPx = STEP_RUNWAY_PX * (n - 1);
    var pinStartY = 0;

    function measure() {
      var sectionHeight = sectionEl.offsetHeight;
      var wrapperRect = wrapperEl.getBoundingClientRect();
      pinStartY = wrapperRect.top + window.scrollY;
      wrapperEl.style.height = sectionHeight + runwayPx + "px";
    }

    function updateFromScroll() {
      var progress = runwayPx > 0 ? (window.scrollY - pinStartY) / runwayPx : 0;
      progress = Math.max(0, Math.min(1, progress));
      var targetIndex = Math.round(progress * (n - 1));
      if (targetIndex !== currentIndex) goToIndex(targetIndex);
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        updateFromScroll();
        ticking = false;
      });
    }

    // 슬라이드를 클릭하면 스크롤 위치 자체를 그 슬라이드에 해당하는 지점으로
    // 옮긴다 — 스크롤 위치가 유일한 소스이므로, 시각 상태만 바꾸면 다음
    // 스크롤 이벤트에서 그대로 되돌아가 버린다.
    slides.forEach(function (slide, i) {
      slide.addEventListener("click", function () {
        if (i === currentIndex) return;
        var targetY = pinStartY + (i / (n - 1)) * runwayPx;
        window.scrollTo({ top: targetY, behavior: "smooth" });
      });
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () {
      measure();
      render();
      updateFromScroll();
    });
    window.addEventListener("load", function () {
      measure();
      render();
      updateFromScroll();
    });

    measure();
    render();
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

    setupBestSellerDial(
      document.querySelector(".best_seller_pin_wrapper"),
      document.querySelector("#best_seller"),
      document.querySelector(".best_seller_dial"),
      Array.prototype.slice.call(document.querySelectorAll(".best_seller_slide"))
    );

    setupAutoScroll(cultureSection, cultureTrack, ".culture_panel", ".culture_dot", 2000);

    setupFlagshipCardCycle(
      document.querySelector("#flagship"),
      Array.prototype.slice.call(document.querySelectorAll(".flagship_card_top")),
      document.querySelector(".flagship_counter"),
      document.querySelector(".flagship_counter_num"),
      3500
    );

    setupFlagshipCursor(
      document.querySelector("#flagship"),
      document.querySelector(".flagship_cursor"),
      document.querySelector(".flagship_link")
    );

    setupSalonFixedText(
      document.querySelector("#salon"),
      document.querySelector(".salon_grid"),
      "[data-row]",
      ".salon_fixed_text",
      ".salon_panel"
    );

    setupSalonImagePan(document.querySelector("#salon"), ".salon_image_box");

    setupSalonFinalReveal(
      document.querySelector(".salon_final_pin_wrapper"),
      document.querySelector(".salon_final_panel")
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
