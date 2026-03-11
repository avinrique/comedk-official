/* ============================================
   COMEDK Official — Analytics / Dashboard View
   CSS-only charts, no external libraries.
   ============================================ */
const Analytics = (() => {

  async function render() {
    const content = document.getElementById('content');
    content.innerHTML = '<div style="text-align:center;padding:48px;color:var(--text-muted);">Loading dashboard...</div>';

    try {
      // Fetch analytics data in parallel
      const [stats, pipeline, sources, trends, recent] = await Promise.all([
        _fetchStats(),
        _fetchPipeline(),
        _fetchSources(),
        _fetchTrends(),
        _fetchRecent()
      ]);

      content.innerHTML = '';

      // 1. Stat cards
      content.appendChild(_renderStatCards(stats));

      // 2. Charts grid
      const chartsGrid = document.createElement('div');
      chartsGrid.className = 'charts-grid';
      chartsGrid.appendChild(_renderPipelineFunnel(pipeline));
      chartsGrid.appendChild(_renderSourceChart(sources));
      content.appendChild(chartsGrid);

      // 3. Daily trends
      content.appendChild(_renderTrendsChart(trends));

      // 4. Recent leads
      content.appendChild(_renderRecentLeads(recent));

    } catch (err) {
      content.innerHTML = `<div class="chart-card" style="text-align:center;padding:48px;color:var(--danger);">
        <p>Failed to load dashboard.</p><p style="font-size:0.8125rem;color:var(--text-muted);margin-top:8px;">${_esc(err.message)}</p>
      </div>`;
    }
  }

  /* ──────────────────── Data fetchers ──────────────────── */

  async function _fetchStats() {
    try {
      const res = await get('/analytics/stats');
      return res.data || res;
    } catch (_) {
      return { total_leads: 0, new_this_week: 0, conversion_rate: 0, followups_due: 0,
               total_change: 0, new_change: 0 };
    }
  }

  async function _fetchPipeline() {
    try {
      const res = await get('/analytics/pipeline');
      const arr = res.data ? (res.data.pipeline || res.data) : res;
      if (Array.isArray(arr)) {
        const obj = {};
        arr.forEach(item => { obj[item.status] = item.count; });
        return obj;
      }
      return arr;
    } catch (_) {
      return { new: 0, contacted: 0, qualified: 0, enrolled: 0, lost: 0 };
    }
  }

  async function _fetchSources() {
    try {
      const res = await get('/analytics/sources');
      return res.data || res;
    } catch (_) { return []; }
  }

  async function _fetchTrends() {
    try {
      const res = await get('/analytics/trends');
      return res.data ? (res.data.trends || res.data) : res;
    } catch (_) { return []; }
  }

  async function _fetchRecent() {
    try {
      const res = await get('/leads', { limit: 5, sort: '-createdAt' });
      const data = res.data || res;
      return data.leads || data || [];
    } catch (_) { return []; }
  }

  /* ──────────────────── Stat Cards ──────────────────── */

  function _renderStatCards(s) {
    const cards = [
      { label: 'Total Leads', value: _num(s.total_leads), change: s.total_change, icon: 'users', color: 'green' },
      { label: 'New This Week', value: _num(s.new_this_week), change: s.new_change, icon: 'plus-circle', color: 'blue' },
      { label: 'Conversion Rate', value: (s.conversion_rate || 0).toFixed(1) + '%', change: null, icon: 'trending-up', color: 'purple' },
      { label: 'Follow-ups Due', value: _num(s.followups_due), change: null, icon: 'bell', color: 'orange' }
    ];

    const wrap = document.createElement('div');
    wrap.className = 'dashboard-stats';

    cards.forEach(c => {
      const card = document.createElement('div');
      card.className = 'dashboard-stat-card';
      card.innerHTML = `
        <div class="stat-card-info">
          <h3>${c.label}</h3>
          <div class="stat-card-value">${c.value}</div>
          ${c.change !== null && c.change !== undefined ? `
            <div class="stat-card-change ${c.change >= 0 ? 'up' : 'down'}">
              ${c.change >= 0 ? _svgArrowUp() : _svgArrowDown()} ${Math.abs(c.change)}% vs last week
            </div>` : ''}
        </div>
        <div class="stat-card-icon ${c.color}">${_statIcon(c.icon)}</div>
      `;
      wrap.appendChild(card);
    });

    return wrap;
  }

  /* ──────────────────── Pipeline Funnel (Horizontal Bars) ──────────────────── */

  function _renderPipelineFunnel(data) {
    const card = document.createElement('div');
    card.className = 'chart-card';

    const statuses = [
      { key: 'new', label: 'New', color: 'var(--info)' },
      { key: 'contacted', label: 'Contacted', color: 'var(--warning)' },
      { key: 'qualified', label: 'Qualified', color: 'var(--primary)' },
      { key: 'enrolled', label: 'Enrolled', color: '#9b59b6' },
      { key: 'lost', label: 'Lost', color: 'var(--danger)' }
    ];

    const maxVal = Math.max(...statuses.map(s => data[s.key] || 0), 1);

    let barsHTML = statuses.map(s => {
      const val = data[s.key] || 0;
      const pct = (val / maxVal) * 100;
      return `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div style="width:80px;font-size:0.8125rem;font-weight:500;color:var(--text-body);text-align:right;">${s.label}</div>
          <div style="flex:1;background:var(--bg-light);border-radius:6px;height:28px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:${s.color};border-radius:6px;transition:width 0.6s ease;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;min-width:32px;">
              <span style="font-size:0.6875rem;font-weight:700;color:#fff;">${val}</span>
            </div>
          </div>
        </div>`;
    }).join('');

    card.innerHTML = `
      <div class="chart-card-header"><h3>Pipeline Overview</h3></div>
      <div>${barsHTML}</div>
    `;
    return card;
  }

  /* ──────────────────── Source Chart (Donut via conic-gradient) ──────────────────── */

  function _renderSourceChart(sources) {
    const card = document.createElement('div');
    card.className = 'chart-card';

    const colors = ['var(--primary)', 'var(--info)', 'var(--accent)', '#9b59b6', 'var(--warning)', 'var(--danger)', '#6c757d'];
    const srcArray = Array.isArray(sources) ? sources : [];
    const total = srcArray.reduce((sum, s) => sum + (s.count || 0), 0) || 1;

    // Build conic gradient
    let gradientParts = [];
    let cumPct = 0;
    srcArray.forEach((s, i) => {
      const pct = ((s.count || 0) / total) * 100;
      const c = colors[i % colors.length];
      gradientParts.push(`${c} ${cumPct}% ${cumPct + pct}%`);
      cumPct += pct;
    });
    if (gradientParts.length === 0) gradientParts.push('var(--bg-light) 0% 100%');
    const gradient = `conic-gradient(${gradientParts.join(', ')})`;

    // Legend
    const legend = srcArray.map((s, i) => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="width:10px;height:10px;border-radius:50%;background:${colors[i % colors.length]};flex-shrink:0;"></span>
        <span style="font-size:0.8125rem;color:var(--text-body);flex:1;">${_esc(_capitalize(s.source || s.name || 'Unknown'))}</span>
        <span style="font-size:0.8125rem;font-weight:600;color:var(--text-dark);">${s.count || 0}</span>
      </div>`
    ).join('');

    card.innerHTML = `
      <div class="chart-card-header"><h3>Leads by Source</h3></div>
      <div style="display:flex;align-items:center;gap:32px;flex-wrap:wrap;">
        <div style="width:160px;height:160px;border-radius:50%;background:${gradient};position:relative;flex-shrink:0;">
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:80px;height:80px;border-radius:50%;background:var(--bg-white);display:flex;align-items:center;justify-content:center;">
            <div style="text-align:center;">
              <div style="font-size:1.25rem;font-weight:700;color:var(--text-dark);">${total}</div>
              <div style="font-size:0.6875rem;color:var(--text-muted);">Total</div>
            </div>
          </div>
        </div>
        <div style="flex:1;min-width:140px;">${legend || '<p style="font-size:0.8125rem;color:var(--text-muted);">No data</p>'}</div>
      </div>
    `;
    return card;
  }

  /* ──────────────────── Daily Trends (Vertical Bar Chart) ──────────────────── */

  function _renderTrendsChart(trends) {
    const card = document.createElement('div');
    card.className = 'chart-card';

    const tArr = Array.isArray(trends) ? trends : [];
    const maxVal = Math.max(...tArr.map(t => t.count || 0), 1);

    const bars = tArr.map(t => {
      const pct = ((t.count || 0) / maxVal) * 100;
      const label = t.date ? _shortDate(t.date) : '';
      return `
        <div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:28px;max-width:60px;">
          <div style="font-size:0.6875rem;font-weight:600;color:var(--text-dark);margin-bottom:4px;">${t.count || 0}</div>
          <div style="width:100%;max-width:32px;background:var(--bg-light);border-radius:4px 4px 0 0;height:180px;position:relative;overflow:hidden;">
            <div style="position:absolute;bottom:0;width:100%;height:${pct}%;background:var(--primary);border-radius:4px 4px 0 0;transition:height 0.6s ease;"></div>
          </div>
          <div style="font-size:0.625rem;color:var(--text-muted);margin-top:6px;white-space:nowrap;">${label}</div>
        </div>`;
    }).join('');

    card.innerHTML = `
      <div class="chart-card-header"><h3>Daily Lead Trends</h3></div>
      <div style="display:flex;align-items:flex-end;gap:6px;overflow-x:auto;padding-bottom:4px;">
        ${bars || '<p style="font-size:0.8125rem;color:var(--text-muted);width:100%;text-align:center;padding:48px 0;">No trend data available</p>'}
      </div>
    `;
    return card;
  }

  /* ──────────────────── Recent Leads List ──────────────────── */

  function _renderRecentLeads(leads) {
    const card = document.createElement('div');
    card.className = 'data-table-card';

    const rows = (Array.isArray(leads) ? leads : []).map(l => `
      <tr style="cursor:pointer;" onclick="LeadDetail.open('${l._id || l.id}')">
        <td><strong>${_esc(l.name || '')}</strong></td>
        <td>${_esc(l.phone || '')}</td>
        <td>${_esc(l.exam || '-')}</td>
        <td><span class="status-badge ${_statusClass(l.status)}"><span class="status-dot"></span>${_esc(_capitalize(l.status || 'new'))}</span></td>
        <td>${_esc(_capitalize(l.source || '-'))}</td>
        <td>${_relTime(l.createdAt || l.created_at)}</td>
      </tr>`
    ).join('');

    card.innerHTML = `
      <div class="data-table-header">
        <h3>Recent Leads</h3>
        <a href="#/leads" style="font-size:0.8125rem;font-weight:600;color:var(--primary);">View all &rarr;</a>
      </div>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>Name</th><th>Phone</th><th>Exam</th><th>Status</th><th>Source</th><th>Date</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted);">No leads yet</td></tr>'}</tbody>
        </table>
      </div>
    `;
    return card;
  }

  /* ──────────────────── Utility Helpers ──────────────────── */

  function _num(n) {
    return (n || 0).toLocaleString();
  }

  function _esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function _capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '';
  }

  function _statusClass(status) {
    return (status || 'new').toLowerCase().replace(/\s+/g, '-');
  }

  function _shortDate(d) {
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch (_) { return ''; }
  }

  function _relTime(d) {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      const diff = Date.now() - dt.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return mins + 'm ago';
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return hrs + 'h ago';
      const days = Math.floor(hrs / 24);
      if (days < 7) return days + 'd ago';
      return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch (_) { return '-'; }
  }

  /* ── SVG helpers ── */

  function _svgArrowUp() {
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
  }

  function _svgArrowDown() {
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>';
  }

  function _statIcon(name) {
    const icons = {
      'users': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      'plus-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
      'trending-up': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
      'bell': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'
    };
    return icons[name] || '';
  }

  /* ---- Public ---- */
  return { render };
})();
