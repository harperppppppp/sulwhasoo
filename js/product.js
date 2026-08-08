// Sulwhasoo · Product List
// pages/product.html 전용 기능

(function () {
  'use strict';

  // ---- Responsive stage: scale the fixed 1920px canvas to fit narrower
  // viewports (360 / 768 / 1280) so no breakpoint ever gets a horizontal
  // scrollbar. At >=1920px this is scale(1), i.e. unchanged. ----
  function initScaleStage() {
    var stage = document.querySelector('[data-scale-stage]');
    var page = stage ? stage.querySelector('.page') : null;
    if (!stage || !page) return;

    function handleStageResize() {
      var scale = Math.min(1, window.innerWidth / 1920);
      page.style.transform = 'scale(' + scale + ')';
      stage.style.height = (page.scrollHeight * scale) + 'px';
    }
    handleStageResize();
    window.addEventListener('resize', handleStageResize);
    window.addEventListener('load', handleStageResize);
  }

  function initTabs() {
    var tabs = document.querySelectorAll('.product_tabs [data-tab]');
    if (!tabs.length) return;

    tabs.forEach(function (tab) {
      if (tab.disabled) return;

      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          t.classList.remove('is_active');
          t.classList.add('product_tab_sub');
          t.classList.remove('product_tab');
        });
        tab.classList.add('is_active', 'product_tab');
        tab.classList.remove('product_tab_sub');

        var subtabs = document.querySelector('[data-subtabs-for="' + tab.dataset.tab + '"]');
        document.querySelectorAll('.product_subtabs').forEach(function (group) {
          group.hidden = group !== subtabs;
        });
      });
    });
  }

  function initSubtabs() {
    var groups = document.querySelectorAll('.product_subtabs');
    if (!groups.length) return;

    groups.forEach(function (group) {
      var subtabs = group.querySelectorAll('.product_subtab');
      subtabs.forEach(function (subtab) {
        subtab.addEventListener('click', function () {
          subtabs.forEach(function (s) { s.classList.remove('is_active'); });
          subtab.classList.add('is_active');
        });
      });
    });
  }

  function initProductCards() {
    var triggers = document.querySelectorAll('.product_card_trigger');
    if (!triggers.length) return;

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var card = trigger.closest('.product_card');
        var wasSelected = card.classList.contains('is_selected');

        document.querySelectorAll('.product_card.is_selected').forEach(function (c) {
          c.classList.remove('is_selected');
          var t = c.querySelector('.product_card_trigger');
          if (t) t.setAttribute('aria-pressed', 'false');
        });

        if (!wasSelected) {
          card.classList.add('is_selected');
          trigger.setAttribute('aria-pressed', 'true');
        }
      });
    });
  }

  function init() {
    initScaleStage();
    initTabs();
    initSubtabs();
    initProductCards();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
