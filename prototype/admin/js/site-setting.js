(function () {
  'use strict';

  var form = document.getElementById('siteSettingForm');
  if (!form) return;

  var accountList = document.getElementById('accountList');
  var keywordInput = document.getElementById('keywordInput');
  var keywordTags = document.getElementById('keywordTags');
  var seoDescription = document.getElementById('seoDescription');
  var saveBar = document.querySelector('.save-bar');
  var changeStatus = document.getElementById('changeStatus');
  var toastElement = document.getElementById('siteToast');
  var files = {};
  var savedFiles = {};
  var keywords = [];
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

  function formatPhone(value) {
    var number = value.replace(/\D/g, '').slice(0, 11);
    if (number.indexOf('02') === 0) return number.length <= 2 ? number : number.length <= 6 ? number.slice(0, 2) + '-' + number.slice(2) : number.slice(0, 2) + '-' + number.slice(2, number.length - 4) + '-' + number.slice(-4);
    return number.length <= 3 ? number : number.length <= 7 ? number.slice(0, 3) + '-' + number.slice(3) : number.slice(0, 3) + '-' + number.slice(3, number.length - 4) + '-' + number.slice(-4);
  }

  function formatBusinessNumber(value) {
    var number = value.replace(/\D/g, '').slice(0, 10);
    return number.length <= 3 ? number : number.length <= 5 ? number.slice(0, 3) + '-' + number.slice(3) : number.slice(0, 3) + '-' + number.slice(3, 5) + '-' + number.slice(5);
  }

  function updateSeoCount() { document.getElementById('seoCount').textContent = seoDescription.value.length + ' / 200'; }

  function addKeywords(raw) {
    raw.split(',').map(function (item) { return item.trim(); }).filter(Boolean).forEach(function (keyword) {
      if (keywords.length >= 20) return;
      if (!keywords.some(function (item) { return item.toLowerCase() === keyword.toLowerCase(); })) keywords.push(keyword);
    });
    keywordInput.value = '';
    renderKeywords();
    markDirty();
    if (keywords.length >= 20) toast('SEO 키워드는 최대 20개까지 등록할 수 있습니다.');
  }

  function renderKeywords() {
    keywordTags.innerHTML = '';
    keywords.forEach(function (keyword, index) {
      var tag = document.createElement('span');
      tag.className = 'keyword-tag';
      tag.appendChild(document.createTextNode(keyword));
      var remove = document.createElement('button');
      remove.type = 'button';
      remove.setAttribute('aria-label', keyword + ' 삭제');
      remove.textContent = '×';
      remove.addEventListener('click', function () { keywords.splice(index, 1); renderKeywords(); markDirty(); });
      tag.appendChild(remove);
      keywordTags.appendChild(tag);
    });
  }

  function accountTemplate(index, data) {
    var row = document.createElement('div');
    row.className = 'account-row';
    row.innerHTML = '<div><label>은행명</label><select data-account="bank"><option>국민은행</option><option>신한은행</option><option>우리은행</option><option>하나은행</option><option>농협은행</option><option>기업은행</option><option>카카오뱅크</option><option>토스뱅크</option><option>기타</option></select></div>' +
      '<div><label>계좌번호</label><input data-account="number" placeholder="계좌번호를 입력해주세요."></div>' +
      '<div><label>예금주</label><input data-account="holder" placeholder="예금주를 입력해주세요."></div>' +
      '<label class="primary-radio"><input type="radio" name="primaryAccount" value="' + index + '"> 대표계좌</label>' +
      '<button class="btn red account-delete" type="button">삭제</button>';
    row.querySelector('[data-account="bank"]').value = data.bank || '국민은행';
    row.querySelector('[data-account="number"]').value = data.number || '';
    row.querySelector('[data-account="holder"]').value = data.holder || '';
    row.querySelector('[name="primaryAccount"]').checked = !!data.primary;
    row.querySelector('.account-delete').addEventListener('click', function () {
      if (accountList.children.length === 1) { toast('계좌는 최소 한 개 이상 등록해야 합니다.'); return; }
      row.remove();
      normalizeAccounts();
      markDirty();
    });
    return row;
  }

  function addAccount(data, silent) {
    accountList.appendChild(accountTemplate(accountList.children.length, data || {}));
    normalizeAccounts();
    if (!silent) markDirty();
  }

  function normalizeAccounts() {
    var radios = accountList.querySelectorAll('[name="primaryAccount"]');
    radios.forEach(function (radio, index) { radio.value = index; });
    if (radios.length && !accountList.querySelector('[name="primaryAccount"]:checked')) radios[0].checked = true;
  }

  function getAccounts() {
    return Array.prototype.map.call(accountList.children, function (row) {
      return { bank: row.querySelector('[data-account="bank"]').value, number: row.querySelector('[data-account="number"]').value, holder: row.querySelector('[data-account="holder"]').value, primary: row.querySelector('[name="primaryAccount"]').checked };
    });
  }

  function validateFile(file) {
    var allowed = ['pdf', 'jpg', 'jpeg', 'png'];
    var extension = file.name.split('.').pop().toLowerCase();
    if (allowed.indexOf(extension) === -1) return 'PDF, JPG, JPEG, PNG 파일만 등록할 수 있습니다.';
    if (file.size > 10 * 1024 * 1024) return '파일 용량은 최대 10MB까지 등록할 수 있습니다.';
    return '';
  }

  function renderFile(key) {
    var result = document.querySelector('[data-file-result="' + key + '"]');
    var file = files[key];
    result.innerHTML = '';
    if (!file) return;
    var info = document.createElement('div');
    info.className = 'file-info';
    var isImage = /image\/(jpeg|png)/.test(file.type) || /\.(jpg|jpeg|png)$/i.test(file.name);
    info.innerHTML = '<div class="file-name"><strong></strong><span></span></div><div class="file-actions"></div>';
    info.querySelector('strong').textContent = file.name;
    info.querySelector('span').textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
    var actions = info.querySelector('.file-actions');
    if (isImage) actions.appendChild(fileButton('미리보기', function () { window.open(URL.createObjectURL(file), '_blank'); }));
    actions.appendChild(fileButton('다운로드', function () { var link = document.createElement('a'); link.href = URL.createObjectURL(file); link.download = file.name; link.click(); setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000); }));
    actions.appendChild(fileButton('삭제', function () { delete files[key]; result.closest('.field').querySelector('input[type="file"]').value = ''; renderFile(key); markDirty(); }, 'red'));
    result.appendChild(info);
  }

  function fileButton(text, handler, color) {
    var button = document.createElement('button');
    button.type = 'button'; button.className = 'btn' + (color ? ' ' + color : ''); button.textContent = text; button.addEventListener('click', handler); return button;
  }

  function selectFile(key, file) {
    if (!file) return;
    var error = validateFile(file);
    if (error) { toast(error); return; }
    files[key] = file;
    renderFile(key);
    markDirty();
  }

  function clearErrors() {
    document.querySelectorAll('.error').forEach(function (error) { error.textContent = ''; });
    document.querySelectorAll('.invalid').forEach(function (field) { field.classList.remove('invalid'); });
  }

  function validate() {
    clearErrors();
    var firstInvalid = null;
    var siteName = document.getElementById('siteName');
    var email = document.getElementById('email');
    if (!siteName.value.trim()) { siteName.classList.add('invalid'); document.getElementById('siteNameError').textContent = '사이트 이름을 입력해주세요.'; firstInvalid = siteName; }
    if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { email.classList.add('invalid'); document.getElementById('emailError').textContent = '올바른 이메일 형식으로 입력해주세요.'; firstInvalid = firstInvalid || email; }
    Object.keys(files).some(function (key) { var error = validateFile(files[key]); if (error) { toast(error); return true; } return false; });
    if (firstInvalid) { firstInvalid.focus(); firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' }); return false; }
    return true;
  }

  function serialize() {
    var values = {};
    new FormData(form).forEach(function (value, key) { if (!(value instanceof File)) values[key] = value; });
    return JSON.stringify({ values: values, keywords: keywords, accounts: getAccounts() });
  }

  function restore(serialized) {
    var state = JSON.parse(serialized);
    Object.keys(state.values).forEach(function (name) { var field = form.elements[name]; if (field) field.value = state.values[name]; });
    keywords = state.keywords.slice();
    renderKeywords();
    accountList.innerHTML = '';
    state.accounts.forEach(function (account) { addAccount(account, true); });
    files = Object.assign({}, savedFiles);
    document.querySelectorAll('.file-result').forEach(function (result) { result.innerHTML = ''; });
    document.querySelectorAll('.upload-box input').forEach(function (input) { input.value = ''; });
    Object.keys(files).forEach(renderFile);
    updateSeoCount();
    clearErrors();
    markClean();
  }

  function save() {
    if (!validate()) { toast('입력 내용을 확인해주세요.'); return; }
    savedState = serialize();
    savedFiles = Object.assign({}, files);
    var now = new Date();
    var stamp = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    document.getElementById('lastSaved').textContent = '마지막 저장: ' + stamp;
    markClean();
    toast('사이트 설정이 저장되었습니다.');
  }

  form.addEventListener('input', function (event) {
    if (event.target.matches('[data-phone]')) event.target.value = formatPhone(event.target.value);
    if (event.target.id === 'businessNumber') event.target.value = formatBusinessNumber(event.target.value);
    if (event.target === seoDescription) updateSeoCount();
    markDirty();
  });
  form.addEventListener('change', markDirty);
  keywordInput.addEventListener('keydown', function (event) { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addKeywords(keywordInput.value); } });
  keywordInput.addEventListener('blur', function () { if (keywordInput.value.trim()) addKeywords(keywordInput.value); });
  document.getElementById('addAccount').addEventListener('click', function () { addAccount({}); });
  document.getElementById('addressSearch').addEventListener('click', function () { toast('주소검색 기능은 추후 API와 연동됩니다.'); });
  document.querySelectorAll('.save-action').forEach(function (button) { button.addEventListener('click', save); });
  document.querySelectorAll('.cancel-action').forEach(function (button) { button.addEventListener('click', function () { restore(savedState); toast('저장되지 않은 변경사항을 취소했습니다.'); }); });
  document.querySelectorAll('[data-preparing]').forEach(function (tab) { tab.addEventListener('click', function () { if (dirty && !window.confirm('변경사항이 저장되지 않았습니다. 페이지를 이동하시겠습니까?')) return; toast('해당 설정 페이지는 준비 중입니다.'); }); });
  document.querySelectorAll('.upload-box').forEach(function (box) {
    var key = box.getAttribute('data-upload');
    var input = box.querySelector('input');
    box.addEventListener('click', function () { input.click(); });
    box.addEventListener('keydown', function (event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); } });
    input.addEventListener('click', function (event) { event.stopPropagation(); });
    input.addEventListener('change', function () { selectFile(key, input.files[0]); });
    ['dragenter', 'dragover'].forEach(function (name) { box.addEventListener(name, function (event) { event.preventDefault(); box.classList.add('dragover'); }); });
    ['dragleave', 'drop'].forEach(function (name) { box.addEventListener(name, function (event) { event.preventDefault(); box.classList.remove('dragover'); }); });
    box.addEventListener('drop', function (event) { selectFile(key, event.dataTransfer.files[0]); });
  });
  window.addEventListener('beforeunload', function (event) { if (!dirty) return; event.preventDefault(); event.returnValue = ''; });

  addAccount({ bank: '국민은행', primary: true }, true);
  updateSeoCount();
  savedState = serialize();
  markClean();
}());
