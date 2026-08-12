/**
 * AOS Admin Common Interactions
 * Sidebar collapse, nav accordion, dropdown, search focus, toast
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'aos-admin-sidebar-collapsed';

  function showToast(message) {
    var existing = document.querySelector('.toast');
    if (existing) {
      existing.remove();
    }

    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = '<span>✓</span><b>' + String(message) + '</b>';
    document.body.appendChild(toast);

    window.setTimeout(function () {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 2200);
  }

  function closeAllDropdowns(exceptPanel) {
    document.querySelectorAll('[data-dropdown-panel]').forEach(function (panel) {
      if (panel === exceptPanel) {
        return;
      }
      panel.hidden = true;
    });

    document.querySelectorAll('[data-dropdown]').forEach(function (btn) {
      if (exceptPanel && btn.getAttribute('data-dropdown') === exceptPanel.getAttribute('data-dropdown-panel')) {
        return;
      }
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  function setSidebarCollapsed(collapsed) {
    document.body.classList.toggle('is-collapsed', collapsed);
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch (e) {
      /* ignore */
    }

    var toggle = document.querySelector('[data-action="toggle-sidebar"]');
    if (toggle) {
      toggle.setAttribute('aria-label', collapsed ? '사이드바 펼치기' : '사이드바 접기');
    }
  }

  function initSidebar() {
    var collapsed = false;
    try {
      collapsed = localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      collapsed = false;
    }
    setSidebarCollapsed(collapsed);

    var toggle = document.querySelector('[data-action="toggle-sidebar"]');
    if (toggle) {
      toggle.addEventListener('click', function () {
        setSidebarCollapsed(!document.body.classList.contains('is-collapsed'));
      });
    }
  }

  function initNav() {
    document.querySelectorAll('.nav-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var navId = item.getAttribute('data-nav-id');
        var href = item.getAttribute('data-href');
        var subnav = navId
          ? document.querySelector('[data-subnav-for="' + navId + '"]')
          : null;

        if (subnav) {
          var isOpen = item.getAttribute('aria-expanded') === 'true';
          item.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
          subnav.classList.toggle('is-hidden', isOpen);
          var chevron = item.querySelector('.chevron');
          if (chevron) {
            chevron.classList.toggle('open', !isOpen);
          }
          return;
        }

        if (href && href !== '#') {
          window.location.href = href;
        } else {
          showToast((item.querySelector('.nav-label') || {}).textContent + ' 메뉴는 준비 중입니다.');
        }
      });
    });

    document.querySelectorAll('.subnav button, [data-href]').forEach(function (btn) {
      if (btn.classList.contains('nav-item')) {
        return;
      }
      btn.addEventListener('click', function () {
        var href = btn.getAttribute('data-href');
        if (href && href !== '#') {
          window.location.href = href;
          return;
        }
        showToast(btn.textContent.trim() + ' 화면은 준비 중입니다.');
      });
    });
  }

  function initDropdowns() {
    document.querySelectorAll('[data-dropdown]').forEach(function (trigger) {
      trigger.addEventListener('click', function (event) {
        event.stopPropagation();
        var key = trigger.getAttribute('data-dropdown');
        var panel = document.querySelector('[data-dropdown-panel="' + key + '"]');
        if (!panel) {
          return;
        }
        var willOpen = panel.hidden;
        closeAllDropdowns(willOpen ? panel : null);
        panel.hidden = !willOpen;
        trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });
    });

    document.addEventListener('click', function () {
      closeAllDropdowns(null);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeAllDropdowns(null);
      }
    });

    var markAll = document.querySelector('[data-action="mark-all-read"]');
    if (markAll) {
      markAll.addEventListener('click', function (event) {
        event.stopPropagation();
        showToast('알림을 모두 확인 처리했습니다.');
        closeAllDropdowns(null);
      });
    }

    var support = document.querySelector('[data-action="support"]');
    if (support) {
      support.addEventListener('click', function () {
        showToast('업무지원센터: 평일 09:00–18:00');
      });
    }
  }

  function initSearchShortcut() {
    var input = document.querySelector('.search input');
    if (!input) {
      return;
    }

    document.addEventListener('keydown', function (event) {
      var isMetaK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (!isMetaK) {
        return;
      }
      event.preventDefault();
      input.focus();
    });
  }

  function init() {
    initSidebar();
    initNav();
    initDropdowns();
    initSearchShortcut();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.AOSAdmin = {
    showToast: showToast,
    init: init
  };
})(window);
