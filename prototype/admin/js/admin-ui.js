(function () {
  function activateTab(scope, target) {
    scope.querySelectorAll('[data-ui-tab-target]').forEach(function (tab) {
      tab.classList.toggle('active', tab.getAttribute('data-ui-tab-target') === target);
    });
    scope.querySelectorAll('[data-ui-tab-panel]').forEach(function (panel) {
      panel.classList.toggle('active', panel.getAttribute('data-ui-tab-panel') === target);
    });
  }

  function bindTabs() {
    document.querySelectorAll('[data-ui-tabscope]').forEach(function (scope) {
      scope.querySelectorAll('[data-ui-tab-target]').forEach(function (tab) {
        tab.addEventListener('click', function () {
          activateTab(scope, tab.getAttribute('data-ui-tab-target'));
        });
      });
    });

    document.addEventListener('click', function (event) {
      var opener = event.target.closest('[onclick*="openSellerForm"]');
      if (!opener) return;
      setTimeout(function () {
        var scope = document.querySelector('[data-ui-tabscope="seller-form"]');
        if (scope) activateTab(scope, 'seller-basic');
      }, 0);
    });
  }

  window.AdminUI = {
    activateTab: function (scopeSelector, target) {
      var scope = document.querySelector(scopeSelector);
      if (scope) activateTab(scope, target);
    }
  };

  document.addEventListener('DOMContentLoaded', bindTabs);
})();
