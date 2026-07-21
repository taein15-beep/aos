// Common admin helpers for externally loaded page scripts and HTML includes.
(function () {
  window.AdminAssets = window.AdminAssets || {};

  window.AdminAssets.sidebarHtml = "\u003cdiv class=\"brand\"\u003e\u003cstrong\u003eAviaNext\u003c/strong\u003e\u003csmall\u003eAOS Admin Prototype\u003c/small\u003e\u003c/div\u003e\r\n    \u003cdiv class=\"nav-title\"\u003e관리메뉴\u003c/div\u003e\r\n    \u003cnav class=\"nav nav-tree\"\u003e\r\n      \u003cdiv class=\"nav-group\"\u003e\r\n        \u003cdiv class=\"nav-depth1\" onclick=\"toggleNavGroup(this)\"\u003e📦 상품관리\u003c/div\u003e\r\n        \u003ca href=\"product_list.html\"\u003e상품목록\u003c/a\u003e\r\n        \u003ca href=\"product_register.html\"\u003e상품등록\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027재고관리 화면은 준비 중입니다.\u0027);return false;\"\u003e재고관리\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027이미지관리 화면은 준비 중입니다.\u0027);return false;\"\u003e이미지관리\u003c/a\u003e\r\n        \u003ca href=\"template_manage.html\"\u003e템플릿관리\u003c/a\u003e\r\n        \u003ca href=\"attraction_manage.html\"\u003e관광지관리\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027상품분류관리 화면은 준비 중입니다.\u0027);return false;\"\u003e상품분류관리\u003c/a\u003e\r\n      \u003c/div\u003e\r\n      \u003cdiv class=\"nav-group\"\u003e\r\n        \u003cdiv class=\"nav-depth1\" onclick=\"toggleNavGroup(this)\"\u003e📋 예약관리\u003c/div\u003e\r\n        \u003ca href=\"reservation_list.html\"\u003e예약목록\u003c/a\u003e\r\n        \u003ca href=\"reservation_status.html\"\u003e예약현황\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027좌석관리 화면은 준비 중입니다.\u0027);return false;\"\u003e좌석관리\u003c/a\u003e\r\n      \u003c/div\u003e\r\n      \u003cdiv class=\"nav-group\"\u003e\r\n        \u003cdiv class=\"nav-depth1\" onclick=\"toggleNavGroup(this)\"\u003e✈️ 항공예약관리\u003c/div\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027국제선예약 화면은 준비 중입니다.\u0027);return false;\"\u003e국제선예약\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027국제선예약목록 화면은 준비 중입니다.\u0027);return false;\"\u003e국제선예약목록\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027국내선예약 화면은 준비 중입니다.\u0027);return false;\"\u003e국내선예약\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027국내선예약목록 화면은 준비 중입니다.\u0027);return false;\"\u003e국내선예약목록\u003c/a\u003e\r\n        \u003ca href=\"statistics_flight_sales.html\"\u003e항공권 매출통계\u003c/a\u003e\r\n      \u003c/div\u003e\r\n      \u003cdiv class=\"nav-group\"\u003e\r\n        \u003cdiv class=\"nav-depth1\" onclick=\"toggleNavGroup(this)\"\u003e👤 회원관리\u003c/div\u003e\r\n        \u003ca href=\"member_web_list.html\"\u003e웹회원관리\u003c/a\u003e\n        \u003ca href=\"member_admin_list.html\"\u003e관리자/직원 관리\u003c/a\u003e\r\n        \u003ca href=\"seller_list.html\"\u003e판매점관리\u003c/a\u003e\r\n        \u003ca href=\"member-vendor-list.html\"\u003e랜드사관리\u003c/a\u003e\r\n        \u003ca href=\"member_group_list.html\"\u003e그룹관리\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027탈퇴회원 화면은 준비 중입니다.\u0027);return false;\"\u003e탈퇴회원\u003c/a\u003e\r\n      \u003c/div\u003e\r\n      \u003cdiv class=\"nav-group\"\u003e\r\n        \u003cdiv class=\"nav-depth1\" onclick=\"toggleNavGroup(this)\"\u003e💰 정산관리\u003c/div\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027인보이스관리 화면은 준비 중입니다.\u0027);return false;\"\u003e인보이스관리\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027입금/환불현황 화면은 준비 중입니다.\u0027);return false;\"\u003e입금/환불현황\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027미수금관리 화면은 준비 중입니다.\u0027);return false;\"\u003e미수금관리\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027국제선정산(항공) 화면은 준비 중입니다.\u0027);return false;\"\u003e국제선정산(항공)\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027발권데이터(항공) 화면은 준비 중입니다.\u0027);return false;\"\u003e발권데이터(항공)\u003c/a\u003e\r\n      \u003c/div\u003e\r\n      \u003cdiv class=\"nav-group\"\u003e\r\n        \u003cdiv class=\"nav-depth1\" onclick=\"toggleNavGroup(this)\"\u003e📊 통계관리\u003c/div\u003e\r\n        \u003ca href=\"statistics_dashboard.html\"\u003e통계 대시보드\u003c/a\u003e\r\n        \u003ca href=\"statistics_sales.html\"\u003e매출통계\u003c/a\u003e\r\n        \u003ca href=\"statistics_reservation.html\"\u003e예약통계\u003c/a\u003e\r\n        \u003ca href=\"statistics_product.html\"\u003e상품별 통계\u003c/a\u003e\r\n        \u003ca href=\"statistics_seller.html\"\u003e판매점별 통계\u003c/a\u003e\r\n        \u003ca href=\"statistics_region.html\"\u003e지역별 통계\u003c/a\u003e\r\n        \u003ca href=\"statistics_settlement.html\"\u003e정산통계\u003c/a\u003e\r\n      \u003c/div\u003e\r\n      \u003cdiv class=\"nav-group\"\u003e\r\n        \u003cdiv class=\"nav-depth1\" onclick=\"toggleNavGroup(this)\"\u003e🎨 디자인설정\u003c/div\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027템플릿관리 화면은 준비 중입니다.\u0027);return false;\"\u003e템플릿관리\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027섹션관리 화면은 준비 중입니다.\u0027);return false;\"\u003e섹션관리\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027홈페이지 설정 화면은 준비 중입니다.\u0027);return false;\"\u003e홈페이지 설정\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027메인메뉴관리 화면은 준비 중입니다.\u0027);return false;\"\u003e메인메뉴관리\u003c/a\u003e\r\n        \u003ca href=\"popup_manage.html\"\u003e팝업관리\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027상단띠배너 화면은 준비 중입니다.\u0027);return false;\"\u003e상단띠배너\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027관리자메뉴관리 화면은 준비 중입니다.\u0027);return false;\"\u003e관리자메뉴관리\u003c/a\u003e\r\n      \u003c/div\u003e\r\n      \u003cdiv class=\"nav-group\"\u003e\r\n        \u003cdiv class=\"nav-depth1\" onclick=\"toggleNavGroup(this)\"\u003e💬 알림톡/문자관리\u003c/div\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027알림톡 설정 화면은 준비 중입니다.\u0027);return false;\"\u003e알림톡 설정\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027이메일발송 화면은 준비 중입니다.\u0027);return false;\"\u003e이메일발송\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027문자발송 화면은 준비 중입니다.\u0027);return false;\"\u003e문자발송\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027발송내역 화면은 준비 중입니다.\u0027);return false;\"\u003e발송내역\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027메크로설정 화면은 준비 중입니다.\u0027);return false;\"\u003e메크로설정\u003c/a\u003e\r\n      \u003c/div\u003e\r\n      \u003cdiv class=\"nav-group\"\u003e\r\n        \u003cdiv class=\"nav-depth1\" onclick=\"toggleNavGroup(this)\"\u003e📝 게시판관리\u003c/div\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027공지사항 화면은 준비 중입니다.\u0027);return false;\"\u003e공지사항\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027고객문의 화면은 준비 중입니다.\u0027);return false;\"\u003e고객문의\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027여행후기 화면은 준비 중입니다.\u0027);return false;\"\u003e여행후기\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027자주묻는질문 화면은 준비 중입니다.\u0027);return false;\"\u003e자주묻는질문\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027고객문의 화면은 준비 중입니다.\u0027);return false;\"\u003e고객문의\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027스캔목록 화면은 준비 중입니다.\u0027);return false;\"\u003e스캔목록\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027자료실 화면은 준비 중입니다.\u0027);return false;\"\u003e자료실\u003c/a\u003e\r\n      \u003c/div\u003e\r\n      \u003cdiv class=\"nav-group\"\u003e\r\n        \u003cdiv class=\"nav-depth1\" onclick=\"toggleNavGroup(this)\"\u003e⚙️ 기본설정\u003c/div\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027항공사 Bin관리 화면은 준비 중입니다.\u0027);return false;\"\u003e항공사 Bin관리\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027노선관리 화면은 준비 중입니다.\u0027);return false;\"\u003e노선관리\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027탑승역관리 화면은 준비 중입니다.\u0027);return false;\"\u003e탑승역관리\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027열차관리 화면은 준비 중입니다.\u0027);return false;\"\u003e열차관리\u003c/a\u003e\r\n        \u003ca href=\"#\" onclick=\"msg(\u0027템플릿사이트관리 화면은 준비 중입니다.\u0027);return false;\"\u003e템플릿사이트관리\u003c/a\u003e\r\n      \u003c/div\u003e\r\n    \u003c/nav\u003e\r\n";

  if (window.AdminAssets.sidebarHtml.indexOf('href="site_setting.html"') === -1) {
    window.AdminAssets.sidebarHtml = window.AdminAssets.sidebarHtml.replace(
      '<div class="nav-depth1" onclick="toggleNavGroup(this)">⚙️ 기본설정</div>',
      '<div class="nav-depth1" onclick="toggleNavGroup(this)">⚙️ 기본설정</div>\r\n        <a href="site_setting.html">사이트설정</a>'
    );
  }

  window.msg = window.msg || function (text) {
    alert(text);
  };

  window.toggleNavGroup = window.toggleNavGroup || function (el) {
    var group = el && el.closest ? el.closest('.nav-group') : null;
    if (group) group.classList.toggle('open');
  };

  window.AdminAssets.currentPage = function () {
    return (window.location.pathname.split('/').pop() || 'index.html');
  };

  window.AdminAssets.runPageScript = function (scripts) {
    var page = window.AdminAssets.currentPage();
    var source = scripts[page];
    if (!source) return;
    (0, eval)(source);
  };

  window.AdminAssets.markSidebarActive = function (container) {
    var page = window.AdminAssets.currentPage();
    var activePageMap = {
      'member-vendor-form.html': 'member-vendor-list.html',
      'member_web_form.html': 'member_web_list.html',
      'member_web_detail.html': 'member_web_list.html',
      'member_admin_form.html': 'member_admin_list.html',
      'member_admin_detail.html': 'member_admin_list.html',
      'homepage_setting.html': 'site_setting.html'
    };
    var activePage = activePageMap[page] || page;
    var links = Array.prototype.slice.call(container.querySelectorAll('a[href]'));
    var matched = null;

    links.forEach(function (link) {
      link.classList.remove('active');
      var href = (link.getAttribute('href') || '').split('#')[0].split('?')[0];
      if (!matched && href === activePage) matched = link;
    });

    container.querySelectorAll('.nav-group.open').forEach(function (group) {
      group.classList.remove('open');
    });

    if (matched) {
      matched.classList.add('active');
      var group = matched.closest('.nav-group');
      if (group) group.classList.add('open');
    }
  };

  window.AdminAssets.renderInclude = function (target, html) {
    target.innerHTML = html;
    target.setAttribute('data-include-loaded', 'true');

    if (target.classList.contains('sidebar')) {
      window.AdminAssets.markSidebarActive(target);
    }
  };

  window.AdminAssets.includeFallback = function (target, src, error) {
    if (target.classList.contains('sidebar') && window.AdminAssets.sidebarHtml) {
      window.AdminAssets.renderInclude(target, window.AdminAssets.sidebarHtml);
      return;
    }

    if (error) console.error(error.message || error);
    else console.error(src + ' load failed');
  };

  window.AdminAssets.loadIncludes = function (root) {
    var scope = root || document;
    var targets = Array.prototype.slice.call(scope.querySelectorAll('[data-include]'));

    targets.forEach(function (target) {
      var src = target.getAttribute('data-include');
      if (!src || target.getAttribute('data-include-loaded') === 'true') return;

      if (!window.fetch) {
        window.AdminAssets.includeFallback(target, src);
        return;
      }

      fetch(src, { cache: 'no-cache' })
        .then(function (response) {
          if (!response.ok) throw new Error(src + ' load failed: ' + response.status);
          return response.text();
        })
        .then(function (html) {
          window.AdminAssets.renderInclude(target, html);
        })
        .catch(function (error) {
          window.AdminAssets.includeFallback(target, src, error);
        });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.AdminAssets.loadIncludes(document);
    });
  } else {
    window.AdminAssets.loadIncludes(document);
  }
})();
