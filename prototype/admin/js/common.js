// Common admin helpers for externally loaded page scripts and HTML includes.
(function () {
  window.AdminAssets = window.AdminAssets || {};

  window.AdminAssets.sidebarHtml = "<div class=\"brand\"><strong>AviaNext</strong><small>AOS Admin Prototype</small></div>\n    <div class=\"nav-title\">관리메뉴</div>\n    <nav class=\"nav nav-tree\">\n      <div class=\"nav-group\">\n        <div class=\"nav-depth1\" onclick=\"toggleNavGroup(this)\">📦 상품관리</div>\n        <a href=\"product_list.html\">상품목록</a>\n        <a href=\"product_register.html\">상품등록</a>\n        <a href=\"#\" onclick=\"msg('재고관리 화면은 준비 중입니다.');return false;\">재고관리</a>\n        <a href=\"#\" onclick=\"msg('이미지관리 화면은 준비 중입니다.');return false;\">이미지관리</a>\n        <a href=\"template_manage.html\">템플릿관리</a>\r\n        <a href=\"attraction_manage.html\">관광지관리</a>\n        <a href=\"#\" onclick=\"msg('상품분류관리 화면은 준비 중입니다.');return false;\">상품분류관리</a>\n      </div>\n      <div class=\"nav-group\">\n        <div class=\"nav-depth1\" onclick=\"toggleNavGroup(this)\">📋 예약관리</div>\n        <a href=\"reservation_list.html\">예약목록</a>\n        <a href=\"reservation_status.html\">예약현황</a>\n        <a href=\"#\" onclick=\"msg('좌석관리 화면은 준비 중입니다.');return false;\">좌석관리</a>\n      </div>\n      <div class=\"nav-group\">\n        <div class=\"nav-depth1\" onclick=\"toggleNavGroup(this)\">✈️ 항공예약관리</div>\n        <a href=\"#\" onclick=\"msg('국제선예약 화면은 준비 중입니다.');return false;\">국제선예약</a>\n        <a href=\"#\" onclick=\"msg('국제선예약목록 화면은 준비 중입니다.');return false;\">국제선예약목록</a>\n        <a href=\"#\" onclick=\"msg('국내선예약 화면은 준비 중입니다.');return false;\">국내선예약</a>\n        <a href=\"#\" onclick=\"msg('국내선예약목록 화면은 준비 중입니다.');return false;\">국내선예약목록</a>\n      </div>\n      <div class=\"nav-group\">\n        <div class=\"nav-depth1\" onclick=\"toggleNavGroup(this)\">👤 회원관리</div>\n        <a href=\"#\" onclick=\"msg('웹회원관리 화면은 준비 중입니다.');return false;\">웹회원관리</a>\n        <a href=\"#\" onclick=\"msg('관리자/직원 관리 화면은 준비 중입니다.');return false;\">관리자/직원 관리</a>\n        <a href=\"seller_list.html\">판매점관리</a>\n        <a href=\"#\" onclick=\"msg('거래처관리 화면은 준비 중입니다.');return false;\">거래처관리</a>\n        <a href=\"#\" onclick=\"msg('그룹관리 화면은 준비 중입니다.');return false;\">그룹관리</a>\n        <a href=\"#\" onclick=\"msg('탈퇴회원 화면은 준비 중입니다.');return false;\">탈퇴회원</a>\n      </div>\n      <div class=\"nav-group\">\n        <div class=\"nav-depth1\" onclick=\"toggleNavGroup(this)\">💰 정산관리</div>\n        <a href=\"#\" onclick=\"msg('인보이스관리 화면은 준비 중입니다.');return false;\">인보이스관리</a>\n        <a href=\"#\" onclick=\"msg('입금/환불현황 화면은 준비 중입니다.');return false;\">입금/환불현황</a>\n        <a href=\"#\" onclick=\"msg('미수금관리 화면은 준비 중입니다.');return false;\">미수금관리</a>\n        <a href=\"#\" onclick=\"msg('국제선정산(항공) 화면은 준비 중입니다.');return false;\">국제선정산(항공)</a>\n        <a href=\"#\" onclick=\"msg('발권데이터(항공) 화면은 준비 중입니다.');return false;\">발권데이터(항공)</a>\n      </div>\n      <div class=\"nav-group\">\n        <div class=\"nav-depth1\" onclick=\"toggleNavGroup(this)\">📊 통계관리</div>\n        <a href=\"statistics_dashboard.html\">통계 대시보드</a>\n        <a href=\"statistics_sales.html\">매출통계</a>\n        <a href=\"statistics_reservation.html\">예약통계</a>\n        <a href=\"statistics_product.html\">상품별 통계</a>\n        <a href=\"statistics_seller.html\">판매점별 통계</a>\n        <a href=\"statistics_region.html\">지역별 통계</a>\n        <a href=\"statistics_settlement.html\">정산통계</a>\n      </div>\n      <div class=\"nav-group\">\n        <div class=\"nav-depth1\" onclick=\"toggleNavGroup(this)\">🎨 디자인설정</div>\n        <a href=\"#\" onclick=\"msg('템플릿관리 화면은 준비 중입니다.');return false;\">템플릿관리</a>\n        <a href=\"#\" onclick=\"msg('섹션관리 화면은 준비 중입니다.');return false;\">섹션관리</a>\n        <a href=\"#\" onclick=\"msg('홈페이지 설정 화면은 준비 중입니다.');return false;\">홈페이지 설정</a>\n        <a href=\"#\" onclick=\"msg('메인메뉴관리 화면은 준비 중입니다.');return false;\">메인메뉴관리</a>\n        <a href=\"popup_manage.html\">팝업관리</a>\n        <a href=\"#\" onclick=\"msg('상단띠배너 화면은 준비 중입니다.');return false;\">상단띠배너</a>\n        <a href=\"#\" onclick=\"msg('관리자메뉴관리 화면은 준비 중입니다.');return false;\">관리자메뉴관리</a>\n      </div>\n      <div class=\"nav-group\">\n        <div class=\"nav-depth1\" onclick=\"toggleNavGroup(this)\">💬 알림톡/문자관리</div>\n        <a href=\"#\" onclick=\"msg('알림톡 설정 화면은 준비 중입니다.');return false;\">알림톡 설정</a>\n        <a href=\"#\" onclick=\"msg('이메일발송 화면은 준비 중입니다.');return false;\">이메일발송</a>\n        <a href=\"#\" onclick=\"msg('문자발송 화면은 준비 중입니다.');return false;\">문자발송</a>\n        <a href=\"#\" onclick=\"msg('발송내역 화면은 준비 중입니다.');return false;\">발송내역</a>\n        <a href=\"#\" onclick=\"msg('메크로설정 화면은 준비 중입니다.');return false;\">메크로설정</a>\n      </div>\n      <div class=\"nav-group\">\n        <div class=\"nav-depth1\" onclick=\"toggleNavGroup(this)\">📝 게시판관리</div>\n        <a href=\"#\" onclick=\"msg('공지사항 화면은 준비 중입니다.');return false;\">공지사항</a>\n        <a href=\"#\" onclick=\"msg('고객문의 화면은 준비 중입니다.');return false;\">고객문의</a>\n        <a href=\"#\" onclick=\"msg('여행후기 화면은 준비 중입니다.');return false;\">여행후기</a>\n        <a href=\"#\" onclick=\"msg('자주묻는질문 화면은 준비 중입니다.');return false;\">자주묻는질문</a>\n        <a href=\"#\" onclick=\"msg('고객문의 화면은 준비 중입니다.');return false;\">고객문의</a>\n        <a href=\"#\" onclick=\"msg('스캔목록 화면은 준비 중입니다.');return false;\">스캔목록</a>\n        <a href=\"#\" onclick=\"msg('자료실 화면은 준비 중입니다.');return false;\">자료실</a>\n      </div>\n      <div class=\"nav-group\">\n        <div class=\"nav-depth1\" onclick=\"toggleNavGroup(this)\">⚙️ 기본설정</div>\n        <a href=\"#\" onclick=\"msg('항공사 Bin관리 화면은 준비 중입니다.');return false;\">항공사 Bin관리</a>\n        <a href=\"#\" onclick=\"msg('노선관리 화면은 준비 중입니다.');return false;\">노선관리</a>\n        <a href=\"#\" onclick=\"msg('탑승역관리 화면은 준비 중입니다.');return false;\">탑승역관리</a>\n        <a href=\"#\" onclick=\"msg('열차관리 화면은 준비 중입니다.');return false;\">열차관리</a>\n        <a href=\"#\" onclick=\"msg('템플릿사이트관리 화면은 준비 중입니다.');return false;\">템플릿사이트관리</a>\n      </div>\n    </nav>\n";

  window.AdminAssets.sidebarHtml = window.AdminAssets.sidebarHtml.replace(
    '<a href="#" onclick="msg(\'웹회원관리 화면은 준비 중입니다.\');return false;">웹회원관리</a>',
    '<a href="member_web_list.html">웹회원관리</a>'
  );

  window.AdminAssets.sidebarHtml = window.AdminAssets.sidebarHtml.replace(
    '<a href="#" onclick="msg(\'거래처관리 화면은 준비 중입니다.\');return false;">거래처관리</a>',
    '<a href="member-vendor-list.html">거래처관리</a>'
  );

  window.AdminAssets.sidebarHtml = window.AdminAssets.sidebarHtml.replace(
    '<a href="#" onclick="msg(\'그룹관리 화면은 준비 중입니다.\');return false;">그룹관리</a>',
    '<a href="member_group_list.html">그룹관리</a>'
  );

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
      'member_web_detail.html': 'member_web_list.html'
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
