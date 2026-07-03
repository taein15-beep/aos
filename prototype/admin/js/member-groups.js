(function () {
  var currentAdmin = { id: 'superadmin', name: '최고관리자', isSuperAdmin: true };
  var groupTypes = [
    { value: 'admin', name: '관리자/직원', order: 1, locked: true },
    { value: 'seller', name: '판매점', order: 2, locked: true },
    { value: 'partner', name: '거래처', order: 3, locked: true },
    { value: 'web', name: '웹회원', order: 4, locked: true }
  ];

  var groups = [
    { id: 'g1', type: 'admin', name: '최고관리자', code: 'SUPER_ADMIN', description: '전체 메뉴와 전체 데이터에 접근 가능한 시스템 최고 권한 그룹', isDefault: 'N', active: 'Y', members: 1, sort: 1, updatedAt: '2026-07-01', systemLocked: true },
    { id: 'g2', type: 'admin', name: '일반관리자', code: 'ADMIN_DEFAULT', description: '관리자/직원 기본 운영 권한 그룹', isDefault: 'N', active: 'Y', members: 4, sort: 2, updatedAt: '2026-06-30', systemLocked: true },
    { id: 'g3', type: 'admin', name: '예약관리팀', code: 'ADMIN_RESERVATION', description: '예약 현황과 예약 등록 업무 중심 권한', isDefault: 'N', active: 'Y', members: 3, sort: 3, updatedAt: '2026-06-28' },
    { id: 'g4', type: 'admin', name: '정산관리팀', code: 'ADMIN_ACCOUNTING', description: '판매점/거래처 정산과 인보이스 관리 권한', isDefault: 'N', active: 'Y', members: 2, sort: 4, updatedAt: '2026-06-26' },
    { id: 'g5', type: 'web', name: '일반 웹회원', code: 'WEB_DEFAULT', description: '일반 고객 회원 기본 그룹', isDefault: 'Y', active: 'Y', members: 248, sort: 10, updatedAt: '2026-06-25' },
    { id: 'g6', type: 'web', name: 'VIP 웹회원', code: 'WEB_VIP', description: '우수 고객 대상 혜택 그룹', isDefault: 'N', active: 'Y', members: 32, sort: 11, updatedAt: '2026-06-20' },
    { id: 'g7', type: 'seller', name: '기본 판매점', code: 'SELLER_DEFAULT', description: '판매점 가입 시 기본으로 부여되는 그룹', isDefault: 'Y', active: 'Y', members: 18, sort: 20, updatedAt: '2026-06-18' },
    { id: 'g8', type: 'seller', name: '우수 판매점', code: 'SELLER_PRIORITY', description: '우수 판매점 전용 운영 권한 그룹', isDefault: 'N', active: 'Y', members: 7, sort: 21, updatedAt: '2026-06-15' },
    { id: 'g9', type: 'partner', name: '기본 거래처', code: 'PARTNER_DEFAULT', description: '거래처 기본 접근 권한 그룹', isDefault: 'Y', active: 'Y', members: 12, sort: 30, updatedAt: '2026-06-14' }
  ];

  var accounts = [
    { id: 'a1', name: '김관리', login: 'superadmin', type: 'admin', groupId: 'g1', groupStatus: '전체 권한 적용', override: 'group', updatedAt: '2026-07-01' },
    { id: 'a2', name: '예약팀 박민지', login: 'reserve01', type: 'admin', groupId: 'g3', groupStatus: '예약관리팀 권한 적용', override: 'allow', updatedAt: '2026-06-28' },
    { id: 'a3', name: '정산팀 최정우', login: 'account01', type: 'admin', groupId: 'g4', groupStatus: '정산관리팀 권한 적용', override: 'group', updatedAt: '2026-06-26' },
    { id: 'a4', name: '제주로컬투어', login: 'jeju_seller', type: 'seller', groupId: 'g8', groupStatus: '우수 판매점 권한 적용', override: 'deny', updatedAt: '2026-06-25' },
    { id: 'a5', name: '해담정', login: 'partner_food01', type: 'partner', groupId: 'g9', groupStatus: '기본 거래처 권한 적용', override: 'group', updatedAt: '2026-06-21' }
  ];

  var menuTree = [
    { id: 'dashboard', name: '대시보드', children: [] },
    { id: 'product', name: '상품관리', children: [
      { id: 'product_list', name: '상품목록' },
      { id: 'product_register', name: '상품등록' },
      { id: 'price_setting', name: '요금설정' },
      { id: 'schedule_register', name: '일정표관리' }
    ] },
    { id: 'reservation', name: '예약관리', children: [
      { id: 'reservation_status', name: '예약현황' },
      { id: 'reservation_register', name: '예약등록' },
      { id: 'reservation_cancel', name: '예약취소관리' }
    ] },
    { id: 'member', name: '회원관리', children: [
      { id: 'web_member', name: '웹회원관리' },
      { id: 'admin_member', name: '관리자/직원관리' },
      { id: 'seller_member', name: '판매점관리' },
      { id: 'partner_member', name: '거래처관리' },
      { id: 'group_member', name: '그룹관리' }
    ] },
    { id: 'settlement', name: '정산관리', children: [
      { id: 'seller_settlement', name: '판매점정산' },
      { id: 'partner_settlement', name: '거래처정산' },
      { id: 'invoice', name: '인보이스관리' }
    ] },
    { id: 'statistics', name: '통계관리', children: [
      { id: 'product_stats', name: '상품별통계' },
      { id: 'seller_stats', name: '판매점별통계' },
      { id: 'reservation_stats', name: '예약통계' }
    ] },
    { id: 'board', name: '게시판관리', children: [] },
    { id: 'system', name: '시스템설정', children: [] }
  ];

  var selectedDeleteId = '';
  var selectedPermissionGroupId = '';
  var selectedPermissionTypeValue = '';
  var selectedAccountId = '';
  var draggingTypeValue = '';

  function $(id) { return document.getElementById(id); }
  function notify(message) { if (typeof window.msg === 'function') window.msg(message); else window.alert(message); }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"]/g, function (char) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]; }); }
  function badge(text, cls) { return '<span class="badge ' + cls + '">' + esc(text) + '</span>'; }
  function groupById(id) { return groups.find(function (group) { return group.id === id; }); }
  function canDelete(group) { return group && !group.systemLocked && Number(group.members || 0) < 1; }
  function typeByValue(value) { return groupTypes.find(function (type) { return type.value === value; }); }
  function typeName(value) { var type = typeByValue(value); return type ? type.name : value; }
  function typeOrder(value) { var type = typeByValue(value); return type ? Number(type.order || 99) : 99; }
  function typeBadgeClass(value) { return value === 'admin' ? 'b-blue' : value === 'web' ? 'b-green' : value === 'seller' ? 'b-purple' : 'b-orange'; }

  function deleteReason(group) {
    if (!group) return '그룹 정보를 찾을 수 없습니다.';
    if (group.systemLocked) return '시스템 보호 그룹은 삭제할 수 없습니다.';
    if (Number(group.members || 0) > 0) return '가입자가 있는 그룹은 삭제할 수 없습니다.';
    return '';
  }

  function groupPriority(group) { return group.systemLocked || group.isDefault === 'Y' ? 0 : 1; }
  function sortedGroups(list) {
    return list.slice().sort(function (a, b) {
      return typeOrder(a.type) - typeOrder(b.type)
        || groupPriority(a) - groupPriority(b)
        || a.name.localeCompare(b.name, 'ko');
    });
  }

  function renderTypeOptions() {
    var filterOptions = '<option value="">전체</option>' + groupTypes
      .slice()
      .sort(function (a, b) { return Number(a.order || 99) - Number(b.order || 99) || a.name.localeCompare(b.name, 'ko'); })
      .map(function (type) { return '<option value="' + esc(type.value) + '">' + esc(type.name) + '</option>'; })
      .join('');
    var formOptions = '<option value="">선택</option>' + filterOptions.replace('<option value="">전체</option>', '');
    $('filterType').innerHTML = filterOptions;
    $('groupType').innerHTML = formOptions;
  }

  function filteredGroups() {
    var type = $('filterType').value;
    var keyword = $('filterKeyword').value.trim().toLowerCase();
    return sortedGroups(groups.filter(function (group) {
      return (!keyword || group.name.toLowerCase().indexOf(keyword) >= 0) && (!type || group.type === type);
    }));
  }

  function groupBadges(group) {
    var html = '';
    if (group.systemLocked) html += badge('시스템 보호', 'b-red');
    if (group.isDefault === 'Y') html += badge('가입 기본', 'b-orange');
    return html ? '<span class="group-name-badges">' + html + '</span>' : '';
  }

  function renderGroups() {
    var rows = filteredGroups();
    $('groupCountText').textContent = '총 ' + rows.length + '개';
    $('groupRows').innerHTML = rows.map(function (group, index) {
      var locked = !canDelete(group);
      var lockTitle = locked ? deleteReason(group) : '삭제 가능';
      return '<tr>'
        + '<td class="center"><input type="checkbox" data-group-check="' + group.id + '" ' + (locked ? 'disabled title="' + esc(lockTitle) + '"' : '') + '></td>'
        + '<td class="center">' + (index + 1) + '</td>'
        + '<td class="center">' + badge(typeName(group.type), typeBadgeClass(group.type)) + '</td>'
        + '<td><div class="group-name-cell"><strong>' + esc(group.name) + '</strong>' + groupBadges(group) + '</div></td>'
        + '<td class="desc-cell">' + esc(group.description) + '</td>'
        + '<td class="center">' + Number(group.members || 0).toLocaleString() + '명</td>'
        + '<td class="center"><button class="status-toggle ' + (group.active === 'Y' ? 'active' : 'inactive') + '" type="button" role="switch" aria-checked="' + (group.active === 'Y' ? 'true' : 'false') + '" data-group-action="toggle-status" data-id="' + group.id + '"><span class="status-toggle-track"><span class="status-toggle-knob"></span></span><span class="status-toggle-text">' + (group.active === 'Y' ? '사용중' : '비활성') + '</span></button></td>'
        + '<td class="center"><button class="btn small" type="button" data-group-action="permission" data-id="' + group.id + '" ' + (group.type === 'web' ? 'title="웹회원 그룹은 관리자 메뉴 권한 대상이 아닙니다."' : '') + '>권한설정</button></td>'
        + '<td class="center"><button class="btn small" type="button" data-group-action="edit" data-id="' + group.id + '">수정</button></td>'
        + '<td class="center"><button class="btn small red" type="button" data-group-action="delete" data-id="' + group.id + '" ' + (locked ? 'disabled title="' + esc(lockTitle) + '"' : '') + '>삭제</button></td>'
        + '</tr>';
    }).join('') || '<tr><td colspan="10" class="empty">검색된 그룹이 없습니다.</td></tr>';
    $('checkAllGroups').checked = false;
  }

  function renderAccounts(groupId) {
    var list = groupId ? accounts.filter(function (account) { return account.groupId === groupId; }) : accounts;
    $('accountRows').innerHTML = list.map(function (account) {
      var overrideBadge = account.override === 'allow' ? badge('개별 허용', 'b-blue') : account.override === 'deny' ? badge('개별 차단', 'b-red') : badge('그룹권한 적용', 'b-gray');
      return '<tr>'
        + '<td><strong>' + esc(account.name) + '</strong></td>'
        + '<td>' + esc(account.login) + '</td>'
        + '<td class="center">' + badge(typeName(account.type), typeBadgeClass(account.type)) + '</td>'
        + '<td>' + esc(account.groupStatus) + '</td>'
        + '<td class="center">' + overrideBadge + '</td>'
        + '<td class="center">' + esc(account.updatedAt) + '</td>'
        + '<td class="center"><button class="btn small" type="button" data-group-action="account-permission" data-id="' + account.id + '">개별권한 설정</button></td>'
        + '</tr>';
    }).join('') || '<tr><td colspan="7" class="empty">소속 계정이 없습니다.</td></tr>';
  }

  function openModal(id) { $(id).classList.add('open'); $(id).setAttribute('aria-hidden', 'false'); }
  function closeModal(id) { $(id).classList.remove('open'); $(id).setAttribute('aria-hidden', 'true'); }

  function generateCode(type, name) {
    var prefix = { admin: 'ADMIN', seller: 'SELLER', partner: 'PARTNER', web: 'WEB' }[type] || 'GROUP';
    var slug = String(name || 'NEW').trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '').toUpperCase() || 'NEW';
    return prefix + '_' + slug + '_' + Date.now().toString().slice(-4);
  }

  function openGroupForm(group) {
    $('groupForm').reset();
    $('groupId').value = group ? group.id : '';
    $('groupModalTitle').textContent = group ? '그룹수정' : '그룹등록';
    $('groupType').value = group ? group.type : '';
    $('groupName').value = group ? group.name : '';
    $('groupCode').value = group ? group.code : '';
    $('groupDescription').value = group ? group.description : '';
    $('advancedGroupInfo').classList.add('hidden');
    document.querySelector('[data-group-action="toggle-advanced"]').textContent = '고급정보 보기';
    $('groupLockNotice').classList.toggle('hidden', !(group && group.systemLocked));
    openModal('groupModal');
  }

  function saveGroup(event) {
    event.preventDefault();
    var id = $('groupId').value || 'g' + Date.now();
    var existing = groupById(id);
    var type = $('groupType').value;
    var name = $('groupName').value.trim();
    var row = {
      id: id,
      type: type,
      name: name,
      code: existing ? existing.code : generateCode(type, name),
      description: $('groupDescription').value.trim(),
      isDefault: existing ? existing.isDefault : 'N',
      active: existing ? existing.active : 'Y',
      members: existing ? existing.members : 0,
      sort: existing ? existing.sort : 999,
      updatedAt: new Date().toISOString().slice(0, 10)
    };
    if (!row.type || !row.name) { notify('그룹유형과 그룹명은 필수입니다.'); return; }
    if (existing) { row.systemLocked = existing.systemLocked; Object.assign(existing, row); } else { groups.push(row); }
    closeModal('groupModal');
    renderGroups();
    notify('그룹 정보가 저장되었습니다.');
  }

  function openDelete(group) {
    selectedDeleteId = group.id;
    var reason = deleteReason(group);
    $('deleteMessage').textContent = group.name + ' 그룹을 삭제하시겠습니까?';
    $('deleteBlockReason').textContent = reason;
    $('deleteBlockReason').classList.toggle('hidden', !reason);
    $('confirmDeleteButton').disabled = !!reason;
    openModal('deleteModal');
  }

  function confirmDelete() {
    var group = groupById(selectedDeleteId);
    if (!canDelete(group)) { notify(deleteReason(group)); return; }
    groups = groups.filter(function (item) { return item.id !== selectedDeleteId; });
    selectedDeleteId = '';
    closeModal('deleteModal');
    renderGroups();
    notify('그룹이 삭제되었습니다.');
  }

  function defaultPermissionLevel(group, menuId) {
    if (group && group.code === 'SUPER_ADMIN') return 'edit';
    if (group && group.type === 'partner' && menuId.indexOf('settlement') >= 0) return 'read';
    if (menuId.indexOf('system') >= 0 && (!group || !group.systemLocked)) return 'none';
    return 'read';
  }

  function defaultTypePermissionLevel(typeValue, menuId) {
    if (typeValue === 'admin') return menuId.indexOf('system') >= 0 ? 'read' : 'edit';
    if (typeValue === 'seller' && (menuId.indexOf('settlement') >= 0 || menuId.indexOf('seller') >= 0 || menuId.indexOf('product') >= 0 || menuId.indexOf('reservation') >= 0)) return 'read';
    if (typeValue === 'partner' && (menuId.indexOf('partner') >= 0 || menuId.indexOf('settlement') >= 0)) return 'read';
    return menuId === 'dashboard' ? 'read' : 'none';
  }

  function typePermissionLevel(typeValue, menuId) {
    var type = typeByValue(typeValue);
    return type && type.permissions && type.permissions[menuId] ? type.permissions[menuId] : defaultTypePermissionLevel(typeValue, menuId);
  }

  function groupPermissionLevel(group, menuId) {
    if (group && group.permissions && group.permissions[menuId]) return group.permissions[menuId];
    if (group && group.code === 'SUPER_ADMIN') return 'edit';
    return group ? typePermissionLevel(group.type, menuId) : defaultPermissionLevel(group, menuId);
  }

  function accountPermissionLevel(account, group, menuId) {
    if (account && account.permissions && account.permissions[menuId]) return account.permissions[menuId];
    return groupPermissionLevel(group, menuId);
  }

  function renderPermissionTree(targetId, subject, scope) {
    $(targetId).innerHTML = menuTree.map(function (menu) { return renderNode(menu, subject, true, scope); }).join('');
  }

  function permissionLevelFor(menuId, subject, scope) {
    if (scope === 'type') return typePermissionLevel(subject.value, menuId);
    if (scope === 'account') return accountPermissionLevel(subject.account, subject.group, menuId);
    return groupPermissionLevel(subject, menuId);
  }

  function renderNode(menu, subject, isParent, scope) {
    var children = (menu.children || []).map(function (child) { return renderNode(child, subject, false, scope); }).join('');
    var level = permissionLevelFor(menu.id, subject, scope);
    return '<div class="permission-node ' + (isParent ? 'parent' : 'child') + '" data-node-id="' + menu.id + '">'
      + '<div class="permission-row simple">'
      + '<div class="permission-menu-title"><strong>' + esc(menu.name) + '</strong>' + (isParent && menu.children.length ? '<small>하위 ' + menu.children.length + '개</small>' : '') + '</div>'
      + permissionRadio(menu.id, 'none', '권한없음', level)
      + permissionRadio(menu.id, 'read', '읽기', level)
      + permissionRadio(menu.id, 'edit', '등록/수정', level)
      + '</div>'
      + (children ? '<div class="permission-children">' + children + '</div>' : '')
      + '</div>';
  }

  function permissionRadio(menuId, value, label, selected) {
    return '<label class="permission-radio"><input type="radio" name="perm_' + menuId + '" data-menu-id="' + menuId + '" value="' + value + '" ' + (selected === value ? 'checked' : '') + '> ' + label + '</label>';
  }

  function collectPermissions(rootId) {
    var permissions = {};
    $(rootId).querySelectorAll('input[type="radio"]:checked').forEach(function (input) {
      permissions[input.getAttribute('data-menu-id')] = input.value;
    });
    return permissions;
  }

  function applyBulkPermission(actionEl) {
    var value = actionEl.getAttribute('data-permission-value');
    var container = actionEl.closest('.tab-panel') || actionEl.closest('.modal-body');
    var tree = container ? container.querySelector('.permission-tree') : null;
    if (!tree || !value) return;
    tree.querySelectorAll('input[type="radio"][value="' + value + '"]').forEach(function (input) {
      input.checked = true;
    });
  }

  function renderBasicInfo(group) {
    $('groupBasicInfo').innerHTML = [
      ['그룹명', group.name + (group.systemLocked ? ' [시스템 보호]' : '') + (group.isDefault === 'Y' ? ' [가입 기본]' : '')],
      ['그룹유형', typeName(group.type)],
      ['설명', group.description || '-'],
      ['가입수', Number(group.members || 0).toLocaleString() + '명'],
      ['상태', group.active === 'Y' ? '사용중' : '비활성'],
      ['가입 기본 의미', '신규 계정 생성 또는 가입 승인 시 자동 적용되는 그룹']
    ].map(function (row) { return '<dt>' + esc(row[0]) + '</dt><dd>' + esc(row[1]) + '</dd>'; }).join('');
  }

  function setActiveTab(targetId) {
    document.querySelectorAll('.detail-tabs button').forEach(function (button) {
      button.classList.toggle('active', button.getAttribute('data-tab-target') === targetId);
    });
    document.querySelectorAll('.tab-panel').forEach(function (panel) {
      panel.classList.toggle('active', panel.id === targetId);
    });
  }

  function openPermission(group) {
    if (group.type === 'web') { openModal('webGroupNoticeModal'); return; }
    selectedPermissionGroupId = group.id;
    $('permGroupName').textContent = group.name;
    $('permGroupType').textContent = typeName(group.type);
    $('permissionNotice').textContent = '권한없음은 메뉴가 노출되지 않습니다. 읽기는 조회만 가능하며, 등록/수정은 데이터 생성과 수정이 가능합니다.';
    renderBasicInfo(group);
    renderPermissionTree('permissionTree', group, 'group');
    renderAccounts(group.id);
    renderHistory(group);
    setActiveTab('menuPermissionTab');
    openModal('permissionModal');
  }

  function renderHistory(group) {
    $('historyRows').innerHTML = [
      ['2026-07-01 09:30', 'superadmin', group.name, '권한 샘플 초기화', '-', '메뉴 권한 생성'],
      ['2026-06-29 16:12', 'admin01', group.name, '읽기 권한 조정', '일부 메뉴 조회 불가', '예약관리 읽기 허용'],
      ['2026-06-21 11:04', 'admin01', group.name, '위험 권한 검토', '삭제 허용', '삭제 제한']
    ].map(function (row) {
      return '<tr>' + row.map(function (cell) { return '<td>' + esc(cell) + '</td>'; }).join('') + '</tr>';
    }).join('');
  }

  function openAccountPermission(account) {
    var group = groupById(account.groupId);
    selectedAccountId = account.id;
    $('accountPermName').textContent = account.name;
    $('accountPermLogin').textContent = account.login;
    $('accountPermGroup').textContent = group ? group.name : '-';
    var radio = document.querySelector('input[name="accountOverrideMode"][value="' + account.override + '"]');
    if (radio) radio.checked = true;
    renderPermissionTree('accountPermissionTree', { account: account, group: group }, 'account');
    openModal('accountPermissionModal');
  }

  function saveAccountPermission() {
    var account = accounts.find(function (item) { return item.id === selectedAccountId; });
    var selected = document.querySelector('input[name="accountOverrideMode"]:checked');
    if (account && selected) {
      account.override = selected.value;
      account.permissions = selected.value === 'group' ? {} : collectPermissions('accountPermissionTree');
      account.updatedAt = new Date().toISOString().slice(0, 10);
      renderAccounts(selectedPermissionGroupId);
    }
    closeModal('accountPermissionModal');
    notify('개별권한 설정이 저장되었습니다.');
  }

  function resetFilters() {
    $('filterType').value = '';
    $('filterKeyword').value = '';
    renderGroups();
  }

  function bulkDelete() {
    var selected = Array.prototype.slice.call(document.querySelectorAll('[data-group-check]:checked')).map(function (input) {
      return input.getAttribute('data-group-check');
    });
    if (!selected.length) { notify('삭제할 그룹을 선택해 주세요.'); return; }
    groups = groups.filter(function (group) { return selected.indexOf(group.id) < 0 || !canDelete(group); });
    renderGroups();
    notify('삭제 가능한 선택 그룹을 삭제했습니다.');
  }

  function toggleAdvancedInfo() {
    var box = $('advancedGroupInfo');
    var open = box.classList.toggle('hidden') === false;
    document.querySelector('[data-group-action="toggle-advanced"]').textContent = open ? '고급정보 닫기' : '고급정보 보기';
  }

  function resetTypeForm() {
    $('groupTypeForm').reset();
    $('typeOriginalValue').value = '';
    $('typeValue').readOnly = false;
  }

  function renderGroupTypes() {
    $('typeRows').innerHTML = groupTypes
      .slice()
      .sort(function (a, b) { return Number(a.order || 99) - Number(b.order || 99) || a.name.localeCompare(b.name, 'ko'); })
      .map(function (type) {
        var usedCount = groups.filter(function (group) { return group.type === type.value; }).length;
        var canRemove = !type.locked && usedCount === 0;
        return '<tr draggable="true" data-type-row="' + esc(type.value) + '">'
          + '<td><span class="drag-handle" title="드래그로 순서 변경">&#9776;</span><strong>' + esc(type.name) + '</strong>' + (type.locked ? ' ' + badge('기본 그룹유형', 'b-gray') : '') + '</td>'
          + '<td>' + esc(type.value) + '</td>'
          + '<td class="center">' + usedCount + '개</td>'
          + '<td class="center"><button class="btn small blue" type="button" data-group-action="type-permission" data-type-value="' + esc(type.value) + '">권한설정</button></td>'
          + '<td class="center"><button class="btn small" type="button" data-group-action="edit-type" data-type-value="' + esc(type.value) + '">수정</button></td>'
          + '<td class="center"><button class="btn small red" type="button" data-group-action="delete-type" data-type-value="' + esc(type.value) + '" ' + (canRemove ? '' : 'disabled title="기본 그룹유형 또는 사용 중인 그룹유형은 삭제할 수 없습니다."') + '>삭제</button></td>'
          + '</tr>';
      }).join('');
  }

  function openTypeManager() {
    if (!currentAdmin.isSuperAdmin) {
      notify('그룹유형 추가 및 수정은 최고관리자만 가능합니다.');
      return;
    }
    resetTypeForm();
    renderGroupTypes();
    openModal('groupTypeModal');
  }

  function openTypePermission(value) {
    if (!currentAdmin.isSuperAdmin) {
      notify('그룹유형별 권한설정은 최고관리자만 가능합니다.');
      return;
    }
    var type = typeByValue(value);
    if (!type) return;
    selectedPermissionTypeValue = value;
    $('typePermName').textContent = type.name;
    $('typePermCode').textContent = type.value;
    renderPermissionTree('typePermissionTree', type, 'type');
    openModal('typePermissionModal');
  }

  function saveTypePermission() {
    var type = typeByValue(selectedPermissionTypeValue);
    if (!type) return;
    type.permissions = collectPermissions('typePermissionTree');
    closeModal('typePermissionModal');
    renderGroupTypes();
    notify('그룹유형 기본권한이 저장되었습니다. 해당 유형 그룹의 기본 권한으로 적용됩니다.');
  }

  function saveGroupType(event) {
    event.preventDefault();
    if (!currentAdmin.isSuperAdmin) {
      notify('그룹유형 추가 및 수정은 최고관리자만 가능합니다.');
      return;
    }
    var originalValue = $('typeOriginalValue').value;
    var value = $('typeValue').value.trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '').toLowerCase();
    var name = $('typeName').value.trim();
    if (!value || !name) {
      notify('그룹코드와 그룹유형을 입력해 주세요.');
      return;
    }
    var duplicate = groupTypes.some(function (type) { return type.value === value && type.value !== originalValue; });
    if (duplicate) {
      notify('이미 사용 중인 그룹코드입니다.');
      return;
    }
    var existing = originalValue ? typeByValue(originalValue) : null;
    if (existing) {
      existing.name = name;
      if (!existing.locked && existing.value !== value) {
        groups.forEach(function (group) { if (group.type === existing.value) group.type = value; });
        accounts.forEach(function (account) { if (account.type === existing.value) account.type = value; });
        existing.value = value;
      }
    } else {
      groupTypes.push({ value: value, name: name, order: nextTypeOrder(), locked: false });
    }
    renderTypeOptions();
    renderGroupTypes();
    renderGroups();
    resetTypeForm();
    notify('그룹유형이 저장되었습니다.');
  }

  function editGroupType(value) {
    if (!currentAdmin.isSuperAdmin) {
      notify('그룹유형 추가 및 수정은 최고관리자만 가능합니다.');
      return;
    }
    var type = typeByValue(value);
    if (!type) return;
    $('typeOriginalValue').value = type.value;
    $('typeValue').value = type.value;
    $('typeValue').readOnly = !!type.locked;
    $('typeName').value = type.name;
  }

  function deleteGroupType(value) {
    if (!currentAdmin.isSuperAdmin) {
      notify('그룹유형 추가 및 수정은 최고관리자만 가능합니다.');
      return;
    }
    var type = typeByValue(value);
    var usedCount = groups.filter(function (group) { return group.type === value; }).length;
    if (!type || type.locked || usedCount > 0) {
      notify('기본 그룹유형 또는 사용 중인 그룹유형은 삭제할 수 없습니다.');
      return;
    }
    groupTypes = groupTypes.filter(function (item) { return item.value !== value; });
    renderTypeOptions();
    renderGroupTypes();
    renderGroups();
    resetTypeForm();
    notify('그룹유형이 삭제되었습니다.');
  }

  function toggleStatus(group) {
    group.active = group.active === 'Y' ? 'N' : 'Y';
    group.updatedAt = new Date().toISOString().slice(0, 10);
    renderGroups();
    notify('상태가 변경되었습니다.');
  }

  function nextTypeOrder() {
    return groupTypes.reduce(function (max, type) { return Math.max(max, Number(type.order || 0)); }, 0) + 1;
  }

  function reorderGroupType(sourceValue, targetValue) {
    if (!sourceValue || !targetValue || sourceValue === targetValue) return;
    var ordered = groupTypes.slice().sort(function (a, b) {
      return Number(a.order || 99) - Number(b.order || 99) || a.name.localeCompare(b.name, 'ko');
    });
    var sourceIndex = ordered.findIndex(function (type) { return type.value === sourceValue; });
    var targetIndex = ordered.findIndex(function (type) { return type.value === targetValue; });
    if (sourceIndex < 0 || targetIndex < 0) return;
    var moved = ordered.splice(sourceIndex, 1)[0];
    ordered.splice(targetIndex, 0, moved);
    ordered.forEach(function (type, index) { type.order = index + 1; });
    groupTypes = ordered;
    renderTypeOptions();
    renderGroupTypes();
    renderGroups();
  }

  function handleTypeDragStart(event) {
    var row = event.target.closest('[data-type-row]');
    if (!row) return;
    draggingTypeValue = row.getAttribute('data-type-row');
    row.classList.add('dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', draggingTypeValue);
    }
  }

  function handleTypeDragOver(event) {
    var row = event.target.closest('[data-type-row]');
    if (!row) return;
    event.preventDefault();
    row.classList.add('drag-over');
  }

  function handleTypeDragLeave(event) {
    var row = event.target.closest('[data-type-row]');
    if (row) row.classList.remove('drag-over');
  }

  function handleTypeDrop(event) {
    var row = event.target.closest('[data-type-row]');
    if (!row) return;
    event.preventDefault();
    row.classList.remove('drag-over');
    reorderGroupType(draggingTypeValue || (event.dataTransfer && event.dataTransfer.getData('text/plain')), row.getAttribute('data-type-row'));
  }

  function handleTypeDragEnd(event) {
    var row = event.target.closest('[data-type-row]');
    if (row) row.classList.remove('dragging');
    document.querySelectorAll('[data-type-row].drag-over').forEach(function (item) { item.classList.remove('drag-over'); });
    draggingTypeValue = '';
  }

  function init() {
    renderTypeOptions();
    renderGroups();
    $('groupForm').addEventListener('submit', saveGroup);
    $('groupTypeForm').addEventListener('submit', saveGroupType);
    $('typeRows').addEventListener('dragstart', handleTypeDragStart);
    $('typeRows').addEventListener('dragover', handleTypeDragOver);
    $('typeRows').addEventListener('dragleave', handleTypeDragLeave);
    $('typeRows').addEventListener('drop', handleTypeDrop);
    $('typeRows').addEventListener('dragend', handleTypeDragEnd);
    if (!currentAdmin.isSuperAdmin) {
      var typeButton = document.querySelector('[data-group-action="open-type-manager"]');
      if (typeButton) typeButton.classList.add('hidden');
    }
    document.addEventListener('click', function (event) {
      var tabEl = event.target.closest('[data-tab-target]');
      if (tabEl) { setActiveTab(tabEl.getAttribute('data-tab-target')); return; }

      var actionEl = event.target.closest('[data-group-action]');
      if (!actionEl) return;
      var action = actionEl.getAttribute('data-group-action');
      var id = actionEl.getAttribute('data-id');
      var group = id ? groupById(id) : null;
      var account = id ? accounts.find(function (item) { return item.id === id; }) : null;

      if (action === 'open-create') openGroupForm();
      if (action === 'open-type-manager') openTypeManager();
      if (action === 'edit' && group) openGroupForm(group);
      if (action === 'toggle-status' && group) toggleStatus(group);
      if (action === 'delete' && group) openDelete(group);
      if (action === 'permission' && group) openPermission(group);
      if (action === 'type-permission') openTypePermission(actionEl.getAttribute('data-type-value'));
      if (action === 'account-permission' && account) openAccountPermission(account);
      if (action === 'search') renderGroups();
      if (action === 'reset') resetFilters();
      if (action === 'bulk-delete') bulkDelete();
      if (action === 'confirm-delete') confirmDelete();
      if (action === 'toggle-advanced') toggleAdvancedInfo();
      if (action === 'bulk-permission') applyBulkPermission(actionEl);
      if (action === 'reset-type-form') resetTypeForm();
      if (action === 'edit-type') editGroupType(actionEl.getAttribute('data-type-value'));
      if (action === 'delete-type') deleteGroupType(actionEl.getAttribute('data-type-value'));
      if (action === 'save-permission') {
        var selectedGroup = groupById(selectedPermissionGroupId);
        if (selectedGroup) selectedGroup.permissions = collectPermissions('permissionTree');
        closeModal('permissionModal');
        notify('그룹명별 권한 설정이 저장되었습니다.');
      }
      if (action === 'save-type-permission') saveTypePermission();
      if (action === 'save-account-permission') saveAccountPermission();
      if (action === 'close-group') closeModal('groupModal');
      if (action === 'close-delete') closeModal('deleteModal');
      if (action === 'close-type-manager') closeModal('groupTypeModal');
      if (action === 'close-type-permission') closeModal('typePermissionModal');
      if (action === 'close-permission') closeModal('permissionModal');
      if (action === 'close-account-permission') closeModal('accountPermissionModal');
      if (action === 'close-web-notice') closeModal('webGroupNoticeModal');
    });
    $('filterKeyword').addEventListener('keydown', function (event) { if (event.key === 'Enter') renderGroups(); });
    $('checkAllGroups').addEventListener('change', function () {
      document.querySelectorAll('[data-group-check]:not(:disabled)').forEach(function (input) { input.checked = $('checkAllGroups').checked; });
    });
  }

  document.addEventListener('DOMContentLoaded', function () { if (document.body.dataset.page === 'member_group_list') init(); });
})();
