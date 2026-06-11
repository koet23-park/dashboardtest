/* ===== SEA GVI Aging Management Dashboard ===== */
var DATA = {};
var chartInstances = {};

function fmt(n) { return Number(n).toLocaleString(); }

/* ===== Login ===== */
var VALID_ID = 'user', VALID_PW = 'user';
function handleLogin() {
    var id = document.getElementById('loginId').value.trim();
    var pw = document.getElementById('loginPw').value.trim();
    if (id === VALID_ID && pw === VALID_PW) {
        document.getElementById('loginOverlay').classList.add('hidden');
        loadDashboard();
    } else {
        document.getElementById('loginError').textContent = 'Invalid ID or Password. Please try again.';
        document.getElementById('loginPw').value = '';
        document.getElementById('loginPw').focus();
    }
}
document.getElementById('loginBtn').addEventListener('click', handleLogin);
document.getElementById('loginId').addEventListener('keydown', function(e) { if (e.key === 'Enter') document.getElementById('loginPw').focus(); });
document.getElementById('loginPw').addEventListener('keydown', function(e) { if (e.key === 'Enter') handleLogin(); });
window.addEventListener('load', function() { document.getElementById('loginId').focus(); });

/* ===== Load Dashboard ===== */
function loadDashboard() {
    if (typeof AGING_DATA !== 'undefined' && AGING_DATA) {
        DATA = AGING_DATA;
        renderAll();
    } else {
        fetch('aging_data.json').then(function(r) { return r.json(); }).then(function(data) {
            DATA = data;
            renderAll();
        }).catch(function(err) {
            console.error('Failed to load data:', err);
            document.getElementById('kpiGrid').innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#dc2626">데이터를 불러올 수 없습니다.</div>';
        });
    }
}

function destroyChart(id) {
    if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

function renderAll() {
    renderKPIs(); renderAgingPeriodChart(); renderSeverityDonut(); renderTopModels();
    renderGradeChart(); renderStorageChart(); renderAgingHistChart(); renderLocationTabs();
    setupImeiSort(); setupSearch();
    document.getElementById('lastUpdated').textContent = 'Last Updated: ' + (DATA.lastUpdated || '—');
}

/* ===== KPIs ===== */
function renderKPIs() {
    var s = DATA.summary;
    var ap = DATA.agingPeriodDist;
    var kpis = [
        { label: 'Total Units', value: fmt(s.totalIMEI), cls: 'blue', sub: 'All aging units' },
        { label: '31~60 Days', value: fmt(ap['31~60 Days'] || 0), cls: 'blue', sub: 'Caution period' },
        { label: '61~90 Days', value: fmt(ap['61~90 Days'] || 0), cls: 'amber', sub: 'Warning period' },
        { label: '91~120 Days', value: fmt(ap['91~120 Days'] || 0), cls: 'purple', sub: 'High risk period' },
        { label: '121+ Days', value: fmt(ap['121+ Days'] || 0), cls: 'red', sub: 'Critical period' }
    ];
    document.getElementById('kpiGrid').innerHTML = kpis.map(function(k) {
        return '<div class="kpi-card ' + k.cls + '"><div class="kpi-label">' + k.label + '</div><div class="kpi-value">' + k.value + '</div><div class="kpi-sub">' + k.sub + '</div></div>';
    }).join('');
}

/* ===== Location Distribution Chart ===== */
function renderAgingPeriodChart() {
    destroyChart('agingPeriodChart');
    var locDist = DATA.locationDist;
    var locNames = Object.keys(locDist);
    var locCross = DATA.locationAgingCross;
    var periodOrder = ['31~60 Days', '61~90 Days', '91~120 Days', '121+ Days'];
    var periodColors = ['#60a5fa', '#fbbf24', '#f97316', '#ef4444'];
    var datasets = periodOrder.map(function(p, i) {
        return { label: p, data: locNames.map(function(loc) { return locCross[loc] ? (locCross[loc][p] || 0) : 0; }), backgroundColor: periodColors[i], borderRadius: 2, borderSkipped: false, minBarLength: 6 };
    });
    chartInstances['agingPeriodChart'] = new Chart(document.getElementById('agingPeriodChart'), {
        type: 'bar', data: { labels: locNames, datasets: datasets },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: '#475569', boxWidth: 12, font: { size: 11 } } }, tooltip: { mode: 'point', intersect: true, callbacks: { label: function(ctx) { return ctx.dataset.label + ': ' + fmt(ctx.raw); } } } }, scales: { x: { stacked: true, grid: { color: '#e2e8f0' }, ticks: { color: '#475569' } }, y: { stacked: true, grid: { color: '#e2e8f0' }, ticks: { color: '#475569', callback: function(v) { return v >= 1000 ? (v/1000)+'k' : v; } } } } }
    });
}

