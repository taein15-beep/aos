(function () {
  window.getValue = function (id) {
    var element = document.getElementById(id);
    return element ? element.value : '';
  };

  window.setValue = function (id, value) {
    var element = document.getElementById(id);
    if (element) element.value = value;
  };

  function syncPassengerUnitPrices() {
    var passengerCard = document.querySelector('.passenger-summary-card');
    var adultUnitPrice = document.getElementById('adultUnitPrice');
    var childUnitPrice = document.getElementById('childUnitPrice');
    var infantUnitPrice = document.getElementById('infantUnitPrice');
    if (!passengerCard || !adultUnitPrice || !childUnitPrice || !infantUnitPrice) return;

    var formatUnitPrice = typeof window.formatMoney === 'function'
      ? window.formatMoney
      : function (value) { return Number(value || 0).toLocaleString('ko-KR') + '원'; };

    adultUnitPrice.textContent = formatUnitPrice(Number(passengerCard.dataset.adultUnitPrice || 0));
    childUnitPrice.textContent = formatUnitPrice(Number(passengerCard.dataset.childUnitPrice || 0));
    infantUnitPrice.textContent = formatUnitPrice(Number(passengerCard.dataset.infantUnitPrice || 0));
  }

  function syncPassengerPaymentSummary() {
    var passengerCard = document.querySelector('.passenger-summary-card');
    var countElement = passengerCard && passengerCard.querySelector('strong');
    var adultPaymentSubtotal = document.getElementById('adultPaymentSubtotal');
    var childPaymentSubtotal = document.getElementById('childPaymentSubtotal');
    var totalPaymentAmount = document.getElementById('billingTotalAmount');
    if (!passengerCard || !countElement || !adultPaymentSubtotal || !childPaymentSubtotal || !totalPaymentAmount) return;

    var adultSubtotal = Number(passengerCard.dataset.adultUnitPrice || 0) * Number(countElement.dataset.adultCount || 0);
    var childSubtotal = Number(passengerCard.dataset.childUnitPrice || 0) * Number(countElement.dataset.childCount || 0);
    var formatPaymentAmount = typeof window.formatMoney === 'function'
      ? window.formatMoney
      : function (value) { return Number(value || 0).toLocaleString('ko-KR') + '원'; };

    adultPaymentSubtotal.textContent = formatPaymentAmount(adultSubtotal);
    childPaymentSubtotal.textContent = formatPaymentAmount(childSubtotal);
    totalPaymentAmount.textContent = formatPaymentAmount(adultSubtotal + childSubtotal);
  }

  syncPassengerUnitPrices();
  syncPassengerPaymentSummary();

  var originalUpdateBillingSummary = window.updateBillingSummary;
  if (typeof originalUpdateBillingSummary === 'function') {
    window.updateBillingSummary = function () {
      originalUpdateBillingSummary();
      syncPassengerPaymentSummary();
    };
  }

  var passengerSummaryCard = document.querySelector('.passenger-summary-card');
  if (passengerSummaryCard) {
    new MutationObserver(function () {
      syncPassengerUnitPrices();
      syncPassengerPaymentSummary();
    }).observe(passengerSummaryCard, {
      attributes: true,
      subtree: true
    });
  }

  var summaryPaymentStatus = document.getElementById('summaryPaymentStatus');
  var detailPaymentStatus = document.getElementById('detailPaymentStatus');

  if (!summaryPaymentStatus || !detailPaymentStatus) return;

  function syncLastModifiedInfo() {
    var historyBody = document.getElementById('changeHistoryBody');
    var lastModifiedBy = document.getElementById('lastModifiedBy');
    var lastModifiedAt = document.getElementById('lastModifiedAt');
    if (!historyBody || !lastModifiedBy || !lastModifiedAt) return;

    var rows = Array.from(historyBody.rows).filter(function (row) {
      return row.cells.length >= 5 && /^\d{4}-\d{2}-\d{2}/.test(row.cells[0].textContent.trim());
    });
    if (!rows.length) return;
    rows.sort(function (a, b) {
      return b.cells[0].textContent.trim().localeCompare(a.cells[0].textContent.trim());
    });
    var latest = rows[0];
    var dateText = latest.cells[0].textContent.trim();
    lastModifiedBy.textContent = latest.cells[4].textContent.trim();
    lastModifiedAt.textContent = dateText;
    lastModifiedAt.dateTime = dateText.replace(' ', 'T');
  }

  syncLastModifiedInfo();
  var changeHistoryBody = document.getElementById('changeHistoryBody');
  if (changeHistoryBody) {
    new MutationObserver(syncLastModifiedInfo).observe(changeHistoryBody, { childList: true });
  }

  function syncDetailPaymentStatus() {
    detailPaymentStatus.value = summaryPaymentStatus.textContent.trim();
  }

  function paymentStatusClass(status) {
    if (status === '전액결제완료' || status === '환불완료') return 'badge b-green';
    if (status === '미결제') return 'badge b-red';
    if (status === '환불요청') return 'badge b-purple';
    return 'badge b-blue';
  }

  function applySelectedPaymentStatus() {
    var status = detailPaymentStatus.value;
    var badgeClass = paymentStatusClass(status);
    var paymentStatusText = document.getElementById('paymentStatusText');
    var paymentStatusBadge = document.getElementById('paymentStatusBadge');

    summaryPaymentStatus.textContent = status;
    summaryPaymentStatus.className = badgeClass;
    if (paymentStatusText) paymentStatusText.textContent = status;
    if (paymentStatusBadge) {
      paymentStatusBadge.textContent = status;
      paymentStatusBadge.className = badgeClass;
    }
  }

  syncDetailPaymentStatus();
  detailPaymentStatus.addEventListener('change', applySelectedPaymentStatus);
  new MutationObserver(syncDetailPaymentStatus).observe(summaryPaymentStatus, {
    attributes: true,
    childList: true,
    characterData: true,
    subtree: true
  });

  var passengerModal = document.getElementById('passengerChangeModal');
  var passengerTrigger = document.querySelector('[data-action="change-passengers"]');
  if (passengerModal && passengerTrigger) {
    var passengerTypes = ['adult', 'child', 'infant'];
    var passengerInputs = {
      adult: document.getElementById('passengerAdultCount'),
      child: document.getElementById('passengerChildCount'),
      infant: document.getElementById('passengerInfantCount')
    };
    var passengerCard = document.querySelector('.passenger-summary-card');
    var passengerCountSource = passengerCard.querySelector('strong');
    var previousBodyOverflow = '';

    function passengerMoney(value) {
      return Number(value || 0).toLocaleString('ko-KR') + '원';
    }
    function passengerRates() {
      return {
        adult: Number(passengerCard.dataset.adultUnitPrice || 0),
        child: Number(passengerCard.dataset.childUnitPrice || 0),
        infant: Number(passengerCard.dataset.infantUnitPrice || 0)
      };
    }
    function currentPassengerCounts() {
      return {
        adult: Number(passengerCountSource.dataset.adultCount || 0),
        child: Number(passengerCountSource.dataset.childCount || 0),
        infant: Number(passengerCountSource.dataset.infantCount || 0)
      };
    }
    function changedPassengerCounts() {
      var result = {};
      passengerTypes.forEach(function (type) {
        var clean = String(passengerInputs[type].value || '').replace(/\D/g, '');
        result[type] = Math.max(0, parseInt(clean || '0', 10));
        passengerInputs[type].value = result[type];
      });
      return result;
    }
    function passengerTotal(counts) {
      var rates = passengerRates();
      return passengerTypes.reduce(function (sum, type) { return sum + rates[type] * counts[type]; }, 0);
    }
    function passengerText(counts) {
      return '대' + counts.adult + ' / 소' + counts.child + ' / 유' + counts.infant;
    }
    function setPassengerInfo() {
      document.getElementById('passengerReservationNo').textContent = document.querySelector('.reservation-basic-grid .value').textContent.trim();
      document.getElementById('passengerProductName').textContent = document.querySelector('.reservation-product-heading .product-name').textContent.trim();
      document.getElementById('passengerDepartureDate').textContent = document.querySelector('.summary-date-departure').textContent.trim();
      document.getElementById('passengerCustomerName').textContent = document.getElementById('detailCustomerName').value;
    }
    function renderPassengerChange() {
      var before = currentPassengerCounts();
      var after = changedPassengerCounts();
      var rates = passengerRates();
      passengerTypes.forEach(function (type) {
        var row = passengerModal.querySelector('[data-passenger-type="' + type + '"]');
        row.querySelector('.passenger-rate').textContent = passengerMoney(rates[type]);
        row.querySelector('.passenger-current').textContent = before[type] + '명';
        row.querySelector('.passenger-subtotal').textContent = passengerMoney(rates[type] * after[type]);
        row.classList.toggle('is-changed', before[type] !== after[type]);
      });
      var beforeTotal = passengerTotal(before);
      var afterTotal = passengerTotal(after);
      var difference = afterTotal - beforeTotal;
      document.getElementById('passengerBeforePeople').textContent = passengerText(before);
      document.getElementById('passengerAfterPeople').textContent = passengerText(after);
      document.getElementById('passengerBeforeAmount').textContent = passengerMoney(beforeTotal);
      document.getElementById('passengerAfterAmount').textContent = passengerMoney(afterTotal);
      var differenceRow = document.getElementById('passengerDifferenceRow');
      var label = document.getElementById('passengerDifferenceLabel');
      var amount = document.getElementById('passengerDifferenceAmount');
      differenceRow.className = 'passenger-difference ' + (difference > 0 ? 'is-extra' : difference < 0 ? 'is-refund' : 'is-same');
      label.textContent = difference > 0 ? '추가 결제 예정금액' : difference < 0 ? '환불 예정금액' : '결제금액 변동 없음';
      amount.textContent = difference ? passengerMoney(Math.abs(difference)) : '';
      document.getElementById('passengerPaymentNotice').textContent = difference > 0
        ? '인원 변경 후 ' + passengerMoney(difference) + '의 추가 결제가 필요합니다.'
        : difference < 0 ? '인원 변경 후 ' + passengerMoney(Math.abs(difference)) + '의 환불 처리가 필요합니다.'
          : '인원 변경에 따른 결제금액 변동이 없습니다.';
      document.getElementById('passengerAdultWarning').hidden = !(after.adult === 0 && after.child + after.infant > 0);
      return { before: before, after: after, beforeTotal: beforeTotal, afterTotal: afterTotal, difference: difference };
    }
    function resetPassengerModal() {
      var current = currentPassengerCounts();
      passengerTypes.forEach(function (type) { passengerInputs[type].value = current[type]; });
      document.getElementById('passengerChangeReason').value = '';
      document.getElementById('passengerOtherReason').value = '';
      document.getElementById('passengerOtherReasonField').hidden = true;
      document.getElementById('passengerAdminMemo').value = '';
      document.getElementById('passengerMemoCount').textContent = '0';
      document.getElementById('passengerValidationMessage').hidden = true;
      showPassengerEdit();
      setPassengerInfo();
      renderPassengerChange();
    }
    function openPassengerModal() {
      resetPassengerModal();
      previousBodyOverflow = document.body.style.overflow;
      document.body.classList.add('passenger-modal-open');
      passengerModal.style.display = 'flex';
      passengerModal.setAttribute('aria-hidden', 'false');
      passengerInputs.adult.focus();
    }
    function closePassengerModal() {
      passengerModal.style.display = 'none';
      passengerModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('passenger-modal-open');
      document.body.style.overflow = previousBodyOverflow;
      passengerTrigger.focus();
    }
    function showPassengerEdit() {
      document.getElementById('passengerEditView').hidden = false;
      document.getElementById('passengerEditFooter').hidden = false;
      document.getElementById('passengerConfirmView').hidden = true;
      document.getElementById('passengerConfirmFooter').hidden = true;
    }
    function validatePassengerChange() {
      var result = renderPassengerChange();
      var reason = document.getElementById('passengerChangeReason').value;
      var error = '';
      if (result.after.adult + result.after.child + result.after.infant === 0) error = '예약 인원은 최소 1명 이상이어야 합니다.';
      else if (passengerTypes.every(function (type) { return result.before[type] === result.after[type]; })) error = '변경된 인원이 없습니다.';
      else if (!reason) error = '변경 사유를 선택해 주세요.';
      else if (reason === '기타' && !document.getElementById('passengerOtherReason').value.trim()) error = '기타 상세 사유를 입력해 주세요.';
      var message = document.getElementById('passengerValidationMessage');
      message.textContent = error;
      message.hidden = !error;
      return error ? null : result;
    }
    function showPassengerConfirmation() {
      var result = validatePassengerChange();
      if (!result) return;
      var differenceLabel = result.difference > 0 ? '추가 결제 예정금액' : result.difference < 0 ? '환불 예정금액' : '결제금액 변동';
      document.getElementById('passengerConfirmDetails').innerHTML =
        '<div><span>대인</span><strong>' + result.before.adult + '명 → ' + result.after.adult + '명</strong></div>' +
        '<div><span>소인</span><strong>' + result.before.child + '명 → ' + result.after.child + '명</strong></div>' +
        '<div><span>유아</span><strong>' + result.before.infant + '명 → ' + result.after.infant + '명</strong></div>' +
        '<div><span>예약금액</span><strong>' + passengerMoney(result.beforeTotal) + ' → ' + passengerMoney(result.afterTotal) + '</strong></div>' +
        '<div><span>' + differenceLabel + '</span><strong>' + (result.difference ? passengerMoney(Math.abs(result.difference)) : '없음') + '</strong></div>';
      document.getElementById('passengerEditView').hidden = true;
      document.getElementById('passengerEditFooter').hidden = true;
      document.getElementById('passengerConfirmView').hidden = false;
      document.getElementById('passengerConfirmFooter').hidden = false;
      document.querySelector('.passenger-confirm-back').focus();
    }
    function confirmPassengerChange() {
      var counts = changedPassengerCounts();
      passengerCountSource.dataset.adultCount = counts.adult;
      passengerCountSource.dataset.childCount = counts.child;
      passengerCountSource.dataset.infantCount = counts.infant;
      passengerCountSource.textContent = passengerText(counts);
      syncPassengerUnitPrices();
      syncPassengerPaymentSummary();
      var customer = document.getElementById('detailCustomerName').value;
      document.getElementById('summaryCustomerPeople').textContent = customer + ' / ' + (counts.adult + counts.child + counts.infant) + '명';
      closePassengerModal();
    }
    passengerTrigger.addEventListener('click', openPassengerModal);
    passengerModal.querySelector('.passenger-modal-close').addEventListener('click', closePassengerModal);
    passengerModal.querySelector('.passenger-modal-cancel').addEventListener('click', closePassengerModal);
    passengerModal.querySelector('.passenger-apply-btn').addEventListener('click', showPassengerConfirmation);
    passengerModal.querySelector('.passenger-confirm-back').addEventListener('click', function () { showPassengerEdit(); passengerInputs.adult.focus(); });
    passengerModal.querySelector('.passenger-confirm-btn').addEventListener('click', confirmPassengerChange);
    passengerModal.addEventListener('click', function (event) { if (event.target === passengerModal) closePassengerModal(); });
    passengerModal.querySelectorAll('[data-step]').forEach(function (button) {
      button.addEventListener('click', function () {
        var input = button.parentElement.querySelector('input');
        input.value = Math.max(0, Number(input.value || 0) + Number(button.dataset.step));
        renderPassengerChange();
      });
    });
    Object.keys(passengerInputs).forEach(function (type) {
      passengerInputs[type].addEventListener('input', function () {
        passengerInputs[type].value = passengerInputs[type].value.replace(/\D/g, '');
        renderPassengerChange();
      });
    });
    document.getElementById('passengerChangeReason').addEventListener('change', function (event) {
      document.getElementById('passengerOtherReasonField').hidden = event.target.value !== '기타';
    });
    document.getElementById('passengerAdminMemo').addEventListener('input', function (event) {
      document.getElementById('passengerMemoCount').textContent = event.target.value.length;
    });
    document.addEventListener('keydown', function (event) {
      if (passengerModal.getAttribute('aria-hidden') === 'true') return;
      if (event.key === 'Escape') { event.preventDefault(); closePassengerModal(); return; }
      if (event.key === 'Tab') {
        var focusable = Array.from(passengerModal.querySelectorAll('button:not([hidden]),input:not([hidden]),select:not([hidden]),textarea:not([hidden])')).filter(function (el) { return !el.closest('[hidden]'); });
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
  }
})();
