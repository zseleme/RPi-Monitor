/* ── Utils ─────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

function fmtMB(mb) {
  if (mb == null || isNaN(mb)) return '—';
  if (mb >= 1024) return (mb / 1024).toFixed(1) + ' GB';
  return Math.round(mb) + ' MB';
}

function fmtBytes(b) {
  b = Math.abs(parseFloat(b) || 0);
  if (b >= 1e9) return (b / 1e9).toFixed(2) + ' GB';
  if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB';
  if (b >= 1e3) return (b / 1e3).toFixed(0) + ' KB';
  return b + ' B';
}

function pct(used, total) {
  if (!total) return 0;
  return Math.min(100, Math.round(used / total * 100));
}

function fmtUptime(sec) {
  sec = parseFloat(sec);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function setBar(id, p, warn = 75, crit = 90) {
  const el = $(id);
  if (!el) return;
  el.style.width = p + '%';
  el.classList.remove('bg-red-500', 'bg-amber-400');
  if (p >= crit)      el.classList.add('bg-red-500');
  else if (p >= warn) el.classList.add('bg-amber-400');
}

/* ── Clock ─────────────────────────────────────────────────── */
const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
let piTime = null;

function tickClock() {
  const d = piTime ? new Date(piTime) : new Date();
  if (piTime) piTime = new Date(piTime.getTime() + 1000);
  $('clock').textContent =
    String(d.getHours()).padStart(2,'0') + ':' +
    String(d.getMinutes()).padStart(2,'0') + ':' +
    String(d.getSeconds()).padStart(2,'0');
  $('date-display').textContent =
    DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate();
}

/* ── Temperature arc ───────────────────────────────────────── */
function updateArc(temp) {
  const arc = $('temp-arc');
  const p   = Math.min(1, Math.max(0, (temp - 30) / 60));  // 30–90°C range
  arc.style.strokeDashoffset = 289 * (1 - p);
  const color = temp < 60 ? '#22c55e' : temp < 75 ? '#f59e0b' : '#ef4444';
  arc.style.stroke = color;
  $('soc-temp').style.color = color;
  $('temp-status').textContent = temp < 60 ? 'Normal' : temp < 75 ? 'Warm' : 'Hot — throttling risk';
  $('temp-status').className = 'text-center text-xs mt-1 font-medium ' +
    (temp < 60 ? 'text-emerald-400' : temp < 75 ? 'text-amber-400' : 'text-red-400');
}

/* ── Render helpers ────────────────────────────────────────── */
function svcBadge(state, name) {
  const ok = state === 'active';
  return `<div class="flex items-center justify-between px-3 py-2 rounded-lg ${ok ? 'bg-emerald-950/40 border border-emerald-900/30' : 'bg-red-950/30 border border-red-900/20'}">
    <span class="text-xs font-medium ${ok ? 'text-slate-200' : 'text-slate-500'}">${name}</span>
    <div class="flex items-center gap-1.5">
      <span class="w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-500'}"></span>
      <span class="text-xs font-medium ${ok ? 'text-emerald-400' : 'text-red-500'}">${ok ? 'active' : 'inactive'}</span>
    </div>
  </div>`;
}

function portBadge(state, label) {
  const ok = state === 'active';
  return `<div class="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/60">
    <span class="text-xs font-mono font-medium ${ok ? 'text-slate-200' : 'text-slate-500'}">${label}</span>
    <span class="text-xs font-medium ${ok ? 'text-emerald-400' : 'text-slate-600'}">
      ${ok ? '● open' : '○ closed'}
    </span>
  </div>`;
}

function powerRow(label, active, isHistory) {
  const ok    = !active;
  const color = ok ? 'text-emerald-400' : isHistory ? 'text-amber-400' : 'text-red-400';
  const dot   = ok ? 'bg-emerald-400'   : isHistory ? 'bg-amber-400'   : 'bg-red-500';
  const text  = ok ? (isHistory ? 'Never occurred' : 'OK') : (isHistory ? 'Occurred' : 'Active');
  return `<div class="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/50">
    <span class="text-xs font-medium text-slate-300">${label}</span>
    <div class="flex items-center gap-1.5">
      <span class="w-1.5 h-1.5 rounded-full ${dot}"></span>
      <span class="text-xs font-medium ${color}">${text}</span>
    </div>
  </div>`;
}

