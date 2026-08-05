// Sulwhasoo · Culture page interactions
document.addEventListener('DOMContentLoaded', () => {
  // ---- Play-button lightbox (placeholder for real video embeds) ----
  const lightbox = document.createElement('div');
  lightbox.className = 'culture-lightbox';
  lightbox.innerHTML = `
    <button class="culture-lightbox__close" aria-label="Close">✕</button>
    <img class="culture-lightbox__img" src="" alt="">
  `;
  document.body.appendChild(lightbox);

  const lightboxImg = lightbox.querySelector('.culture-lightbox__img');
  const closeBtn = lightbox.querySelector('.culture-lightbox__close');

  function openLightbox(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightboxImg.src = '';
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  document.querySelectorAll('[data-video-trigger]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const frame = trigger.closest('[data-video-frame]');
      const img = frame ? frame.querySelector('img') : null;
      if (img) openLightbox(img.src, img.alt);
    });
  });

  // ---- Fade-in on scroll for room sections ----
  const revealTargets = document.querySelectorAll('.article, .room03__concept, .room02__card');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealTargets.forEach((el) => {
      el.classList.add('will-reveal');
      io.observe(el);
    });
  }
});