/* ===== Severity Donut ===== */
function renderSeverityDonut() {
    destroyChart('severityChart');
    var as = DATA.agingSeverity;
    var labels = Object.keys(as), values = Object.values(as);
    var colors = ['#60a5fa', '#fbbf24', '#f97316', '#ef4444'];
    var total = values.reduce(function(a,b){return a+b;}, 0);
    chartInstances['severityChart'] = new Chart(document.getElementById('severityChart'), {
        type: 'doughnut', data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { return fmt(ctx.raw) + ' (' + (ctx.raw/total*100).toFixed(1) + '%)'; } } } } }
    });
    document.getElementById('severityLegend').innerHTML = labels.map(function(l, i) {
        return '<div class="item"><div class="swatch" style="background:' + colors[i] + '"></div>' + l + ': ' + fmt(values[i]) + ' (' + (values[i]/total*100).toFixed(1) + '%)</div>';
    }).join('');
}

/* ===== Top Models Chart ===== */
function renderTopModels() {
    destroyChart('topModelsChart');
    var tm = DATA.topModels.slice(0, 10);
    var labels = tm.map(function(m) { return m.name; });
    var periodOrder = ['31~60 Days', '61~90 Days', '91~120 Days', '121+ Days'];
    var periodColors = ['#60a5fa', '#fbbf24', '#f97316', '#ef4444'];
    var crossMap = {};
    DATA.modelAgingCross.forEach(function(r) { crossMap[r.name] = r; });
    var datasets = periodOrder.map(function(p, i) {
        return { label: p, data: tm.map(function(m) { return crossMap[m.name] ? (crossMap[m.name][p] || 0) : 0; }), backgroundColor: periodColors[i], borderRadius: 2, borderSkipped: false };
    });
    chartInstances['topModelsChart'] = new Chart(document.getElementById('topModelsChart'), {
        type: 'bar', data: { labels: labels, datasets: datasets },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: '#475569', boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: function(ctx) { return ctx.dataset.label + ': ' + fmt(ctx.raw); } } } }, scales: { x: { stacked: true, grid: { color: '#e2e8f0' }, ticks: { color: '#475569', callback: function(v) { return v >= 1000 ? (v/1000)+'k' : v; } } }, y: { stacked: true, grid: { display: false }, ticks: { color: '#475569', font: { size: 10 } } } } }
    });
}

/* ===== Grade Chart ===== */
function renderGradeChart() {
    destroyChart('gradeChart');
    var locDist = DATA.locationDist;
    var locNames = Object.keys(locDist);
    var locGrade = DATA.locationGradeCross;
    var gradeOrder = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D'];
    var gradeColors = ['#34d399', '#6ee7b7', '#60a5fa', '#93c5fd', '#fbbf24', '#fde68a', '#f87171', '#fca5a5'];
    var datasets = gradeOrder.map(function(g, i) {
        return { label: g, data: locNames.map(function(loc) { return locGrade[loc] ? (locGrade[loc][g] || 0) : 0; }), backgroundColor: gradeColors[i], borderRadius: 2, borderSkipped: false, minBarLength: 6 };
    });
    chartInstances['gradeChart'] = new Chart(document.getElementById('gradeChart'), {
        type: 'bar', data: { labels: locNames, datasets: datasets },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: '#475569', boxWidth: 12, font: { size: 11 } } }, tooltip: { mode: 'point', intersect: true, callbacks: { label: function(ctx) { return ctx.dataset.label + ': ' + fmt(ctx.raw); } } } }, scales: { x: { stacked: true, grid: { color: '#e2e8f0' }, ticks: { color: '#475569' } }, y: { stacked: true, grid: { color: '#e2e8f0' }, ticks: { color: '#475569', callback: function(v) { return v >= 1000 ? (v/1000)+'k' : v; } } } } }
    });
}

/* ===== Storage Chart ===== */
function renderStorageChart() {
    destroyChart('storageChart');
    var d = DATA.storageDist;
    var labels = Object.keys(d), values = Object.values(d);
    var colors = ['#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6'];
    var total = values.reduce(function(a,b){return a+b;}, 0);
    chartInstances['storageChart'] = new Chart(document.getElementById('storageChart'), {
        type: 'doughnut', data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '55%', plugins: { legend: { position: 'right', labels: { color: '#475569', boxWidth: 12, font: { size: 11 }, padding: 12 } }, tooltip: { callbacks: { label: function(ctx) { return ctx.label + ': ' + fmt(ctx.raw) + ' (' + (ctx.raw/total*100).toFixed(1) + '%)'; } } } } }
    });
}

