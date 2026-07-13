(function () {
  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function notify(message) {
    if (typeof window.msg === 'function') window.msg(message);
    else window.alert(message);
  }

  function openModal(id) {
    var modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(id) {
    var modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function updateMemberFormMode() {
    var formPage = document.body.dataset.page === 'member_web_form';
    if (!formPage) return;
    var params = new URLSearchParams(window.location.search);
    var isEdit = params.get('mode') === 'edit';
    var editTab = params.get('tab');
    var title = document.getElementById('memberFormTitle');
    var topbarTitle = document.getElementById('memberTopbarTitle');
    var editTitle = '웹회원 수정';
    if (isEdit && editTab === 'basic') editTitle = '웹회원 기본정보 수정';
    if (isEdit && editTab === 'referral') editTitle = '웹회원 가입/추천정보 수정';
    if (title) title.textContent = isEdit ? editTitle : '웹회원 등록';
    if (topbarTitle) topbarTitle.textContent = isEdit ? editTitle : '웹회원 등록';
    $all('[data-edit-only]').forEach(function (el) { el.hidden = !isEdit || !!editTab; });
    $all('[data-create-only]').forEach(function (el) { el.classList.toggle('hidden', isEdit); });
    var memberLoginId = document.getElementById('memberLoginId');
    if (memberLoginId) memberLoginId.readOnly = isEdit;
    if (isEdit && editTab) {
      $all('[data-form-section]').forEach(function (section) {
        section.classList.toggle('hidden', section.dataset.formSection !== editTab);
      });
    }
  }

  function updateStatusFields() {
    var status = $('input[name="memberStatus"]:checked');
    if (!status) return;
    $all('[data-status-extra]').forEach(function (el) {
      el.classList.add('hidden');
    });
    if (status.value === '차단') {
      $all('[data-status-extra="blocked"]').forEach(function (el) { el.classList.remove('hidden'); });
    }
    if (status.value === '탈퇴') {
      $all('[data-status-extra="withdrawn"]').forEach(function (el) { el.classList.remove('hidden'); });
    }
  }

  function updateReferralStore() {
    var code = $('#referralCode');
    var target = $('#matchedSeller');
    if (!code || !target) return;
    var value = code.value.trim().toUpperCase();
    var stores = {
      HAPPYAOS: '행복투어 / 담당자: 김담당 / 010-0000-0000',
      WOORIAOS: '우리여행사 / 담당자: 박담당 / 010-1111-2222'
    };
    target.textContent = stores[value] || (value ? '매칭된 판매점이 없습니다.' : '추천인코드를 입력하면 연결 판매점이 표시됩니다.');
  }

  function resetFilterForm() {
    var form = document.getElementById('memberSearchForm');
    if (form) form.reset();
  }

  function checkedMembers() {
    return $all('[data-member-check]:checked');
  }

  function switchTab(tabName) {
    $all('[data-tab]').forEach(function (button) {
      button.classList.toggle('active', button.dataset.tab === tabName);
    });
    $all('[data-tab-panel]').forEach(function (panel) {
      var isActive = panel.dataset.tabPanel === tabName;
      panel.classList.toggle('active', isActive);
      panel.classList.toggle('hidden', !isActive);
    });
    $all('[data-tab-edit]').forEach(function (button) {
      button.classList.toggle('hidden', button.dataset.tabEdit !== tabName);
    });
  }

  document.addEventListener('click', function (event) {
    var actionEl = event.target.closest('[data-web-action]');
    if (!actionEl) return;
    var action = actionEl.dataset.webAction;

    if (action === 'search') {
      notify('검색 조건으로 웹회원 목록을 조회합니다. 실제 검색 API는 추후 연결이 필요합니다.');
    }

    if (action === 'reset-search') {
      resetFilterForm();
    }

    if (action === 'excel') {
      if (window.confirm('개인정보가 포함된 회원목록을 다운로드하시겠습니까? 다운로드 이력은 관리자 로그에 기록됩니다.')) {
        notify('엑셀 다운로드 요청이 접수되었습니다. 실제 파일 생성은 API 연결 후 처리됩니다.');
      }
    }

    if (action === 'bulk-status') {
      if (!checkedMembers().length) {
        notify('상태를 변경할 웹회원을 선택해주세요.');
        return;
      }
      notify('선택한 웹회원 상태변경 화면은 추후 API 연결 시 처리됩니다.');
    }

    if (action === 'save-member') {
      notify('웹회원 정보가 저장되었습니다.');
    }

    if (action === 'list') {
      window.location.href = 'member_web_list.html';
    }

    if (action === 'cancel') {
      history.length > 1 ? history.back() : window.location.href = 'member_web_list.html';
    }

    if (action === 'password-reset') {
      if (window.confirm('임시 비밀번호를 발급하시겠습니까? 고객에게 별도 안내가 필요합니다.')) {
        notify('임시 비밀번호 발급 요청이 처리되었습니다. 문자/알림톡 발송은 추후 연결이 필요합니다.');
      }
    }

    if (action === 'change-status') {
      notify('회원상태 변경 기능은 실제 회원 API 연결 후 처리됩니다.');
    }

    if (action === 'go-reservation-tab') {
      switchTab('reservation');
    }

    if (action === 'open-consult-modal') {
      openModal('consultModal');
    }

    if (action === 'close-consult-modal') {
      closeModal('consultModal');
    }

    if (action === 'save-consult') {
      notify('상담 내역이 등록되었습니다. 현재는 prototype alert 처리입니다.');
      closeModal('consultModal');
    }

    if (action === 'save-memo') {
      notify('관리자 메모가 등록되었습니다. 현재는 prototype alert 처리입니다.');
    }
  });

  document.addEventListener('change', function (event) {
    if (event.target.matches('#checkAllMembers')) {
      $all('[data-member-check]').forEach(function (checkbox) {
        checkbox.checked = event.target.checked;
      });
    }

    if (event.target.matches('input[name="memberStatus"]')) {
      updateStatusFields();
    }
  });

  document.addEventListener('input', function (event) {
    if (event.target.matches('#referralCode')) {
      updateReferralStore();
    }
  });

  document.addEventListener('click', function (event) {
    var tab = event.target.closest('[data-tab]');
    if (tab) switchTab(tab.dataset.tab);
  });

  $all('.modal').forEach(function (modal) {
    modal.addEventListener('click', function (event) {
      if (event.target === modal) closeModal(modal.id);
    });
  });

  updateMemberFormMode();
  updateStatusFields();
  updateReferralStore();

  var params = new URLSearchParams(window.location.search);
  var initialTab = params.get('tab');
  if (initialTab) switchTab(initialTab);
})();
