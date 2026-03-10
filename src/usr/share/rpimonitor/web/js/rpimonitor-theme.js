// RPi-Monitor Theme Switcher

var interLoaded = false;

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
  if (theme === 'modern' && !interLoaded) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
    interLoaded = true;
  }
}

$(function () {
  var saved = localStorage.getItem('rpiTheme') || 'default';
  applyTheme(saved);
  $('#thememenu li[data-theme="' + saved + '"]').addClass('active-theme');
});