/* ===== Aging Histogram Chart ===== */
function renderAgingHistChart() {
    destroyChart('agingHistChart');
    var d = DATA.agingHistogram;
    var labels = d.map(function(r) { return r.range; });
    var values = d.map(function(r) { return r.count; });
    chartInstances['agingHistChart'] = new Chart(document.getElementById('agingHistChart'), {
        type: 'bar', data: { labels: labels, datasets: [{ label: 'Count', data: values, backgroundColor: '#f59e0b', borderRadius: 3, borderSkipped: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { return fmt(ctx.raw) + ' units'; } } } }, scales: { x: { grid: { color: '#e2e8f0' }, ticks: { color: '#475569', font: { size: 9 }, maxRotation: 45 } }, y: { grid: { color: '#e2e8f0' }, ticks: { color: '#475569', callback: function(v) { return v >= 1000 ? (v/1000)+'k' : v; } } } } }
    });
}

/* ===== Location Tabs & IMEI Detail ===== */
function renderLocationTabs() {
    var locDist = DATA.locationDist;
    var locNames = Object.keys(locDist);
    var locCross = DATA.locationAgingCross;
    var periodOrder = ['31~60 Days', '61~90 Days', '91~120 Days', '121+ Days'];

    var tabsHtml = '<button class="tab-btn active" data-loctab="locSummary">Location Summary</button>';
    locNames.forEach(function(loc) {
        tabsHtml += '<button class="tab-btn" data-loctab="loc_' + loc.replace(/[^a-zA-Z0-9]/g,'_') + '">' + loc + '</button>';
    });
    document.getElementById('locTabs').innerHTML = tabsHtml;

    var contentHtml = '';
    contentHtml += '<div class="tab-content active" id="locSummary">';
    contentHtml += '<div style="overflow-x:auto"><table class="data-table"><thead><tr>';
    contentHtml += '<th>Location</th><th>Total Units</th>';
    periodOrder.forEach(function(p) { contentHtml += '<th class="num">' + p + '</th>'; });
    contentHtml += '</tr></thead><tbody>';
    locNames.forEach(function(loc) {
        contentHtml += '<tr><td style="font-weight:600">' + loc + '</td><td class="num">' + fmt(locDist[loc]) + '</td>';
        periodOrder.forEach(function(p) {
            var v = locCross[loc] ? (locCross[loc][p] || 0) : 0;
            var c = p === '121+ Days' && v > 0 ? 'color:#dc2626;font-weight:600' : p === '91~120 Days' && v > 0 ? 'color:#ea580c;font-weight:600' : '';
            contentHtml += '<td class="num" style="' + c + '">' + fmt(v) + '</td>';
        });
        contentHtml += '</tr>';
    });
    contentHtml += '</tbody></table></div></div>';

    var locImei = DATA.locationImeiDetail || {};
    locNames.forEach(function(loc) {
        var tabId = 'loc_' + loc.replace(/[^a-zA-Z0-9]/g,'_');
        var items = locImei[loc] || [];
        contentHtml += '<div class="tab-content" id="' + tabId + '">';
        contentHtml += '<div style="max-height:320px;overflow-y:auto;overflow-x:auto">';
        contentHtml += '<table class="data-table" data-loc="' + loc + '"><thead><tr>';
        contentHtml += '<th class="sortable sticky-col" data-col="Final IMEI">IMEI</th>';
        contentHtml += '<th class="sortable" data-col="MKT Name">Model</th>';
        contentHtml += '<th class="sortable" data-col="Storage">Storage</th>';
        contentHtml += '<th class="sortable" data-col="Grade">Grade</th>';
        contentHtml += '<th class="sortable" data-col="Aging Days">Aging Days</th>';
        contentHtml += '<th class="sortable" data-col="Aging Period">Aging Period</th>';
        contentHtml += '</tr></thead><tbody>';
        items.forEach(function(r) { contentHtml += renderImeiRow(r); });
        contentHtml += '</tbody></table></div></div>';
    });
    document.getElementById('locTabContent').innerHTML = contentHtml;

    document.querySelectorAll('#locTabs .tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('#locTabs .tab-btn').forEach(function(b) { b.classList.remove('active'); });
            document.querySelectorAll('#locTabContent .tab-content').forEach(function(c) { c.classList.remove('active'); });
            btn.classList.add('active');
            document.getElementById(btn.getAttribute('data-loctab')).classList.add('active');
        });
    });
}

