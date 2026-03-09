// RPi-Monitor Theme Switcher

var tailwindLoaded = false;

function setTheme(theme) {
  localStorage.setItem('rpiTheme', theme);
  applyTheme(theme);
  $('#thememenu li[data-theme]').removeClass('active-theme');
  $('#thememenu li[data-theme="' + theme + '"]').addClass('active-theme');
}

function applyTheme(theme) {
  document.body.classList.remove('theme-dark', 'theme-modern');
  if (theme === 'dark' || theme === 'modern') {
    document.body.classList.add('theme-' + theme);
  }
  if (theme === 'modern' && !tailwindLoaded) {
    var s = document.createElement('script');
    s.src = 'https://cdn.tailwindcss.com';
    document.head.appendChild(s);
    tailwindLoaded = true;
  }
}

$(function () {
  var saved = localStorage.getItem('rpiTheme') || 'default';
  applyTheme(saved);
  $('#thememenu li[data-theme="' + saved + '"]').addClass('active-theme');
});
