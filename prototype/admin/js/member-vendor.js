(function () {
  function notify(message) {
    if (typeof window.msg === 'function') window.msg(message);
    else window.alert(message);
  }

  function goList() {
    window.location.href = 'member-vendor-list.html';
  }

  function initList() {
    document.querySelectorAll('[data-vendor-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        var action = button.getAttribute('data-vendor-action');
        if (action === 'search') notify('현재 조건으로 랜드사를 검색합니다.');
        if (action === 'reset') {
          document.querySelectorAll('.vendor-filter-grid input').forEach(function (input) { input.value = ''; });
          document.querySelectorAll('.vendor-filter-grid select').forEach(function (select) { select.selectedIndex = 0; });
          notify('검색조건을 초기화했습니다.');
        }
        if (action === 'detail') notify('랜드사 상세 샘플입니다.');
        if (action === 'rate') notify('요금관리 샘플입니다. 등록/수정 화면의 요금정보 탭에서 관리합니다.');
      });
    });
  }

  function showTab(name) {
    document.querySelectorAll('[data-vendor-tab]').forEach(function (tab) {
      tab.classList.toggle('active', tab.getAttribute('data-vendor-tab') === name);
    });
    document.querySelectorAll('[data-vendor-panel]').forEach(function (panel) {
      panel.classList.toggle('active', panel.getAttribute('data-vendor-panel') === name);
    });
  }

  function syncAccountFields() {
    var enabled = document.querySelector('input[name="loginEnabled"]:checked');
    var disabled = enabled && enabled.value === 'N';
    document.querySelectorAll('.account-field input, .account-field select, .account-field button').forEach(function (field) {
      field.disabled = disabled;
      field.classList.toggle('disabled-field', disabled);
    });
  }

  function validateRequired() {
    var required = [
      { id: 'vendorName', label: '랜드사명' },
      { id: 'mainCategory', label: '주 카테고리' },
      { id: 'region', label: '지역' },
      { id: 'managerName', label: '담당자명' },
      { id: 'managerPhone', label: '담당자 연락처' }
    ];
    for (var i = 0; i < required.length; i += 1) {
      var field = document.getElementById(required[i].id);
      if (!field || !String(field.value || '').trim()) {
        notify(required[i].label + '은(는) 필수 입력 항목입니다.');
        if (field) {
          var panel = field.closest('[data-vendor-panel]');
          if (panel) showTab(panel.getAttribute('data-vendor-panel'));
          field.focus();
        }
        return false;
      }
    }
    return true;
  }

  var rowTemplates = {
    meal: '<td><input></td><td><select><option>조식</option><option>중식</option><option>석식</option><option>간식</option></select></td><td><input></td><td><input></td><td><input></td><td><input type="date"></td><td><input type="date"></td><td><select><option>사용중</option><option>중지</option></select></td><td><button class="btn small" type="button" data-rate-delete>삭제</button></td>',
    stay: '<td><input></td><td><select><option>1인실</option><option>2인실</option><option>3인실</option><option>4인실</option><option>단체실</option></select></td><td><input></td><td><input></td><td><input></td><td><input></td><td><input></td><td><input></td><td><select><option>포함</option><option>불포함</option></select></td><td><input type="date"></td><td><input type="date"></td><td><select><option>사용중</option><option>중지</option></select></td><td><button class="btn small" type="button" data-rate-delete>삭제</button></td>',
    ship: '<td><input></td><td><select><option>편도</option><option>왕복</option></select></td><td><input></td><td><input></td><td><input></td><td><input></td><td><input type="time"></td><td><input type="date"></td><td><input type="date"></td><td><select><option>사용중</option><option>중지</option></select></td><td><button class="btn small" type="button" data-rate-delete>삭제</button></td>',
    activity: '<td><input></td><td><input></td><td><input></td><td><input></td><td><input></td><td><input></td><td><input type="date"></td><td><input type="date"></td><td><select><option>사용중</option><option>중지</option></select></td><td><button class="btn small" type="button" data-rate-delete>삭제</button></td>'
  };

  function addRateRow(type) {
    var table = document.querySelector('[data-rate-table="' + type + '"] tbody');
    if (!table || !rowTemplates[type]) return;
    var row = document.createElement('tr');
    row.innerHTML = rowTemplates[type];
    table.appendChild(row);
  }

  function initForm() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'edit') {
      document.title = '랜드사 수정';
      var title = document.getElementById('vendorPageTitle');
      if (title) title.textContent = '랜드사 수정';
    }

    document.querySelectorAll('[data-vendor-tab]').forEach(function (tab) {
      tab.addEventListener('click', function () { showTab(tab.getAttribute('data-vendor-tab')); });
    });

    document.querySelectorAll('input[name="loginEnabled"]').forEach(function (radio) {
      radio.addEventListener('change', syncAccountFields);
    });
    syncAccountFields();

    document.querySelectorAll('[data-rate-add]').forEach(function (button) {
      button.addEventListener('click', function () { addRateRow(button.getAttribute('data-rate-add')); });
    });

    document.addEventListener('click', function (event) {
      var deleteButton = event.target.closest('[data-rate-delete]');
      if (deleteButton) {
        var row = deleteButton.closest('tr');
        if (row) row.remove();
      }
    });

    document.querySelectorAll('[data-vendor-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        var action = button.getAttribute('data-vendor-action');
        if (action === 'list' || action === 'cancel') goList();
        if (action === 'password') notify('임시비밀번호가 재발급되었습니다.');
        if (action === 'save' && validateRequired()) notify('랜드사 정보가 저장되었습니다.');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.dataset.page === 'member_vendor_list') initList();
    if (document.body.dataset.page === 'member_vendor_form') initForm();
  });
})();