var imeiSortState = {};

function renderImeiRow(r) {
    var grade = r['Grade'] && r['Grade'].trim() ? r['Grade'] : '-';
    var period = r['Aging Period'] || '';
    var periodBadge = '';
    if (period === '121+ Days') periodBadge = '<span class="badge badge-critical">121+ Days</span>';
    else if (period === '91~120 Days') periodBadge = '<span class="badge badge-highrisk">91~120 Days</span>';
    else if (period === '61~90 Days') periodBadge = '<span class="badge badge-warning">61~90 Days</span>';
    else if (period === '31~60 Days') periodBadge = '<span class="badge badge-caution">31~60 Days</span>';
    else periodBadge = period;
    return '<tr><td class="sticky-col" style="font-family:monospace;font-size:12px">' + r['Final IMEI'] + '</td><td style="font-weight:600">' + r['MKT Name'] + '</td><td>' + r['Storage'] + '</td><td>' + grade + '</td><td class="num" style="color:#d97706;font-weight:600">' + r['Aging Days'] + '</td><td>' + periodBadge + '</td></tr>';
}

function setupImeiSort() {
    document.querySelectorAll('.data-table thead th.sortable').forEach(function(th) {
        th.addEventListener('click', function() {
            var table = th.closest('table');
            var loc = table.getAttribute('data-loc');
            if (!loc) return;
            var col = th.getAttribute('data-col');
            if (!imeiSortState[loc]) imeiSortState[loc] = { col: null, asc: true };
            if (imeiSortState[loc].col === col) {
                imeiSortState[loc].asc = !imeiSortState[loc].asc;
            } else {
                imeiSortState[loc].col = col;
                imeiSortState[loc].asc = true;
            }
            table.querySelectorAll('th.sortable').forEach(function(h) { h.classList.remove('sort-asc', 'sort-desc'); });
            th.classList.add(imeiSortState[loc].asc ? 'sort-asc' : 'sort-desc');
            var locImei = DATA.locationImeiDetail || {};
            var items = (locImei[loc] || []).slice();
            var ss = imeiSortState[loc];
            items.sort(function(a, b) {
                var va = a[col], vb = b[col];
                if (col === 'Aging Days') return ss.asc ? va - vb : vb - va;
                if (!va) va = ''; if (!vb) vb = '';
                return ss.asc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
            });
            table.querySelector('tbody').innerHTML = items.map(renderImeiRow).join('');
        });
    });
}

function downloadCurrentTab() {
    var activeBtn = document.querySelector('#locTabs .tab-btn.active');
    if (!activeBtn) return;
    var tabId = activeBtn.getAttribute('data-loctab');
    if (tabId === 'locSummary') {
        var a = document.createElement('a');
        a.href = 'Aging_IMEI_List.xlsx';
        a.download = 'Aging_IMEI_List.xlsx';
        a.click();
    } else {
        var locNames = Object.keys(DATA.locationDist);
        var locImei = DATA.locationImeiDetail || {};
        var locName = '';
        locNames.forEach(function(loc) {
            if ('loc_' + loc.replace(/[^a-zA-Z0-9]/g,'_') === tabId) locName = loc;
        });
        if (!locName) return;
        var items = locImei[locName] || [];
        var wsData = [['IMEI', 'Model', 'Storage', 'Grade', 'Aging Days', 'Aging Period']];
        items.forEach(function(r) {
            var grade = r['Grade'] && r['Grade'].trim() ? r['Grade'] : '-';
            wsData.push([r['Final IMEI'], r['MKT Name'], r['Storage'], grade, r['Aging Days'], r['Aging Period'] || '']);
        });
        var wb = XLSX.utils.book_new();
        var ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, ws, locName);
        XLSX.writeFile(wb, locName + '_IMEI_Detail.xlsx');
    }
}

function setupSearch() {
    document.getElementById('searchBox').addEventListener('input', function(e) {
        var f = e.target.value.toLowerCase();
        var locImei = DATA.locationImeiDetail || {};
        var locNames = Object.keys(DATA.locationDist);
        locNames.forEach(function(loc) {
            var tabId = 'loc_' + loc.replace(/[^a-zA-Z0-9]/g,'_');
            var tabEl = document.getElementById(tabId);
            if (!tabEl) return;
            var items = locImei[loc] || [];
            var filtered = f ? items.filter(function(r) { return r['MKT Name'].toLowerCase().indexOf(f) >= 0; }) : items;
            tabEl.querySelector('tbody').innerHTML = filtered.map(renderImeiRow).join('');
        });
    });
}