function parseLogins(raw) {
  if (!raw) return [];
  return raw.split(';').filter(Boolean).slice(0, 3).map(e => {
    const [user, ip, date] = e.split('|');
    return { user: user || '?', ip: ip || '—', date: date || '—' };
  });
}

function loginRow(l, ok) {
  return `<div class="rounded-lg px-2.5 py-1.5 ${ok ? 'bg-emerald-950/30 border border-emerald-900/20' : 'bg-red-950/20 border border-red-900/15'}">
    <p class="text-xs font-mono font-medium text-slate-200 truncate">${l.user}<span class="text-slate-500">@</span>${l.ip}</p>
    <p class="text-xs text-slate-600">${l.date}</p>
  </div>`;
}

/* ── Data fetching ─────────────────────────────────────────── */
let S = {};

function loadStatic() {
  fetch('static.json').then(r => r.json()).then(d => {
    S = d;
    $('hostname').textContent        = d.hostname || 'RPi';
    $('processor').textContent       = d.processor || '—';
    $('processor-short').textContent = (d.processor || '').split(' ').slice(0,4).join(' ');
    $('distribution').textContent    = d.distribution || '—';
    $('kernel').textContent          = d.kernel_version || '—';
    document.title = (d.hostname || 'RPi') + ' · Dashboard';
  }).catch(() => {});
}

