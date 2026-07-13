(function () {
  function notify(message) {
    if (typeof window.msg === 'function') window.msg(message);
    else window.alert(message);
  }
  function confirmAction(message, doneMessage) {
    if (window.confirm(message)) notify(doneMessage);
  }
  function initList() {
    var checkAll = document.getElementById('checkAllAdmins');
    if (!checkAll) return;
    checkAll.addEventListener('change', function () {
      document.querySelectorAll('[data-admin-check]').forEach(function (checkbox) {
        checkbox.checked = checkAll.checked;
      });
    });
  }
  function initDetailTabs() {
    document.querySelectorAll('[data-admin-tab]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.getAttribute('data-admin-tab');
        document.querySelectorAll('[data-admin-tab]').forEach(function (item) { item.classList.toggle('active', item === tab); });
        document.querySelectorAll('[data-admin-panel]').forEach(function (panel) {
          panel.classList.toggle('active', panel.getAttribute('data-admin-panel') === target);
        });
      });
    });
  }
  function initFormMode() {
    if (document.body.dataset.page !== 'member_admin_form') return;
    var params = new URLSearchParams(window.location.search);
    if (params.get('mode') !== 'edit') return;
    document.title = '관리자/직원 수정';
    var title = document.getElementById('adminFormTitle');
    var topTitle = document.getElementById('adminFormTopTitle');
    var topButton = document.getElementById('adminSaveTopButton');
    var bottomButton = document.getElementById('adminSaveBottomButton');
    if (title) title.textContent = '관리자/직원 수정';
    if (topTitle) topTitle.textContent = '관리자/직원 수정';
    if (topButton) topButton.textContent = '수정 저장';
    if (bottomButton) bottomButton.textContent = '수정 저장';
  }
  function openPermissionModal(button) {
    var row = button.closest('tr');
    var group = row ? row.children[5].textContent.trim() : '일반관리자';
    var modal = document.getElementById('adminPermissionModal');
    var groupName = document.getElementById('adminPermGroupName');
    var groupType = document.getElementById('adminPermGroupType');
    if (groupName) groupName.textContent = group || '일반관리자';
    if (groupType) groupType.textContent = '관리자/직원';
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }
  }
  function closePermissionModal() {
    var modal = document.getElementById('adminPermissionModal');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }
  function applyBulkPermission(value) {
    if (!value) return;
    document.querySelectorAll('#adminPermissionModal input[type="radio"][value="' + value + '"]').forEach(function (input) {
      input.checked = true;
    });
  }
  function bindActions() {
    document.addEventListener('click', function (event) {
      var button = event.target.closest('[data-admin-action]');
      if (!button) return;
      var action = button.getAttribute('data-admin-action');
      if (action === 'search') notify('현재 조건으로 관리자/직원 계정을 검색합니다.');
      if (action === 'reset-search') {
        var form = document.getElementById('adminSearchForm');
        if (form) form.reset();
        notify('검색조건을 초기화했습니다.');
      }
      if (action === 'excel') notify('관리자/직원 목록 엑셀 다운로드 샘플입니다.');
      if (action === 'bulk-status') notify('선택한 계정의 상태를 변경하는 샘플 동작입니다.');
      if (action === 'password-reset') confirmAction('선택한 계정의 비밀번호를 초기화하시겠습니까?', '임시 비밀번호가 발급되었습니다.');
      if (action === 'lock') confirmAction('선택한 계정을 잠금 처리하시겠습니까?', '계정이 잠금 처리되었습니다.');
      if (action === 'unlock') confirmAction('선택한 계정의 잠금을 해제하시겠습니까?', '계정 잠금이 해제되었습니다.');
      if (action === 'resign') confirmAction('퇴사처리 하시겠습니까? 처리 이력은 보존됩니다.', '퇴사처리 샘플 동작이 완료되었습니다.');
      if (action === 'permission') openPermissionModal(button);
      if (action === 'close-permission') closePermissionModal();
      if (action === 'save-permission') {
        closePermissionModal();
        notify('그룹명별 권한 설정이 저장되었습니다.');
      }
      if (action === 'bulk-permission') applyBulkPermission(button.getAttribute('data-permission-value'));
      if (action === 'save') notify('관리자/직원 정보가 저장되었습니다.');
    });
  }
  document.addEventListener('DOMContentLoaded', function () {
    bindActions();
    initList();
    initDetailTabs();
    initFormMode();
  });
})();

