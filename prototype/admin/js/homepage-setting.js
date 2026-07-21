(function () {
  'use strict';

  var form = document.getElementById('homepageSettingForm');
  if (!form) return;

  var toastElement = document.getElementById('homepageToast');
  var saveBar = document.querySelector('.save-bar');
  var changeStatus = document.getElementById('changeStatus');
  var dirty = false;
  var savedState = '';
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

  function isValidHttpUrl(value) {
    try {
      var url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  function openExternal(url) {
    if (!isValidHttpUrl(url)) return false;
    var opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (opened) opened.opener = null;
    return true;
  }

  function fallbackCopy(value) {
    var textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    var copied = false;
    try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
    textarea.remove();
    return copied;
  }

  function copyText(value, successMessage) {
    var done = function () { toast(successMessage); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(value).then(done).catch(function () {
        if (fallbackCopy(value)) done(); else toast('복사하지 못했습니다. 다시 시도해주세요.');
      });
      return;
    }
    if (fallbackCopy(value)) done(); else toast('복사하지 못했습니다. 다시 시도해주세요.');
  }

  function formatBusinessNumber(value) {
    var number = value.replace(/\D/g, '').slice(0, 10);
    if (number.length <= 3) return number;
    if (number.length <= 5) return number.slice(0, 3) + '-' + number.slice(3);
    return number.slice(0, 3) + '-' + number.slice(3, 5) + '-' + number.slice(5);
  }

  function clearErrors() {
    document.querySelectorAll('.error').forEach(function (error) { error.textContent = ''; });
    document.querySelectorAll('.invalid').forEach(function (field) { field.classList.remove('invalid'); });
  }

  function setError(fieldId, errorId, message) {
    var field = document.getElementById(fieldId);
    field.classList.add('invalid');
    document.getElementById(errorId).textContent = message;
    return field;
  }

  function validate() {
    clearErrors();
    var firstInvalid = null;
    var kakaoChatUrl = document.getElementById('kakaoChatUrl');
    var naverEnabled = document.getElementById('naverEnabled').checked;
    var kakaoEnabled = document.getElementById('kakaoEnabled').checked;
    var popbillEnabled = document.getElementById('popbillEnabled').checked;
    var businessNumber = document.getElementById('popbillBusinessNumber');

    if (kakaoChatUrl.value.trim() && !isValidHttpUrl(kakaoChatUrl.value.trim())) {
      firstInvalid = setError('kakaoChatUrl', 'kakaoChatUrlError', '올바른 URL을 입력해주세요.');
    }
    if (naverEnabled && !document.getElementById('naverClientId').value.trim()) {
      var naverClientIdField = setError('naverClientId', 'naverClientIdError', '네이버 Client ID를 입력해주세요.');
      firstInvalid = firstInvalid || naverClientIdField;
    }
    if (naverEnabled && !document.getElementById('naverClientSecret').value) {
      var naverSecretField = setError('naverClientSecret', 'naverClientSecretError', '네이버 Client Secret을 입력해주세요.');
      firstInvalid = firstInvalid || naverSecretField;
    }
    if (kakaoEnabled && !document.getElementById('kakaoJavascriptKey').value) {
      var kakaoKeyField = setError('kakaoJavascriptKey', 'kakaoJavascriptKeyError', '카카오 JavaScript 키를 입력해주세요.');
      firstInvalid = firstInvalid || kakaoKeyField;
    }
    if (popbillEnabled && !document.getElementById('popbillId').value.trim()) {
      var popbillIdField = setError('popbillId', 'popbillIdError', '팝빌 ID를 입력해주세요.');
      firstInvalid = firstInvalid || popbillIdField;
    }
    if (popbillEnabled && !/^\d{3}-\d{2}-\d{5}$/.test(businessNumber.value)) {
      var businessNumberField = setError('popbillBusinessNumber', 'popbillBusinessNumberError', '올바른 사업자등록번호를 입력해주세요.');
      firstInvalid = firstInvalid || businessNumberField;
    }

    if (firstInvalid) {
      firstInvalid.focus();
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  }

  function serialize() {
    var state = {};
    Array.prototype.forEach.call(form.elements, function (field) {
      if (!field.name) return;
      state[field.name] = field.type === 'checkbox' ? field.checked : field.value;
    });
    return JSON.stringify(state);
  }

  function resetSecretVisibility() {
    document.querySelectorAll('[data-secret-target]').forEach(function (button) {
      var input = document.getElementById(button.getAttribute('data-secret-target'));
      input.type = 'password';
      button.textContent = '보기';
      button.setAttribute('aria-label', input.id === 'naverClientSecret' ? 'Client Secret 보기' : 'JavaScript 키 보기');
    });
  }

  function restore(serialized) {
    var state = JSON.parse(serialized);
    Object.keys(state).forEach(function (name) {
      var field = form.elements[name];
      if (!field) return;
      if (field.type === 'checkbox') field.checked = state[name];
      else field.value = state[name];
    });
    resetSecretVisibility();
    clearErrors();
    markClean();
  }

  function save() {
    if (!validate()) { toast('입력 내용을 확인해주세요.'); return; }
    savedState = serialize();
    var now = new Date();
    var stamp = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    document.getElementById('lastSaved').textContent = '마지막 저장: ' + stamp;
    clearErrors();
    markClean();
    toast('홈페이지 관련 설정이 저장되었습니다.');
  }

  form.addEventListener('input', function (event) {
    if (event.target.id === 'popbillBusinessNumber') event.target.value = formatBusinessNumber(event.target.value);
    markDirty();
  });
  form.addEventListener('change', markDirty);

  document.getElementById('checkKakaoLink').addEventListener('click', function () {
    var field = document.getElementById('kakaoChatUrl');
    document.getElementById('kakaoChatUrlError').textContent = '';
    field.classList.remove('invalid');
    if (!openExternal(field.value.trim())) setError('kakaoChatUrl', 'kakaoChatUrlError', '올바른 URL을 입력해주세요.');
  });

  document.querySelectorAll('[data-copy-target]').forEach(function (button) {
    button.addEventListener('click', function () {
      copyText(document.getElementById(button.getAttribute('data-copy-target')).value, button.getAttribute('data-copy-message'));
    });
  });

  document.querySelectorAll('[data-copy-value]').forEach(function (button) {
    button.addEventListener('click', function () { copyText(button.getAttribute('data-copy-value'), button.getAttribute('data-copy-message')); });
  });

  document.querySelectorAll('[data-open-target]').forEach(function (button) {
    button.addEventListener('click', function () { openExternal(document.getElementById(button.getAttribute('data-open-target')).value); });
  });

  document.querySelectorAll('[data-secret-target]').forEach(function (button) {
    button.addEventListener('click', function () {
      var input = document.getElementById(button.getAttribute('data-secret-target'));
      var showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      button.textContent = showing ? '보기' : '숨기기';
      button.setAttribute('aria-label', showing ? '비밀값 보기' : '비밀값 숨기기');
    });
  });

  document.querySelectorAll('input[readonly]').forEach(function (input) {
    input.addEventListener('click', function () { input.select(); });
  });

  document.querySelectorAll('.save-action').forEach(function (button) { button.addEventListener('click', save); });
  document.querySelectorAll('.cancel-action').forEach(function (button) {
    button.addEventListener('click', function () { restore(savedState); toast('저장되지 않은 변경사항을 취소했습니다.'); });
  });

  document.querySelectorAll('[data-preparing]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      if (dirty && !window.confirm('변경사항이 저장되지 않았습니다. 페이지를 이동하시겠습니까?')) return;
      toast('해당 설정 페이지는 준비 중입니다.');
    });
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
  markClean();
}());
