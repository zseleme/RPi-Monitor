/* ── Metric definitions ────────────────────────────────────── */
const GRAPHS = [
  {
    id: 'cpu', title: 'CPU Load', icon: '⚡', subtitle: 'Load average (1/5/15 min)',
    datasets: [
      { rrd: 'load1',  label: '1 min',  color: '#38bdf8' },
      { rrd: 'load5',  label: '5 min',  color: '#a78bfa' },
      { rrd: 'load15', label: '15 min', color: '#fb7185' },
    ],
    yFormat: v => v.toFixed(2),
  },
  {
    id: 'temperature', title: 'Temperature', icon: '🌡️', subtitle: 'SoC core temperature',
    datasets: [{ rrd: 'soc_temp', label: 'Core Temp', color: '#fb923c', fill: true }],
    yFormat: v => v.toFixed(1) + '°C',
  },
  {
    id: 'memory', title: 'Memory', icon: '🧠', subtitle: 'RAM usage',
    datasets: [
      { rrd: 'memory_available', label: 'Available', color: '#34d399', fill: true },
      { rrd: 'memory_free',      label: 'Free',      color: '#22d3ee' },
    ],
    yFormat: v => fmtMB(v),
  },
  {
    id: 'swap', title: 'Swap', icon: '💾', subtitle: 'Swap usage',
    datasets: [{ rrd: 'swap_used', label: 'Swap Used', color: '#fb923c', fill: true }],
    yFormat: v => fmtMB(v),
  },
  {
    id: 'storage-root', title: 'Disk /', icon: '🗂️', subtitle: 'Root partition',
    datasets: [{ rrd: 'sdcard_root_used', label: 'Used', color: '#38bdf8', fill: true }],
    yFormat: v => fmtMB(v),
  },
  {
    id: 'storage-boot', title: 'Disk /boot', icon: '💿', subtitle: '/boot/firmware',
    datasets: [{ rrd: 'boot_used', label: 'Used', color: '#22d3ee', fill: true }],
    yFormat: v => fmtMB(v),
  },
  {
    id: 'network', title: 'Network', icon: '🌐', subtitle: 'Ethernet traffic',
    datasets: [
      { rrd: 'net_send',     label: '↑ Upload',   color: '#38bdf8' },
      { rrd: 'net_received', label: '↓ Download', color: '#34d399' },
    ],
    yFormat: v => fmtBytes(Math.abs(v)),
  },
  {
    id: 'wifi', title: 'WiFi', icon: '📡', subtitle: 'WiFi traffic',
    datasets: [
      { rrd: 'wifi_send',     label: '↑ Upload',   color: '#a78bfa' },
      { rrd: 'wifi_received', label: '↓ Download', color: '#fb7185' },
    ],
    yFormat: v => fmtBytes(Math.abs(v)),
  },
  {
    id: 'entropy', title: 'Entropy', icon: '🎲', subtitle: 'Kernel entropy pool',
    datasets: [{ rrd: 'entropy_pool', label: 'Pool (bits)', color: '#818cf8', fill: true }],
    yFormat: v => Math.round(v) + ' bits',
  },
  {
    id: 'uptime', title: 'Uptime', icon: '⏱️', subtitle: 'System uptime',
    datasets: [{ rrd: 'uptime', label: 'Uptime', color: '#34d399', fill: true }],
    yFormat: v => {
      v = parseFloat(v);
      if (v > 86400) return (v/86400).toFixed(1) + 'd';
      if (v > 3600)  return (v/3600).toFixed(1) + 'h';
      return Math.round(v/60) + 'm';
    },
  },
  {
    id: 'power', title: 'Power Events', icon: '⚡', subtitle: 'Undervoltage & throttling history',
    datasets: [
      { rrd: 'undervoltage_now', label: 'Undervoltage', color: '#ef4444', fill: true,  stepped: true },
      { rrd: 'power_throttled',  label: 'Throttling',   color: '#f59e0b', fill: false, stepped: true },
      { rrd: 'power_freqcap',    label: 'Freq Cap',     color: '#fb923c', fill: false, stepped: true },
    ],
    yFormat: v => v >= 0.5 ? 'Active' : 'OK',
    yTicks: { min: 0, max: 1.1, stepSize: 1 },
    stepped: true,
  },
];

const RRAs = [
  { idx: 0, label: '1 Day'   },
  { idx: 1, label: '2 Days'  },
  { idx: 2, label: '2 Weeks' },
  { idx: 3, label: '1 Month' },
  { idx: 4, label: '1 Year'  },
];

