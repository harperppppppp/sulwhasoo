// Sulwhasoo · Footer
// 공용 footer 컴포넌트 로더. 다른 페이지에 이식할 때는 마크업을 복붙하지 말고
// <footer id="footer" data-component="footer"></footer> 같은 빈 자리표시자를 두고
// 이 파일만 <script src=".../footer.js"></script>로 연결하면, 이 스크립트가
// footer.html을 fetch해서 그 자리에 채워 넣습니다 (외부 의존성 없음).

(function () {
  'use strict';

  var currentScript = document.currentScript;
  var footerUrl = new URL('footer.html', currentScript.src).href;

  function enhanceFooter(footer) {
    // 저작권 연도 자동 갱신
    var copy = footer.querySelector('.footer_copy');
    if (copy) {
      var year = new Date().getFullYear();
      copy.textContent = '© ' + year + ' AMOREPACIFIC CORPORATION. All rights reserved.';
    }

    // 뷰포트에 들어오면 페이드인 (prefers-reduced-motion은 CSS에서 이미 무력화)
    function handleFooterIntersect(entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          footer.classList.add('is_visible');
          io.unobserve(footer);
        }
      });
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(handleFooterIntersect, { threshold: 0.15 });
      io.observe(footer);
    } else {
      footer.classList.add('is_visible');
    }
  }

  // fetch로 가져온 조각은 현재 문서에 붙는 순간 상대경로(src/href)가
  // "footer.html 기준"이 아니라 "현재 페이지 기준"으로 풀리므로, 페이지 깊이에
  // 상관없이 항상 맞도록 footer.html 위치를 기준 삼아 절대경로로 미리 바꿔둔다.
  function resolveRelativeUrls(root) {
    root.querySelectorAll('[src]').forEach(function (el) {
      el.setAttribute('src', new URL(el.getAttribute('src'), footerUrl).href);
    });
    root.querySelectorAll('[href]').forEach(function (el) {
      var href = el.getAttribute('href');
      if (href && href.charAt(0) !== '#') {
        el.setAttribute('href', new URL(href, footerUrl).href);
      }
    });
  }

  function injectInto(placeholder) {
    fetch(footerUrl)
      .then(function (res) { return res.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var footer = doc.querySelector('.footer');
        if (!footer) return;
        resolveRelativeUrls(footer);
        placeholder.replaceWith(footer);
        enhanceFooter(footer);
      })
      .catch(function (err) {
        console.error('Footer component failed to load:', err);
      });
  }

  function init() {
    var placeholders = document.querySelectorAll('[data-component="footer"]');
    if (!placeholders.length) {
      // footer.html을 단독으로 열었을 때는 이미 완성된 .footer가 있으므로 바로 enhance만 한다
      var existing = document.querySelector('.footer');
      if (existing) enhanceFooter(existing);
      return;
    }
    placeholders.forEach(injectInto);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
