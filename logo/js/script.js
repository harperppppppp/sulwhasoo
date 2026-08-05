/* =========================================================
   Sulwhasoo · Logo Nav
   미리보기용 최소 동작 스크립트 (배지 진입 시 살짝 페이드 인)
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const badge = document.querySelector('.badge');
  if (!badge) return;

  badge.style.opacity = '0';
  badge.style.transition = 'opacity 0.6s ease';

  requestAnimationFrame(() => {
    badge.style.opacity = '1';
  });
});
