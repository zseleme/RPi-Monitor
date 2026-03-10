// RPi-Monitor Theme Switcher — Tailwind CDN edition

var tailwindLoaded = false;
var interLoaded    = false;
var themeObserver  = null;

/* ── helpers ─────────────────────────────────────────────────── */

function addTwClasses(target, classes) {
  var $els = typeof target === 'string' ? $(target) : $(target);
  $els.each(function () {
    var $el  = $(this);
    var prev = $el.attr('data-tw') || '';
    var toAdd = classes.split(/\s+/).filter(function (c) {
      return c && !$el.hasClass(c);
    });
    if (!toAdd.length) return;
    $el.addClass(toAdd.join(' '));
    $el.attr('data-tw', (prev + ' ' + toAdd.join(' ')).trim());
  });
}

function clearTailwindClasses() {
  stopObserver();
  $('[data-tw]').each(function () {
    var $el = $(this);
    $el.removeClass($el.attr('data-tw'));
    $el.removeAttr('data-tw');
  });
}

/* ── theme API ───────────────────────────────────────────────── */

function setTheme(theme) {
  if (document.body.classList.contains('theme-modern') && theme !== 'modern') {
    clearTailwindClasses();
  }
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
  if (theme === 'modern') loadModern();
}

/* ── modern loader ───────────────────────────────────────────── */

function loadModern() {
  if (!interLoaded) {
    var lnk  = document.createElement('link');
    lnk.rel  = 'stylesheet';
    lnk.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(lnk);
    interLoaded = true;
  }

  if (!tailwindLoaded) {
    window.tailwind = { config: { corePlugins: { preflight: false } } };
    var s    = document.createElement('script');
    s.src    = 'https://cdn.tailwindcss.com';
    s.onload = function () {
      tailwindLoaded = true;
      applyTailwindClasses();
      startObserver();
    };
    document.head.appendChild(s);
  } else {
    applyTailwindClasses();
    startObserver();
  }
}

/* ── class injection ─────────────────────────────────────────── */

