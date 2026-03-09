// RPi-Monitor Theme Switcher
// Adds a Theme dropdown to the navbar and handles theme persistence

var TAILWIND_CDN = 'https://cdn.tailwindcss.com';
var tailwindLoaded = false;

function setTheme(theme) {
  localStorage.setItem('rpiTheme', theme);
  applyTheme(theme);
  updateThemeMenu(theme);
}

function applyTheme(theme) {
  document.body.classList.remove('theme-dark', 'theme-modern');
  if (theme === 'dark' || theme === 'modern') {
    document.body.classList.add('theme-' + theme);
  }
  if (theme === 'modern' && !tailwindLoaded) {
    var script = document.createElement('script');
    script.src = TAILWIND_CDN;
    document.head.appendChild(script);
    tailwindLoaded = true;
  }
}

function updateThemeMenu(activeTheme) {
  $('#thememenu li').removeClass('active-theme');
  $('#thememenu li[data-theme="' + activeTheme + '"]').addClass('active-theme');
}

function addThemeMenu() {
  var themeDropdown =
    '<li class="dropdown" id="thememenu">' +
      '<a href="#" class="dropdown-toggle" data-toggle="dropdown">' +
        '<span class="glyphicon glyphicon-adjust"></span> Theme <span class="caret"></span>' +
      '</a>' +
      '<ul class="dropdown-menu" role="menu">' +
        '<li class="dropdown-header">Select Theme</li>' +
        '<li data-theme="default"><a href="#" onclick="setTheme(\'default\'); return false;">' +
          '<span class="theme-dot theme-dot-default"></span>Default</a></li>' +
        '<li data-theme="dark"><a href="#" onclick="setTheme(\'dark\'); return false;">' +
          '<span class="theme-dot theme-dot-dark"></span>Dark</a></li>' +
        '<li data-theme="modern"><a href="#" onclick="setTheme(\'modern\'); return false;">' +
          '<span class="theme-dot theme-dot-modern"></span>Modern</a></li>' +
      '</ul>' +
    '</li>';

  // Insert before the About dropdown (last item in nav)
  var $aboutDropdown = $('.nav.navbar-nav > li.dropdown').last();
  if ($aboutDropdown.length) {
    $aboutDropdown.before(themeDropdown);
  } else {
    $('.nav.navbar-nav').append(themeDropdown);
  }
}

$(function () {
  // rpimonitor.js AddTopmenu() runs before this since it's registered first
  // Use a small delay to ensure the navbar DOM is fully built
  setTimeout(function () {
    addThemeMenu();
    var saved = localStorage.getItem('rpiTheme') || 'default';
    applyTheme(saved);
    updateThemeMenu(saved);
  }, 50);
});