/* ── State ─────────────────────────────────────────────────── */
let activeMetric = null;
let activeRRA    = parseInt(localStorage.getItem('rpiStatsRRA') || '0');
let chartInst    = null;

/* ── Formatters ────────────────────────────────────────────── */
function fmtMB(mb) {
  mb = Math.abs(parseFloat(mb));
  if (isNaN(mb)) return '—';
  if (mb >= 1024) return (mb / 1024).toFixed(1) + ' GB';
  return Math.round(mb) + ' MB';
}

function fmtBytes(b) {
  b = Math.abs(parseFloat(b) || 0);
  if (b >= 1e9) return (b/1e9).toFixed(2) + ' GB';
  if (b >= 1e6) return (b/1e6).toFixed(1) + ' MB';
  if (b >= 1e3) return (b/1e3).toFixed(0) + ' KB';
  return Math.round(b) + ' B';
}

/* ── RRD helpers ───────────────────────────────────────────── */
function fetchRRD(path) {
  return new Promise((resolve, reject) => {
    try {
      FetchBinaryURLAsync(path, bf => resolve(bf), null);
    } catch(e) { reject(e); }
  });
}

function rrdToPoints(rrd, rraIdx) {
  const rra     = rrd.getRRA(rraIdx);
  const nRows   = rra.getNrRows();
  const stepMs  = rra.getStep() * 1000;
  const lastTs  = rrd.getLastUpdate() * 1000;
  const firstTs = lastTs - (nRows - 1) * stepMs;
  const points  = [];
  for (let i = 0; i < nRows; i++) {
    const val = rra.getEl(i, 0);
    points.push({ x: firstTs + i * stepMs, y: (val !== null && isFinite(val)) ? val : null });
  }
  return points;
}

/* ── Chart ─────────────────────────────────────────────────── */
function setLoading(show) {
  document.getElementById('loading').classList.toggle('hidden', !show);
  document.getElementById('chart-wrapper').style.visibility = show ? 'hidden' : 'visible';
  document.getElementById('error-state').classList.add('hidden');
}

function setError(msg) {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('chart-wrapper').style.visibility = 'hidden';
  document.getElementById('error-state').classList.remove('hidden');
  document.getElementById('error-msg').textContent = msg;
}

async function loadChart(metric, rraIdx) {
  setLoading(true);
  document.getElementById('chart-title').textContent    = metric.icon + ' ' + metric.title;
  document.getElementById('chart-subtitle').textContent = metric.subtitle;

  try {
    const buffers  = await Promise.all(metric.datasets.map(ds => fetchRRD('stat/' + ds.rrd + '.rrd')));
    const datasets = buffers.map((bf, i) => {
      const rrd = new RRDFile(bf);
      const ds  = metric.datasets[i];
      const c   = ds.color;
      return {
        label:            ds.label,
        data:             rrdToPoints(rrd, rraIdx),
        borderColor:      c,
        backgroundColor:  c + '1a',
        fill:             ds.fill || false,
        tension:          ds.stepped ? 0 : 0.3,
        stepped:          ds.stepped || false,
        borderWidth:      1.5,
        pointRadius:      0,
        pointHoverRadius: 4,
        spanGaps:         false,
      };
    });

    renderChart(datasets, metric);
    renderStats(datasets, metric);
    setLoading(false);
  } catch(e) {
    setError('Failed to load data: ' + (e.message || e));
  }
}

function renderChart(datasets, metric) {
  const ctx = document.getElementById('chart').getContext('2d');
  if (chartInst) { chartInst.destroy(); chartInst = null; }

  Chart.defaults.color       = '#64748b';
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
  Chart.defaults.font.size   = 11;

  chartInst = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation:           false,
      interaction: { mode: 'index', axis: 'x', intersect: false },
      scales: {
        x: {
          type: 'time',
          ticks:  { maxTicksLimit: 8, color: '#475569' },
          grid:   { color: 'rgba(148,163,184,.05)' },
          border: { color: '#1e293b' },
        },
        y: {
          ticks:  { callback: metric.yFormat, color: '#475569', maxTicksLimit: 6,
                    ...(metric.yTicks || {}) },
          min:    metric.yTicks ? metric.yTicks.min : undefined,
          max:    metric.yTicks ? metric.yTicks.max : undefined,
          grid:   { color: 'rgba(148,163,184,.05)' },
          border: { color: '#1e293b' },
        },
      },
      plugins: {
        legend: {
          position: 'top', align: 'end',
          labels: { color: '#94a3b8', boxWidth: 12, boxHeight: 2, padding: 14, usePointStyle: true, pointStyle: 'line' },
        },
        tooltip: {
          backgroundColor: '#1e293b',
          borderColor:     '#334155',
          borderWidth:     1,
          titleColor:      '#94a3b8',
          bodyColor:       '#e2e8f0',
          padding:         10,
          callbacks: { label: ctx => '  ' + ctx.dataset.label + ':  ' + metric.yFormat(ctx.parsed.y) },
        },
      },
    },
  });
}