function loadDynamic() {
  fetch('dynamic.json').then(r => r.json()).then(d => {

    if (d.localtime) {
      const lt = d.localtime;
      piTime = new Date(lt[0], lt[1]-1, lt[2], lt[3], lt[4], lt[5]);
    }

    $('uptime').textContent = fmtUptime(d.uptime);

    const upgEl  = $('upgrade');
    const hasUpd = d.upgrade && d.upgrade !== '0 upgradable(s)';
    upgEl.textContent = d.upgrade || '0 upgradable(s)';
    upgEl.className   = 'text-sm font-semibold ' + (hasUpd ? 'text-amber-400' : 'text-emerald-400');

    $('load1').textContent          = parseFloat(d.load1).toFixed(2);
    $('load5').textContent          = parseFloat(d.load5).toFixed(2);
    $('load15').textContent         = parseFloat(d.load15).toFixed(2);
    $('cpu-freq-badge').textContent = (d.cpu_frequency || '—') + ' MHz';
    $('cpu-voltage').textContent    = (d.cpu_voltage || '—') + ' V';
    $('cpu-governor').textContent   = d.scaling_governor || '—';

    const temp = parseFloat(d.soc_temp);
    $('soc-temp').textContent = temp.toFixed(1);
    updateArc(temp);

    const memTotal = S.memory_total || 1;
    const memUsed  = memTotal - parseFloat(d.memory_available);
    const memP     = pct(memUsed, memTotal);
    $('mem-pct-badge').textContent   = memP + '%';
    $('mem-used').textContent        = fmtMB(memUsed);
    $('mem-available').textContent   = fmtMB(parseFloat(d.memory_available));
    $('mem-used-label').textContent  = 'Used ' + fmtMB(memUsed);
    $('mem-total-label').textContent = 'Total ' + fmtMB(memTotal);
    setBar('mem-bar', memP, 75, 90);

    const swapTotal = S.swap_total || 1;
    const swapUsed  = parseFloat(d.swap_used);
    const swapP     = pct(swapUsed, swapTotal);
    $('swap-pct-badge').textContent   = swapP + '%';
    $('swap-used').textContent        = fmtMB(swapUsed);
    $('swap-free').textContent        = fmtMB(swapTotal - swapUsed);
    $('swap-used-label').textContent  = 'Used ' + fmtMB(swapUsed);
    $('swap-total-label').textContent = 'Total ' + fmtMB(swapTotal);
    setBar('swap-bar', swapP, 60, 85);

    const rootTotal = S.sdcard_root_total || 1;
    const rootUsed  = parseFloat(d.sdcard_root_used);
    const rootP     = pct(rootUsed, rootTotal);
    $('root-pct-badge').textContent = rootP + '%';
    $('root-used').textContent      = 'Used: ' + fmtMB(rootUsed);
    $('root-total').textContent     = 'Total: ' + fmtMB(rootTotal);
    setBar('root-bar', rootP, 70, 85);

    const bootTotal = S.boot_total || 1;
    const bootUsed  = parseFloat(d.boot_used);
    const bootP     = pct(bootUsed, bootTotal);
    $('boot-pct-badge').textContent = bootP + '%';
    $('boot-used').textContent      = 'Used: ' + fmtMB(bootUsed);
    $('boot-total').textContent     = 'Total: ' + fmtMB(bootTotal);
    setBar('boot-bar', bootP, 70, 85);

    $('eth-ip').textContent    = d.eth_ip  || '—';
    $('wifi-ip').textContent   = d.wifi_ip || '—';
    $('eth-sent').textContent  = fmtBytes(d.net_send);
    $('eth-recv').textContent  = fmtBytes(d.net_received);
    $('wifi-sent').textContent = fmtBytes(d.wifi_send);
    $('wifi-recv').textContent = fmtBytes(d.wifi_received);

    $('services-list').innerHTML = [
      { k: 'svc_cloudflared', n: 'cloudflared' },
      { k: 'svc_docker',      n: 'docker'      },
      { k: 'svc_fail2ban',    n: 'fail2ban'    },
      { k: 'svc_ssh',         n: 'ssh'         },
      { k: 'svc_rpimonitor',  n: 'rpimonitor'  },
    ].map(s => svcBadge(d[s.k], s.n)).join('');

    $('ports-list').innerHTML = [
      { k: 'port_ssh',        l: 'SSH :2222'        },
      { k: 'port_rpimonitor', l: 'RPiMonitor :8888' },
      { k: 'port_docker',     l: 'Docker API :2375' },
    ].map(p => portBadge(d[p.k], p.l)).join('');

    const ent = parseInt(d.entropy_pool) || 0;
    $('entropy').textContent = ent;
    setBar('entropy-bar', pct(ent, 4096));

    const emptyLogin    = '<p class="text-xs text-slate-700 px-1 py-1">No data</p>';
    const successLogins = parseLogins(d.last_success);
    const failedLogins  = parseLogins(d.last_failed);
    $('logins-success').innerHTML = successLogins.length ? successLogins.map(l => loginRow(l, true)).join('')  : emptyLogin;
    $('logins-failed').innerHTML  = failedLogins.length  ? failedLogins.map(l => loginRow(l, false)).join('') : emptyLogin;

    const thr = parseInt(d.throttled_raw) || 0;
    $('throttled-hex').textContent = '0x' + thr.toString(16).toUpperCase();
    $('power-current').innerHTML = [
      powerRow('Undervoltage',    thr & 0x1, false),
      powerRow('Throttling',      thr & 0x4, false),
      powerRow('Frequency Cap',   thr & 0x2, false),
      powerRow('Temp Soft Limit', thr & 0x8, false),
    ].join('');

    const now = new Date();
    $('footer-ts').textContent = 'Updated ' +
      String(now.getHours()).padStart(2,'0') + ':' +
      String(now.getMinutes()).padStart(2,'0') + ':' +
      String(now.getSeconds()).padStart(2,'0');

  }).catch(err => console.warn('[dashboard] fetch error:', err));
}

/* ── Init ──────────────────────────────────────────────────── */
loadStatic();
loadDynamic();
setInterval(loadDynamic, 5000);
setInterval(tickClock, 1000);
