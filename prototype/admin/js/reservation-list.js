(function () {
  function positionMemoTooltip(trigger) {
    var tooltip = trigger.querySelector('.memo-tooltip');
    if (!tooltip) return;

    var triggerRect = trigger.getBoundingClientRect();
    var tooltipRect = tooltip.getBoundingClientRect();
    var gap = 8;
    var edge = 16;
    var left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
    var top = triggerRect.top - tooltipRect.height - gap;

    left = Math.max(edge, Math.min(left, window.innerWidth - tooltipRect.width - edge));
    if (top < edge) top = triggerRect.bottom + gap;

    tooltip.style.left = left + 'px';
    tooltip.style.top = Math.min(top, window.innerHeight - tooltipRect.height - edge) + 'px';
  }

  document.querySelectorAll('.memo-trigger').forEach(function (trigger) {
    trigger.addEventListener('mouseenter', function () {
      positionMemoTooltip(trigger);
    });
    trigger.addEventListener('focus', function () {
      positionMemoTooltip(trigger);
    });
  });
})();
