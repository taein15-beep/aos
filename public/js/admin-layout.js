/**
 * AOS Admin Common Layout
 * Sidebar / Header 공통 구조 — 관리자 페이지에서 재사용
 */
(function (global) {
  'use strict';

  var NAV_ITEMS = [
    {
      id: 'dashboard',
      label: '대시보드',
      icon: '▦',
      href: 'dashboard.html'
    },
    {
      id: 'product',
      label: '상품관리',
      icon: '◇',
      children: [
        { label: '상품목록', href: '#' },
        { label: '상품등록', href: '#' },
        { label: '일정표관리', href: '#' },
        { label: '요금관리', href: '#' }
      ]
    },
    {
      id: 'reservation',
      label: '예약관리',
      icon: '▤',
      children: [
        { label: '예약접수현황', href: '#' },
        { label: '예약달력', href: '#' }
      ]
    },
    { id: 'payment', label: '결제관리', icon: '₩', children: [] },
    { id: 'settlement', label: '정산관리', icon: '⇄', children: [] },
    { id: 'member', label: '회원관리', icon: '♙', children: [] },
    { id: 'agency', label: '판매점관리', icon: '▣', href: '#' },
    { id: 'partner', label: '거래처관리', icon: '⌂', href: '#' },
    { id: 'stats', label: '통계관리', icon: '▥', href: '#' },
    { id: 'operation', label: '운영관리', icon: '◎', children: [] },
    { id: 'system', label: '시스템설정', icon: '⚙', children: [] }
  ];

  var DEFAULT_NOTICES = [
    { level: 'danger', text: '오늘 출발 상품 중 미수금 예약 2건이 있습니다.', time: '10분 전' },
    { level: 'warn', text: '여권정보 미등록 고객 5명이 있습니다.', time: '32분 전' },
    { level: 'info', text: '판매점 정산 12건이 승인 대기 중입니다.', time: '1시간 전' },
    { level: 'info', text: '몽골 5일 상품의 잔여좌석이 3석입니다.', time: '2시간 전' },
    { level: 'warn', text: '취소요청 3건이 아직 처리되지 않았습니다.', time: '오늘 09:20' }
  ];

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderNav(activeId, openGroups) {
    openGroups = openGroups || ['product', 'reservation'];

    return NAV_ITEMS.map(function (item) {
      var isActive = item.id === activeId;
      var hasChildren = item.children && item.children.length > 0;
      var isOpen = hasChildren && openGroups.indexOf(item.id) !== -1;
      var href = item.href || '#';
      var chevron = hasChildren
        ? '<span class="chevron' + (isOpen ? ' open' : '') + '" aria-hidden="true">⌄</span>'
        : '';

      var itemHtml =
        '<button type="button" class="nav-item' +
        (isActive ? ' active' : '') +
        '" data-nav-id="' +
        escapeHtml(item.id) +
        '"' +
        (hasChildren
          ? ' aria-expanded="' + (isOpen ? 'true' : 'false') + '"'
          : ' data-href="' + escapeHtml(href) + '"') +
        '>' +
        '<span class="nav-icon" aria-hidden="true">' +
        item.icon +
        '</span>' +
        '<span class="nav-label">' +
        escapeHtml(item.label) +
        '</span>' +
        chevron +
        '</button>';

      var subnav = '';
      if (hasChildren) {
        subnav =
          '<div class="subnav' +
          (isOpen ? '' : ' is-hidden') +
          '" data-subnav-for="' +
          escapeHtml(item.id) +
          '">' +
          item.children
            .map(function (child) {
              return (
                '<button type="button" data-href="' +
                escapeHtml(child.href) +
                '">' +
                escapeHtml(child.label) +
                '</button>'
              );
            })
            .join('') +
          '</div>';
      }

      return '<div class="nav-group">' + itemHtml + subnav + '</div>';
    }).join('');
  }

  function renderSidebar(options) {
    options = options || {};
    return (
      '<aside class="sidebar" aria-label="관리자 사이드바">' +
      '<div class="brand">' +
      '<div class="brand-mark" aria-hidden="true">A</div>' +
      '<div class="brand-copy"><strong>AOS</strong><span>TRAVEL ERP</span></div>' +
      '<button type="button" class="collapse" aria-label="사이드바 접기" data-action="toggle-sidebar">‹</button>' +
      '</div>' +
      '<nav aria-label="관리자 메뉴">' +
      renderNav(options.activeNav || 'dashboard', options.openGroups) +
      '</nav>' +
      '<div class="sidebar-help">' +
      '<span class="nav-icon" aria-hidden="true">?</span>' +
      '<div><strong>업무지원센터</strong><p>평일 09:00–18:00</p></div>' +
      '</div>' +
      '</aside>'
    );
  }

  function renderNotices(notices) {
    notices = notices || DEFAULT_NOTICES;
    return notices
      .map(function (item) {
        return (
          '<button type="button">' +
          '<i class="alert-dot ' +
          escapeHtml(item.level) +
          '" aria-hidden="true"></i>' +
          '<span><b>' +
          escapeHtml(item.text) +
          '</b><small>' +
          escapeHtml(item.time) +
          '</small></span>' +
          '</button>'
        );
      })
      .join('');
  }

  function renderTopbar(options) {
    options = options || {};
    var breadcrumb = options.breadcrumb || [{ label: '홈' }, { label: '대시보드', current: true }];
    var agency = options.agency || '애비아넥스트';
    var userName = options.userName || '관리자 장윤호';
    var avatar = options.avatar || '장';
    var noticeCount = options.noticeCount != null ? options.noticeCount : 5;

    var crumbHtml = breadcrumb
      .map(function (item, index) {
        if (index === 0) {
          return '<span>' + escapeHtml(item.label) + '</span>';
        }
        if (item.current) {
          return '<b>/</b><strong>' + escapeHtml(item.label) + '</strong>';
        }
        return '<b>/</b><span>' + escapeHtml(item.label) + '</span>';
      })
      .join('');

    return (
      '<header class="topbar">' +
      '<div class="breadcrumb">' +
      crumbHtml +
      '</div>' +
      '<div class="top-actions">' +
      '<label class="search">' +
      '<span aria-hidden="true">⌕</span>' +
      '<input type="search" aria-label="빠른 검색" placeholder="예약번호, 고객명, 상품명 검색" />' +
      '<kbd>⌘ K</kbd>' +
      '</label>' +
      '<a class="website-link" href="https://aos-platform-home.vercel.app/domestic" target="_blank" rel="noopener noreferrer" aria-label="국내여행 홈페이지 보기 (새 창)">' +
      '<span class="website-link-icon" aria-hidden="true">↗</span>' +
      '<span class="website-link-label">홈페이지 보기</span>' +
      '</a>' +
      '<button type="button" class="icon-btn" title="업무지원" data-action="support">?</button>' +
      '<div class="dropdown-wrap">' +
      '<button type="button" class="icon-btn notice" aria-label="알림" aria-expanded="false" data-dropdown="notice">' +
      '♢<i>' +
      escapeHtml(String(noticeCount)) +
      '</i>' +
      '</button>' +
      '<div class="dropdown notice-menu" hidden data-dropdown-panel="notice">' +
      '<div class="drop-head"><strong>알림</strong><button type="button" data-action="mark-all-read">모두 읽음</button></div>' +
      renderNotices(options.notices) +
      '<button type="button" class="drop-footer">전체 알림 보기</button>' +
      '</div>' +
      '</div>' +
      '<div class="divider" aria-hidden="true"></div>' +
      '<div class="dropdown-wrap">' +
      '<button type="button" class="profile" aria-expanded="false" data-dropdown="profile">' +
      '<span class="avatar" aria-hidden="true">' +
      escapeHtml(avatar) +
      '</span>' +
      '<span><b>' +
      escapeHtml(agency) +
      '</b><small>' +
      escapeHtml(userName) +
      '</small></span>' +
      '<em aria-hidden="true">⌄</em>' +
      '</button>' +
      '<div class="dropdown profile-menu" hidden data-dropdown-panel="profile">' +
      '<button type="button">내 정보</button>' +
      '<button type="button">환경설정</button>' +
      '<hr />' +
      '<button type="button" class="logout">로그아웃</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</header>'
    );
  }

  /**
   * #app-root 에 Sidebar + Workspace(Topbar + content slot) 구성
   */
  function mount(options) {
    options = options || {};
    var root = document.getElementById(options.rootId || 'app-root');
    if (!root) {
      return null;
    }

    var contentHtml = '';
    var contentEl = document.getElementById(options.contentId || 'page-content');
    if (contentEl) {
      contentHtml = contentEl.innerHTML;
      contentEl.remove();
    }

    root.innerHTML =
      '<div class="app-shell">' +
      renderSidebar(options) +
      '<div class="workspace">' +
      renderTopbar(options) +
      '<main class="content" id="admin-content">' +
      contentHtml +
      '</main>' +
      '</div>' +
      '</div>';

    return root.querySelector('#admin-content');
  }

  global.AOSAdminLayout = {
    NAV_ITEMS: NAV_ITEMS,
    mount: mount,
    renderSidebar: renderSidebar,
    renderTopbar: renderTopbar,
    escapeHtml: escapeHtml
  };
})(window);
