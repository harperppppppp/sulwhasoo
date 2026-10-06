// Sulwhasoo · Footer
// 공용 footer 컴포넌트 로더. 다른 페이지에 이식할 때는 마크업을 복붙하지 말고
// <footer id="footer" data-component="footer"></footer> 같은 빈 자리표시자를 두고
// 이 파일만 <script src=".../footer.js"></script>로 연결하면, 이 스크립트가
// footer.html을 fetch해서 그 자리에 채워 넣습니다 (외부 의존성 없음).

(function () {
  'use strict';

  var currentScript = document.currentScript;
  var footerUrl = new URL('footer.html', currentScript.src).href;

  function splitTextIntoSpans(element) {
    if (!element) return;
    var text = element.textContent.trim();
    var html = text
      .split('')
      .map(function (char) {
        return char === ' ' ? '<span>&nbsp;</span>' : '<span>' + char + '</span>';
      })
      .join('');
    element.innerHTML = html;
  }

  function animateFooterBrand(footer) {
    var brand = footer.querySelector('.footer_brand');
    if (!brand) return;
    splitTextIntoSpans(brand);
    brand.querySelectorAll('span').forEach(function (span, index) {
      span.style.animationDelay = (index * 0.08) + 's';
      span.classList.add('animate');
    });
  }

  // 아직 연결된 페이지가 없는 버튼(data-coming-soon). href="#"는 누르면 페이지 맨 위로
  // 튀어 올라가므로 이동을 막고, 대신 화면 아래에 "준비중입니다" 안내를 잠깐 띄웁니다.
  var comingSoonToast = null;
  var comingSoonTimer = 0;

  function showComingSoon() {
    if (!comingSoonToast) {
      comingSoonToast = document.createElement('div');
      comingSoonToast.className = 'footer_toast';
      comingSoonToast.setAttribute('role', 'status');
      comingSoonToast.setAttribute('aria-live', 'polite');
      comingSoonToast.textContent = '준비중입니다';
      document.body.appendChild(comingSoonToast);
    }
    comingSoonToast.classList.add('is_on');
    window.clearTimeout(comingSoonTimer);
    comingSoonTimer = window.setTimeout(function () {
      comingSoonToast.classList.remove('is_on');
    }, 1800);
  }

  // common.js의 "연결 없는 링크 → 준비중" 처리도 같은 안내를 씁니다.
  window.sulwhasooComingSoon = showComingSoon;

  function bindComingSoon(footer) {
    footer.querySelectorAll('[data-coming-soon]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        showComingSoon();
      });
    });
  }

  function enhanceFooter(footer) {
    bindComingSoon(footer);

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
          animateFooterBrand(footer);
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

  // 맨 위로 버튼 — 모든 페이지의 오른쪽 아래에 고정. 페이지가 이미 .to_top 을 갖고
  // 있으면(플래그십: 인트로가 끝난 뒤 나타나고 섹션 고정을 먼저 푸는 자기 동작이 있음)
  // 만들지 않습니다. 부드러운 스크롤(Lenis)이 있으면 그것으로, 없으면 브라우저
  // 스크롤로 올라갑니다. force는 페이지가 스크롤을 잠가 둔 상태에서도 움직이게 합니다.
  function initToTop() {
    if (document.querySelector('.to_top')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'to_top is_ready';
    btn.setAttribute('aria-label', '맨 위로 이동');
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
    document.body.appendChild(btn);

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    btn.addEventListener('click', function () {
      var lenis = window.sulwhasooLenis;
      if (lenis && typeof lenis.scrollTo === 'function') {
        lenis.scrollTo(0, { duration: reduced ? 0 : 1.2, force: true });
      } else {
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      }
    });
  }

  function init() {
    initToTop();

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
