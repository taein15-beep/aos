(function () {
  if (document.body.getAttribute('data-page') !== 'statistics_sales') return;

  var airlines = [
    { code: 'KE', name: '대한항공' }, { code: 'OZ', name: '아시아나항공' }, { code: '7C', name: '제주항공' },
    { code: 'LJ', name: '진에어' }, { code: 'TW', name: '티웨이항공' }, { code: 'BX', name: '에어부산' },
    { code: 'ZE', name: '이스타항공' }, { code: 'MU', name: '중국동방항공' }, { code: 'CZ', name: '중국남방항공' },
    { code: 'CA', name: '에어차이나' }, { code: 'VN', name: '베트남항공' }, { code: 'SQ', name: '싱가포르항공' },
    { code: 'JL', name: '일본항공' }, { code: 'NH', name: '전일본공수' }
  ];
  var state = {
    route: 'international',
    year: 2026,
    month: 5,
    selectedDate: '2026-05-06',
    weekStart: '2026-05-04',
    heatmap: false,
    view: 'calendar',
    sortKey: 'total',
    sortDir: 'desc',
    hideZero: false,
    airlineSearch: ''
  };
  var tickets = buildSampleTickets();

  function pad(value) { return String(value).padStart(2, '0'); }
  function dateKey(year, month, day) { return year + '-' + pad(month) + '-' + pad(day); }
  function parseDate(key) {
    var parts = key.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  function toKey(date) { return dateKey(date.getFullYear(), date.getMonth() + 1, date.getDate()); }
  function addDays(key, days) {
    var date = parseDate(key);
    date.setDate(date.getDate() + days);
    return toKey(date);
  }
  function mondayOf(key) {
    var date = parseDate(key);
    var day = date.getDay() || 7;
    date.setDate(date.getDate() - day + 1);
    return toKey(date);
  }
  function money(value) { return Number(value || 0).toLocaleString('ko-KR') + '원'; }
  function people(value) { return Number(value || 0).toLocaleString('ko-KR') + '명'; }
  function pct(value) {
    var sign = value > 0 ? '+' : '';
    return sign + Number(value || 0).toFixed(1) + '%';
  }
  function share(value) { return Number(value || 0).toFixed(2) + '%'; }
  function heatClass(total, maxTotal) {
    if (!state.heatmap || !total) return '';
    return ' heat-' + Math.max(1, Math.min(5, Math.ceil(total / maxTotal * 5)));
  }
  function widthClass(value) {
    return 'w-' + Math.max(0, Math.min(100, Math.round(Number(value || 0) / 5) * 5));
  }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function notify(text) {
    if (window.msg) window.msg(text);
    else alert(text);
  }

  function buildSampleTickets() {
    var agencies = ['본사몰', '강남판매점', '기업복지몰', '콜센터'];
    var managers = ['윤호', '서연', '민재'];
    var routes = ['ICN-NRT', 'ICN-BKK', 'ICN-SIN', 'GMP-CJU', 'PUS-CJU', 'ICN-DAD', 'ICN-PVG', 'ICN-HAN'];
    var rows = [];
    [4, 5, 6].forEach(function (month) {
      var days = new Date(2026, month, 0).getDate();
      for (var day = 1; day <= days; day += 1) {
        airlines.forEach(function (airline, airlineIndex) {
          var active = (day + airlineIndex + month) % 5 !== 0;
          if (!active) return;
          var passengerCount = ((day * (airlineIndex + 3) + month) % 17) + 3;
          var baseFare = (145000 + airlineIndex * 18000 + (day % 6) * 9000) * passengerCount;
          var tax = Math.round(baseFare * (0.085 + (airlineIndex % 4) * 0.008));
          var adjustment = (day + airlineIndex) % 11 === 0 ? Math.round((baseFare + tax) * 0.12) : 0;
          var routeType = ['KE', 'OZ', '7C', 'LJ', 'TW', 'BX', 'ZE'].indexOf(airline.code) > -1 && day % 3 === 0 ? 'domestic' : 'international';
          rows.push({
            id: 'TK-' + month + '-' + day + '-' + airline.code,
            reservationNo: 'AOS' + String(20260000 + month * 1000 + day * 10 + airlineIndex),
            pnr: airline.code + String(70000 + day * 71 + airlineIndex),
            passengerName: ['김하준', '이서연', '박민재', '최지우', '정도윤'][airlineIndex % 5] + ' 외 ' + Math.max(0, passengerCount - 1) + '명',
            airlineCode: airline.code,
            airlineName: airline.name,
            route: routes[(day + airlineIndex) % routes.length],
            agency: agencies[(day + airlineIndex) % agencies.length],
            manager: managers[(day + airlineIndex) % managers.length],
            reservedDate: addDays(dateKey(2026, month, day), -12 - (airlineIndex % 5)),
            ticketedDate: dateKey(2026, month, day),
            departureDate: addDays(dateKey(2026, month, day), 18 + (airlineIndex % 9)),
            passengers: passengerCount,
            fare: baseFare,
            tax: tax,
            adjustment: adjustment,
            status: adjustment ? '부분환불' : '발권완료',
            routeType: routeType
          });
        });
      }
    });
    return rows;
  }

  function getFilters() {
    return {
      route: state.route,
      basis: document.getElementById('basisSelect').value,
      year: Number(document.getElementById('yearSelect').value),
      month: Number(document.getElementById('monthSelect').value),
      agency: document.getElementById('agencySelect').value,
      manager: document.getElementById('managerSelect').value,
      airline: document.getElementById('airlineSelect').value,
      keyword: document.getElementById('keywordInput').value.trim()
    };
  }
  function rowDateByBasis(row, basis) {
    if (basis === 'departure') return row.departureDate;
    if (basis === 'reserved') return row.reservedDate;
    return row.ticketedDate;
  }
  function fetchTicketData(filters) {
    return tickets.filter(function (row) {
      var basisDate = rowDateByBasis(row, filters.basis);
      var date = parseDate(basisDate);
      var keywordText = [row.reservationNo, row.pnr, row.passengerName, row.airlineCode, row.airlineName].join(' ');
      return row.routeType === filters.route
        && date.getFullYear() === filters.year
        && date.getMonth() + 1 === filters.month
        && (!filters.agency || row.agency === filters.agency)
        && (!filters.manager || row.manager === filters.manager)
        && (!filters.airline || row.airlineCode === filters.airline)
        && (!filters.keyword || keywordText.indexOf(filters.keyword) > -1);
    });
  }
  function sumRows(rows) {
    return rows.reduce(function (acc, row) {
      acc.passengers += row.passengers;
      acc.fare += row.fare;
      acc.tax += row.tax;
      acc.total += row.fare + row.tax;
      acc.adjustment += row.adjustment;
      return acc;
    }, { passengers: 0, fare: 0, tax: 0, total: 0, adjustment: 0 });
  }
  function calcDaily(rows, filters) {
    var map = {};
    rows.forEach(function (row) {
      var key = rowDateByBasis(row, filters.basis);
      if (!map[key]) map[key] = [];
      map[key].push(row);
    });
    return map;
  }
  function calcAirlineSummary(rows) {
    var totalAll = sumRows(rows).total;
    var map = {};
    airlines.forEach(function (airline) {
      map[airline.code] = { code: airline.code, name: airline.name, passengers: 0, fare: 0, tax: 0, total: 0, adjustment: 0, prevRate: ((airline.code.charCodeAt(0) % 13) - 4) * 1.7 };
    });
    rows.forEach(function (row) {
      var item = map[row.airlineCode];
      item.passengers += row.passengers;
      item.fare += row.fare;
      item.tax += row.tax;
      item.total += row.fare + row.tax;
      item.adjustment += row.adjustment;
    });
    return Object.keys(map).map(function (key) {
      var item = map[key];
      item.net = item.total - item.adjustment;
      item.share = totalAll ? item.total / totalAll * 100 : 0;
      return item;
    });
  }
  function calcDayAirlines(rows) {
    return calcAirlineSummary(rows).filter(function (row) { return row.total > 0; }).sort(function (a, b) { return b.total - a.total; });
  }

  function renderKpis(rows) {
    var total = sumRows(rows);
    var prevRate = rows.length ? 12.8 : 0;
    var data = [
      ['총 발권 인원', people(total.passengers), '선택 월 기준', prevRate, 'up'],
      ['항공권 판매액', money(total.fare), 'TAX 제외', 9.4, 'up'],
      ['TAX', money(total.tax), '항공권 세금', 6.1, 'up'],
      ['총 결제금액', money(total.total), '판매액 + TAX', prevRate, 'up'],
      ['조정금액', total.adjustment ? '-' + money(total.adjustment) : '실적 없음', '환불/할인 등 보조금액', -3.2, 'bad'],
      ['전월 대비 증감률', pct(prevRate), '총 결제금액 기준', prevRate, 'up']
    ];
    document.getElementById('monthlyKpis').innerHTML = data.map(function (item) {
      return '<div class="card"><span>' + item[0] + '</span><strong>' + item[1] + '</strong><small>' + item[2] + '</small><em class="metric-delta ' + item[4] + '">' + pct(item[3]) + '</em></div>';
    }).join('');
  }

  function renderCalendar(rows, filters) {
    var daily = calcDaily(rows, filters);
    var first = new Date(filters.year, filters.month - 1, 1);
    var start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() || 7) - 1));
    var todayKey = toKey(new Date());
    var maxTotal = Math.max.apply(null, Object.keys(daily).map(function (key) { return sumRows(daily[key]).total; }).concat([1]));
    var previousTotal = null;
    var html = '';
    for (var i = 0; i < 42; i += 1) {
      var date = new Date(start);
      date.setDate(start.getDate() + i);
      var key = toKey(date);
      var dayRows = daily[key] || [];
      var total = sumRows(dayRows);
      var outside = date.getMonth() + 1 !== filters.month;
      var dayAirlines = calcDayAirlines(dayRows).slice(0, 2);
      var change = previousTotal && total.total ? (total.total - previousTotal) / previousTotal * 100 : 0;
      if (total.total) previousTotal = total.total;
      html += '<button type="button" class="day-cell ' + (outside ? 'is-outside ' : '') + (key === todayKey ? 'is-today ' : '') + (key === state.selectedDate ? 'is-selected ' : '') + (total.adjustment ? 'has-refund' : '') + heatClass(total.total, maxTotal) + '" data-date="' + key + '" aria-label="' + key + ' 매출 보기">';
      html += '<span class="day-top"><span>' + date.getDate() + '일</span><span>' + ['일', '월', '화', '수', '목', '금', '토'][date.getDay()] + '</span></span>';
      if (dayRows.length) {
        html += '<span class="day-people">' + people(total.passengers) + '</span><span class="day-total-money">' + money(total.total) + '</span>';
        html += '<span class="day-sub"><span class="mobile-hide">항공료 ' + money(total.fare) + '</span><span class="mobile-hide">TAX ' + money(total.tax) + '</span></span>';
        if (total.adjustment) html += '<span class="day-refund">조정금액 -' + money(total.adjustment) + '</span>';
        html += '<span class="change-pill ' + (change >= 0 ? 'up' : 'down') + '">' + (change ? pct(change) : '변동 없음') + '</span>';
        html += '<span class="airline-badges">' + dayAirlines.map(function (airline) { return '<span class="airline-badge">' + airline.code + '</span>'; }).join('') + '</span>';
      } else {
        html += '<span class="day-empty">실적 없음</span>';
      }
      html += '</button>';
    }
    document.getElementById('salesCalendar').innerHTML = html;
    document.getElementById('currentMonthLabel').textContent = filters.year + '년 ' + filters.month + '월';
  }

  function renderSelectedDay(rows, filters) {
    var selectedRows = rows.filter(function (row) { return rowDateByBasis(row, filters.basis) === state.selectedDate; });
    var total = sumRows(selectedRows);
    var date = parseDate(state.selectedDate);
    document.getElementById('selectedDayTotal').innerHTML = '<h2>' + date.getFullYear() + '년 ' + (date.getMonth() + 1) + '월 ' + date.getDate() + '일 ' + ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][date.getDay()] + '</h2><div>발권 <strong>' + people(total.passengers) + '</strong> · 총 결제금액 <strong>' + money(total.total) + '</strong></div>';
    var dayAirlines = calcDayAirlines(selectedRows);
    document.getElementById('selectedAirlineList').innerHTML = dayAirlines.length ? dayAirlines.map(function (row, index) {
      return '<button type="button" class="airline-row" data-airline="' + row.code + '"><span class="airline-row-head"><span class="rank-no">' + (index + 1) + '</span><span class="airline-name">' + row.code + ' · ' + row.name + '</span><strong>' + share(row.share) + '</strong></span><span class="airline-meta"><span>인원</span><span class="money">' + people(row.passengers) + '</span><span>항공료</span><span class="money">' + money(row.fare) + '</span><span>TAX</span><span class="money">' + money(row.tax) + '</span><span>총 결제</span><span class="money">' + money(row.total) + '</span><span>조정금액</span><span class="money negative">' + (row.adjustment ? '-' + money(row.adjustment) : '-') + '</span></span><span class="share-line"><span>' + share(row.share) + '</span><span class="share-track"><span class="share-fill ' + widthClass(row.share) + '"></span></span></span></button>';
    }).join('') : '<div class="day-total">선택한 날짜의 항공권 실적이 없습니다.</div>';
  }

  function renderAirlineTable(rows) {
    var data = calcAirlineSummary(rows).filter(function (row) {
      return (!state.hideZero || row.total > 0) && (!state.airlineSearch || (row.code + row.name).indexOf(state.airlineSearch) > -1);
    });
    data.sort(function (a, b) {
      var av = a[state.sortKey], bv = b[state.sortKey];
      if (typeof av === 'string') return state.sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return state.sortDir === 'asc' ? av - bv : bv - av;
    });
    var total = sumRows(rows);
    var heads = [['rank', '순위'], ['code', '항공사 코드'], ['name', '항공사명'], ['passengers', '발권 인원'], ['fare', '항공권 판매액'], ['tax', 'TAX'], ['total', '총 결제금액'], ['adjustment', '조정금액'], ['net', '순매출'], ['share', '점유율'], ['prevRate', '전월 대비']];
    var html = '<thead><tr>' + heads.map(function (head) {
      return '<th><button type="button" data-sort="' + head[0] + '">' + head[1] + (state.sortKey === head[0] ? (state.sortDir === 'asc' ? ' ▲' : ' ▼') : '') + '</button></th>';
    }).join('') + '</tr></thead><tbody>';
    html += data.map(function (row, index) {
      return '<tr data-airline="' + row.code + '"><td class="center">' + (index + 1) + '</td><td class="center">' + row.code + '</td><td>' + row.name + '</td><td class="center">' + people(row.passengers) + '</td><td class="money">' + money(row.fare) + '</td><td class="money">' + money(row.tax) + '</td><td class="money">' + money(row.total) + '</td><td class="money negative">' + (row.adjustment ? '-' + money(row.adjustment) : '-') + '</td><td class="money">' + money(row.net) + '</td><td class="center">' + share(row.share) + '</td><td class="center ' + (row.prevRate >= 0 ? 'positive' : 'negative') + '">' + pct(row.prevRate) + '</td></tr>';
    }).join('');
    html += '</tbody><tfoot><tr><td colspan="3">합계</td><td class="center">' + people(total.passengers) + '</td><td class="money">' + money(total.fare) + '</td><td class="money">' + money(total.tax) + '</td><td class="money">' + money(total.total) + '</td><td class="money negative">' + (total.adjustment ? '-' + money(total.adjustment) : '-') + '</td><td class="money">' + money(total.total - total.adjustment) + '</td><td class="center">100.00%</td><td></td></tr></tfoot>';
    document.getElementById('airlineSummaryTable').innerHTML = html;
  }

  function renderWeekly(rows, filters) {
    var days = Array.from({ length: 7 }, function (_, index) { return addDays(state.weekStart, index); });
    var weekRows = rows.filter(function (row) { return days.indexOf(rowDateByBasis(row, filters.basis)) > -1; });
    var data = calcAirlineSummary(weekRows).filter(function (row) { return row.total > 0; }).sort(function (a, b) { return b.total - a.total; });
    document.getElementById('weekLabel').textContent = days[0] + ' ~ ' + days[6];
    document.getElementById('weeklyTable').innerHTML = '<thead><tr><th>항공사</th><th>발권 인원</th><th>항공권 판매액</th><th>TAX</th><th>총 결제금액</th><th>조정금액</th><th>점유율</th></tr></thead><tbody>' + data.map(function (row) {
      return '<tr><td>' + row.code + ' · ' + row.name + '</td><td class="center">' + people(row.passengers) + '</td><td class="money">' + money(row.fare) + '</td><td class="money">' + money(row.tax) + '</td><td class="money">' + money(row.total) + '</td><td class="money negative">' + (row.adjustment ? '-' + money(row.adjustment) : '-') + '</td><td class="center">' + share(row.share) + '</td></tr>';
    }).join('') + '</tbody>';
  }

  function renderTickets(rows) {
    document.getElementById('ticketTable').innerHTML = '<thead><tr><th>예약번호</th><th>PNR</th><th>승객명</th><th>항공사</th><th>구간</th><th>예약일</th><th>발권일</th><th>출발일</th><th>항공료</th><th>TAX</th><th>총 결제금액</th><th>상태</th><th>담당자</th><th>거래처</th></tr></thead><tbody>' + rows.slice(0, 80).map(function (row) {
      return '<tr data-ticket="' + row.id + '"><td>' + row.reservationNo + '</td><td>' + row.pnr + '</td><td>' + row.passengerName + '</td><td>' + row.airlineCode + '</td><td>' + row.route + '</td><td>' + row.reservedDate + '</td><td>' + row.ticketedDate + '</td><td>' + row.departureDate + '</td><td class="money">' + money(row.fare) + '</td><td class="money">' + money(row.tax) + '</td><td class="money">' + money(row.fare + row.tax) + '</td><td><span class="badge ' + (row.adjustment ? 'b-red' : 'b-green') + '">' + row.status + '</span></td><td>' + row.manager + '</td><td>' + row.agency + '</td></tr>';
    }).join('') + '</tbody>';
  }

  function setView(view) {
    state.view = view;
    document.querySelectorAll('.view-tab').forEach(function (button) { button.classList.toggle('active', button.dataset.view === view); });
    document.querySelectorAll('[data-view-panel]').forEach(function (panel) {
      panel.classList.toggle('active', panel.dataset.viewPanel === view || (view === 'calendar' && panel.dataset.viewPanel === 'airlines'));
    });
  }
  function renderAll() {
    var filters = getFilters();
    state.year = filters.year;
    state.month = filters.month;
    var rows = fetchTicketData(filters);
    renderKpis(rows);
    renderCalendar(rows, filters);
    renderSelectedDay(rows, filters);
    renderAirlineTable(rows);
    renderWeekly(rows, filters);
    renderTickets(rows);
  }
  function openTicketModal(ticketId) {
    var row = tickets.find(function (item) { return item.id === ticketId; });
    if (!row) return;
    var items = [['예약번호', row.reservationNo], ['PNR', row.pnr], ['승객명', row.passengerName], ['항공사', row.airlineCode + ' · ' + row.airlineName], ['구간', row.route], ['예약일', row.reservedDate], ['발권일', row.ticketedDate], ['출발일', row.departureDate], ['항공료', money(row.fare)], ['TAX', money(row.tax)], ['총 결제금액', money(row.fare + row.tax)], ['발권상태', row.status], ['담당자', row.manager], ['거래처', row.agency]];
    document.getElementById('ticketModalBody').innerHTML = '<div class="ticket-grid">' + items.map(function (item) { return '<div class="ticket-field"><span>' + item[0] + '</span><strong>' + esc(item[1]) + '</strong></div>'; }).join('') + '</div>';
    document.getElementById('ticketModal').hidden = false;
    document.getElementById('closeTicketModal').focus();
  }

  function initControls() {
    var yearSelect = document.getElementById('yearSelect');
    var monthSelect = document.getElementById('monthSelect');
    yearSelect.innerHTML = [2024, 2025, 2026, 2027].map(function (year) { return '<option value="' + year + '">' + year + '년</option>'; }).join('');
    monthSelect.innerHTML = Array.from({ length: 12 }, function (_, index) { return '<option value="' + (index + 1) + '">' + (index + 1) + '월</option>'; }).join('');
    document.getElementById('airlineSelect').innerHTML = '<option value="">전체</option>' + airlines.map(function (airline) { return '<option value="' + airline.code + '">' + airline.code + ' · ' + airline.name + '</option>'; }).join('');
    yearSelect.value = state.year;
    monthSelect.value = state.month;

    document.querySelectorAll('[data-route]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.route = button.dataset.route;
        document.querySelectorAll('[data-route]').forEach(function (item) {
          item.classList.toggle('active', item === button);
          item.setAttribute('aria-selected', item === button ? 'true' : 'false');
        });
        renderAll();
      });
    });
    document.querySelectorAll('.view-tab').forEach(function (button) { button.addEventListener('click', function () { setView(button.dataset.view); }); });
    document.getElementById('flightFilterForm').addEventListener('submit', function (event) { event.preventDefault(); renderAll(); notify('샘플 데이터 기준으로 검색했습니다.'); });
    document.getElementById('resetFilters').addEventListener('click', function () {
      state.route = 'international';
      state.year = 2026;
      state.month = 5;
      state.selectedDate = '2026-05-06';
      state.weekStart = mondayOf(state.selectedDate);
      document.getElementById('flightFilterForm').reset();
      yearSelect.value = state.year;
      monthSelect.value = state.month;
      document.querySelectorAll('[data-route]').forEach(function (item) { item.classList.toggle('active', item.dataset.route === state.route); });
      renderAll();
      notify('검색조건을 초기화했습니다.');
    });
    document.getElementById('excelDownload').addEventListener('click', function () { notify('현재 검색조건 기준으로 항공권 매출통계 Excel을 다운로드합니다.'); });
    ['basisSelect', 'agencySelect', 'managerSelect', 'airlineSelect', 'keywordInput'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', renderAll);
    });
    ['yearSelect', 'monthSelect'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', function () {
        state.year = Number(yearSelect.value);
        state.month = Number(monthSelect.value);
        state.selectedDate = dateKey(state.year, state.month, 1);
        state.weekStart = mondayOf(state.selectedDate);
        renderAll();
      });
    });
    document.getElementById('prevMonth').addEventListener('click', function () { shiftMonth(-1); });
    document.getElementById('nextMonth').addEventListener('click', function () { shiftMonth(1); });
    document.getElementById('todayButton').addEventListener('click', function () {
      var today = new Date();
      state.year = today.getFullYear();
      state.month = today.getMonth() + 1;
      state.selectedDate = toKey(today);
      yearSelect.value = state.year;
      monthSelect.value = state.month;
      renderAll();
    });
    document.getElementById('heatmapToggle').addEventListener('change', function (event) { state.heatmap = event.target.checked; renderAll(); });
    document.getElementById('salesCalendar').addEventListener('click', function (event) {
      var cell = event.target.closest('.day-cell');
      if (!cell) return;
      state.selectedDate = cell.dataset.date;
      state.weekStart = mondayOf(state.selectedDate);
      renderAll();
    });
    document.getElementById('airlineSummaryTable').addEventListener('click', function (event) {
      var sortButton = event.target.closest('[data-sort]');
      if (sortButton) {
        var key = sortButton.dataset.sort === 'rank' ? 'total' : sortButton.dataset.sort;
        state.sortDir = state.sortKey === key && state.sortDir === 'desc' ? 'asc' : 'desc';
        state.sortKey = key;
        renderAll();
        return;
      }
      var row = event.target.closest('tr[data-airline]');
      if (row) setView('tickets');
    });
    document.getElementById('selectedAirlineList').addEventListener('click', function (event) {
      var row = event.target.closest('[data-airline]');
      if (!row) return;
      var filters = getFilters();
      var selected = fetchTicketData(filters).find(function (ticket) { return ticket.airlineCode === row.dataset.airline && rowDateByBasis(ticket, filters.basis) === state.selectedDate; });
      if (selected) openTicketModal(selected.id);
    });
    document.getElementById('ticketTable').addEventListener('click', function (event) {
      var row = event.target.closest('[data-ticket]');
      if (row) openTicketModal(row.dataset.ticket);
    });
    document.getElementById('airlineSearch').addEventListener('input', function (event) { state.airlineSearch = event.target.value.trim(); renderAll(); });
    document.getElementById('hideZeroAirlines').addEventListener('change', function (event) { state.hideZero = event.target.checked; renderAll(); });
    document.getElementById('prevWeek').addEventListener('click', function () { state.weekStart = addDays(state.weekStart, -7); renderAll(); });
    document.getElementById('nextWeek').addEventListener('click', function () { state.weekStart = addDays(state.weekStart, 7); renderAll(); });
    document.getElementById('closeTicketModal').addEventListener('click', closeModal);
    document.getElementById('ticketModal').addEventListener('click', function (event) { if (event.target.id === 'ticketModal') closeModal(); });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeModal(); });
  }
  function shiftMonth(delta) {
    var date = new Date(state.year, state.month - 1 + delta, 1);
    state.year = date.getFullYear();
    state.month = date.getMonth() + 1;
    state.selectedDate = dateKey(state.year, state.month, 1);
    state.weekStart = mondayOf(state.selectedDate);
    document.getElementById('yearSelect').value = state.year;
    document.getElementById('monthSelect').value = state.month;
    renderAll();
  }
  function closeModal() { document.getElementById('ticketModal').hidden = true; }

  initControls();
  renderAll();
})();
