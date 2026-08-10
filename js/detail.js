// Sulwhasoo · Product Detail
// pages/product_detail.html 전용 기능
document.addEventListener('DOMContentLoaded', () => {

  // ---- Responsive stage: scale the fixed 1920px canvas to fit narrower
  // viewports (360 / 768 / 1280) so no breakpoint ever gets a horizontal
  // scrollbar. At >=1920px this is scale(1), i.e. unchanged.
  //
  // .stage/.page는 이제 문서 전체에 하나가 아니라 여러 조각으로 나뉘어 있다
  // (hero/message/sales, texture, reviews 각각 자기 .stage/.page 쌍을 가짐) —
  // NO.1/Benefit/Ingredient/Ritual 4개 pin 섹션을 이 조각들 "사이"의 최상위
  // 형제로 뻈기 때문이다(아래 이유 참고). 그래서 [data-scale-stage] 전부를
  // 순회하며 각자 독립적으로 스케일한다 — 조각마다 로직은 기존과 동일하다.
  //
  // 왜 뺐는지: GSAP ScrollTrigger의 pin은 pin 대상(과 그 트리거)이 scale된
  // 조상 안에 있으면 — transform이든 zoom이든 동일하게 — 전혀 고정되지
  // 않고 그냥 스크롤과 함께 흘러가 버린다(격리 테스트로 확인된 GSAP 자체의
  // 한계). 그래서 pin 대상 자체(.no1_pin 등)와 그 트리거 <section>은 scale
  // 조상이 전혀 없는 곳에 real px로 두고, 그 안의 1920px 디자인 좌표
  // 콘텐츠만 새 *_pin_inner 래퍼로 감싸 --stage-scale을 직접 적용한다.
  const stagePairs = Array.from(document.querySelectorAll('[data-scale-stage]'))
    .map((stage) => ({ stage, page: stage.querySelector('.page') }))
    .filter((pair) => pair.page);
  if (stagePairs.length) {
    const handleStageResize = () => {
      const scale = Math.min(1, window.innerWidth / 1920);
      stagePairs.forEach(({ stage, page }) => {
        // scale(1)은 시각적으로 변화가 없지만, transform 자체가 걸리는 순간
        // position:fixed/sticky 자식들의 containing block이 바뀌어 스크롤
        // 스티키 리빌 등이 깨진다. 데스크톱(스케일 불필요)에서는 transform을
        // 아예 걸지 않아 이 부작용을 피한다.
        page.style.transform = scale < 1 ? 'scale(' + scale + ')' : '';
        stage.style.height = scale < 1 ? (page.scrollHeight * scale) + 'px' : '';
      });
      // --stage-scale: :root에 전역으로 노출해 .page 조각들뿐 아니라 그
      // "사이"에 있는 4개 pin 섹션(.page 밖, scale 조상 없음)의 *_pin_inner
      // 래퍼도 같은 값을 상속받아 쓸 수 있게 한다. window.innerWidth는 OS
      // 디스플레이 배율(Windows 125%/150% 등)이 반영된 논리 해상도라 1920px
      // 실물 모니터에서도 scale<1이 흔히 걸린다.
      document.documentElement.style.setProperty('--stage-scale', scale < 1 ? scale : 1);
      // 'load' 시점(이미지가 전부 실제 크기로 자리잡은 뒤)에도 다시 불리는데,
      // 그때 .stage 높이가 커지면 그 아래 NO.1/Benefit/Ingredient/Ritual
      // pin들이 DOMContentLoaded 시점의 더 작았던 레이아웃 기준으로 캐시해둔
      // start/end가 실제 렌더 위치보다 한참 당겨진 채로 굳어버린다 — 그
      // 상태에서는 그 섹션이 화면에 들어와도 progress가 이미 0이 아니거나
      // pin이 아예 안 걸린 것처럼 보인다("NO.1"만 정적으로 보이고 아무 것도
      // 진행되지 않는 증상). GSAP 표준 API인 refresh()로 이 시점 레이아웃
      // 기준으로 전체 트리거를 다시 재는다(트리거가 아직 없으면 아무 효과
      // 없이 끝난다).
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    };
    handleStageResize();
    window.addEventListener('resize', handleStageResize);
    window.addEventListener('load', handleStageResize);
  }

  // ---- NO.1 → Benefit: NO.1 유지 → O 안에 문구(ANTI-AGING SERUM/IN KOREA)
  // 등장 → 같은 O 안에서 그 문구가 golden image로 morph → 같은 이미지가
  // 화면 중앙에서 크게 유지 → 같은 이미지가 축소·이동해 benefit_img 자리에
  // 안착 (GSAP ScrollTrigger pin+scrub, initRitual과 같은 패턴). golden
  // image는 처음부터 끝까지 no1GoldenImg 단 하나의 DOM element만 쓴다 —
  // 복제/두 번째 이미지 생성/두 이미지를 겹쳐 opacity로 바꿔치기하는 방식
  // 전부 없이, 이 한 element의 left/top/width/height/border-radius/
  // opacity/transform만 매 프레임 갱신해 "O → 이미지 → 중앙 → Benefit"이
  // 하나의 연속된 visual object로 이어지게 한다. O의 위치/크기 기준도
  // Figma 좌표 하드코딩이 아니라 실제 DOM(.no1_o_mask)의
  // getBoundingClientRect() 실측값이다. 하나의 ScrollTrigger가 .no1_pin을
  // 고정하는 동안 progress(0~1)만으로 전체 시퀀스를 이어서 재생하고,
  // 스크롤을 위로 올리면 scrub이 자동으로 역재생한다.
  initNo1ToBenefit();

  function initNo1ToBenefit() {
    const no1 = document.querySelector('[data-no1]');
    const no1Pin = no1 ? no1.querySelector('.no1_pin') : null;
    const no1Figure = document.querySelector('[data-no1-figure]'); // "NO.1" — O의 시각적 크기 기준
    const no1Label = document.querySelector('[data-no1-label]'); // ANTI-AGING SERUM / IN KOREA
    const no1OMask = document.querySelector('[data-no1-o-mask]'); // "O 내부" 실측 기준 DOM(원형 클리핑)
    // golden image: ONE DOM element, 시작부터 끝까지 이것 하나만 쓴다 — O 안의
    // 이미지 / 중앙의 큰 이미지 / Benefit 최종 이미지 세 역할을 전부 담당.
    const no1GoldenImg = document.querySelector('[data-no1-golden-img]');
    const benefitSection = document.querySelector('.benefit');
    const benefitImgEl = document.querySelector('.benefit_img'); // 실제 <img> 없음 — 위치/크기 기준으로만 쓰임(항상 opacity:0)

    if (!no1 || !no1Pin || !no1Figure || !no1Label || !no1OMask || !no1GoldenImg || !benefitSection || !benefitImgEl) return;
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return; // GSAP 없으면 초기 정적 상태(문구만 보임) 그대로 둔다

    // reduced-motion: 확대/전환 없이 정적으로 문구만 보이게 둔다(ritual과 동일 정책).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      no1Label.style.opacity = '1';
      return;
    }

    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp01(v) { return Math.min(Math.max(v, 0), 1); }

    // ---- 타임라인 구간 (전체 progress 0~1) ----
    // STEP 1  0    ~ HOLD1_END(.15)      : NO.1 유지
    // STEP 2  HOLD1_END ~ LABEL_END(.30) : O 안에 ANTI-AGING SERUM / IN KOREA 등장
    // STEP 3  LABEL_END ~ MORPH_END(.50) : 같은 O 안에서 문구 → golden image morph
    // STEP 4  MORPH_END ~ CENTER_HOLD_END(.65) : 같은 이미지가 화면 중앙에서 크게 유지
    // STEP 5  CENTER_HOLD_END ~ 1        : 같은 이미지가 축소되며 benefit_img로 이동
    // (요청 스펙 12번 항목의 0/15/30/50/65/100% 비율을 그대로 따른다.)
    const HOLD1_END = 0.15;
    const LABEL_END = 0.30;
    const MORPH_END = 0.50;
    const CENTER_HOLD_END = 0.65;

    const O_MAX_SCALE = 13; // "NO.1" 글자가 커지는 최대 배율 — MORPH_END까지만 쓰고 그 뒤엔 어차피 안 보여서 고정

    let stInstance = null;

    function render(progress) {
      // no1 섹션(pin 스페이서 포함)이 이미 화면 위로 다 지나갔다면, 아래
      // trackSettled()가 golden image의 위치를 전담한다 — 이 함수가 뒤늦게
      // (또는 progress 계산이 어긋난 채) 다시 호출돼 중간 모양(원 등)으로
      // 덮어써 버리는 걸 막는다.
      if (no1.getBoundingClientRect().bottom <= 0) return;

      const p = progress;

      // STEP1→STEP3: O(=NO.1의 "O" 글자) 확대. HOLD1_END 이전엔 1배(NO.1
      // 유지), HOLD1_END~MORPH_END 구간에서 1→O_MAX_SCALE로 커진다. 그
      // 이후(STEP4~5)는 문구/글자가 이미 다 옅어져 안 보이므로 고정.
      const zoomT = clamp01((p - HOLD1_END) / (MORPH_END - HOLD1_END));
      const oScale = lerp(1, O_MAX_SCALE, zoomT);
      no1Figure.style.transform = `scale(${oScale})`;

      // STEP2: 라벨(ANTI-AGING SERUM/IN KOREA)이 HOLD1_END~LABEL_END 구간에
      // fade+scale(.92→1)로 O 안에 나타난다.
      const labelIn = clamp01((p - HOLD1_END) / (LABEL_END - HOLD1_END));
      // STEP3: LABEL_END~MORPH_END 구간에서 라벨이 fade+scale-out(1→.95)
      // 되는 것과 동시에 golden image가 fade+scale-in — "같은 O 안"에서
      // 하나가 다른 것으로 넘어가는 단일 morph 모먼트다(따로 등장/소멸하는
      // 별개의 애니메이션이 아니라 같은 진행률 축 위의 상호 보완 관계).
      const morphT = clamp01((p - LABEL_END) / (MORPH_END - LABEL_END));

      no1Label.style.opacity = String(labelIn * (1 - morphT));
      no1Label.style.transform = `scale(${p <= LABEL_END ? lerp(0.92, 1, labelIn) : lerp(1, 0.95, morphT)})`;

      // "NO.1" 글자 자체도 morph와 같은 타이밍에 옅어져, STEP4(이미지가
      // 중앙에서 크게 유지)에서는 화면이 이미지에 완전히 지배되게 한다.
      no1Figure.style.opacity = String(1 - morphT);

      // O 마스크(.no1_o_mask, 실제 DOM): O 확대율에 맞춰 매 프레임 크기를
      // 지정한 뒤 getBoundingClientRect()로 실측한다 — Figma 좌표를 쓰지
      // 않고 이 요소의 실제 화면 위치/크기가 golden image의 유일한 기준이다.
      // MORPH_END 이후로는 zoomT가 1에 고정되어 이 크기도 함께 고정되고,
      // 그 값을 STEP4(중앙 유지)·STEP5(이동 시작점)가 그대로 이어받는다.
      const oSize = Math.min(window.innerWidth, window.innerHeight) * 0.6 * (oScale / O_MAX_SCALE);
      no1OMask.style.width = oSize + 'px';
      no1OMask.style.height = oSize + 'px';
      const oRect = no1OMask.getBoundingClientRect();

      // golden image(ONE element)는 morph가 시작되기 전까지는 완전히 숨어
      // 있는다 — "별도의 큰 이미지로 화면에 처음부터 존재"하지 않는다.
      if (morphT <= 0) {
        no1GoldenImg.style.opacity = '0';
        return;
      }
      no1GoldenImg.style.opacity = String(morphT);

      // 도착 지점(benefit_img)은 항상 실측(getBoundingClientRect) — 고정 px로
      // 하드코딩하지 않아 브라우저 크기가 달라져도 정확히 맞아 들어간다.
      const benefitImgRect = benefitImgEl.getBoundingClientRect();
      const benefitRect = benefitSection.getBoundingClientRect();
      const targetRect = {
        left: benefitImgRect.left,
        top: benefitImgRect.top - benefitRect.top,
        width: benefitImgRect.width,
        height: benefitImgRect.height,
      };

      let width, height, centerX, centerY;
      if (p <= CENTER_HOLD_END) {
        // STEP3(morph)~STEP4(중앙 유지): O 마스크의 실측 rect를 그대로
        // 따라간다 — morph 중엔 O와 함께 커지고, MORPH_END 이후로는 oScale이
        // 고정되어 자연히 같은 크기·자리에 "중앙에서 크게" 멈춰 있는다.
        // 같은 element가 O 자리에서 자라나 그대로 유지되는 것이라, 별도
        // 이미지가 새로 등장하는 것처럼 보이지 않는다.
        width = oRect.width;
        height = oRect.height;
        centerX = oRect.left + oRect.width / 2;
        centerY = oRect.top + oRect.height / 2;
      } else {
        // STEP5: 같은 이미지가 축소되며 benefit_img로 이동 — 크기와
        // 중심점이 함께, 하나의 연속된 변형으로 도착한다(분리된 두 단계가
        // 아님). 시작점은 STEP4가 멈춰있던 자리(oRect)라 여기서도 "새 위치에
        // 다시 나타나는" 순간이 없다.
        const moveT = clamp01((p - CENTER_HOLD_END) / (1 - CENTER_HOLD_END));
        width = lerp(oRect.width, targetRect.width, moveT);
        height = lerp(oRect.height, targetRect.height, moveT);
        const startCenterX = oRect.left + oRect.width / 2;
        const startCenterY = oRect.top + oRect.height / 2;
        const targetCenterX = targetRect.left + targetRect.width / 2;
        const targetCenterY = targetRect.top + targetRect.height / 2;
        centerX = lerp(startCenterX, targetCenterX, moveT);
        centerY = lerp(startCenterY, targetCenterY, moveT);
      }

      const rect = {
        left: centerX - width / 2,
        top: centerY - height / 2,
        width,
        height,
      };

      // border-radius(원 → 사각형) morph: CENTER_HOLD_END까지는 O 모양
      // 그대로(원형)를 유지하다가, STEP5(이동) 동안 benefit_img 모양(사각형)
      // 으로 서서히 morph된다 — "O를 벗어나 큰 이미지로" 확장되는 느낌은
      // STEP3~4에서 이미 크기로 표현되므로, 모서리는 이동과 함께 마지막에
      // 각진다.
      const radiusT = p <= CENTER_HOLD_END ? 0 : clamp01((p - CENTER_HOLD_END) / (1 - CENTER_HOLD_END));
      const radiusPct = lerp(50, 0, radiusT);

      // pop-in: STEP3(morph) 동안 이미지가 0.8→1로 살짝 커지며 나타나는
      // 느낌을 얹는다 — left/top/width/height는 그대로 O 자리를 따라가고,
      // 이 transform은 그 위에 겹쳐지는 시각적 강조일 뿐이라 위치 계산과
      // 충돌하지 않는다(중심 기준 scale이라 박스의 중심은 그대로 유지된다).
      const popScale = lerp(0.8, 1, morphT);

      // 실제 left/top/width/height/border-radius를 매 프레임 직접 보간한다
      // (transform:scale로 흉내내지 않음) — object-fit:cover가 그때그때
      // 실제 박스 크기에 맞춰 다시 계산되므로, 원(정사각형)→targetRect
      // (benefit_img, 정사각형)처럼 가로세로 비율이 달라지는 구간에서도
      // 이미지 내용이 절대 찌그러지지 않는다.
      no1GoldenImg.style.left = rect.left + 'px';
      no1GoldenImg.style.top = rect.top + 'px';
      no1GoldenImg.style.width = rect.width + 'px';
      no1GoldenImg.style.height = rect.height + 'px';
      no1GoldenImg.style.borderRadius = radiusPct + '%';
      no1GoldenImg.style.transform = morphT < 1 ? `scale(${popScale})` : 'none';
    }

    // ScrollTrigger의 pin 구간이 끝난 뒤(progress가 1에 머문 뒤)에도 계속
    // 스크롤하면 Product_Benefit이 화면을 따라 움직이므로(그 안에 있는
    // .benefit_pin이 자체 ScrollTrigger pin으로 더 고정될 수도 있음), golden
    // image도 benefit_img의 그때그때 실제 좌표를 계속 따라가야 한다.
    // onUpdate는 pin 구간(start~end) 안에서만 호출되므로, 그 바깥은 별도
    // scroll 리스너로 보완한다 — 기존 benefit_img(opacity:0)와 겹쳐
    // 보이는 순간 없이, 같은 golden image가 계속 그 자리를 대신한다.
    function trackSettled() {
      // stInstance.progress(GSAP ScrollTrigger 값)에만 의존하면, 페이지 뒤쪽에
      // 새 pin 섹션이 추가/변경되어 ScrollTrigger가 refresh될 때 이 값이
      // 실제 스크롤 위치와 어긋나 1 미만에 멈춰버리는 경우가 있다 — 그러면
      // golden image가 render()가 마지막으로 그린 중간 상태(예: 아직 원
      // 모양인 채로)에 멈춰서, 사용자가 한참 더 아래(Ingredient 등)로
      // 스크롤해도 화면 위에 둥둥 떠 있는 것처럼 보인다. GSAP progress 대신
      // no1 섹션 자체의 실제 화면 위치(pin 스페이서를 포함한 전체 높이)로
      // "이미 다 지나쳤는지"를 판단하면 GSAP 쪽 계산과 무관하게 항상 맞는다.
      if (!stInstance) return;
      const no1Rect = no1.getBoundingClientRect();
      if (no1Rect.bottom > 0) return; // no1 섹션이 아직 화면에 걸쳐 있으면 render()가 처리 중
      const liveRect = benefitImgEl.getBoundingClientRect();
      no1GoldenImg.style.left = liveRect.left + 'px';
      no1GoldenImg.style.top = liveRect.top + 'px';
      no1GoldenImg.style.width = liveRect.width + 'px';
      no1GoldenImg.style.height = liveRect.height + 'px';
      no1GoldenImg.style.borderRadius = '0';
      no1GoldenImg.style.transform = 'none';
      no1GoldenImg.style.opacity = '1';
    }

    stInstance = ScrollTrigger.create({
      trigger: no1,
      start: 'top top',
      end: () => '+=' + window.innerHeight * 6, // 충분한 스크롤 구간 — resize 시 refresh가 재계산한다
      pin: no1Pin,
      // no1Pin은 이제 .page(반응형 scale 조상) 밖에 real px로 산다 — scale
      // 조상이 없으니 기본 pinType:"fixed"(position:fixed)가 정상적으로
      // 진짜 뷰포트 기준으로 동작한다. 예전엔 .page 안에 있어서 pinType을
      // 'transform'으로 강제해야 했지만, 그 우회 자체로도 스케일된 조상
      // 안에서는 pin-spacer 크기 계산이 어긋나 pin이 전혀 고정되지 않는
      // 별도 버그가 있었다(GSAP 격리 테스트로 확인) — 그래서 pinType을
      // 바꾸는 대신 아예 scale 조상 밖으로 뺐다.
      scrub: true,
      onUpdate(self) { render(self.progress); },
    });

    // 새로고침 등으로 이미 스크롤이 진행된 채 로드될 수 있으므로, 0이 아니라
    // 지금 실제 progress로 초기 렌더한다.
    render(stInstance.progress);
    trackSettled();
    window.addEventListener('scroll', trackSettled, { passive: true });
  }

  // ---- message_title word-by-word reveal (pinned scroll) ----
  // message_reveal 섹션이 스크롤 동안 고정(position: sticky)되고, 그 사이
  // message_title의 각 단어가 순서대로 #BFBFBF → 검정(#2c2d32)으로 바뀐다.
  // 단어 색이 다 채워지고 나면(progress > WORDS_END) 이어서 message_desc가
  // 나타난다. ContentBlock 3(message_round_img)도 이 안에 있어, 같은 구간 동안
  // js/detail_scene.js가 3D 병을 그 자리에 고정된 것처럼 계속 그려준다.
  const messageReveal = document.querySelector('[data-message-reveal]');
  const revealWords = document.querySelectorAll('[data-reveal-title] .reveal_word');
  const revealDesc = document.querySelector('[data-reveal-desc]');

  if (messageReveal && revealWords.length) {
    const GRAY = [0xbf, 0xbf, 0xbf];
    const INK = [0x2c, 0x2d, 0x32];
    const WORDS_END = 0.7; // 단어 리빌은 진행률의 70%까지만 쓰고, 나머지 30%에 desc가 나타난다

    function lerpColor(from, to, amount) {
      const r = Math.round(from[0] + (to[0] - from[0]) * amount);
      const g = Math.round(from[1] + (to[1] - from[1]) * amount);
      const b = Math.round(from[2] + (to[2] - from[2]) * amount);
      return `rgb(${r}, ${g}, ${b})`;
    }

    function smoothstep(value) {
      const t = Math.min(Math.max(value, 0), 1);
      return t * t * (3 - 2 * t);
    }

    function handleRevealScroll() {
      const rect = messageReveal.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;

      const count = revealWords.length;
      revealWords.forEach((word, index) => {
        const start = (index / count) * WORDS_END;
        const end = ((index + 1) / count) * WORDS_END;
        const amount = smoothstep((progress - start) / (end - start));
        word.style.color = lerpColor(GRAY, INK, amount);
      });

      if (revealDesc) {
        const amount = smoothstep((progress - WORDS_END) / (1 - WORDS_END));
        revealDesc.style.opacity = String(amount);
        revealDesc.style.transform = `translateY(${(1 - amount) * 16}px)`;
      }
    }

    handleRevealScroll();
    window.addEventListener('scroll', handleRevealScroll, { passive: true });
    window.addEventListener('resize', handleRevealScroll);
  }

  // ---- JAUM Ingredient: 스크롤에 따라 5개 성분을 순서대로 보여주는
  // storytelling 인터랙션 (GSAP ScrollTrigger pin) ----
  // .ritual(initRitual)과 완전히 같은 구조다: 섹션에 진입하면 .ingredient_pin이
  // 화면에 고정되고, 스크롤 진행률 0~1을 5등분한 정수 인덱스로 어떤
  // .ingredient_slide가 보일지 정한다. 이미지가 먼저 등장하고 텍스트가 뒤따르는
  // 시간차는 CSS(.ingredient_title의 transition-delay, css/detail.css)가
  // 처리하므로, 여기서는 인덱스 전환(is_active/is_prev 토글)과 HUD(진행바+목록)
  // 갱신만 맡는다.
  function initJaumIngredient() {
    const section = document.querySelector('[data-ingredient]');
    const pinTarget = document.querySelector('[data-ingredient-pin]');
    const card = document.querySelector('[data-ingredient-track]');
    const slides = document.querySelectorAll('[data-ingredient-slide]');
    const listItems = document.querySelectorAll('[data-ingredient-list] li');
    const barFill = document.querySelector('[data-ingredient-bar-fill]');
    if (!section || !pinTarget || !slides.length) return;

    // .ingredient_pin은 항상 100vh(+overflow:hidden)라, 뷰포트가 1200px보다
    // 낮으면 1920x1200 카드가 넘쳐서 잘린다(HUD까지 화면 밖으로 사라지는 원인).
    // .ritual_pin(updateCardScale)과 완전히 같은 방식으로 .page의 현재 width
    // 스케일을 구해 "로컬 좌표계 기준 가용 높이"를 계산하고, 그 안에 1200px가
    // 다 들어오도록 카드를 축소한다 — gsap/pin 여부와 무관하게 항상 적용해야
    // reduced-motion fallback에서도 잘리지 않는다.
    function updateCardScale() {
      if (!card) return;
      const pageEl = document.querySelector('.page');
      let stageScale = 1;
      if (pageEl && pageEl.offsetWidth) {
        stageScale = (pageEl.getBoundingClientRect().width / pageEl.offsetWidth) || 1;
      }
      const availableLocalHeight = window.innerHeight / stageScale;
      const scale = Math.min(1, availableLocalHeight / 1200);
      card.style.setProperty('--ingredient-scale', scale);
    }
    updateCardScale();
    window.addEventListener('resize', updateCardScale);

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotionQuery.matches || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      // pin/스크럽 없이 Peony만 정적으로 보여준다(ritual과 동일한 fallback).
      slides.forEach((slide, i) => slide.classList.toggle('is_active', i === 0));
      listItems.forEach((li, i) => li.classList.toggle('is_active', i === 0));
      return;
    }

    const total = slides.length;
    // -1은 "아직 아무 성분도 활성화되지 않은 진입 전" 상태 — HTML에 처음부터
    // is_active를 박아두면 클래스에 "변화"가 없어 등장 트랜지션(이미지→텍스트)이
    // 재생되지 않는다. 섹션에 처음 들어와 onUpdate가 index 0을 계산하는 순간
    // -1→0으로 실제 클래스 변화가 생기면서 Peony의 등장 애니메이션이 재생된다.
    let activeIndex = -1;

    function setActive(index) {
      activeIndex = index;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is_active', i === index);
        slide.classList.toggle('is_prev', i < index);
      });
      listItems.forEach((li, i) => li.classList.toggle('is_active', i === index));
    }

    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      // 성분 1개당 화면 높이의 1.15배 — IMAGE 등장 → TEXT 등장 → HOLD가 다
      // 지나갈 여유를 준다(ritual의 "성분당 1화면"보다 살짝 넉넉하게).
      end: () => '+=' + window.innerHeight * total * 1.15,
      pin: pinTarget,
      // pin 대상이 이제 .page(반응형 scale 조상) 밖에 real px로 살아서
      // 기본 pinType:"fixed"가 정상 동작한다 — no1과 동일한 이유.
      scrub: true,
      onUpdate(self) {
        // 얇은 Progress Line: width(%)를 매 프레임 직접 쓴다(transition 없음) —
        // scrub과 다른 속도로 따라가면 스크롤과 분리된 느낌이 생기기 때문.
        // 끝의 작은 포인트(빛)는 CSS(.ingredient_bar_fill::after)가 이 width의
        // 오른쪽 끝을 따라가며 알아서 위치를 잡는다.
        if (barFill) barFill.style.width = `${self.progress * 100}%`;
        let index = Math.floor(self.progress * total);
        if (index >= total) index = total - 1;
        if (index < 0) index = 0;
        if (index !== activeIndex) setActive(index);
      },
    });
  }

  // BENEFIT의 ScrollTrigger.create()는 JAUM INGREDIENT보다 먼저 등록해야
  // 한다 — GSAP는 각 트리거의 'top top' 시작점을 등록 순서대로 계산하는데,
  // BENEFIT(문서상 INGREDIENT보다 앞)이 나중에 등록되면 INGREDIENT가 이미
  // "BENEFIT에 pin 스크롤 구간이 없다"고 가정한 채 시작점을 계산해버려,
  // 두 pin 구간이 겹쳐 스크롤 도중 INGREDIENT가 BENEFIT 패널 위로 먼저
  // 튀어나오는 문제가 있었다. initJaumIngredient 자체는 그대로 두고 호출
  // 순서만 바꿔서 해결한다.
  initBenefitReveal();
  initJaumIngredient();

  // ---- BENEFIT: 스크롤하면 화면 아래에서 White Panel이 올라와 배경(GOLD
  // 이미지+지표 리스트)을 덮고, 그 안에 JAUM Activator 설명이 나타난다.
  // no1/ritual과 같은 패턴(GSAP ScrollTrigger가 내부 .benefit_pin을 pin,
  // scrub으로 스크롤에 진행률을 붙임 — 위로 스크롤하면 자동으로 역재생된다).
  // no1ToBenefit의 render(progress) 방식과 동일하게, 구간 상수 기반으로
  // 직접 계산해서 매 프레임 적용한다(gsap.timeline의 duration/position
  // 비율로는 "얼마나 지나야 시작하는지"를 직관적으로 맞추기 어려워서
  // progress 기준으로 바꿈).
  function initBenefitReveal() {
    const section = document.querySelector('#benefit');
    const pinTarget = document.querySelector('[data-benefit-pin]');
    const panel = document.querySelector('[data-benefit-reveal]');
    const body = document.querySelector('[data-benefit-reveal-body]');
    const rows = document.querySelectorAll('.benefit_row'); // 01~05 지표 행 — 숫자/라벨/값이 스크롤 순서대로 "차오르며" 켜진다
    if (!section || !pinTarget || !panel) return;

    // 값 텍스트(+68.2% 등) 위에 겹칠 오렌지 사본(::after, content: attr(data-value))이
    // 읽을 attr를 채워둔다 — 마크업에 직접 중복 기입하지 않고 현재
    // textContent를 그대로 복사해, 나중에 수치가 바뀌어도 따로 안 건드려도 된다.
    // 동시에 "+68.2%" 같은 원본 텍스트를 부호/숫자/소수자리수로 파싱해 두어,
    // 아래 render(p)에서 0 → 목표값으로 카운트업할 때 같은 자리수·부호로
    // 다시 포맷할 수 있게 한다.
    function parseValue(str) {
      const m = /^([+-])(\d+(?:\.(\d+))?)(%?)$/.exec(str.trim());
      if (!m) return null;
      return {
        sign: m[1],
        magnitude: parseFloat(m[2]),
        decimals: m[3] ? m[3].length : 0,
        suffix: m[4] || '',
      };
    }
    const rowStates = Array.from(rows).map((row) => {
      const valueEl = row.querySelector('.benefit_value');
      if (!valueEl) return null;
      if (!valueEl.hasAttribute('data-value')) {
        valueEl.setAttribute('data-value', valueEl.textContent.trim());
      }
      const parsed = parseValue(valueEl.textContent);
      return parsed ? { valueEl, ...parsed } : null;
    });

    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return; // 정적 상태(배경만 보임) 그대로 둔다

    // reduced-motion: pin/스크롤 애니메이션 없이 패널이 이미 다 올라온
    // 최종 상태로 바로 보여준다(ritual/no1과 동일 정책). 지표 행도 순서
    // 연출 없이 전부 즉시 켜둔다.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(panel, { y: 0, opacity: 1 });
      if (body) gsap.set(body, { opacity: 1 });
      rows.forEach((row) => row.classList.add('is_active'));
      return;
    }

    // 카드 자신의 높이만큼 px 단위로 움직인다(yPercent 아님) — 뒤의 EXIT
    // 구간에서는 "뷰포트 높이만큼" 이동해야 하는데 yPercent는 카드 자신의
    // 높이 기준이라 뷰포트 이동량과 한 트랙에서 섞어 쓸 수 없기 때문.
    // 카드 높이는 반응형 스케일 등으로 바뀔 수 있어 resize/refresh 시 다시 잰다.
    let panelH = panel.offsetHeight;
    function measurePanel() { panelH = panel.offsetHeight; }
    window.addEventListener('resize', measurePanel);

    gsap.set(panel, { y: panelH, opacity: 1 }); // CSS 기본값(opacity:0)을 GSAP 전담 상태로 전환 — transform은 이제부터 GSAP만 건드린다

    function clamp01(v) { return Math.min(Math.max(v, 0), 1); }

    // 배경(GOLD 이미지+지표 리스트)을 충분히 보여준 뒤에야 카드가 올라오기
    // 시작한다(RISE_START). RISE_END에서 카드 높이만큼 다 올라와 화면
    // 아래쪽에 "텍스트 카드"로 완전히 보이고, HOLD_END까지는 그 자리에
    // 고정된 채(텍스트도 카드에 딸려있을 뿐 따로 애니메이션하지 않는다)
    // 읽을 시간을 준다. 그 뒤 EXIT_END까지는 같은 방향으로 계속 올라가되
    // 이번엔 카드 높이가 아니라 "뷰포트 높이"만큼 이동해 화면 위로 완전히
    // 빠져나간다 — pin이 끝나는 시점(progress=1)과 맞물려 다음 섹션(JAUM
    // INGREDIENT)이 바로 이어지는 것처럼 보인다.
    //
    // REVEAL_START: 섹션이 화면에 막 자리잡은 직후(p=0)부터 바로 반응하지
    // 않고, 살짝 뜸을 들인 뒤에야(0.07) 01번 행부터 켜지기 시작한다 — "자리
    // 잡고 나서 스크롤해야 인터랙션이 시작되는" 느낌. REVEAL_END(0.38)까지
    // 걸쳐 5개 행이 하나씩 채워지는데, 예전(0~0.2, 즉 반응 시작부터 0.2까지)
    // 보다 한 행당 스크롤 폭이 넉넉해져(전체 4.5vh 기준 약 1.4vh, 예전
    // 0.7vh의 두 배) "너무 빠르다"는 느낌을 줄였다. RISE_START는 REVEAL_END
    // 보다 살짝 늦게 잡아, 패널이 배경을 덮기 전에 다섯 행이 모두 켜진 걸
    // 볼 여유를 준다. RISE/HOLD/EXIT 각 구간의 실제 스크롤 길이(vh)는 예전과
    // 거의 동일하게 유지했다 — 전체 pin 길이(아래 ScrollTrigger의 end)를
    // 3.5vh→4.5vh로 늘려 그 차액만큼을 REVEAL_START/REVEAL_END 확장에 썼다.
    const REVEAL_START = 0.07;
    const REVEAL_END = 0.38;
    const RISE_START = 0.42;
    const RISE_END = 0.66;
    const HOLD_END = 0.85;
    const EXIT_END = 1;
    const rowSegment = rows.length ? 1 / rows.length : 0; // localP(REVEAL_START~REVEAL_END를 0~1로 정규화) 기준, 행 하나가 차지하는 폭

    function render(p) {
      let y;
      if (p <= RISE_END) {
        const riseT = clamp01((p - RISE_START) / (RISE_END - RISE_START));
        y = panelH * (1 - riseT); // 카드 높이만큼 아래에 숨어있다가(riseT=0) 화면에 다 보이는 자리(riseT=1, y=0)까지
      } else if (p <= HOLD_END) {
        y = 0; // HOLD: 카드도 텍스트도 그대로 고정
      } else {
        const exitT = clamp01((p - HOLD_END) / (EXIT_END - HOLD_END));
        y = -window.innerHeight * exitT; // EXIT: 뷰포트 높이만큼 위로 계속 올라가 화면 밖으로 빠져나간다
      }
      gsap.set(panel, { y });

      // 01→05 순차 "차오름": 현재 구간에 해당하는 행 하나만 0%→100%로
      // 서서히 채워진다(--fill, CSS의 텍스트 wipe가 이 값을 읽는다).
      // 다음 행으로 넘어가는 순간 이전 행은 즉시 0%로 되돌아간다(스크롤
      // 위로 돌아가면 자동으로 역재생). 시간(transition) 기반이 아니라
      // 스크롤 진행률에 직접 묶여 있어서, 빨리 스크롤해도 느리게
      // 스크롤해도 "차오르는 과정"을 건너뛰지 않는다. 다만 마지막 행은
      // 다음 행이 없으므로 REVEAL_END를 넘긴 뒤에도(= 패널이 덮기 전까지)
      // 100%로 유지된다. localP: REVEAL_START 이전엔 0으로 묶여있어(아직
      // 아무 행도 안 켜짐) "자리잡고 뜸 들인 뒤 반응 시작" 느낌을 만들고,
      // REVEAL_START~REVEAL_END 구간을 0~1로 정규화해 기존 로직을 그대로 쓴다.
      if (rows.length) {
        const localP = clamp01((p - REVEAL_START) / (REVEAL_END - REVEAL_START));
        const idx = Math.min(Math.floor(localP * rows.length), rows.length - 1);
        rows.forEach((row, i) => {
          // 지나친 행(i < idx)은 항상 100%, 아직 안 온 행(i > idx)은 0%, 현재
          // 행(i === idx)만 스포트라이트와 같은 비율로 — 프레임 순서에 상관없이
          // p 하나로 항상 옳은 상태가 나온다. (버그: 예전엔 이 값이 i===idx일
          // 때만 계산되고 나머지는 전부 0이라, 지나간 행이 누적되지 않고
          // "현재 행 하나만 반짝 켜졌다 꺼지는" 것처럼 보였다 — 아래 숫자
          // 카운트업의 countT와 같은 값이라 fillT 하나로 통일한다.)
          const fillT = i === idx ? clamp01((localP - i * rowSegment) / rowSegment) : (i < idx ? 1 : 0);
          row.style.setProperty('--fill', (fillT * 100).toFixed(1) + '%');
          row.classList.toggle('is_active', fillT > 0);

          // 숫자 카운트업: "몇 번째 행을 지나쳤는지(idx)"로 매 프레임 직접
          // 계산한다 — 예전엔 t가 정확히 1이 되는 프레임을 만나야만 done을
          // 걸어 최종값을 고정했는데, 한 행이 차지하는 스크롤 구간이 짧아
          // (전체 구간의 4%, 실제로는 휠 한 번에도 건너뛸 수 있는 폭) 그
          // 프레임을 아예 못 만나고 다음 행으로 넘어가버리면 done이 영영
          // 안 걸려 숫자가 "0.0%"로 계속 덮어써지는 문제가 있었다.
          const rowState = rowStates[i];
          if (rowState) {
            const current = rowState.sign + (rowState.magnitude * fillT).toFixed(rowState.decimals) + rowState.suffix;
            rowState.valueEl.textContent = current;
            rowState.valueEl.setAttribute('data-value', current); // ::after wipe 사본도 같이 갱신
          }
        });
      }
    }

    render(0);

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => '+=' + window.innerHeight * 4.5, // 3.5→4.5: REVEAL_START 지연 + 행당 반응 폭 확장분(위 주석) — resize 시 refresh가 재계산
      pin: pinTarget,
      // pin 대상이 이제 .page(반응형 scale 조상) 밖에 real px로 살아서
      // 기본 pinType:"fixed"가 정상 동작한다 — no1과 동일한 이유.
      scrub: true,
      onRefresh: measurePanel, // .page의 반응형 스케일이 바뀌면(리사이즈 등) 카드 실측 높이도 다시 잰다
      onUpdate(self) { render(self.progress); },
    });
    render(st.progress);

    // 이 pin이 새로 늘려놓은 스크롤 구간을, 이미 그 전에 만들어진 뒤쪽
    // 섹션(JAUM INGREDIENT 등)의 ScrollTrigger가 옛 높이 기준으로 계산해
    // 시작 지점을 너무 이르게 잡아버리는 경우가 있다 — 다른 섹션의 코드는
    // 건드리지 않고 GSAP 표준 API인 refresh()로 전체 트리거의 시작/끝
    // 지점만 다시 재계산시켜 겹침을 없앤다. pin-spacer가 막 삽입된
    // 직후라 브라우저가 아직 그 레이아웃을 반영하기 전일 수 있어, 한
    // 프레임 뒤로 미룬다.
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }

  // ---- RITUAL / HOW TO USE: scroll-driven Step 1→2→3 transition ----
  // Figma 디자이너 노트대로 좌우 캐러셀 대신, ingredient 섹션과 같은 패턴
  // (섹션 진입 시 pin, 스크롤 진행률 0~1을 3등분)으로 Step을 전환한다.
  // kicker/heading은 세 Step에서 동일해 그대로 두고, 이미지·설명·Step
  // 표시(is_active)만 인덱스에 맞춰 토글한다.
  function initRitual() {
    const section = document.querySelector('[data-ritual]');
    const pinTarget = document.querySelector('[data-ritual-pin]');
    const card = document.querySelector('[data-ritual-card]');
    const slides = document.querySelectorAll('[data-ritual-slide]');
    const descs = document.querySelectorAll('[data-ritual-desc]');
    const stepItems = document.querySelectorAll('[data-ritual-steps] li');
    if (!section || !pinTarget || !slides.length) return;

    // .ritual_pin은 항상 100vh(+overflow:hidden)라, 뷰포트가 1080px보다 낮으면
    // 1920x1080 카드가 그대로는 넘쳐서 잘린다(Step 표시가 화면 밖으로 사라지는
    // 원인). NO.1 섹션의 getStageScale()과 같은 방식으로 .page의 현재
    // width 스케일을 구해 "로컬 좌표계 기준 가용 높이"를 계산하고, 그 안에
    // 1080px가 다 들어오도록 카드를 축소한다 — gsap/pin 여부와 무관하게
    // 항상 적용해야 reduced-motion fallback에서도 잘리지 않는다.
    function updateCardScale() {
      if (!card) return;
      const pageEl = document.querySelector('.page');
      let stageScale = 1;
      if (pageEl && pageEl.offsetWidth) {
        stageScale = (pageEl.getBoundingClientRect().width / pageEl.offsetWidth) || 1;
      }
      const availableLocalHeight = window.innerHeight / stageScale;
      const scale = Math.min(1, availableLocalHeight / 1080);
      card.style.transform = `scale(${scale})`;
    }
    updateCardScale();
    window.addEventListener('resize', updateCardScale);

    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    // reduced-motion에서는 pin으로 스크롤을 가두지 않는다 — Step 1이 보이는
    // 정적인 섹션으로 두고, 콘텐츠는 그대로 다 보이게 fallback한다.
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotionQuery.matches) return;

    const total = slides.length;
    let activeIndex = 0;

    function setActive(index) {
      activeIndex = index;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is_active', i === index);
        slide.classList.toggle('is_prev', i < index);
      });
      descs.forEach((desc, i) => {
        desc.classList.toggle('is_active', i === index);
        desc.classList.toggle('is_prev', i < index);
      });
      stepItems.forEach((li, i) => li.classList.toggle('is_active', i === index));
    }

    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => '+=' + window.innerHeight * total, // Step 1개당 화면 높이만큼 스크롤
      pin: pinTarget,
      // pin 대상이 이제 .page(반응형 scale 조상) 밖에 real px로 살아서
      // 기본 pinType:"fixed"가 정상 동작한다 — no1과 동일한 이유.
      scrub: true,
      onUpdate(self) {
        let index = Math.floor(self.progress * total);
        if (index >= total) index = total - 1;
        if (index !== activeIndex) setActive(index);
      },
    });
  }

  initRitual();

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

  // ---- Reviews: 왼쪽으로 끊김 없이 계속 흐르는 자동 슬라이드 ----
  // 원본 카드 세트를 한 번 더 복제해 뒤에 이어붙인 뒤, translateX를 원본
  // 세트 폭만큼 이동할 때마다 0으로 되돌려서 시각적으로 끊김 없이 반복되게 한다.
  function initReviewsMarquee() {
    // .reviews_track: 자르는 창(overflow:hidden, 고정, transform 없음).
    // .reviews_track_inner: 실제로 translateX 애니메이션이 걸리는 카드 flex 묶음.
    // 이 둘을 분리해야 애니메이션 중에도 448px 경계 밖(제목 영역)으로 카드가
    // 새어나가지 않는다 — transform을 .reviews_track에 직접 걸면 overflow:hidden의
    // 기준 박스 자체가 같이 움직여버려 클리핑이 무력화된다.
    const track = document.querySelector('.reviews_track');
    const inner = document.querySelector('.reviews_track_inner');
    if (!track || !inner) return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotionQuery.matches) return;

    const originalCards = Array.from(inner.children);
    if (!originalCards.length) return;

    originalCards.forEach((card) => {
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.classList.add('is_visible'); // 복제본은 fade-in 관찰 대상이 아니므로 바로 노출
      inner.appendChild(clone);
    });

    const speed = 40; // px per second
    let setWidth = 0;
    let offset = 0;
    let lastTime = null;

    function measure() {
      const gap = parseFloat(getComputedStyle(inner).columnGap || getComputedStyle(inner).gap) || 0;
      setWidth = originalCards.reduce((sum, card) => sum + card.getBoundingClientRect().width + gap, 0);
    }

    function tick(now) {
      if (lastTime === null) lastTime = now;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      offset += speed * dt;
      if (setWidth > 0 && offset >= setWidth) offset -= setWidth;

      inner.style.transform = `translateX(${-offset}px)`;
      requestAnimationFrame(tick);
    }

    measure();
    window.addEventListener('resize', measure);
    requestAnimationFrame(tick);
  }

  initReviewsMarquee();

  // ---- Cube 3D: hover 시 정육면체 회전 (cube3d_body 하나만 GSAP으로 제어) ----
  // otsuka-air.jp/product/zeroz "/ Purchase" 버튼의 원리를 참고: 회전은 항상
  // 큐브 전체(.cube3d_body)에 한 번에 걸고, 각 면을 따로 움직이지 않는다.
  // CSS transition이 아니라 GSAP으로 매 프레임 transform을 직접 쓰는 이유는
  // 브라우저의 transform 보간 로직에 기대지 않고 값을 그대로 확정하기 위함.
  // [data-cube-hover]로 범위를 한정한다 — .cube3d는 sales 큐브(스크롤로 회전)에도
  // 재사용되는 "perspective 껍데기" 클래스라, hover 동작까지 같이 붙으면 안 된다.
  function initCube3D(root) {
    const body = root.querySelector('.cube3d_body');
    if (!body) return;
    const shadow = root.querySelector('.cube3d_shadow');
    const sheen = root.querySelector('.cube3d_sheen');

    const state = { rx: 0 };

    function render() {
      // Phase 3: rotateX 단일 축만 쓰면 90deg 부근에서 "카드가 뒤집히는" 것처럼
      // 납작하게 보인다. 진행 중간(rx=90 근처)에서 최대가 되는 살짝의 rotateY
      // 흔들림을 같이 얹어서 입체가 비틀리며 도는 것처럼 보이게 한다 — 0/180deg
      // (정면 정지 상태)에서는 sin이 0으로 돌아와 앞/뒷면이 비뚤어지지 않는다.
      const rad = (state.rx / 180) * Math.PI;
      const wobble = Math.sin(rad) * 12;
      body.style.transform = `rotateX(${state.rx}deg) rotateY(${wobble}deg)`;

      // Phase 1: 옆면이 정면을 향하는(=엣지온인) 90deg 부근에서 살짝 어두워지는
      // 그림자감 — 실제 사물이 빛을 등지고 돌 때 생기는 명암 변화를 흉내낸다.
      // .cube3d_body가 아니라 root(.cube3d, preserve-3d 아님)에 걸어야
      // 3D 트리가 안 깨진다.
      const edgeOn = Math.abs(Math.sin(rad));
      root.style.filter = `brightness(${1 - edgeOn * 0.22})`;

      // 표면을 스치는 하이라이트
      if (sheen) sheen.style.setProperty('--sheen-x', `${(state.rx / 180) * 140 - 20}%`);

      // Phase 2: 엣지온일수록 그림자가 좁아지고 옅어진다(사물이 세워질수록
      // 바닥에 닿는 면적이 줄어드는 것과 같은 원리)
      if (shadow) {
        shadow.style.transform = `translateX(-50%) scaleX(${1 - edgeOn * 0.28})`;
        shadow.style.opacity = String(1 - edgeOn * 0.35);
      }
    }

    function rotateTo(value) {
      if (typeof gsap !== 'undefined') {
        // Phase 3: duration을 늘리고 ease를 inOut으로 바꿔서 중간 과정(옆면이
        // 보이는 구간)이 눈에 들어올 시간을 준다 — 기존 0.6s/power3.out은
        // 너무 빨리 끝나 "훅 바뀌는 카드"처럼 보였다.
        gsap.to(state, { rx: value, duration: 0.9, ease: 'power2.inOut', onUpdate: render, overwrite: true });
      } else {
        // GSAP이 없는 경우를 위한 폴백: 즉시 반영
        state.rx = value;
        render();
      }
    }

    root.addEventListener('mouseenter', () => rotateTo(180));
    root.addEventListener('mouseleave', () => rotateTo(0));
    root.addEventListener('focusin', () => rotateTo(180));
    root.addEventListener('focusout', () => rotateTo(0));

    render();
  }

  document.querySelectorAll('[data-cube-hover]').forEach(initCube3D);

  // ---- Sales cube: 스크롤에 맞춰 Y축으로 회전하며 01→02→03 전환 ----
  // otsuka-air.jp/product/zeroz의 Feature 섹션처럼, 이미지(cube)는 sticky로
  // 고정되고 텍스트(.sales_item ×3)는 일반 문서 흐름으로 쌓여 있어 스크롤로
  // 자연스럽게 밀려 올라온다 — 그래서 텍스트 쪽은 opacity 토글이 필요 없다.
  // 회전 진행률은 no1 섹션과 같은 방식(getBoundingClientRect)으로 구한다:
  // .sales_scroller가 화면에 자리잡기 전까지는 rect.top이 양수라 progress가
  // 0으로 고정되므로, 스크롤 진입 즉시가 아니라 섹션이 실제로 제자리에 온
  // 뒤부터 회전이 시작된다.
  function initSalesCube() {
    const pinWrap = document.querySelector('[data-sales-pin]');
    const cubeEl = document.querySelector('[data-sales-cube] .sales_cube'); // = .cube3d, preserve-3d 아님
    const body = document.querySelector('[data-sales-cube] .cube3d_body');
    const shadow = document.querySelector('[data-sales-cube] .cube3d_shadow');
    const sheen = document.querySelector('[data-sales-cube] .cube3d_sheen');
    if (!pinWrap || !body) return;

    function handleSalesScroll() {
      const rect = pinWrap.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;
      const angle = -180 * progress;

      // Phase 3: 회전 중 살짝 커졌다 작아지며(진행률 중간에서 최대) 카메라
      // 쪽으로 다가오는 느낌을 준다. transform은 preserve-3d 요소(body)에
      // 걸어도 괜찮다 — 문제가 되는 건 filter/opacity뿐이다.
      const bump = 1 + Math.sin(progress * Math.PI) * 0.05;
      body.style.transform = `scale(${bump}) rotateY(${angle}deg)`;

      // Phase 1: 이 큐브는 0→-90→-180deg 사이에 면이 두 번(01→02, 02→03)
      // 정면을 지나간다 — "엣지온"(가장 안 밝은 순간)도 그 사이인 -45deg,
      // -135deg에서 두 번 온다. sin(rx)는 주기가 한 번뿐이라 hero_cart에는
      // 맞지만 여기서는 sin(2*rx)를 써야 두 전환 구간 모두에서 어두워진다.
      const angleRad = (angle * Math.PI) / 180;
      const edgeOn = Math.abs(Math.sin(2 * angleRad));
      if (cubeEl) cubeEl.style.filter = `brightness(${1 - edgeOn * 0.18})`;

      if (sheen) sheen.style.setProperty('--sheen-x', `${progress * 140 - 20}%`);
      if (shadow) {
        shadow.style.transform = `translateX(-50%) scaleX(${1 - edgeOn * 0.22})`;
        shadow.style.opacity = String(1 - edgeOn * 0.3);
      }
    }

    handleSalesScroll();
    window.addEventListener('scroll', handleSalesScroll, { passive: true });
    window.addEventListener('resize', handleSalesScroll);
  }

  initSalesCube();

  // ---- Hero cart dock: 히어로를 벗어나면 화면 오른쪽 아래로 작아지며
  // 이동해 콘텐츠를 덜 가린다(CSS .hero_cart.is_docked, detail.css 참고).
  // .hero의 아랫변이 화면 위로 넘어간 순간(=히어로가 완전히 지나간 시점)
  // 붙였다 뗀다 — 다시 위로 스크롤해 히어로가 보이면 원래 크기/위치로 되돌아온다.
  function initHeroCartDock() {
    const el = document.querySelector('.hero_cart');
    const hero = document.querySelector('.hero');
    if (!el || !hero) return;

    function update() {
      el.classList.toggle('is_docked', hero.getBoundingClientRect().bottom <= 0);
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }
  initHeroCartDock();

  // ---- Add to cart feedback ----
  // 큐브(hero_cart)가 앞/뒷면에 각각 버튼을 하나씩 담고 있으므로(총 2개),
  // 어느 면이 보이든 눌렀을 때 둘 다 같은 피드백을 보여준다.
  const cartBtns = document.querySelectorAll('.hero_cart_btn');

  function handleAddToCart() {
    cartBtns.forEach((btn) => { btn.textContent = '/ Added ✓'; });
    setTimeout(() => {
      cartBtns.forEach((btn) => { btn.textContent = '/ Add to Cart'; });
    }, 1800);
  }

  cartBtns.forEach((btn) => { btn.addEventListener('click', handleAddToCart); });
});
