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

    var panels = document.querySelectorAll('[data-tab-panel]');

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

        panels.forEach(function (panel) {
          panel.hidden = panel.dataset.tabPanel !== tab.dataset.tab;
        });
      });
    });
  }

  // Generic across every product_subtabs group (Product Line, Skin
  // Concern, …): each group's data-subtabs-for="<tab>" names the
  // matching panel attribute data-<tab>-panel="<subtab>" to toggle.
  function initSubtabs() {
    var groups = document.querySelectorAll('.product_subtabs');
    if (!groups.length) return;

    groups.forEach(function (group) {
      var panelAttr = 'data-' + group.dataset.subtabsFor + '-panel';
      var subtabs = group.querySelectorAll('.product_subtab');

      subtabs.forEach(function (subtab) {
        if (subtab.disabled) return;

        subtab.addEventListener('click', function () {
          subtabs.forEach(function (s) { s.classList.remove('is_active'); });
          subtab.classList.add('is_active');

          var targetPanel = document.querySelector('[' + panelAttr + '="' + subtab.dataset.subtab + '"]');
          document.querySelectorAll('[' + panelAttr + ']').forEach(function (panel) {
            panel.classList.toggle('is_active', panel === targetPanel);
          });
        });
      });
    });
  }

  // Best Seller cards reveal their ring/enlarged-shot/View More state
  // via pure CSS :hover / :focus-within (see product.css) — no JS
  // needed for that; it used to be click-toggled but hover now
  // matches the Product Line tab's interaction.

  function init() {
    initScaleStage();
    initTabs();
    initSubtabs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
