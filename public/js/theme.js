(function () {
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var dark = document.documentElement.classList.toggle('dark-mode');
    localStorage.setItem('bb-theme', dark ? 'dark' : 'light');
    btn.textContent = dark ? '☀️' : '🌙';
  });
  if (document.documentElement.classList.contains('dark-mode')) {
    btn.textContent = '☀️';
  }
})();
