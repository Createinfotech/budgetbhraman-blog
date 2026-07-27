(function () {
  var tabs = document.querySelectorAll('.sidebar-tab');
  if (!tabs.length) return;
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var name = tab.getAttribute('data-tab');
      var widget = tab.closest('.widget');
      widget.querySelectorAll('.sidebar-tab').forEach(function (t) {
        t.classList.toggle('active', t === tab);
      });
      widget.querySelectorAll('.sidebar-tab-panel').forEach(function (panel) {
        panel.hidden = panel.getAttribute('data-panel') !== name;
      });
    });
  });
})();