function renderStats(datasets, metric) {
  const row = document.getElementById('stats-row');
  row.innerHTML = '';
  datasets.forEach(ds => {
    const vals = ds.data.map(p => p.y).filter(v => v !== null && isFinite(v));
    if (!vals.length) return;
    const last = vals[vals.length - 1];
    const min  = Math.min(...vals);
    const max  = Math.max(...vals);
    const avg  = vals.reduce((a,b) => a+b, 0) / vals.length;
    const fmt  = metric.yFormat;
    const c    = ds.borderColor;
    row.innerHTML += `
      <div class="card bg-slate-900 rounded-xl border border-slate-800/80 p-4">
        <div class="flex items-center gap-2 mb-3">
          <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${c}"></span>
          <p class="text-xs font-semibold text-slate-400 truncate">${ds.label}</p>
        </div>
        <div class="grid grid-cols-2 gap-y-2 text-xs">
          <div><p class="text-slate-600 mb-0.5">Current</p><p class="font-bold text-slate-100">${fmt(last)}</p></div>
          <div><p class="text-slate-600 mb-0.5">Average</p><p class="font-semibold text-slate-300">${fmt(avg)}</p></div>
          <div><p class="text-slate-600 mb-0.5">Min</p><p class="font-semibold text-emerald-400">${fmt(min)}</p></div>
          <div><p class="text-slate-600 mb-0.5">Max</p><p class="font-semibold text-red-400">${fmt(max)}</p></div>
        </div>
      </div>`;
  });
}

/* ── UI builders ───────────────────────────────────────────── */
function selectMetric(metric) {
  activeMetric = metric;
  localStorage.setItem('rpiStatsMetric', metric.id);
  document.querySelectorAll('.metric-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('[data-metric="' + metric.id + '"]').forEach(b => b.classList.add('active'));
  loadChart(metric, activeRRA);
}

function selectRRA(rra) {
  activeRRA = rra.idx;
  localStorage.setItem('rpiStatsRRA', rra.idx);
  document.querySelectorAll('.rra-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('[data-rra="' + rra.idx + '"]').forEach(b => b.classList.add('active'));
  if (activeMetric) loadChart(activeMetric, activeRRA);
}

function buildUI() {
  const list   = document.getElementById('metric-list');
  const mobile = document.getElementById('metric-list-mobile');

  GRAPHS.forEach(g => {
    [
      [list,   'metric-btn w-full text-left px-3 py-2.5 rounded-xl border border-transparent text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all flex items-center gap-2.5',
               `<span class="text-base leading-none">${g.icon}</span><span>${g.title}</span>`],
      [mobile, 'metric-btn flex-shrink-0 px-3 py-1.5 rounded-full border border-slate-700 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all whitespace-nowrap',
               g.icon + ' ' + g.title],
    ].forEach(([parent, cls, html]) => {
      const btn = document.createElement('button');
      btn.className = cls;
      btn.setAttribute('data-metric', g.id);
      btn.innerHTML = html;
      btn.addEventListener('click', () => selectMetric(g));
      parent.appendChild(btn);
    });
  });

  const rraContainer = document.getElementById('rra-buttons');
  RRAs.forEach(rra => {
    const btn = document.createElement('button');
    btn.className = 'rra-btn px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-400 hover:text-sky-400 hover:border-sky-700 transition-all';
    btn.setAttribute('data-rra', rra.idx);
    btn.textContent = rra.label;
    btn.addEventListener('click', () => selectRRA(rra));
    rraContainer.appendChild(btn);
  });
}

/* ── Init ──────────────────────────────────────────────────── */
fetch('static.json').then(r => r.json()).then(d => {
  document.getElementById('hostname').textContent = d.hostname || 'RPi';
}).catch(() => {});

buildUI();

const savedRRABtn = document.querySelector('[data-rra="' + activeRRA + '"]');
if (savedRRABtn) savedRRABtn.classList.add('active');

const savedId     = localStorage.getItem('rpiStatsMetric') || GRAPHS[0].id;
const savedMetric = GRAPHS.find(g => g.id === savedId) || GRAPHS[0];
selectMetric(savedMetric);
