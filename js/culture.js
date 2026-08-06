// Sulwhasoo · Culture page interactions
document.addEventListener('DOMContentLoaded', handleDomContentLoaded);

function handleDomContentLoaded() {
  // ---- Play-button lightbox (placeholder for real video embeds) ----
  const lightbox = document.createElement('div');
  lightbox.className = 'culture_lightbox';
  lightbox.innerHTML = `
    <button class="culture_lightbox_close" aria-label="Close">✕</button>
    <img class="culture_lightbox_img" src="" alt="">
  `;
  document.body.appendChild(lightbox);

  const lightboxImg = lightbox.querySelector('.culture_lightbox_img');
  const closeBtn = lightbox.querySelector('.culture_lightbox_close');

  function openLightbox(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    lightbox.classList.add('is_open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('is_open');
    lightboxImg.src = '';
    document.body.style.overflow = '';
  }

  function handleCloseButtonClick() {
    closeLightbox();
  }

  function handleLightboxClick(e) {
    if (e.target === lightbox) closeLightbox();
  }

  function handleDocumentKeydown(e) {
    if (e.key === 'Escape') closeLightbox();
  }

  function handleVideoTriggerClick(e) {
    const frame = e.currentTarget.closest('[data-video-frame]');
    const img = frame ? frame.querySelector('img') : null;
    if (img) openLightbox(img.src, img.alt);
  }

  closeBtn.addEventListener('click', handleCloseButtonClick);
  lightbox.addEventListener('click', handleLightboxClick);
  document.addEventListener('keydown', handleDocumentKeydown);

  document.querySelectorAll('[data-video-trigger]').forEach((trigger) => {
    trigger.addEventListener('click', handleVideoTriggerClick);
  });

  // ---- Fade-in on scroll for room sections ----
  const revealTargets = document.querySelectorAll('.article, .room03_concept, .room02_card');

  function handleRevealIntersect(entries, observer) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is_visible');
        observer.unobserve(entry.target);
      }
    });
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(handleRevealIntersect, { threshold: 0.15 });
    revealTargets.forEach((el) => {
      el.classList.add('will_reveal');
      io.observe(el);
    });
  }
}
