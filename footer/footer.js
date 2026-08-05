// Sulwhasoo · Footer
// 독립 footer 컴포넌트 전용 스크립트.
// 다른 페이지에 이식할 때는 이 파일을 그대로 <script src="footer.js"></script>로
// 연결하면 됩니다 (외부 의존성 없음).

(function () {
  'use strict';

  var footer = document.querySelector('.footer');
  if (!footer) return;

  // 저작권 연도 자동 갱신
  var copy = footer.querySelector('.footer__copy');
  if (copy) {
    var year = new Date().getFullYear();
    copy.textContent = '© ' + year + ' AMOREPACIFIC CORPORATION. All rights reserved.';
  }

  // 뷰포트에 들어오면 페이드인 (prefers-reduced-motion은 CSS에서 이미 무력화)
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            footer.classList.add('is-visible');
            io.unobserve(footer);
          }
        });
      },
      { threshold: 0.15 }
    );
    io.observe(footer);
  } else {
    footer.classList.add('is-visible');
  }
})();
