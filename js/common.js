// Sulwhasoo · Common
// 모든 페이지에서 공유하는 기능 (Header, Menu 등)

// Lenis + GSAP ScrollTrigger 연동 (부드러운 스크롤)
(() => {
  if (typeof Lenis === 'undefined' || typeof gsap === 'undefined') return;

  //ScrollTrigger를 쓸 수 있게 GSAP에 먼저 등록한다
  gsap.registerPlugin(ScrollTrigger);

  // Lenis는 마우스휠 스크롤을 부드럽게 만들어 준다
  // GSAP ScrollTrigger와 같이 쓰면 스크롤 애니메이션도 더 자연스럽게 붙는다
  const lenis = new Lenis({
    //자동실행 대신 우리가 직접 프레임을 돌리게 한다
    autoRaf: false,
    //스크롤이 살짝 따라오는 시간을 정한다.
    duration: 0.8,
    //들어온 값을 그대로 써서 일정한 속도감을 만든다
    easing: (t) => t,
    //마우스 휠 스크롤을 부드럽게 만든다
    smoothWheel: true,
    //터치 스크롤도 lenis 흐름과 맞춘다
    syncTouch: true,
  });

  // 스크롤을 잠가야 하는 구간에서 lenis.stop() / start()를 부를 수 있게 내보낸다
  // (flagship 인트로가 도는 동안 사용). window.lenis는 라이브러리가 이미
  // 다른 용도로 쓰고 있어서 이름을 따로 잡는다.
  window.sulwhasooLenis = lenis;

  //매 프레임마다 lenis와 scrolltrigger를 같이 업데이트 해야 스크롤 애니메이션이 어긋나지 않음
  function raf(time) {
    //지금 프레임의 시간을 lenis에게 알려준다
    lenis.raf(time);
    //ScrollTrigger가 현재 스크롤 위치를 다시 계산하게 한다.
    ScrollTrigger.update();
    //다음 화면 프레임에서도 같은일을 반복한다
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
})();
