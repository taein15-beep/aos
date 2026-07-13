(function () {
  var todayText = '2026-07-13';
  var regionMap = {
    '': ['전체'],
    '서울': ['전체', '강남구', '마포구', '종로구', '송파구'],
    '경기': ['전체', '수원시', '성남시', '고양시', '부천시'],
    '인천': ['전체', '연수구', '남동구', '부평구'],
    '부산': ['전체', '해운대구', '부산진구', '동래구'],
    '대전': ['전체', '서구', '유성구', '중구'],
    '제주': ['전체', '제주시', '서귀포시']
  };

  var sellers = [
    { id: 's001', name: '에이비아 강남여행사', sido: '서울', sigungu: '강남구', grade: 'A등급', ceo: '김민준', manager: '박서연', phone: '02-1234-5678', status: '정상', selected: true },
    { id: 's002', name: '마포 모두투어센터', sido: '서울', sigungu: '마포구', grade: 'B등급', ceo: '이도현', manager: '정하윤', phone: '02-778-2451', status: '정상', selected: true },
    { id: 's003', name: '종로 프리미엄투어', sido: '서울', sigungu: '종로구', grade: 'C등급', ceo: '최지훈', manager: '한유진', phone: '02-736-9012', status: '승인대기', selected: false },
    { id: 's004', name: '송파 패밀리여행', sido: '서울', sigungu: '송파구', grade: 'D등급', ceo: '오세준', manager: '윤다은', phone: '02-415-3300', status: '정상', selected: false },
    { id: 's005', name: '수원 파트너투어', sido: '경기', sigungu: '수원시', grade: 'B등급', ceo: '장현우', manager: '김나린', phone: '031-222-1234', status: '정상', selected: true },
    { id: 's006', name: '성남 드림여행사', sido: '경기', sigungu: '성남시', grade: 'C등급', ceo: '문태영', manager: '서지민', phone: '031-701-4411', status: '정상', selected: false },
    { id: 's007', name: '고양 행복관광', sido: '경기', sigungu: '고양시', grade: 'A등급', ceo: '임수호', manager: '조아라', phone: '031-918-7070', status: '사용중지', selected: false },
    { id: 's008', name: '부천 온누리투어', sido: '경기', sigungu: '부천시', grade: 'D등급', ceo: '강도윤', manager: '백예린', phone: '032-611-8920', status: '정상', selected: false },
    { id: 's009', name: '인천공항 제휴센터', sido: '인천', sigungu: '연수구', grade: 'A등급', ceo: '손재원', manager: '이채원', phone: '032-811-6001', status: '정상', selected: true },
    { id: 's010', name: '남동 스마트여행', sido: '인천', sigungu: '남동구', grade: 'C등급', ceo: '신유찬', manager: '권미소', phone: '032-472-8088', status: '승인대기', selected: false },
    { id: 's011', name: '부평 레일파트너', sido: '인천', sigungu: '부평구', grade: 'B등급', ceo: '황서준', manager: '류은지', phone: '032-505-7788', status: '정상', selected: false },
    { id: 's012', name: '부산 해운대투어', sido: '부산', sigungu: '해운대구', grade: 'A등급', ceo: '차민석', manager: '문소희', phone: '051-744-1122', status: '정상', selected: false },
    { id: 's013', name: '부산진 여행마루', sido: '부산', sigungu: '부산진구', grade: 'B등급', ceo: '노지호', manager: '심예나', phone: '051-802-3309', status: '사용중지', selected: false },
    { id: 's014', name: '대전 유성관광', sido: '대전', sigungu: '유성구', grade: 'C등급', ceo: '배준호', manager: '남가은', phone: '042-862-7744', status: '정상', selected: true },
    { id: 's015', name: '대전 중앙여행클럽', sido: '대전', sigungu: '중구', grade: 'D등급', ceo: '전우진', manager: '홍시은', phone: '042-255-1004', status: '정상', selected: false },
    { id: 's016', name: '제주 하늘길투어', sido: '제주', sigungu: '제주시', grade: 'A등급', ceo: '고은찬', manager: '양하늘', phone: '064-711-4522', status: '정상', selected: true },
    { id: 's017', name: '서귀포 바다여행', sido: '제주', sigungu: '서귀포시', grade: 'B등급', ceo: '현지완', manager: '오유리', phone: '064-763-9030', status: '승인대기', selected: false },
    { id: 's018', name: '동래 로컬트립', sido: '부산', sigungu: '동래구', grade: 'C등급', ceo: '윤태오', manager: '최보라', phone: '051-552-1900', status: '정상', selected: false }
  ];

  var initialSelectedIds = sellers.filter(function (seller) { return seller.selected; }).map(function (seller) { return seller.id; });
  var savedSelectedIds = initialSelectedIds.slice();
  var workingSelectedIds = initialSelectedIds.slice();
  var pendingCheckedIds = [];
  var checkedSelectedIds = [];
  var currentPage = 1;
  var pageSize = 10;
  var selectedSortAsc = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function getSeller(id) {
    return sellers.find(function (seller) { return seller.id === id; });
  }

  function uniquePush(list, id) {
    if (list.indexOf(id) === -1) list.push(id);
  }

  function removeFrom(list, id) {
    return list.filter(function (value) { return value !== id; });
  }

  function isSelectable(seller) {
    return seller.status === '정상';
  }

  function badge(text, type) {
    return '<span class="badge ' + type + '">' + escapeHtml(text) + '</span>';
  }

  function gradeBadge(grade) {
    var types = { 'A등급': 'b-blue', 'B등급': 'b-green', 'C등급': 'b-gray', 'D등급': 'b-orange' };
    return badge(grade, types[grade] || 'b-gray');
  }

  function statusBadge(status) {
    var types = { '정상': 'b-green', '승인대기': 'b-orange', '사용중지': 'b-red' };
    return badge(status, types[status] || 'b-gray');
  }

  function publicBadge(id) {
    return workingSelectedIds.indexOf(id) > -1 ? badge('선택됨', 'b-blue') : badge('미선택', 'b-gray');
  }

  function setSidoOptions() {
    var sido = byId('filterSido');
    sido.innerHTML = Object.keys(regionMap).map(function (value) {
      return '<option value="' + escapeHtml(value) + '">' + (value || '전체') + '</option>';
    }).join('');
  }

  function updateSigunguOptions() {
    var sidoValue = byId('filterSido').value;
    var options = regionMap[sidoValue] || ['전체'];
    byId('filterSigungu').innerHTML = options.map(function (value) {
      var optionValue = value === '전체' ? '' : value;
      return '<option value="' + escapeHtml(optionValue) + '">' + escapeHtml(value) + '</option>';
    }).join('');
  }

  function filterSellers() {
    var name = byId('filterName').value.trim();
    var sido = byId('filterSido').value;
    var sigungu = byId('filterSigungu').value;
    var grade = byId('filterGrade').value;
    var ceo = byId('filterCeo').value.trim();
    var manager = byId('filterManager').value.trim();
    var phone = byId('filterPhone').value.trim();

    return sellers.filter(function (seller) {
      return (!name || seller.name.indexOf(name) > -1)
        && (!sido || seller.sido === sido)
        && (!sigungu || seller.sigungu === sigungu)
        && (!grade || seller.grade === grade)
        && (!ceo || seller.ceo.indexOf(ceo) > -1)
        && (!manager || seller.manager.indexOf(manager) > -1)
        && (!phone || seller.phone.indexOf(phone) > -1);
    });
  }

  function currentPageRows(filtered) {
    var totalPage = Math.max(1, Math.ceil(filtered.length / pageSize));
    currentPage = Math.min(currentPage, totalPage);
    return filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }

  function renderResultRows() {
    var filtered = filterSellers();
    var rows = currentPageRows(filtered);
    byId('resultCountText').textContent = '총 ' + filtered.length + '개';
    byId('sellerResultRows').innerHTML = rows.length ? rows.map(function (seller) {
      var disabled = !isSelectable(seller);
      var checked = pendingCheckedIds.indexOf(seller.id) > -1;
      var selected = workingSelectedIds.indexOf(seller.id) > -1;
      return '<tr class="' + (selected ? 'is-selected ' : '') + (disabled ? 'is-disabled' : '') + '" title="' + (disabled ? escapeHtml(seller.status + ' 상태의 판매점은 선택할 수 없습니다.') : '') + '">'
        + '<td class="center"><input type="checkbox" class="result-check" data-id="' + seller.id + '" aria-label="' + escapeHtml(seller.name) + ' 선택"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '></td>'
        + '<td title="' + escapeHtml(seller.name) + '"><button class="seller-name-button" type="button" data-edit-id="' + seller.id + '">' + escapeHtml(seller.name) + '</button></td>'
        + '<td class="center" title="' + escapeHtml(seller.sido + ' ' + seller.sigungu) + '">' + escapeHtml(seller.sido + ' ' + seller.sigungu) + '</td>'
        + '<td class="center">' + gradeBadge(seller.grade) + '</td>'
        + '<td class="center">' + publicBadge(seller.id) + '</td>'
        + '</tr>';
    }).join('') : '<tr><td colspan="5" class="center">검색된 판매점이 없습니다.</td></tr>';

    var selectableIds = rows.filter(isSelectable).map(function (seller) { return seller.id; });
    byId('resultSelectAll').checked = selectableIds.length > 0 && selectableIds.every(function (id) { return pendingCheckedIds.indexOf(id) > -1; });
    renderPagination(filtered.length);
  }

  function renderPagination(totalCount) {
    var totalPage = Math.max(1, Math.ceil(totalCount / pageSize));
    var html = [];
    for (var i = 1; i <= totalPage; i += 1) {
      html.push('<button type="button" class="' + (i === currentPage ? 'active' : '') + '" data-page="' + i + '">' + i + '</button>');
    }
    byId('resultPagination').innerHTML = html.join('');
  }

  function renderSelectedRows() {
    var keyword = byId('selectedSearchName').value.trim();
    var selectedRows = workingSelectedIds.map(getSeller).filter(Boolean);
    if (selectedSortAsc) {
      selectedRows.sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); });
    }
    if (keyword) {
      selectedRows = selectedRows.filter(function (seller) { return seller.name.indexOf(keyword) > -1; });
    }

    byId('selectedSellerRows').innerHTML = selectedRows.map(function (seller) {
      var checked = checkedSelectedIds.indexOf(seller.id) > -1;
      return '<tr class="is-selected">'
        + '<td class="center"><input type="checkbox" class="selected-check" data-id="' + seller.id + '" aria-label="' + escapeHtml(seller.name) + ' 선택됨 목록 선택"' + (checked ? ' checked' : '') + '></td>'
        + '<td title="' + escapeHtml(seller.name) + '"><button class="seller-name-button" type="button" data-edit-id="' + seller.id + '">' + escapeHtml(seller.name) + '</button></td>'
        + '<td class="center" title="' + escapeHtml(seller.sido + ' ' + seller.sigungu) + '">' + escapeHtml(seller.sido + ' ' + seller.sigungu) + '</td>'
        + '<td class="center">' + gradeBadge(seller.grade) + '</td>'
        + '<td class="center">' + todayText + '</td>'
        + '<td class="center"><button class="btn small" type="button" data-remove-id="' + seller.id + '">공개해제</button></td>'
        + '</tr>';
    }).join('');

    byId('selectedTableWrap').style.display = selectedRows.length ? '' : 'none';
    byId('selectedEmpty').style.display = selectedRows.length ? 'none' : 'block';
    byId('selectedSelectAll').checked = selectedRows.length > 0 && selectedRows.every(function (seller) { return checkedSelectedIds.indexOf(seller.id) > -1; });
  }

  function hasChanges() {
    var saved = savedSelectedIds.slice().sort().join(',');
    var working = workingSelectedIds.slice().sort().join(',');
    return saved !== working;
  }

  function updateCounts() {
    var count = workingSelectedIds.length;
    byId('summarySelectedCount').textContent = count + '개';
    byId('selectedCountBadge').textContent = count + '개';
    byId('changeHint').textContent = hasChanges() ? '저장하지 않은 변경사항이 있습니다.' : '저장 전까지 추가 및 삭제 내용은 임시상태로 유지됩니다.';
  }

  function renderAll() {
    renderResultRows();
    renderSelectedRows();
    updateCounts();
  }

  function resetFilters() {
    ['filterName', 'filterGrade', 'filterCeo', 'filterManager', 'filterPhone'].forEach(function (id) { byId(id).value = ''; });
    byId('filterSido').value = '';
    updateSigunguOptions();
    pendingCheckedIds = [];
    currentPage = 1;
    renderAll();
  }

  function addCheckedSellers() {
    pendingCheckedIds.forEach(function (id) {
      var seller = getSeller(id);
      if (seller && isSelectable(seller)) uniquePush(workingSelectedIds, id);
    });
    pendingCheckedIds = [];
    renderAll();
  }

  function removeSelectedId(id) {
    workingSelectedIds = removeFrom(workingSelectedIds, id);
    pendingCheckedIds = removeFrom(pendingCheckedIds, id);
    checkedSelectedIds = removeFrom(checkedSelectedIds, id);
  }

  function releaseCheckedSelected() {
    checkedSelectedIds.slice().forEach(removeSelectedId);
    renderAll();
  }

  function resetChanges() {
    workingSelectedIds = savedSelectedIds.slice();
    pendingCheckedIds = [];
    checkedSelectedIds = [];
    selectedSortAsc = false;
    byId('selectedSearchName').value = '';
    renderAll();
  }

  function saveChanges() {
    savedSelectedIds = workingSelectedIds.slice();
    byId('lastSavedAt').textContent = '2026-07-13 15:00';
    updateCounts();
    window.msg('판매점 설정이 저장되었습니다.');
  }

  function setOptions(select, values, current) {
    select.innerHTML = values.map(function (value) {
      return '<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + '</option>';
    }).join('');
    select.value = current || values[0] || '';
  }

  function updateEditSigunguOptions(current) {
    var sido = byId('editSellerSido').value;
    var options = (regionMap[sido] || ['전체']).filter(function (value) { return value !== '전체'; });
    setOptions(byId('editSellerSigungu'), options, current);
  }

  function openSellerEditModal(id) {
    var seller = getSeller(id);
    if (!seller) return;
    byId('editSellerId').value = seller.id;
    byId('editSellerName').value = seller.name;
    setOptions(byId('editSellerGrade'), ['A등급', 'B등급', 'C등급', 'D등급'], seller.grade);
    setOptions(byId('editSellerSido'), Object.keys(regionMap).filter(Boolean), seller.sido);
    updateEditSigunguOptions(seller.sigungu);
    byId('editSellerCeo').value = seller.ceo;
    byId('editSellerManager').value = seller.manager;
    byId('editSellerPhone').value = seller.phone;
    byId('editSellerStatus').value = seller.status;
    byId('sellerEditModal').classList.add('open');
    byId('editSellerName').focus();
  }

  function closeSellerEditModal() {
    byId('sellerEditModal').classList.remove('open');
  }

  function saveSellerEdit() {
    var seller = getSeller(byId('editSellerId').value);
    if (!seller) return;
    seller.name = byId('editSellerName').value.trim() || seller.name;
    seller.grade = byId('editSellerGrade').value;
    seller.sido = byId('editSellerSido').value;
    seller.sigungu = byId('editSellerSigungu').value;
    seller.ceo = byId('editSellerCeo').value.trim();
    seller.manager = byId('editSellerManager').value.trim();
    seller.phone = byId('editSellerPhone').value.trim();
    seller.status = byId('editSellerStatus').value;
    if (!isSelectable(seller)) {
      pendingCheckedIds = removeFrom(pendingCheckedIds, seller.id);
      removeSelectedId(seller.id);
    }
    closeSellerEditModal();
    renderAll();
  }

  function requestSave() {
    if (workingSelectedIds.length === 0) {
      byId('zeroSaveModal').classList.add('open');
      return;
    }
    saveChanges();
  }

  function bindEvents() {
    byId('filterSido').addEventListener('change', function () {
      updateSigunguOptions();
    });
    byId('searchBtn').addEventListener('click', function () {
      currentPage = 1;
      renderAll();
    });
    byId('resetFilterBtn').addEventListener('click', resetFilters);
    byId('pageSizeSelect').addEventListener('change', function () {
      pageSize = Number(this.value);
      currentPage = 1;
      renderAll();
    });
    byId('resultSelectAll').addEventListener('change', function () {
      currentPageRows(filterSellers()).filter(isSelectable).forEach(function (seller) {
        if (byId('resultSelectAll').checked) uniquePush(pendingCheckedIds, seller.id);
        else pendingCheckedIds = removeFrom(pendingCheckedIds, seller.id);
      });
      renderAll();
    });
    byId('sellerResultRows').addEventListener('change', function (event) {
      if (!event.target.classList.contains('result-check')) return;
      var id = event.target.getAttribute('data-id');
      if (event.target.checked) uniquePush(pendingCheckedIds, id);
      else pendingCheckedIds = removeFrom(pendingCheckedIds, id);
      renderAll();
    });
    byId('sellerResultRows').addEventListener('click', function (event) {
      var id = event.target.getAttribute('data-edit-id');
      if (id) openSellerEditModal(id);
    });
    byId('resultPagination').addEventListener('click', function (event) {
      var page = event.target.getAttribute('data-page');
      if (!page) return;
      currentPage = Number(page);
      renderAll();
    });
    byId('addSelectedBtn').addEventListener('click', addCheckedSellers);
    byId('selectedSearchName').addEventListener('input', renderSelectedRows);
    byId('selectedSelectAll').addEventListener('change', function () {
      var visibleIds = Array.prototype.slice.call(document.querySelectorAll('.selected-check')).map(function (input) {
        return input.getAttribute('data-id');
      });
      visibleIds.forEach(function (id) {
        if (byId('selectedSelectAll').checked) uniquePush(checkedSelectedIds, id);
        else checkedSelectedIds = removeFrom(checkedSelectedIds, id);
      });
      renderSelectedRows();
    });
    byId('selectedSellerRows').addEventListener('change', function (event) {
      if (!event.target.classList.contains('selected-check')) return;
      var id = event.target.getAttribute('data-id');
      if (event.target.checked) uniquePush(checkedSelectedIds, id);
      else checkedSelectedIds = removeFrom(checkedSelectedIds, id);
      renderSelectedRows();
    });
    byId('selectedSellerRows').addEventListener('click', function (event) {
      var editId = event.target.getAttribute('data-edit-id');
      if (editId) {
        openSellerEditModal(editId);
        return;
      }
      var id = event.target.getAttribute('data-remove-id');
      if (!id) return;
      removeSelectedId(id);
      renderAll();
    });
    byId('releaseCheckedBtn').addEventListener('click', releaseCheckedSelected);
    byId('sortSelectedBtn').addEventListener('click', function () {
      selectedSortAsc = true;
      renderSelectedRows();
    });
    byId('resetChangesBtn').addEventListener('click', resetChanges);
    byId('saveBtn').addEventListener('click', requestSave);
    byId('topSaveBtn').addEventListener('click', requestSave);
    byId('cancelBtn').addEventListener('click', function () {
      if (!hasChanges() || confirm('저장하지 않은 변경사항이 있습니다. 페이지를 이동하시겠습니까?')) {
        location.href = 'product_detail.html';
      }
    });
    byId('zeroSaveCancelBtn').addEventListener('click', function () {
      byId('zeroSaveModal').classList.remove('open');
    });
    byId('zeroSaveConfirmBtn').addEventListener('click', function () {
      byId('zeroSaveModal').classList.remove('open');
      saveChanges();
    });
    byId('zeroSaveModal').addEventListener('click', function (event) {
      if (event.target.id === 'zeroSaveModal') byId('zeroSaveModal').classList.remove('open');
    });
    byId('editSellerSido').addEventListener('change', function () {
      updateEditSigunguOptions('');
    });
    byId('sellerEditCloseBtn').addEventListener('click', closeSellerEditModal);
    byId('sellerEditCancelBtn').addEventListener('click', closeSellerEditModal);
    byId('sellerEditSaveBtn').addEventListener('click', saveSellerEdit);
    byId('sellerEditModal').addEventListener('click', function (event) {
      if (event.target.id === 'sellerEditModal') closeSellerEditModal();
    });
    window.addEventListener('beforeunload', function (event) {
      if (!hasChanges()) return;
      event.preventDefault();
      event.returnValue = '저장하지 않은 변경사항이 있습니다. 페이지를 이동하시겠습니까?';
    });
  }

  setSidoOptions();
  updateSigunguOptions();
  bindEvents();
  renderAll();
})();
