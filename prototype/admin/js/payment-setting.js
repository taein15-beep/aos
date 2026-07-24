(function () {
  'use strict';

  var form = document.getElementById('paymentSettingForm');
  if (!form) return;

  var toastElement = document.getElementById('paymentToast');
  var saveBar = document.querySelector('.save-bar');
  var changeStatus = document.getElementById('changeStatus');
  var savedState = '';
  var dirty = false;
  var toastTimer;

  function toast(message) {
    toastElement.textContent = message;
    toastElement.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastElement.classList.remove('show'); }, 2200);
  }

  function markDirty() {
    dirty = true;
    changeStatus.textContent = '변경된 내용이 있습니다.';
    saveBar.classList.add('dirty');
    document.querySelectorAll('.cancel-action').forEach(function (button) { button.disabled = false; });
  }

  function markClean() {
    dirty = false;
    changeStatus.textContent = '저장된 상태입니다.';
    saveBar.classList.remove('dirty');
    document.querySelectorAll('.cancel-action').forEach(function (button) { button.disabled = true; });
  }

  function clearErrors() {
    form.querySelectorAll('.error').forEach(function (error) { error.textContent = ''; });
    form.querySelectorAll('.invalid').forEach(function (field) { field.classList.remove('invalid'); });
  }

  function serialize() {
    var state = {};
    Array.prototype.forEach.call(form.elements, function (field) {
      if (!field.name) return;
      if (field.type === 'checkbox') {
        state[field.name] = field.checked;
        return;
      }
      if (field.type === 'radio') {
        if (field.checked) state[field.name] = field.value;
        return;
      }
      state[field.name] = field.value;
    });
    return JSON.stringify(state);
  }

  function restore(serialized) {
    var state = JSON.parse(serialized);
    Object.keys(state).forEach(function (name) {
      var field = form.elements[name];
      if (!field) return;
      if (field instanceof RadioNodeList) {
        Array.prototype.forEach.call(field, function (radio) { radio.checked = radio.value === state[name]; });
      } else if (field.type === 'checkbox') {
        field.checked = state[name];
      } else {
        field.value = state[name];
      }
    });
    updateSwitchStates();
    clearErrors();
    markClean();
  }

  function updateSwitchStates() {
    document.querySelectorAll('.switch-label input[type="checkbox"]').forEach(function (checkbox) {
      var state = checkbox.closest('.switch-label').querySelector('.switch-state');
      if (state) state.textContent = checkbox.checked ? '사용' : '비사용';
    });
  }

  function save() {
    savedState = serialize();
    var now = new Date();
    var stamp = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    document.getElementById('lastSaved').textContent = '마지막 저장: ' + stamp;
    clearErrors();
    markClean();
    toast('결제 관련 설정이 저장되었습니다.');
  }

  form.addEventListener('input', function (event) {
    if (event.target.matches('.switch-label input[type="checkbox"]')) updateSwitchStates();
    markDirty();
  });

  document.querySelectorAll('.save-action').forEach(function (button) { button.addEventListener('click', save); });
  document.querySelectorAll('.cancel-action').forEach(function (button) {
    button.addEventListener('click', function () {
      restore(savedState);
      toast('저장되지 않은 변경사항을 취소했습니다.');
    });
  });

  document.querySelectorAll('[data-preparing]').forEach(function (tab) {
    tab.addEventListener('click', function () { toast('해당 설정 페이지는 준비 중입니다.'); });
  });

  document.querySelectorAll('[data-page-link]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      if (!dirty) return;
      event.preventDefault();
      if (!window.confirm('변경사항이 저장되지 않았습니다. 페이지를 이동하시겠습니까?')) return;
      dirty = false;
      window.location.href = link.href;
    });
  });

  window.addEventListener('beforeunload', function (event) {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  savedState = serialize();
  updateSwitchStates();
  markClean();
}());
