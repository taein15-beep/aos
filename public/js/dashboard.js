/**
 * AOS Admin Dashboard Renderer
 * 샘플 데이터를 기반으로 대시보드 UI를 렌더링
 */
(function (global) {
  'use strict';

  var escapeHtml = function (value) {
    if (global.AOSAdminLayout && global.AOSAdminLayout.escapeHtml) {
      return global.AOSAdminLayout.escapeHtml(value);
    }
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  function badge(text, tone) {
    return '<span class="badge ' + escapeHtml(tone || '') + '">' + escapeHtml(text) + '</span>';
  }

  function renderPageHead(meta) {
    return (
      '<section class="page-head">' +
      '<div>' +
      '<h1>' +
      escapeHtml(meta.title) +
      '</h1>' +
      '<p>' +
      escapeHtml(meta.description) +
      '</p>' +
      '</div>' +
      '<div class="date-actions">' +
      '<span>오늘</span>' +
      '<button type="button" class="secondary" data-action="refresh">↻ 새로고침</button>' +
      '</div>' +
      '</section>'
    );
  }

  function renderKpis(kpis) {
    return (
      '<section class="kpi-grid">' +
      kpis
        .map(function (kpi) {
          return (
            '<button type="button" class="kpi" data-kpi="' +
            escapeHtml(kpi.key) +
            '">' +
            '<span class="kpi-icon ' +
            escapeHtml(kpi.iconClass) +
            '" aria-hidden="true">' +
            kpi.icon +
            '</span>' +
            '<span class="kpi-copy">' +
            '<small>' +
            escapeHtml(kpi.label) +
            '</small>' +
            '<strong>' +
            escapeHtml(kpi.value) +
            '</strong>' +
            '<em class="' +
            escapeHtml(kpi.noteClass) +
            '">' +
            escapeHtml(kpi.note) +
            '</em>' +
            '</span>' +
            '<b aria-hidden="true">›</b>' +
            '</button>'
          );
        })
        .join('') +
      '</section>'
    );
  }

  function renderDepartures(rows) {
    var body = rows
      .map(function (row) {
        var seatClass = row.seatsLow ? 'seat-low' : row.seats === '마감' ? 'muted' : '';
        var dueStack =
          '<span class="payment-stack' +
          (row.dueCount > 0 ? ' has-due' : '') +
          '">' +
          '<small>미수</small>' +
          '<b>' +
          escapeHtml(String(row.dueCount)) +
          '건</b>' +
          '<small>' +
          escapeHtml(row.dueAmount || '미수 없음') +
          '</small>' +
          '</span>';

        return (
          '<tr>' +
          '<td class="time">' +
          escapeHtml(row.time) +
          '</td>' +
          '<td>' +
          '<a href="#" class="product-link">' +
          escapeHtml(row.productName) +
          '<span>예약현황 ›</span></a>' +
          '<small class="code">' +
          escapeHtml(row.productCode) +
          '</small>' +
          '</td>' +
          '<td>' +
          escapeHtml(row.period) +
          '</td>' +
          '<td><b>' +
          escapeHtml(String(row.people)) +
          '명</b></td>' +
          '<td>' +
          escapeHtml(row.composition) +
          '</td>' +
          '<td class="' +
          seatClass +
          '">' +
          escapeHtml(row.seats) +
          '</td>' +
          '<td><span class="payment-stack"><small>결제</small><b>완료 ' +
          escapeHtml(String(row.paidCount)) +
          '건</b></span></td>' +
          '<td>' +
          dueStack +
          '</td>' +
          '<td>' +
          escapeHtml(row.manager) +
          '</td>' +
          '<td>' +
          badge(row.status, row.statusClass) +
          '</td>' +
          '</tr>'
        );
      })
      .join('');

    return (
      '<section class="panel departure-panel">' +
      '<div class="panel-head">' +
      '<div><h2>오늘의 출발상품 <span class="count">' +
      rows.length +
      '</span></h2>' +
      '<p>상품별 출발 준비와 결제 문제를 한눈에 확인하세요.</p></div>' +
      '<button type="button" class="text-btn" data-link="departures">전체 출발현황 보기 →</button>' +
      '</div>' +
      '<div class="table-wrap"><table>' +
      '<thead><tr>' +
      '<th>출발</th><th>상품명 / 상품코드</th><th>여행기간</th><th>예약인원</th><th>인원구성</th>' +
      '<th>잔여좌석</th><th>결제 현황</th><th>미수 현황</th><th>담당자</th><th>출발상태</th>' +
      '</tr></thead>' +
      '<tbody>' +
      body +
      '</tbody></table></div></section>'
    );
  }

  function renderSalesChart(chart) {
    var periods = chart.periods
      .map(function (period) {
        return (
          '<button type="button" class="' +
          (period === chart.activePeriod ? 'active' : '') +
          '" data-chart-period="' +
          escapeHtml(period) +
          '">' +
          escapeHtml(period) +
          '</button>'
        );
      })
      .join('');

    var summary = chart.summary
      .map(function (item) {
        return (
          '<div><small>' +
          escapeHtml(item.label) +
          '</small><b>' +
          escapeHtml(item.value) +
          '</b><em class="' +
          (item.down ? 'down' : '') +
          '">' +
          escapeHtml(item.change) +
          '</em></div>'
        );
      })
      .join('');

    var bars = chart.bars
      .map(function (day) {
        return (
          '<div class="bar-day">' +
          '<div class="bars">' +
          '<i style="height:' +
          day.reservation +
          '%"></i>' +
          '<b style="height:' +
          day.payment +
          '%"></b>' +
          '</div><span>' +
          escapeHtml(day.label) +
          '</span></div>'
        );
      })
      .join('');

    return (
      '<section class="panel chart-panel">' +
      '<div class="panel-head">' +
      '<div><h2>매출 및 결제현황</h2><p>기간별 예약·결제 흐름</p></div>' +
      '<div class="segmented">' +
      periods +
      '</div></div>' +
      '<div class="chart-summary">' +
      summary +
      '</div>' +
      '<div class="bar-chart" aria-label="최근 7일 매출 차트">' +
      bars +
      '</div>' +
      '<div class="legend">' +
      '<span><i class="blue" aria-hidden="true"></i>예약금액</span>' +
      '<span><i class="sky" aria-hidden="true"></i>결제금액</span>' +
      '</div></section>'
    );
  }

  function renderStatus(status) {
    var list = status.items
      .map(function (item) {
        return (
          '<button type="button">' +
          '<i class="' +
          escapeHtml(item.tone) +
          '" aria-hidden="true"></i>' +
          '<span>' +
          escapeHtml(item.label) +
          '</span>' +
          '<b>' +
          escapeHtml(String(item.count)) +
          '</b>' +
          '<small>' +
          escapeHtml(item.percent) +
          '</small></button>'
        );
      })
      .join('');

    return (
      '<section class="panel status-panel">' +
      '<div class="panel-head">' +
      '<div><h2>예약 상태 요약</h2><p>전체 예약 ' +
      escapeHtml(String(status.total)) +
      '건</p></div>' +
      '<button type="button" class="more" aria-label="더보기">•••</button>' +
      '</div>' +
      '<div class="status-body">' +
      '<div class="donut" aria-hidden="true"><div><b>' +
      escapeHtml(String(status.total)) +
      '</b><span>전체예약</span></div></div>' +
      '<div class="status-list">' +
      list +
      '</div></div></section>'
    );
  }

  function renderRecent(recent) {
    var rows = recent.rows
      .map(function (row) {
        return (
          '<tr>' +
          '<td><a href="#">' +
          escapeHtml(row.code) +
          '</a><small class="subtext">' +
          escapeHtml(row.timeLabel) +
          '</small></td>' +
          '<td class="product-cell">' +
          escapeHtml(row.productName) +
          '</td>' +
          '<td>' +
          escapeHtml(row.departure) +
          '</td>' +
          '<td><b>' +
          escapeHtml(row.guest) +
          '</b></td>' +
          '<td>' +
          escapeHtml(String(row.people)) +
          '명</td>' +
          '<td class="money">' +
          escapeHtml(row.totalAmount) +
          '</td>' +
          '<td class="' +
          (row.dueAmount ? 'money-danger' : 'muted') +
          '">' +
          escapeHtml(row.dueAmount || '-') +
          '</td>' +
          '<td>' +
          badge(row.reserveStatus, row.reserveClass) +
          '</td>' +
          '<td>' +
          badge(row.paymentStatus, row.paymentClass) +
          '</td>' +
          '<td>' +
          escapeHtml(row.channel) +
          '</td></tr>'
        );
      })
      .join('');

    return (
      '<section class="panel recent-panel">' +
      '<div class="panel-head">' +
      '<div><h2>최근 예약</h2><p>오늘 접수된 최신 예약입니다.</p></div>' +
      '<button type="button" class="text-btn" data-link="reservations">전체 예약 보기 →</button>' +
      '</div>' +
      '<div class="table-wrap"><table>' +
      '<thead><tr>' +
      '<th>예약번호 / 일시</th><th>상품명</th><th>출발일</th><th>예약자</th><th>인원</th>' +
      '<th>총 결제금액</th><th>미수금</th><th>예약상태</th><th>결제상태</th><th>판매채널 / 판매점</th>' +
      '</tr></thead><tbody>' +
      rows +
      '</tbody></table></div>' +
      '<div class="table-footer">' +
      '<span>총 ' +
      escapeHtml(String(recent.total)) +
      '건 중 ' +
      escapeHtml(String(recent.rows.length)) +
      '건 표시</span>' +
      '<div class="pagination">' +
      '<button type="button" disabled>‹</button>' +
      '<button type="button" class="active">1</button>' +
      '<button type="button">2</button>' +
      '<button type="button">3</button>' +
      '<button type="button">›</button>' +
      '</div></div></section>'
    );
  }

  function renderTasks(tasks) {
    var list = tasks.items
      .map(function (item) {
        return (
          '<button type="button" data-task="' +
          escapeHtml(item.label) +
          '">' +
          '<i class="' +
          escapeHtml(item.tone) +
          '" aria-hidden="true"></i>' +
          '<span>' +
          escapeHtml(item.label) +
          '</span>' +
          '<b>' +
          escapeHtml(String(item.count)) +
          '건</b>' +
          '<em aria-hidden="true">›</em></button>'
        );
      })
      .join('');

    return (
      '<section class="panel task-panel">' +
      '<div class="panel-head">' +
      '<div><h2>오늘 처리할 업무</h2><p>오늘 우선 확인이 필요한 실무 항목</p></div>' +
      '<div class="task-total"><small>총 처리업무</small><b>' +
      escapeHtml(String(tasks.total)) +
      '건</b></div></div>' +
      '<div class="task-list">' +
      list +
      '</div></section>'
    );
  }

  function renderAlerts(alerts) {
    var summary = alerts.summary
      .map(function (item) {
        return (
          '<span class="' +
          escapeHtml(item.tone) +
          '">' +
          escapeHtml(item.label) +
          ' <b>' +
          escapeHtml(String(item.count)) +
          '</b></span>'
        );
      })
      .join('');

    var list = alerts.items
      .map(function (item) {
        return (
          '<button type="button">' +
          '<span class="alert-tag ' +
          escapeHtml(item.tagClass) +
          '">' +
          escapeHtml(item.tag) +
          '</span>' +
          '<p>' +
          escapeHtml(item.text) +
          '</p><em aria-hidden="true">›</em></button>'
        );
      })
      .join('');

    return (
      '<section class="panel alerts-panel">' +
      '<div class="panel-head">' +
      '<div><h2>업무 알림</h2><p>확인이 필요한 주요 업무</p></div>' +
      '<button type="button" class="text-btn" data-action="ack-alerts">모두 확인</button>' +
      '</div>' +
      '<div class="alert-summary">' +
      summary +
      '</div>' +
      '<div class="alert-list">' +
      list +
      '</div></section>'
    );
  }

  function renderSchedules(schedules) {
    var list = schedules
      .map(function (item) {
        return (
          '<button type="button">' +
          '<span class="date-box"><b>' +
          escapeHtml(item.date) +
          '</b><small>' +
          escapeHtml(item.weekday) +
          '</small></span>' +
          '<i aria-hidden="true"></i>' +
          '<span class="schedule-name"><b>' +
          escapeHtml(item.name) +
          '</b><small>' +
          escapeHtml(item.meta) +
          '</small></span>' +
          badge(item.status, item.statusClass) +
          '<em aria-hidden="true">›</em></button>'
        );
      })
      .join('');

    return (
      '<section class="panel schedule-panel">' +
      '<div class="panel-head">' +
      '<div><h2>출발 예정 일정</h2><p>향후 7일 내 출발상품</p></div>' +
      '<button type="button" class="text-btn" data-link="calendar">예약달력 보기 →</button>' +
      '</div>' +
      '<div class="timeline">' +
      list +
      '</div></section>'
    );
  }

  function renderDepartureSummary(items) {
    var list = items
      .map(function (item) {
        return (
          '<button type="button">' +
          '<i class="' +
          escapeHtml(item.tone) +
          '" aria-hidden="true"></i>' +
          '<span>' +
          escapeHtml(item.label) +
          '</span><b>' +
          escapeHtml(item.value) +
          '</b><em aria-hidden="true">›</em></button>'
        );
      })
      .join('');

    return (
      '<section class="panel schedule-panel">' +
      '<div class="panel-head"><div><h2>출발 현황 요약</h2><p>향후 7일 기준</p></div></div>' +
      '<div class="departure-summary">' +
      list +
      '</div></section>'
    );
  }

  function renderReceivables(rows) {
    var body = rows
      .map(function (row) {
        return (
          '<tr>' +
          '<td><a href="#">' +
          escapeHtml(row.code) +
          '</a></td>' +
          '<td><b>' +
          escapeHtml(row.guest) +
          '</b></td>' +
          '<td><a href="#" class="table-product-link">' +
          escapeHtml(row.productName) +
          '</a></td>' +
          '<td>' +
          escapeHtml(row.departure) +
          '</td>' +
          '<td class="money">' +
          escapeHtml(row.totalAmount) +
          '</td>' +
          '<td class="money">' +
          escapeHtml(row.paidAmount) +
          '</td>' +
          '<td class="money-danger"><b>' +
          escapeHtml(row.dueAmount) +
          '</b></td>' +
          '<td><span class="due ' +
          escapeHtml(row.dueClass) +
          '">' +
          escapeHtml(row.dueLabel) +
          '</span></td>' +
          '<td><span class="due ' +
          escapeHtml(row.departureClass) +
          '">' +
          escapeHtml(row.departureLabel) +
          '</span></td>' +
          '<td><button type="button" class="small-btn" data-payment="' +
          escapeHtml(row.code) +
          '">결제등록</button></td></tr>'
        );
      })
      .join('');

    return (
      '<section class="panel receivable-panel">' +
      '<div class="panel-head">' +
      '<div><h2>미수금 확인 <span class="count danger-count">' +
      rows.length +
      '</span></h2>' +
      '<p>출발일과 결제기한이 가까운 예약을 우선 확인하세요.</p></div>' +
      '<button type="button" class="text-btn" data-link="receivables">미수금 전체보기 →</button>' +
      '</div>' +
      '<div class="table-wrap"><table>' +
      '<thead><tr>' +
      '<th>예약번호</th><th>예약자</th><th>상품명</th><th>출발일</th><th>총금액</th>' +
      '<th>결제금액</th><th>미수금</th><th>결제기한</th><th>출발임박</th><th>관리</th>' +
      '</tr></thead><tbody>' +
      body +
      '</tbody></table></div></section>'
    );
  }

  function renderChannels(channels) {
    var bar = channels
      .map(function (item) {
        return '<i class="' + escapeHtml(item.key) + '" style="width:' + item.percent + '%"></i>';
      })
      .join('');

    var list = channels
      .map(function (item) {
        return (
          '<div>' +
          '<i class="' +
          escapeHtml(item.key) +
          '" aria-hidden="true"></i>' +
          '<span>' +
          escapeHtml(item.label) +
          '</span>' +
          '<b>' +
          escapeHtml(String(item.percent)) +
          '%</b>' +
          '<small>' +
          escapeHtml(String(item.count)) +
          '건</small></div>'
        );
      })
      .join('');

    return (
      '<section class="panel channel-panel">' +
      '<div class="panel-head"><div><h2>판매채널 현황</h2><p>이번 달 예약 비중</p></div></div>' +
      '<div class="channel-bar">' +
      bar +
      '</div>' +
      '<div class="channel-list">' +
      list +
      '</div></section>'
    );
  }

  function renderAgencies(agencies) {
    var rows = agencies
      .map(function (item) {
        return (
          '<button type="button">' +
          '<strong><em>' +
          escapeHtml(String(item.rank)) +
          '</em>' +
          escapeHtml(item.name) +
          '</strong>' +
          '<span>' +
          escapeHtml(String(item.reservations)) +
          '건</span>' +
          '<span>' +
          escapeHtml(String(item.people)) +
          '명</span>' +
          '<span>' +
          escapeHtml(item.sales) +
          '</span>' +
          '<span>' +
          escapeHtml(item.settlement) +
          '</span></button>'
        );
      })
      .join('');

    return (
      '<section class="panel agency-panel">' +
      '<div class="panel-head">' +
      '<div><h2>판매점 TOP 5</h2><p>이번 달 판매 실적</p></div>' +
      '<button type="button" class="text-btn" data-link="agencies">전체보기 →</button>' +
      '</div>' +
      '<div class="mini-table">' +
      '<div class="mini-head">' +
      '<span>판매점명</span><span>예약</span><span>인원</span><span>판매금액</span><span>정산예정액</span>' +
      '</div>' +
      rows +
      '</div></section>'
    );
  }

  function renderDashboard(data) {
    return [
      renderPageHead(data.meta),
      renderKpis(data.kpis),
      renderDepartures(data.departuresToday),
      '<div class="grid-main">' + renderSalesChart(data.salesChart) + renderStatus(data.reservationStatus) + '</div>',
      renderRecent(data.recentReservations),
      '<div class="work-grid">' + renderTasks(data.tasks) + renderAlerts(data.alerts) + '</div>',
      '<div class="grid-main lower">' +
        renderSchedules(data.schedules) +
        renderDepartureSummary(data.departureSummary) +
        '</div>',
      renderReceivables(data.receivables),
      '<div class="grid-main bottom">' + renderChannels(data.channels) + renderAgencies(data.topAgencies) + '</div>',
      '<footer>최근 업데이트 ' +
        escapeHtml(data.meta.updatedAt) +
        ' · ' +
        escapeHtml(data.meta.version) +
        '</footer>'
    ].join('');
  }

  function bindEvents(root) {
    if (!root) {
      return;
    }

    var toast = global.AOSAdmin && global.AOSAdmin.showToast
      ? global.AOSAdmin.showToast
      : function (msg) {
          window.alert(msg);
        };

    root.addEventListener('click', function (event) {
      var target = event.target.closest('button, a');
      if (!target || !root.contains(target)) {
        return;
      }

      if (target.matches('a[href="#"]')) {
        event.preventDefault();
      }

      if (target.getAttribute('data-action') === 'refresh') {
        toast('대시보드 데이터를 새로고침했습니다.');
        return;
      }

      if (target.getAttribute('data-action') === 'ack-alerts') {
        toast('업무 알림을 모두 확인 처리했습니다.');
        return;
      }

      if (target.hasAttribute('data-kpi')) {
        toast(target.querySelector('small').textContent + ' 상세 화면은 준비 중입니다.');
        return;
      }

      if (target.hasAttribute('data-task')) {
        toast(target.getAttribute('data-task') + ' 목록을 확인합니다.');
        return;
      }

      if (target.hasAttribute('data-payment')) {
        toast('예약 ' + target.getAttribute('data-payment') + ' 결제등록을 준비합니다.');
        return;
      }

      if (target.hasAttribute('data-chart-period')) {
        root.querySelectorAll('[data-chart-period]').forEach(function (btn) {
          btn.classList.toggle('active', btn === target);
        });
        toast(target.getAttribute('data-chart-period') + ' 기준으로 표시합니다.');
        return;
      }

      if (target.hasAttribute('data-link') || target.classList.contains('text-btn') || target.classList.contains('small-btn')) {
        if (!target.hasAttribute('data-payment')) {
          toast('해당 화면은 준비 중입니다.');
        }
      }
    });
  }

  function mount(targetSelector, data) {
    var target = document.querySelector(targetSelector || '#dashboard-root');
    if (!target) {
      return;
    }
    target.innerHTML = renderDashboard(data || global.AOSDashboardData);
    bindEvents(target);
  }

  global.AOSDashboard = {
    mount: mount,
    render: renderDashboard
  };
})(window);
