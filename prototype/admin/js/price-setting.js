(function () {
  var STORAGE_KEY = 'aosPriceSettingCalendarData';
  var todayIso = '2026-07-13';
  var state = {};
  var viewDate = new Date(2026, 6, 1);
  var selectedDate = '';
  var selectedRateDates = [];
  var editingRateRuleId = '';
  var calendarOptions = { price: true, seat: true, status: true };
  var statusFilter = 'all';

  var personTypes = [
    { id: 'adult', name: '대인', price: 79000, enabled: true },
    { id: 'child', name: '소인', price: 79000, enabled: true },
    { id: 'infant', name: '유아', price: 0, enabled: false },
    { id: 'youth', name: '청소년', price: 0, enabled: false },
    { id: 'senior', name: '경로', price: 0, enabled: false }
  ];

  var stayTypes = [
    { id: 'room2', name: '2인1실' },
    { id: 'room3', name: '3인1실' },
    { id: 'room4', name: '4인1실' }
  ];

  var weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  var departureStatuses = {
    undecided: '미확정',
    confirmed: '출발확정',
    cancelled: '출발취소'
  };
  var bookingStatuses = {
    available: '예약가능',
    waiting: '대기접수',
    closed: '예약마감'
  };
  var defaultRuleColors = ['#fff4de', '#eaf1ff', '#e7f8ee', '#f5e8ff', '#ffe8ef', '#e8f7ff'];
  var oldStatusMap = {
    NS: '출발안함',
    AV: '예약가능',
    CF: '출발확정',
    CL: '예약마감',
    WL: '대기'
  };

  function defaultState() {
    return {
      rateRules: [
        {
          id: 'holiday-chuseok',
          priority: 1,
          title: '추석연휴',
          color: '#fff4de',
          applyType: 'dates',
          selectedDates: ['2026-09-24', '2026-09-25'],
          days: [],
          departureStatus: 'undecided',
          bookingStatus: 'available',
          confirmMinCount: 2,
          bookingMaxCount: 30,
          prices: priceSet(365000, 345000, 360000, 340000, 355000, 335000)
        },
        {
          id: 'summer-weekend',
          priority: 2,
          title: '성수기요금',
          color: '#eaf1ff',
          applyType: 'period',
          startDate: '2026-07-01',
          endDate: '2026-12-31',
          selectedDates: [],
          days: ['토', '일'],
          departureStatus: 'undecided',
          bookingStatus: 'available',
          confirmMinCount: 2,
          bookingMaxCount: 30,
          prices: priceSet(120000, 110000, 115000, 105000, 110000, 100000)
        }
      ],
      optionGroups: [
        { id: 'dokdo', order: 1, name: '독도 선택관광', calcType: 'per_selected_person', required: false, items: [{ id: 1, name: '독도', price: 30000, enabled: true }, { id: 2, name: '관음도', price: 10000, enabled: true }] },
        { id: 'pool', order: 2, name: '온수풀 변경', calcType: 'per_all_people', required: true, items: [{ id: 1, name: '온수풀', price: 10000, enabled: true }] }
      ],
      reservations: {
        '2026-07-04': 5,
        '2026-07-05': 8,
        '2026-07-11': 11,
        '2026-07-12': 30,
        '2026-07-15': 8,
        '2026-07-18': 16,
        '2026-07-19': 23,
        '2026-09-24': 18,
        '2026-09-25': 26
      },
      overrides: {}
    };
  }

  function priceSet(r2Adult, r2Child, r3Adult, r3Child, r4Adult, r4Child) {
    return {
      room2: { adult: r2Adult, child: r2Child },
      room3: { adult: r3Adult, child: r3Child },
      room4: { adult: r4Adult, child: r4Child }
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function money(value) {
    return Number(value || 0).toLocaleString('ko-KR');
  }

  function num(value) {
    return Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
  }

  function isHexColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || ''));
  }

  function ruleColor(value, index) {
    return isHexColor(value) ? value : defaultRuleColors[(index || 0) % defaultRuleColors.length];
  }

  function iso(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function parseIso(value) {
    var parts = String(value).split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function dateLabel(value) {
    var date = parseIso(value);
    return date.getFullYear() + '년 ' + (date.getMonth() + 1) + '월 ' + date.getDate() + '일';
  }

  function activePeople() {
    return personTypes.filter(function (person) { return person.enabled; });
  }

  function setMessage(id, text, isError) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('show', !!text);
    el.classList.toggle('error', !!isError);
  }

  window.msg = function (text) {
    setMessage('calendarMessage', text, false);
    setTimeout(function () { setMessage('calendarMessage', '', false); }, 2200);
  };

  function loadState() {
    var base = defaultState();
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      state = Object.assign(base, saved || {});
      state.rateRules = Array.isArray(saved.rateRules) ? saved.rateRules : base.rateRules;
      state.rateRules.forEach(function (rule, index) {
        if (!isHexColor(rule.color)) rule.color = defaultRuleColors[index % defaultRuleColors.length];
      });
      state.optionGroups = Array.isArray(saved.optionGroups) ? saved.optionGroups : base.optionGroups;
      state.reservations = Object.assign(base.reservations, saved.reservations || {});
      state.overrides = saved.overrides || {};
    } catch (error) {
      state = base;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      rateRules: state.rateRules,
      optionGroups: state.optionGroups,
      reservations: state.reservations,
      overrides: state.overrides
    }));
  }

  function basePriceSource() {
    return {
      title: '기본요금',
      sourceType: 'base',
      sourceLabel: '기본요금',
      ruleColor: '',
      prices: priceSet(79000, 79000, 79000, 79000, 79000, 79000),
      totalSeats: 30,
      blockedSeats: 0,
      departureStatus: 'undecided',
      bookingStatus: 'available',
      confirmMinCount: 2,
      bookingMaxCount: 30
    };
  }

  function ruleMatchesDate(rule, dateIso) {
    if (rule.applyType === 'dates') return (rule.selectedDates || []).indexOf(dateIso) >= 0;
    if (!rule.startDate || !rule.endDate || dateIso < rule.startDate || dateIso > rule.endDate) return false;
    var day = weekdays[parseIso(dateIso).getDay()];
    return !rule.days || !rule.days.length || rule.days.indexOf(day) >= 0;
  }

  function ruleSource(dateIso) {
    var matched = state.rateRules
      .filter(function (rule) { return ruleMatchesDate(rule, dateIso); })
      .sort(function (a, b) { return Number(a.priority || 999) - Number(b.priority || 999); })[0];
    if (!matched) return basePriceSource();
    return {
      title: matched.title,
      sourceType: matched.applyType === 'dates' ? 'dateRule' : 'periodRule',
      sourceLabel: matched.title,
      ruleColor: ruleColor(matched.color, Number(matched.priority || 1) - 1),
      prices: clone(matched.prices),
      totalSeats: 30,
      blockedSeats: 0,
      departureStatus: matched.departureStatus || 'undecided',
      bookingStatus: matched.bookingStatus || 'available',
      confirmMinCount: matched.confirmMinCount || 2,
      bookingMaxCount: matched.bookingMaxCount || 30
    };
  }

  function departureData(dateIso) {
    var source = ruleSource(dateIso);
    var override = state.overrides[dateIso];
    var data = Object.assign({}, source, override || {});
    data.prices = override && override.prices ? clone(override.prices) : clone(source.prices);
    data.date = dateIso;
    data.bookedSeats = Number(state.reservations[dateIso] || 0);
    data.totalSeats = Number(data.totalSeats || 30);
    data.blockedSeats = Number(data.blockedSeats || 0);
    data.remainingSeats = data.totalSeats - data.bookedSeats - data.blockedSeats;
    if (data.remainingSeats <= 0 || data.departureStatus === 'cancelled') data.bookingStatus = 'closed';
    if (data.bookedSeats >= Number(data.confirmMinCount || 2) && data.departureStatus === 'undecided') data.departureStatus = 'confirmed';
    data.isOverride = !!override;
    data.sourceLabel = override ? '개별수정' : source.sourceLabel;
    data.sourceType = override ? 'override' : source.sourceType;
    return data;
  }

  function hasDeparture(dateIso) {
    var day = parseIso(dateIso).getDay();
    return day === 0 || day === 3 || day === 5 || day === 6 || !!state.overrides[dateIso] || !!state.reservations[dateIso] || !!state.rateRules.some(function (rule) { return ruleMatchesDate(rule, dateIso); });
  }

  function primaryStatus(data) {
    if (data.departureStatus === 'cancelled') return 'cancelled';
    if (data.bookingStatus === 'closed') return 'closed';
    if (data.departureStatus === 'confirmed') return 'confirmed';
    if (data.bookingStatus === 'waiting') return 'waiting';
    return 'available';
  }

  function statusText(key) {
    if (key === 'cancelled') return '취소';
    if (key === 'closed') return '예약마감';
    if (key === 'confirmed') return '출발확정';
    if (key === 'waiting') return '대기';
    return '예약가능';
  }

  function renderBase() {
    var el = document.getElementById('basePriceGrid');
    if (!el) return;
    el.innerHTML = personTypes.map(function (person) {
      return '<div class="field"><label>' + person.name + '</label><input readonly ' + (person.enabled ? '' : 'disabled') + ' value="' + (person.enabled ? money(person.price) + '원' : '사용안함') + '"></div>';
    }).join('');
  }

  function renderRateTable() {
    var head = document.getElementById('rateHead');
    var body = document.getElementById('rateBody');
    if (!head || !body) return;
    head.innerHTML = ['우선순위', '적용구분', '요일', '적용기간', '상태', '대인', '소아', '배경색', '삭제'].map(function (h) { return '<th>' + h + '</th>'; }).join('');
    body.innerHTML = state.rateRules
      .slice()
      .sort(function (a, b) { return a.priority - b.priority; })
      .map(function (rule, index) {
        var statusKey = rule.bookingStatus === 'closed' ? 'closed' : rule.departureStatus === 'confirmed' ? 'confirmed' : 'available';
        return '<tr>' +
          '<td class="center">' + rule.priority + '</td>' +
          '<td><a class="rate-title-link" href="price_setting.html?rateRuleId=' + encodeURIComponent(rule.id) + '#rate-detail" data-rate-id="' + rule.id + '">' + rule.title + '</a></td>' +
          '<td>' + ((rule.days && rule.days.length) ? rule.days.join(', ') : '-') + '</td>' +
          '<td>' + periodText(rule) + '</td>' +
          '<td class="center"><span class="status-pill status-' + statusKey + '">' + statusText(statusKey) + '</span></td>' +
          '<td class="money">' + money((rule.prices.room2 || {}).adult) + '원</td>' +
          '<td class="money">' + money((rule.prices.room2 || {}).child) + '원</td>' +
          '<td class="center"><label class="rate-color-cell"><input class="rate-row-color" type="color" value="' + ruleColor(rule.color, index) + '" data-rate-id="' + rule.id + '" aria-label="' + rule.title + ' 배경색"><span>' + ruleColor(rule.color, index) + '</span></label></td>' +
          '<td class="center"><button class="btn small red delete-rate-btn" type="button" data-rate-id="' + rule.id + '">삭제</button></td>' +
          '</tr>';
      }).join('');
  }

  function handleRateRuleRoute() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('rateRuleId');
    if (!id) return;
    var link = Array.prototype.slice.call(document.querySelectorAll('.rate-title-link')).find(function (item) {
      return String(item.dataset.rateId) === String(id);
    });
    if (!link) return;
    var row = link.closest('tr');
    if (row) {
      row.classList.add('rate-rule-focused');
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    var rule = state.rateRules.find(function (item) { return String(item.id) === String(id); });
    if (rule) {
      msg('선택한 날짜별 요금 항목: ' + rule.title);
    }
  }

  function periodText(rule) {
    if (rule.applyType === 'dates') return (rule.selectedDates || []).map(function (date) { return '<span class="tag">' + date + '</span>'; }).join('');
    return rule.startDate + ' ~ ' + rule.endDate;
  }

  function renderOptions() {
    var body = document.getElementById('optionBody');
    if (!body) return;
    body.innerHTML = state.optionGroups
      .slice()
      .sort(function (a, b) { return a.order - b.order; })
      .map(function (group) {
        return '<tr>' +
          '<td class="center">' + group.order + '</td>' +
          '<td>' + group.name + '</td>' +
          '<td><div class="option-tags">' + group.items.map(function (item) { return '<span>' + item.name + ' +' + money(item.price) + '원</span>'; }).join('') + '</div></td>' +
          '<td>' + calcName(group.calcType) + '</td>' +
          '<td>' + (group.required ? '필수' : '선택') + '</td>' +
          '<td class="center"><button class="btn small red delete-option-btn" type="button" data-option-id="' + group.id + '">삭제</button></td>' +
          '</tr>';
      }).join('');
  }

  function renderPreviewInputs() {
    var staySelect = document.getElementById('previewStayType');
    var peopleBox = document.getElementById('previewPeople');
    var optionBox = document.getElementById('previewOptions');
    if (!staySelect || !peopleBox || !optionBox) return;
    staySelect.innerHTML = stayTypes.map(function (stay) {
      return '<option value="' + stay.id + '">' + stay.name + '</option>';
    }).join('');
    peopleBox.innerHTML = activePeople().map(function (person) {
      var defaultCount = person.id === 'adult' ? 2 : person.id === 'child' ? 1 : 0;
      return '<div class="field"><label for="cnt_' + person.id + '">' + person.name + ' 인원</label><input id="cnt_' + person.id + '" type="number" min="0" value="' + defaultCount + '"></div>';
    }).join('');
    optionBox.innerHTML = state.optionGroups.map(function (group) {
      var options = group.items.filter(function (item) { return item.enabled; }).map(function (item) {
        return '<option value="' + item.id + '">' + item.name + ' +' + money(item.price) + '원</option>';
      }).join('');
      return '<div class="field preview-option-field"><label for="opt_' + group.id + '">' + group.name + ' (' + calcName(group.calcType) + ')</label><select id="opt_' + group.id + '"><option value="">선택안함</option>' + options + '</select>' +
        (group.calcType === 'per_selected_person' ? '<input id="optCnt_' + group.id + '" type="number" min="0" value="1" aria-label="' + group.name + ' 선택 인원">' : '') +
        '</div>';
    }).join('');
  }

  function calcName(value) {
    if (value === 'per_booking') return '예약건당 1회';
    if (value === 'per_selected_person') return '선택인원별';
    return '전체인원 자동적용';
  }

  window.calculatePreview = function () {
    var date = document.getElementById('previewDate').value;
    var stay = document.getElementById('previewStayType').value;
    var result = document.getElementById('previewResult');
    if (!date) return msg('출발일을 선택하세요.');
    if (!stay) return msg('숙박타입을 선택하세요.');
    var data = departureData(date);
    var totalPeople = 0;
    var sum = 0;
    var lines = [];
    activePeople().forEach(function (person) {
      var countInput = document.getElementById('cnt_' + person.id);
      var count = Number(countInput ? countInput.value : 0) || 0;
      totalPeople += count;
      if (!count) return;
      var unit = Number((data.prices[stay] || data.prices.room2 || {})[person.id] || 0);
      var lineTotal = unit * count;
      sum += lineTotal;
      lines.push('<div class="calc-line"><span>' + person.name + ' ' + count + '명 × ' + money(unit) + '원</span><strong>' + money(lineTotal) + '원</strong></div>');
    });
    if (!totalPeople) return msg('전체 예약인원이 0명입니다.');
    var optionLines = [];
    state.optionGroups.forEach(function (group) {
      var select = document.getElementById('opt_' + group.id);
      if (!select || !select.value) return;
      var item = group.items.find(function (row) { return String(row.id) === String(select.value); });
      if (!item) return;
      var count = group.calcType === 'per_booking' ? 1 : group.calcType === 'per_all_people' ? totalPeople : Number(document.getElementById('optCnt_' + group.id).value || 0);
      var optionTotal = item.price * count;
      sum += optionTotal;
      optionLines.push('<div class="calc-line"><span>' + item.name + ' ' + count + (group.calcType === 'per_booking' ? '회' : '명') + ' × ' + money(item.price) + '원</span><strong>' + money(optionTotal) + '원</strong></div>');
    });
    var warnings = [];
    if (data.bookingStatus === 'closed') warnings.push('예약마감 상태입니다.');
    if (data.departureStatus === 'cancelled') warnings.push('출발취소 상태입니다.');
    if (totalPeople > data.remainingSeats) warnings.push('선택 인원이 잔여좌석보다 많습니다.');
    result.innerHTML = warnings.map(function (warning) { return '<div class="warn">' + warning + '</div>'; }).join('') +
      '<div><strong>적용요금:</strong> ' + data.sourceLabel + '</div>' +
      '<div><strong>상태:</strong> ' + statusText(primaryStatus(data)) + '</div>' +
      '<div><strong>숙박타입:</strong> ' + (stayTypes.find(function (row) { return row.id === stay; }) || {}).name + '</div>' +
      '<div class="calc-box">' + lines.join('') + '</div>' +
      '<h4>선택옵션</h4><div class="calc-box">' + (optionLines.join('') || '<span class="hint">선택된 옵션이 없습니다.</span>') + '</div>' +
      '<div class="total"><span>총금액</span><strong>' + money(sum) + '원</strong></div>';
  };

  function renderCalendar() {
    var grid = document.getElementById('departureCalendar');
    var title = document.getElementById('calendarTitle');
    var picker = document.getElementById('calendarMonthPicker');
    if (!grid || !title) return;
    var year = viewDate.getFullYear();
    var month = viewDate.getMonth();
    title.textContent = year + '년 ' + (month + 1) + '월';
    if (picker) picker.value = year + '-' + String(month + 1).padStart(2, '0');
    var firstDay = new Date(year, month, 1).getDay();
    var lastDay = new Date(year, month + 1, 0).getDate();
    var cells = [];
    for (var blank = 0; blank < firstDay; blank++) {
      cells.push(renderEmptyDay());
    }
    for (var day = 1; day <= lastDay; day++) {
      cells.push(renderDay(new Date(year, month, day), month));
    }
    var trailingBlanks = (7 - (cells.length % 7)) % 7;
    for (var tail = 0; tail < trailingBlanks; tail++) {
      cells.push(renderEmptyDay());
    }
    grid.innerHTML = cells.join('');
  }

  function renderEmptyDay() {
    return '<div class="calendar-day calendar-empty" aria-hidden="true"></div>';
  }

  function renderDay(date, activeMonth) {
    var dateIso = iso(date);
    var inMonth = date.getMonth() === activeMonth;
    var available = hasDeparture(dateIso);
    var data = departureData(dateIso);
    var status = primaryStatus(data);
    var hidden = statusFilter !== 'all' && statusFilter !== status;
    var classes = ['calendar-day'];
    if (!inMonth) classes.push('other-month');
    if (!available) classes.push('no-departure');
    if (dateIso === todayIso) classes.push('today');
    if (dateIso === selectedDate) classes.push('selected');
    if (hidden) classes.push('hidden-by-option');
    var disabled = available ? '' : ' aria-disabled="true"';
    var dateAttr = available ? ' data-date="' + dateIso + '"' : '';
    var styleAttr = available && data.ruleColor ? ' style="background-color:' + data.ruleColor + '"' : '';
    var statusLine = calendarOptions.status ? '<span class="status-pill status-' + status + '">' + statusText(status) + '</span>' : '';
    var priceLine = calendarOptions.price ? '<span class="day-price">대인 <strong>' + money(data.prices.room2.adult) + '원</strong></span><span class="day-price">소아 ' + money(data.prices.room2.child) + '원</span>' : '';
    var seatLine = calendarOptions.seat ? '<span class="day-seat">잔여 <strong>' + data.remainingSeats + '</strong> / 총 ' + data.totalSeats + '석</span><span class="day-booked">예약 ' + data.bookedSeats + '명</span>' + (data.blockedSeats ? '<span>판매제외 ' + data.blockedSeats + '석</span>' : '') : '';
    var source = available ? '<span class="source-badge">' + data.sourceLabel + '</span>' : '';
    return '<button type="button" class="' + classes.join(' ') + '"' + dateAttr + disabled + styleAttr + '>' +
      '<span class="day-top"><span class="day-number">' + date.getDate() + '</span>' + source + '</span>' +
      (available ? '<span class="day-lines">' + statusLine + priceLine + seatLine + '</span>' : '<span class="hint">출발일 없음</span>') +
      '</button>';
  }

  function renderDetail(dateIso) {
    var modal = document.getElementById('dateDetailModal');
    var empty = document.getElementById('detailEmpty');
    var form = document.getElementById('detailForm');
    if (!dateIso || !form || !empty) return;
    var data = departureData(dateIso);
    if (modal) modal.classList.add('open');
    empty.style.display = 'none';
    form.classList.add('open');
    document.getElementById('detailTitle').textContent = dateLabel(dateIso) + ' 출발 설정';
    document.getElementById('detailDateText').textContent = dateLabel(dateIso);
    document.getElementById('detailSourceText').textContent = data.sourceLabel;
    document.getElementById('detailOverrideText').textContent = data.isOverride ? '개별수정' : '기본 적용';
    document.getElementById('detailUpdatedText').textContent = data.updatedAt || '-';
    document.getElementById('detailAdultPrice').value = money(data.prices.room2.adult);
    document.getElementById('detailChildPrice').value = money(data.prices.room2.child);
    document.getElementById('detailTotalSeats').value = data.totalSeats;
    document.getElementById('detailBookedSeats').value = data.bookedSeats;
    document.getElementById('detailBlockedSeats').value = data.blockedSeats;
    document.getElementById('detailRemainingSeats').value = data.remainingSeats;
    document.getElementById('detailDepartureStatus').value = data.departureStatus;
    document.getElementById('detailBookingStatus').value = data.bookingStatus;
    document.getElementById('detailNotifyConfirm').checked = !!data.notifyConfirm;
    document.getElementById('detailNotifyCancel').checked = !!data.notifyCancel;
    document.getElementById('detailAdminMemo').value = data.memo || '';
    document.getElementById('detailNotice').textContent = dateIso < todayIso ? '지난 출발일입니다. 프로토타입에서는 수정 가능하지만 실제 운영에서는 별도 권한 확인이 필요합니다.' : '';
    document.getElementById('detailNotice').style.display = dateIso < todayIso ? 'block' : 'none';
    setMessage('detailMessage', '', false);
    updateRemainingSeats();
    document.getElementById('detailAdultPrice').focus();
  }

  function renderStatusSelects() {
    fillSelect('detailDepartureStatus', departureStatuses);
    fillSelect('bulkDepartureStatus', departureStatuses, true);
    fillSelect('detailBookingStatus', bookingStatuses);
    fillSelect('bulkBookingStatus', bookingStatuses, true);
  }

  function fillSelect(id, map, includeBlank) {
    var el = document.getElementById(id);
    if (!el) return;
    var html = includeBlank ? '<option value="">변경 안함</option>' : '';
    html += Object.keys(map).map(function (key) { return '<option value="' + key + '">' + map[key] + '</option>'; }).join('');
    el.innerHTML = html;
  }

  function renderBulkWeekdays() {
    var el = document.getElementById('bulkWeekdays');
    if (!el) return;
    el.innerHTML = weekdays.map(function (day, index) {
      return '<label><input type="checkbox" value="' + index + '" checked>' + day + '</label>';
    }).join('');
  }

  function updateRemainingSeats() {
    var total = Number(document.getElementById('detailTotalSeats').value || 0);
    var booked = Number(document.getElementById('detailBookedSeats').value || 0);
    var blocked = Number(document.getElementById('detailBlockedSeats').value || 0);
    var remaining = total - booked - blocked;
    document.getElementById('detailRemainingSeats').value = remaining;
    var error = document.getElementById('detailSeatError');
    if (total < booked) {
      error.textContent = '총 판매좌석은 현재 예약인원보다 적게 설정할 수 없습니다.';
      error.classList.add('show');
    } else if (remaining < 0) {
      error.textContent = '판매제외 좌석 때문에 잔여좌석이 음수가 됩니다.';
      error.classList.add('show');
    } else {
      error.textContent = '';
      error.classList.remove('show');
    }
    if (remaining <= 0) document.getElementById('detailBookingStatus').value = 'closed';
  }

  window.moveMonth = function (amount) {
    viewDate.setMonth(viewDate.getMonth() + amount);
    renderCalendar();
  };

  window.goToday = function () {
    viewDate = parseIso(todayIso);
    viewDate.setDate(1);
    renderCalendar();
  };

  window.setCalendarStatusFilter = function (value) {
    statusFilter = value;
    renderCalendar();
  };

  window.toggleCalendarOption = function (key, checked) {
    calendarOptions[key] = checked;
    renderCalendar();
  };

  window.selectDate = function (dateIso) {
    if (!hasDeparture(dateIso)) return;
    selectedDate = dateIso;
    renderCalendar();
    renderDetail(dateIso);
  };

  window.closeDetailPanel = function () {
    selectedDate = '';
    var modal = document.getElementById('dateDetailModal');
    var empty = document.getElementById('detailEmpty');
    var form = document.getElementById('detailForm');
    if (modal) modal.classList.remove('open');
    if (empty) empty.style.display = 'grid';
    if (form) form.classList.remove('open');
    renderCalendar();
  };

  window.adjustPrices = function (amount) {
    ['detailAdultPrice', 'detailChildPrice'].forEach(function (id) {
      var el = document.getElementById(id);
      el.value = money(Math.max(0, num(el.value) + amount));
    });
  };

  window.saveDateDetail = function () {
    if (!selectedDate) return;
    var total = Number(document.getElementById('detailTotalSeats').value || 0);
    var booked = Number(document.getElementById('detailBookedSeats').value || 0);
    var blocked = Number(document.getElementById('detailBlockedSeats').value || 0);
    if (total < booked) return setMessage('detailMessage', '총 판매좌석은 현재 예약인원보다 적게 설정할 수 없습니다.', true);
    if (total - booked - blocked < 0) return setMessage('detailMessage', '판매제외 좌석 때문에 잔여좌석이 음수가 됩니다.', true);
    var current = departureData(selectedDate);
    var bookingStatus = document.getElementById('detailBookingStatus').value;
    var departureStatus = document.getElementById('detailDepartureStatus').value;
    if (departureStatus === 'cancelled') bookingStatus = 'closed';
    var remaining = total - booked - blocked;
    if (remaining <= 0) bookingStatus = 'closed';
    state.overrides[selectedDate] = {
      prices: priceSet(num(document.getElementById('detailAdultPrice').value), num(document.getElementById('detailChildPrice').value), num(document.getElementById('detailAdultPrice').value), num(document.getElementById('detailChildPrice').value), num(document.getElementById('detailAdultPrice').value), num(document.getElementById('detailChildPrice').value)),
      totalSeats: total,
      blockedSeats: blocked,
      departureStatus: departureStatus,
      bookingStatus: bookingStatus,
      notifyConfirm: document.getElementById('detailNotifyConfirm').checked,
      notifyCancel: document.getElementById('detailNotifyCancel').checked,
      memo: document.getElementById('detailAdminMemo').value.trim(),
      updatedAt: new Date().toLocaleString('ko-KR'),
      sourceTitle: current.sourceLabel
    };
    saveState();
    setMessage('detailMessage', '변경사항이 저장되었습니다.', false);
    renderCalendar();
    renderDetail(selectedDate);
  };

  window.cancelDateEdit = function () {
    if (selectedDate) renderDetail(selectedDate);
  };

  window.resetDateOverride = function () {
    if (!selectedDate) return;
    delete state.overrides[selectedDate];
    saveState();
    renderCalendar();
    renderDetail(selectedDate);
    setMessage('detailMessage', '개별 수정값을 제거하고 기본 요금을 다시 적용했습니다.', false);
  };

  window.openBulkModal = function () {
    document.getElementById('bulkModal').classList.add('open');
    document.getElementById('bulkStartDate').value = iso(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1));
    document.getElementById('bulkEndDate').value = iso(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0));
    setMessage('bulkMessage', '', false);
    updateBulkSummary();
    document.getElementById('bulkStartDate').focus();
  };

  window.closeBulkModal = function () {
    document.getElementById('bulkModal').classList.remove('open');
  };

  window.updateBulkSummary = function () {
    var dates = bulkDates();
    var start = document.getElementById('bulkStartDate').value;
    var end = document.getElementById('bulkEndDate').value;
    var days = selectedBulkDayNames().join(', ') || '선택 요일 없음';
    document.getElementById('bulkSummary').textContent = start + '부터 ' + end + '까지 ' + days + ' 총 ' + dates.length + '개 출발일에 적용합니다.';
  };

  function selectedBulkDayNames() {
    return Array.prototype.slice.call(document.querySelectorAll('#bulkWeekdays input:checked')).map(function (input) {
      return weekdays[Number(input.value)];
    });
  }

  function bulkDates() {
    var start = document.getElementById('bulkStartDate').value;
    var end = document.getElementById('bulkEndDate').value;
    if (!start || !end || start > end) return [];
    var selectedDays = Array.prototype.slice.call(document.querySelectorAll('#bulkWeekdays input:checked')).map(function (input) { return Number(input.value); });
    var out = [];
    for (var date = parseIso(start); iso(date) <= end; date.setDate(date.getDate() + 1)) {
      var dateIso = iso(date);
      if (selectedDays.indexOf(date.getDay()) < 0) continue;
      if (!hasDeparture(dateIso)) continue;
      if (document.getElementById('bulkExcludeOverride').checked && state.overrides[dateIso]) continue;
      if (document.getElementById('bulkExcludeCancelled').checked && departureData(dateIso).departureStatus === 'cancelled') continue;
      if (document.getElementById('bulkExcludePast').checked && dateIso < todayIso) continue;
      out.push(dateIso);
    }
    return out;
  }

  window.applyBulkSettings = function () {
    var dates = bulkDates();
    if (!dates.length) return setMessage('bulkMessage', '적용할 출발일이 없습니다.', true);
    var mode = document.querySelector('input[name="bulkApplyMode"]:checked').value;
    dates.forEach(function (dateIso) {
      var current = departureData(dateIso);
      var existing = state.overrides[dateIso] || {};
      var next = clone(existing);
      next.prices = next.prices || clone(current.prices);
      if (mode === 'overwrite' || document.getElementById('bulkAdultPrice').value) next.prices.room2.adult = document.getElementById('bulkAdultPrice').value ? num(document.getElementById('bulkAdultPrice').value) : next.prices.room2.adult;
      if (mode === 'overwrite' || document.getElementById('bulkChildPrice').value) next.prices.room2.child = document.getElementById('bulkChildPrice').value ? num(document.getElementById('bulkChildPrice').value) : next.prices.room2.child;
      next.prices.room3 = clone(next.prices.room2);
      next.prices.room4 = clone(next.prices.room2);
      if (document.getElementById('bulkTotalSeats').value) next.totalSeats = Number(document.getElementById('bulkTotalSeats').value);
      if (document.getElementById('bulkBlockedSeats').value) next.blockedSeats = Number(document.getElementById('bulkBlockedSeats').value);
      if (document.getElementById('bulkDepartureStatus').value) next.departureStatus = document.getElementById('bulkDepartureStatus').value;
      if (document.getElementById('bulkBookingStatus').value) next.bookingStatus = document.getElementById('bulkBookingStatus').value;
      next.updatedAt = new Date().toLocaleString('ko-KR');
      state.overrides[dateIso] = next;
    });
    saveState();
    closeBulkModal();
    renderCalendar();
    if (selectedDate) renderDetail(selectedDate);
    msg(dates.length + '개 출발일에 일괄설정을 적용했습니다.');
  };

  window.openModal = function (id) {
    document.getElementById(id).classList.add('open');
  };

  window.closeModal = function (id) {
    document.getElementById(id).classList.remove('open');
  };

  window.openRateModal = function () {
    editingRateRuleId = '';
    document.getElementById('rateModal').classList.remove('rate-edit-mode');
    document.getElementById('ratePeriodCell').setAttribute('colspan', '5');
    document.getElementById('rateModalTitle').textContent = '날짜별 요금추가';
    document.getElementById('rateSaveBtn').textContent = '저장';
    var status = document.getElementById('rateStatus');
    var days = document.getElementById('rateDays');
    document.getElementById('rateTitle').value = '';
    document.getElementById('rateConfirm').value = '1';
    document.getElementById('rateClose').value = '30';
    document.getElementById('rateStart').value = '2026-07-01';
    document.getElementById('rateEnd').value = '2026-08-31';
    var periodRadio = document.querySelector('input[name="applyType"][value="period"]');
    if (periodRadio) periodRadio.checked = true;
    if (status) {
      status.innerHTML = Object.keys(oldStatusMap).map(function (key) {
        return '<label><input type="radio" name="status" value="' + key + '"' + (key === 'AV' ? ' checked' : '') + '>' + oldStatusMap[key] + '</label>';
      }).join('');
    }
    if (days) {
      days.innerHTML = weekdays.map(function (day) {
        return '<label><input type="checkbox" class="day-check" value="' + day + '">' + day + '</label>';
      }).join('');
    }
    document.getElementById('rateColor').value = defaultRuleColors[state.rateRules.length % defaultRuleColors.length];
    selectedRateDates = [];
    renderRateModalDefaults();
    renderRateCalendar();
    renderSelectedRateDates();
    window.toggleApplyType();
    window.openModal('rateModal');
  };

  window.openRateEditModal = function (id) {
    var rule = state.rateRules.find(function (item) { return String(item.id) === String(id); });
    if (!rule) return;
    window.openRateModal();
    editingRateRuleId = String(rule.id);
    document.getElementById('rateModal').classList.add('rate-edit-mode');
    document.getElementById('ratePeriodCell').setAttribute('colspan', '5');
    document.getElementById('rateModalTitle').textContent = '날짜별 요금수정';
    document.getElementById('rateSaveBtn').textContent = '수정 저장';
    document.getElementById('rateTitle').value = rule.title || '';
    document.getElementById('rateColor').value = ruleColor(rule.color, Number(rule.priority || 1) - 1);
    document.getElementById('rateConfirm').value = rule.confirmMinCount || 1;
    document.getElementById('rateClose').value = rule.bookingMaxCount || 30;
    document.getElementById('rateStart').value = rule.startDate || '2026-07-01';
    document.getElementById('rateEnd').value = rule.endDate || '2026-08-31';
    var applyRadio = document.querySelector('input[name="applyType"][value="' + (rule.applyType || 'period') + '"]');
    if (applyRadio) applyRadio.checked = true;
    selectedRateDates = (rule.selectedDates || []).slice().sort();
    document.querySelectorAll('#rateDays .day-check').forEach(function (input) {
      input.checked = (rule.days || []).indexOf(input.value) >= 0;
    });
    var statusValue = rule.bookingStatus === 'closed' ? 'CL' : rule.departureStatus === 'confirmed' ? 'CF' : rule.bookingStatus === 'waiting' ? 'WL' : 'AV';
    var statusRadio = document.querySelector('input[name="status"][value="' + statusValue + '"]');
    if (statusRadio) statusRadio.checked = true;
    renderRateModalDefaults();
    stayTypes.forEach(function (stay) {
      activePeople().forEach(function (person) {
        var input = document.querySelector('.money-input[data-person="' + person.id + '"][data-stay="' + stay.id + '"]');
        if (input) input.value = money(((rule.prices || {})[stay.id] || {})[person.id] || person.price);
      });
    });
    renderSelectedRateDates();
    renderRateCalendar();
    window.toggleApplyType();
  };

  window.toggleApplyType = function () {
    var value = document.querySelector('input[name="applyType"]:checked').value;
    document.getElementById('periodBox').style.display = value === 'period' ? 'flex' : 'none';
    document.getElementById('datesBox').style.display = value === 'dates' ? 'block' : 'none';
    document.getElementById('selectedDateRow').style.display = value === 'dates' ? 'grid' : 'none';
  };

  window.setRangeMonth = function (months) {
    var start = parseIso(todayIso);
    var end = parseIso(todayIso);
    end.setMonth(end.getMonth() + months);
    document.getElementById('rateStart').value = iso(start);
    document.getElementById('rateEnd').value = iso(end);
  };

  window.setYearEnd = function () {
    document.getElementById('rateStart').value = todayIso;
    document.getElementById('rateEnd').value = '2026-12-31';
  };

  window.addSelectedDate = function (dateIso) {
    if (selectedRateDates.indexOf(dateIso) >= 0) {
      selectedRateDates = selectedRateDates.filter(function (date) { return date !== dateIso; });
    } else {
      if (selectedRateDates.length >= 10) return msg('개별일자는 최대 10일까지 선택할 수 있습니다.');
      selectedRateDates.push(dateIso);
    }
    selectedRateDates.sort();
    renderSelectedRateDates();
    renderRateCalendar();
  };

  function renderSelectedRateDates() {
    var el = document.getElementById('selectedDates');
    if (!el) return;
    el.innerHTML = selectedRateDates.map(function (dateIso) {
      return '<span class="tag">' + dateIso + '</span>';
    }).join('');
  }

  function renderRateCalendar() {
    var grid = document.getElementById('rateCalendarGrid');
    if (!grid) return;
    var base = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    var html = '';
    for (var offset = 0; offset < 3; offset++) {
      var cur = new Date(base.getFullYear(), base.getMonth() + offset, 1);
      var year = cur.getFullYear();
      var month = cur.getMonth();
      var first = cur.getDay();
      var last = new Date(year, month + 1, 0).getDate();
      var cells = '';
      for (var blank = 0; blank < first; blank++) cells += '<button type="button" class="rate-day blank" tabindex="-1"></button>';
      for (var day = 1; day <= last; day++) {
        var dateIso = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        cells += '<button type="button" class="rate-day ' + (selectedRateDates.indexOf(dateIso) >= 0 ? 'selected' : '') + '" data-rate-date="' + dateIso + '">' + String(day).padStart(2, '0') + '</button>';
      }
      html += '<div class="rate-calendar-month"><div class="rate-calendar-title">' + year + '년 ' + (month + 1) + '월</div><div class="rate-calendar-week"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div><div class="rate-calendar-days">' + cells + '</div></div>';
    }
    grid.innerHTML = html;
  }

  function renderRateModalDefaults() {
    var head = document.getElementById('ratePriceHead');
    var body = document.getElementById('ratePriceBody');
    if (!head || !body) return;
    head.innerHTML = '<tr><th>구분</th>' + stayTypes.map(function (stay) { return '<th>' + stay.name + '</th>'; }).join('') + '</tr>';
    body.innerHTML = activePeople().map(function (person) {
      return '<tr><th>' + person.name + '</th>' + stayTypes.map(function (stay) {
        return '<td><input class="money-input" data-person="' + person.id + '" data-stay="' + stay.id + '" value="' + money(person.price) + '"></td>';
      }).join('') + '</tr>';
    }).join('');
  }

  window.saveRateRule = function () {
    var title = document.getElementById('rateTitle').value.trim();
    if (!title) return msg('적용구분을 입력하세요.');
    var applyType = document.querySelector('input[name="applyType"]:checked').value;
    var prices = {};
    stayTypes.forEach(function (stay) {
      prices[stay.id] = {};
      activePeople().forEach(function (person) {
        var input = document.querySelector('.money-input[data-person="' + person.id + '"][data-stay="' + stay.id + '"]');
        prices[stay.id][person.id] = num(input ? input.value : person.price);
      });
    });
    var statusValue = document.querySelector('input[name="status"]:checked').value;
    var existingRule = editingRateRuleId ? state.rateRules.find(function (rule) { return String(rule.id) === String(editingRateRuleId); }) : null;
    var nextRule = {
      id: editingRateRuleId || 'rule-' + Date.now(),
      priority: editingRateRuleId ? (existingRule || {}).priority : state.rateRules.length + 1,
      title: title,
      color: editingRateRuleId ? ruleColor((existingRule || {}).color, Number((existingRule || {}).priority || 1) - 1) : ruleColor(document.getElementById('rateColor').value, state.rateRules.length),
      applyType: applyType,
      startDate: document.getElementById('rateStart').value,
      endDate: document.getElementById('rateEnd').value,
      selectedDates: applyType === 'dates' ? selectedRateDates.slice() : [],
      days: Array.prototype.slice.call(document.querySelectorAll('#rateDays .day-check:checked')).map(function (input) { return input.value; }),
      departureStatus: statusValue === 'CF' ? 'confirmed' : 'undecided',
      bookingStatus: statusValue === 'CL' ? 'closed' : statusValue === 'WL' ? 'waiting' : 'available',
      confirmMinCount: num(document.getElementById('rateConfirm').value),
      bookingMaxCount: num(document.getElementById('rateClose').value),
      prices: prices
    };
    if (editingRateRuleId) {
      state.rateRules = state.rateRules.map(function (rule) {
        return String(rule.id) === String(editingRateRuleId) ? nextRule : rule;
      });
    } else {
      state.rateRules.push(nextRule);
    }
    editingRateRuleId = '';
    saveState();
    renderRateTable();
    renderCalendar();
    window.closeModal('rateModal');
  };

  window.deleteRate = function (id) {
    state.rateRules = state.rateRules.filter(function (rule) { return String(rule.id) !== String(id); }).map(function (rule, index) {
      rule.priority = index + 1;
      return rule;
    });
    saveState();
    renderRateTable();
    renderCalendar();
  };

  window.openOptionModal = function () {
    document.getElementById('optionName').value = '';
    document.getElementById('optionCalcType').value = 'per_booking';
    setOptionRequired(false, false);
    document.getElementById('optionItemRows').innerHTML = '';
    addOptionItemRow();
    window.openModal('optionModal');
  };

  window.addOptionItemRow = function () {
    var row = document.createElement('div');
    row.className = 'option-item-row';
    row.innerHTML = '<div class="field"><label>항목명</label><input class="item-name"></div><div class="field"><label>금액</label><input class="item-price" value="0"></div><div class="field"><label>사용여부</label><label><input class="item-enabled" type="checkbox" checked>사용</label></div><button class="btn small red option-row-delete" type="button">삭제</button>';
    document.getElementById('optionItemRows').appendChild(row);
  };

  function setOptionRequired(required, locked) {
    document.querySelectorAll('input[name="optionRequired"]').forEach(function (input) {
      input.checked = String(required) === input.value;
      input.disabled = !!locked;
    });
  }

  window.syncOptionRequired = function () {
    if (document.getElementById('optionCalcType').value === 'per_all_people') setOptionRequired(true, true);
    else setOptionRequired(document.querySelector('input[name="optionRequired"]:checked').value === 'true', false);
  };

  window.saveOptionGroup = function () {
    var name = document.getElementById('optionName').value.trim();
    if (!name) return msg('옵션명을 입력하세요.');
    var rows = Array.prototype.slice.call(document.querySelectorAll('.option-item-row'));
    var items = rows.map(function (row, index) {
      return {
        id: index + 1,
        name: row.querySelector('.item-name').value.trim(),
        price: num(row.querySelector('.item-price').value),
        enabled: row.querySelector('.item-enabled').checked
      };
    }).filter(function (item) { return item.name; });
    if (!items.length) return msg('옵션항목을 입력하세요.');
    state.optionGroups.push({
      id: 'option-' + Date.now(),
      order: state.optionGroups.length + 1,
      name: name,
      calcType: document.getElementById('optionCalcType').value,
      required: document.querySelector('input[name="optionRequired"]:checked').value === 'true',
      items: items
    });
    saveState();
    renderOptions();
    renderPreviewInputs();
    window.closeModal('optionModal');
  };

  window.deleteOption = function (id) {
    state.optionGroups = state.optionGroups.filter(function (group) { return String(group.id) !== String(id); }).map(function (group, index) {
      group.order = index + 1;
      return group;
    });
    saveState();
    renderOptions();
    renderPreviewInputs();
  };

  window.saveAll = function () {
    saveState();
    msg('요금설정이 저장되었습니다.');
  };

  function bindEvents() {
    document.getElementById('calendarTodayBtn').addEventListener('click', window.goToday);
    document.getElementById('calendarPrevBtn').addEventListener('click', function () { window.moveMonth(-1); });
    document.getElementById('calendarNextBtn').addEventListener('click', function () { window.moveMonth(1); });
    document.getElementById('openBulkModalBtn').addEventListener('click', window.openBulkModal);
    document.getElementById('detailCloseBtn').addEventListener('click', window.closeDetailPanel);
    document.getElementById('detailSaveBtn').addEventListener('click', window.saveDateDetail);
    document.getElementById('detailCancelBtn').addEventListener('click', window.cancelDateEdit);
    document.getElementById('detailResetBtn').addEventListener('click', window.resetDateOverride);
    document.getElementById('bulkApplyBtn').addEventListener('click', window.applyBulkSettings);
    document.getElementById('previewCalcBtn').addEventListener('click', window.calculatePreview);
    document.querySelectorAll('.bulk-close-btn').forEach(function (button) {
      button.addEventListener('click', window.closeBulkModal);
    });
    document.getElementById('calendarStatusFilter').addEventListener('change', function () {
      window.setCalendarStatusFilter(this.value);
    });
    [
      ['togglePrice', 'price'],
      ['toggleSeat', 'seat'],
      ['toggleStatus', 'status']
    ].forEach(function (pair) {
      document.getElementById(pair[0]).addEventListener('change', function () {
        window.toggleCalendarOption(pair[1], this.checked);
      });
    });
    document.querySelectorAll('.price-adjust-btn').forEach(function (button) {
      button.addEventListener('click', function () {
        window.adjustPrices(Number(this.dataset.adjust || 0));
      });
    });
    document.getElementById('calendarMonthPicker').addEventListener('change', function () {
      var parts = this.value.split('-').map(Number);
      viewDate = new Date(parts[0], parts[1] - 1, 1);
      renderCalendar();
    });
    ['detailTotalSeats', 'detailBlockedSeats'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', updateRemainingSeats);
    });
    ['detailAdultPrice', 'detailChildPrice', 'bulkAdultPrice', 'bulkChildPrice'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', function () { this.value = money(num(this.value)); });
    });
    ['bulkStartDate', 'bulkEndDate', 'bulkExcludeOverride', 'bulkExcludeCancelled', 'bulkExcludePast'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', updateBulkSummary);
    });
    document.getElementById('bulkWeekdays').addEventListener('change', updateBulkSummary);
    document.addEventListener('click', function (event) {
      if (event.target.id === 'dateDetailModal') window.closeDetailPanel();
      var calendarDay = event.target.closest('.calendar-day[data-date]');
      if (calendarDay) window.selectDate(calendarDay.dataset.date);
      var rateDay = event.target.closest('.rate-day[data-rate-date]');
      if (rateDay) window.addSelectedDate(rateDay.dataset.rateDate);
      var rateTitle = event.target.closest('.rate-title-link');
      if (rateTitle) {
        event.preventDefault();
        window.openRateEditModal(rateTitle.dataset.rateId);
      }
      var rateDelete = event.target.closest('.delete-rate-btn');
      if (rateDelete) window.deleteRate(rateDelete.dataset.rateId);
      var optionDelete = event.target.closest('.delete-option-btn');
      if (optionDelete) window.deleteOption(optionDelete.dataset.optionId);
      var optionRowDelete = event.target.closest('.option-row-delete');
      if (optionRowDelete) optionRowDelete.closest('.option-item-row').remove();
    });
    document.addEventListener('input', function (event) {
      var colorInput = event.target.closest('.rate-row-color');
      if (!colorInput) return;
      var rule = state.rateRules.find(function (row) { return String(row.id) === String(colorInput.dataset.rateId); });
      if (!rule) return;
      rule.color = ruleColor(colorInput.value, Number(rule.priority || 1) - 1);
      var label = colorInput.closest('.rate-color-cell');
      if (label) label.querySelector('span').textContent = rule.color;
      saveState();
      renderCalendar();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (document.getElementById('dateDetailModal').classList.contains('open')) {
        window.closeDetailPanel();
        return;
      }
      document.querySelectorAll('.modal-backdrop.open').forEach(function (modal) { modal.classList.remove('open'); });
    });
  }

  function init() {
    loadState();
    renderBase();
    renderRateTable();
    handleRateRuleRoute();
    renderOptions();
    renderPreviewInputs();
    renderStatusSelects();
    renderBulkWeekdays();
    bindEvents();
    renderCalendar();
    window.toggleApplyType();
  }

  init();
})();
