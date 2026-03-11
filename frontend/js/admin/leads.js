/* ============================================
   LS Predictor — Leads Management View
   ============================================ */
const Leads = (() => {
  let currentPage  = 1;
  let totalPages   = 1;
  let perPage      = 20;
  let totalLeads   = 0;
  let sortField    = 'createdAt';
  let sortOrder    = 'desc';
  let filters      = { status: '', source: '', search: '', assigned_to: '' };
  let _leadsCache  = [];

  /* ────────── Main render ────────── */

  async function render() {
    const content = document.getElementById('content');
    content.innerHTML = `
      <!-- Toolbar -->
      <div class="data-table-card" style="margin-bottom:0;border-bottom:none;border-radius:var(--radius-lg) var(--radius-lg) 0 0;">
        <div class="data-table-header" style="border-bottom:none;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <div class="topbar-search" style="margin:0;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" id="leads-search" placeholder="Search by name, phone, email..." value="${_esc(filters.search)}" style="width:220px;">
            </div>
            <select id="filter-status" class="form-control" style="width:auto;padding:9px 14px;font-size:0.8125rem;">
              <option value="">All Statuses</option>
              <option value="new"${filters.status==='new'?' selected':''}>New</option>
              <option value="contacted"${filters.status==='contacted'?' selected':''}>Contacted</option>
              <option value="qualified"${filters.status==='qualified'?' selected':''}>Qualified</option>
              <option value="enrolled"${filters.status==='enrolled'?' selected':''}>Enrolled</option>
              <option value="lost"${filters.status==='lost'?' selected':''}>Lost</option>
            </select>
            <select id="filter-source" class="form-control" style="width:auto;padding:9px 14px;font-size:0.8125rem;">
              <option value="">All Sources</option>
              <option value="predictor"${filters.source==='predictor'?' selected':''}>Predictor</option>
              <option value="website"${filters.source==='website'?' selected':''}>Website</option>
              <option value="whatsapp"${filters.source==='whatsapp'?' selected':''}>WhatsApp</option>
              <option value="referral"${filters.source==='referral'?' selected':''}>Referral</option>
              <option value="walk-in"${filters.source==='walk-in'?' selected':''}>Walk-in</option>
              <option value="phone"${filters.source==='phone'?' selected':''}>Phone</option>
            </select>
          </div>
          <div class="data-table-actions">
            <button class="btn btn-secondary btn-sm" id="export-csv-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
            <button class="btn btn-primary btn-sm" id="add-lead-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Lead
            </button>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="data-table-card" style="border-radius:0 0 var(--radius-lg) var(--radius-lg);margin-top:0;">
        <div class="data-table-wrap">
          <table class="data-table" id="leads-table">
            <thead>
              <tr>
                <th data-sort="name">Name <span class="sort-arrow"></span></th>
                <th data-sort="phone">Phone</th>
                <th data-sort="email">Email</th>
                <th data-sort="exam">Exam</th>
                <th data-sort="status">Status</th>
                <th data-sort="source">Source</th>
                <th data-sort="priority">Priority</th>
                <th data-sort="assignedTo">Assigned</th>
                <th data-sort="createdAt">Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="leads-tbody">
              <tr><td colspan="10" style="text-align:center;padding:32px;color:var(--text-muted);">Loading...</td></tr>
            </tbody>
          </table>
        </div>
        <div class="data-table-pagination" id="leads-pagination"></div>
      </div>
    `;

    _bindEvents();
    await loadLeads();
  }

  /* ────────── Events ────────── */

  function _bindEvents() {
    // Search with debounce
    const searchInput = document.getElementById('leads-search');
    let debounce = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        filters.search = searchInput.value.trim();
        currentPage = 1;
        loadLeads();
      }, 350);
    });

    // Filters
    document.getElementById('filter-status').addEventListener('change', (e) => {
      filters.status = e.target.value;
      currentPage = 1;
      loadLeads();
    });
    document.getElementById('filter-source').addEventListener('change', (e) => {
      filters.source = e.target.value;
      currentPage = 1;
      loadLeads();
    });

    // Column sorting
    document.querySelectorAll('#leads-table th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (sortField === field) {
          sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          sortField = field;
          sortOrder = 'asc';
        }
        loadLeads();
      });
    });

    // Add Lead button
    document.getElementById('add-lead-btn').addEventListener('click', _openAddModal);

    // Export CSV
    document.getElementById('export-csv-btn').addEventListener('click', exportCSV);
  }

  /* ────────── Load Leads ────────── */

  async function loadLeads() {
    const tbody = document.getElementById('leads-tbody');
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--text-muted);">Loading...</td></tr>';

    try {
      const sortStr = sortOrder === 'desc' ? `-${sortField}` : sortField;
      const params = {
        page: currentPage,
        limit: perPage,
        sort: sortStr
      };
      if (filters.status)      params.status = filters.status;
      if (filters.source)      params.source = filters.source;
      if (filters.search)      params.search = filters.search;
      if (filters.assigned_to) params.assigned_to = filters.assigned_to;

      const res = await get('/leads', params);
      const data = res.data || res;
      const leads = data.leads || data || [];
      totalLeads = data.total || data.count || leads.length;
      totalPages = data.pages || data.totalPages || Math.ceil(totalLeads / perPage) || 1;
      _leadsCache = leads;

      _renderRows(leads);
      _renderPagination();
      _updateSortIndicators();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--danger);">Error: ${_esc(err.message)}</td></tr>`;
    }
  }

  /* ────────── Render rows ────────── */

  function _renderRows(leads) {
    const tbody = document.getElementById('leads-tbody');
    if (!leads || leads.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--text-muted);">No leads found</td></tr>';
      return;
    }

    tbody.innerHTML = leads.map(l => {
      const id = l._id || l.id;
      return `
      <tr style="cursor:pointer;" data-id="${id}">
        <td><strong>${_esc(l.name || '')}</strong></td>
        <td>${_esc(l.phone || '')}</td>
        <td>${_esc(l.email || '-')}</td>
        <td>${_esc(l.exam || '-')}</td>
        <td><span class="status-badge ${_statusClass(l.status)}"><span class="status-dot"></span>${_esc(_capitalize(l.status || 'new'))}</span></td>
        <td>${_esc(_capitalize(l.source || '-'))}</td>
        <td><span class="tag-pill ${_priorityColor(l.priority)}">${_esc(_capitalize(l.priority || 'medium'))}</span></td>
        <td>${_esc(l.assignedTo ? (l.assignedTo.name || l.assignedTo) : '-')}</td>
        <td>${_formatDate(l.createdAt || l.created_at)}</td>
        <td>
          <button class="topbar-icon-btn" onclick="event.stopPropagation();LeadDetail.open('${id}')" title="View details" style="width:30px;height:30px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </td>
      </tr>`;
    }).join('');

    // Row click -> detail
    tbody.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.addEventListener('click', () => LeadDetail.open(tr.dataset.id));
    });
  }

  /* ────────── Pagination ────────── */

  function _renderPagination() {
    const pag = document.getElementById('leads-pagination');
    if (!pag) return;

    const start = ((currentPage - 1) * perPage) + 1;
    const end   = Math.min(currentPage * perPage, totalLeads);

    let btns = '';
    // Prev
    btns += `<button ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}">&laquo;</button>`;

    // Page numbers (show max 7)
    const startPage = Math.max(1, currentPage - 3);
    const endPage   = Math.min(totalPages, startPage + 6);
    for (let i = startPage; i <= endPage; i++) {
      btns += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    // Next
    btns += `<button ${currentPage >= totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">&raquo;</button>`;

    pag.innerHTML = `
      <span>Showing ${totalLeads > 0 ? start : 0}-${end} of ${totalLeads} leads</span>
      <div class="pagination-btns">${btns}</div>
    `;

    pag.querySelectorAll('.pagination-btns button[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.dataset.page);
        if (p >= 1 && p <= totalPages && p !== currentPage) {
          currentPage = p;
          loadLeads();
        }
      });
    });
  }

  /* ────────── Sort indicators ────────── */

  function _updateSortIndicators() {
    document.querySelectorAll('#leads-table th[data-sort]').forEach(th => {
      const arrow = th.querySelector('.sort-arrow');
      if (th.dataset.sort === sortField) {
        th.style.color = 'var(--primary)';
        if (arrow) arrow.textContent = sortOrder === 'asc' ? ' \u25B2' : ' \u25BC';
      } else {
        th.style.color = '';
        if (arrow) arrow.textContent = '';
      }
    });
  }

  /* ────────── Add Lead Modal ────────── */

  function _openAddModal() {
    const modal = document.getElementById('add-lead-modal');
    modal.classList.add('active');

    // Close handlers
    document.getElementById('add-lead-close-btn').onclick  = _closeAddModal;
    document.getElementById('add-lead-cancel-btn').onclick = _closeAddModal;
    modal.addEventListener('click', (e) => { if (e.target === modal) _closeAddModal(); });

    // Submit
    document.getElementById('add-lead-submit-btn').onclick = _submitNewLead;
  }

  function _closeAddModal() {
    const modal = document.getElementById('add-lead-modal');
    modal.classList.remove('active');
    document.getElementById('add-lead-form').reset();
  }

  async function _submitNewLead() {
    const btn = document.getElementById('add-lead-submit-btn');
    btn.disabled = true;
    btn.textContent = 'Adding...';

    try {
      const body = {
        name:     document.getElementById('new-lead-name').value.trim(),
        phone:    document.getElementById('new-lead-phone').value.trim(),
        email:    document.getElementById('new-lead-email').value.trim() || undefined,
        exam:     document.getElementById('new-lead-exam').value.trim() || undefined,
        source:   document.getElementById('new-lead-source').value || undefined,
        priority: document.getElementById('new-lead-priority').value || 'medium',
        notes:    document.getElementById('new-lead-notes').value.trim() || undefined
      };

      if (!body.name || !body.phone) {
        alert('Name and Phone are required.');
        return;
      }

      await post('/leads', body);
      _closeAddModal();
      await loadLeads();
    } catch (err) {
      alert('Failed to add lead: ' + (err.message || 'Unknown error'));
    } finally {
      btn.disabled = false;
      btn.textContent = 'Add Lead';
    }
  }

  /* ────────── Export CSV ────────── */

  async function exportCSV() {
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.source) params.set('source', filters.source);
      if (filters.search) params.set('search', filters.search);

      const url = `${API_BASE_URL}/leads/export?${params.toString()}`;
      const resp = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!resp.ok) {
        // Fallback: build CSV client-side from cached leads
        _downloadClientCSV();
        return;
      }

      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `leads_export_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      // Fallback to client-side CSV
      _downloadClientCSV();
    }
  }

  function _downloadClientCSV() {
    if (!_leadsCache.length) {
      alert('No leads to export.');
      return;
    }
    const headers = ['Name','Phone','Email','Exam','Status','Source','Priority','Created'];
    const rows = _leadsCache.map(l => [
      l.name, l.phone, l.email, l.exam, l.status, l.source, l.priority,
      l.created_at ? new Date(l.created_at).toLocaleDateString() : ''
    ]);
    let csv = headers.join(',') + '\n';
    rows.forEach(r => {
      csv += r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leads_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  /* ────────── Utility ────────── */

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

  function _priorityColor(p) {
    const map = { low: 'blue', medium: 'orange', high: 'red', urgent: 'red' };
    return map[(p || '').toLowerCase()] || 'gray';
  }

  function _formatDate(d) {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (_) { return '-'; }
  }

  /* ---- Public ---- */
  return { render, loadLeads };
})();
