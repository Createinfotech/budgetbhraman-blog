(function () {
  var btns = document.querySelectorAll('.theme-toggle-btn');
  if (!btns.length) return;
  function setIcon(dark) {
    btns.forEach(function (b) {
      var iconEl = b.querySelector('.darkmode-widget-icon');
      var labelEl = b.querySelector('.darkmode-widget-label');
      if (iconEl) {
        iconEl.textContent = dark ? '☀️' : '🌙';
        if (labelEl) labelEl.textContent = dark ? 'Light Mode' : 'Dark Mode';
      } else {
        b.textContent = dark ? '☀️' : '🌙';
      }
    });
  }
  btns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dark = document.documentElement.classList.toggle('dark-mode');
      localStorage.setItem('bb-theme', dark ? 'dark' : 'light');
      setIcon(dark);
    });
  });
  if (document.documentElement.classList.contains('dark-mode')) setIcon(true);
})();

(function () {
  var toggle = document.getElementById('nav-toggle');
  var links = document.getElementById('nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', function () {
    var open = links.classList.toggle('nav-links--open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
})();
