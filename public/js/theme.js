(function () {
  var btns = document.querySelectorAll('.theme-toggle-btn');
  if (!btns.length) return;
  function setIcon(dark) {
    btns.forEach(function (b) { b.textContent = dark ? '☀️' : '🌙'; });
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