function applyTailwindClasses() {
  if (!document.body.classList.contains('theme-modern')) return;

  // Body
  addTwClasses('body', '!bg-slate-100 font-sans');

  // ── Navbar ────────────────────────────────────────────────────
  addTwClasses('.navbar.navbar-fixed-top',
    '!bg-slate-900 !border-0 !shadow-xl');
  addTwClasses('.navbar-brand',
    '!text-sky-400 !font-bold !text-lg !tracking-tight');
  addTwClasses('.navbar-inverse .navbar-nav > li > a',
    '!text-slate-400 !text-sm !font-medium');
  addTwClasses('#thememenu > a',
    '!text-slate-400 !text-sm !font-medium');
  addTwClasses('.navbar-inverse .navbar-nav > .active > a',
    '!text-sky-400');
  addTwClasses('.navbar-inverse .navbar-nav > .open > a',
    '!bg-slate-800 !text-slate-100');
  addTwClasses('.navbar-toggle',
    '!border-slate-700');
  addTwClasses('.navbar-toggle .icon-bar',
    '!bg-slate-400');

  // ── Dropdowns ─────────────────────────────────────────────────
  $('.dropdown-menu').each(function () {
    addTwClasses(this,
      '!bg-slate-800 !border !border-slate-700 !rounded-xl !shadow-2xl !p-1.5 !mt-0');
  });
  $('.dropdown-menu > li > a').each(function () {
    addTwClasses(this,
      '!text-slate-300 !text-sm !font-medium !rounded-lg');
  });
  $('.dropdown-menu .dropdown-header').each(function () {
    addTwClasses(this,
      '!text-slate-500 !text-xs !uppercase !tracking-widest !px-3');
  });
  $('.dropdown-menu .divider').each(function () {
    addTwClasses(this, '!bg-slate-700');
  });

  // ── Cards (list-group-item) ───────────────────────────────────
  $('.list-group-item').each(function () {
    if (!$(this).attr('data-tw')) {
      addTwClasses(this,
        '!bg-white !rounded-2xl !border !border-slate-200 !shadow-sm !mb-3 !p-5 ' +
        '!border-l-4 !border-l-blue-500 !transition-all !duration-200');
    }
  });

  // ── Metric titles & values ────────────────────────────────────
  $('.Title').each(function () {
    if (!$(this).attr('data-tw')) {
      addTwClasses(this,
        '!text-slate-400 !text-xs !font-semibold !uppercase !tracking-widest !mb-1 !block');
    }
  });
  $('.Text').each(function () {
    if (!$(this).attr('data-tw')) {
      addTwClasses(this,
        '!text-slate-700 !text-sm !leading-relaxed');
    }
  });

  // ── Progress bars ─────────────────────────────────────────────
  $('.progress').each(function () {
    if (!$(this).attr('data-tw')) {
      addTwClasses(this,
        '!bg-slate-200 !rounded-full !shadow-none !mt-2 !overflow-hidden');
    }
  });
  $('.progress-bar').each(function () {
    if (!$(this).attr('data-tw')) {
      var cls = '!rounded-full !shadow-none !transition-all !duration-300';
      if      ($(this).hasClass('progress-bar-warning')) cls += ' !bg-amber-400';
      else if ($(this).hasClass('progress-bar-danger'))  cls += ' !bg-red-500';
      else if ($(this).hasClass('progress-bar-success')) cls += ' !bg-emerald-500';
      else                                                cls += ' !bg-blue-500';
      addTwClasses(this, cls);
    }
  });

  // ── Labels / badges ───────────────────────────────────────────
  $('.label').each(function () {
    if (!$(this).attr('data-tw')) {
      var cls = '!rounded-full !text-xs !font-semibold !px-2.5 !py-0.5 !border-0 !leading-none';
      if      ($(this).hasClass('label-success')) cls += ' !bg-emerald-100 !text-emerald-700';
      else if ($(this).hasClass('label-danger'))  cls += ' !bg-red-100 !text-red-700';
      else if ($(this).hasClass('label-warning')) cls += ' !bg-amber-100 !text-amber-700';
      else if ($(this).hasClass('label-info'))    cls += ' !bg-sky-100 !text-sky-700';
      else                                         cls += ' !bg-slate-100 !text-slate-500';
      addTwClasses(this, cls);
    }
  });

  // ── Popovers ──────────────────────────────────────────────────
  $('.popover').each(function () {
    if (!$(this).attr('data-tw')) {
      addTwClasses(this,
        '!bg-white !border !border-slate-200 !rounded-2xl !shadow-2xl');
    }
  });
  $('.popover-title').each(function () {
    if (!$(this).attr('data-tw')) {
      addTwClasses(this,
        '!bg-slate-50 !text-slate-900 !font-semibold !text-sm !border-b !border-slate-200');
    }
  });
  $('.popover-content').each(function () {
    if (!$(this).attr('data-tw')) {
      addTwClasses(this, '!text-slate-600 !text-sm');
    }
  });

  // ── Footer ────────────────────────────────────────────────────
  addTwClasses('.navbar-fixed-bottom',
    '!bg-slate-900 !border-t !border-slate-800 !shadow-none');
  addTwClasses('.navbar-fixed-bottom a', '!text-slate-500 !text-xs');

  // ── Modals ────────────────────────────────────────────────────
  $('.modal-content').each(function () {
    if (!$(this).attr('data-tw')) {
      addTwClasses(this, '!rounded-2xl !border-0 !shadow-2xl');
    }
  });
  $('.modal-header').each(function () {
    if (!$(this).attr('data-tw')) {
      addTwClasses(this, '!border-b !border-slate-200 !rounded-t-2xl');
    }
  });
  $('.modal-title').each(function () {
    if (!$(this).attr('data-tw')) {
      addTwClasses(this, '!text-slate-900 !font-semibold');
    }
  });
  $('.modal-footer').each(function () {
    if (!$(this).attr('data-tw')) {
      addTwClasses(this, '!border-t !border-slate-200');
    }
  });
  $('.btn.btn-default').each(function () {
    if (!$(this).attr('data-tw')) {
      addTwClasses(this,
        '!rounded-lg !text-sm !font-medium !border-slate-300 !text-slate-600 !bg-white');
    }
  });
  $('.close').each(function () {
    if (!$(this).attr('data-tw')) {
      addTwClasses(this, '!text-slate-400 !opacity-100');
    }
  });
}

/* ── mutation observer ───────────────────────────────────────── */

function startObserver() {
  if (themeObserver) return;
  var debounce;
  themeObserver = new MutationObserver(function (mutations) {
    var added = mutations.some(function (m) { return m.addedNodes.length > 0; });
    if (added) { clearTimeout(debounce); debounce = setTimeout(applyTailwindClasses, 80); }
  });
  themeObserver.observe(document.body, { childList: true, subtree: true });
}

function stopObserver() {
  if (themeObserver) { themeObserver.disconnect(); themeObserver = null; }
}

/* ── init ────────────────────────────────────────────────────── */

$(function () {
  var saved = localStorage.getItem('rpiTheme') || 'default';
  applyTheme(saved);
  $('#thememenu li[data-theme="' + saved + '"]').addClass('active-theme');
});
