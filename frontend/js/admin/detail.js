/* ============================================
   LS Predictor — Lead Detail Modal
   Tabs: Info, Activity/Notes, Reminders
   ============================================ */
const LeadDetail = (() => {
  let _lead       = null;
  let _notes      = [];
  let _reminders  = [];
  let _activeTab  = 'info';
  let _users      = [];   // cached team list for assignment dropdown

  /* ────────── Open ────────── */

  async function open(leadId) {
    if (!leadId) return;
    const modal = document.getElementById('lead-modal');
    const body  = document.getElementById('modal-body');

    // Show modal with loading
    modal.classList.add('active');
    body.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted);">Loading...</div>';
    _activeTab = 'info';
    _resetTabs();

    try {
      // Fetch lead, notes, reminders in parallel
      const [leadData, notesData, remindersData] = await Promise.all([
        get(`/leads/${leadId}`),
        _safeGet(`/leads/${leadId}/notes`),
        _safeGet(`/leads/${leadId}/reminders`)
      ]);

      const ld = leadData.data || leadData;
      _lead = ld.lead || ld;
      const nd = notesData.data || notesData;
      _notes = Array.isArray(nd) ? nd : (nd.notes || nd || []);
      const rd = remindersData.data || remindersData;
      _reminders = Array.isArray(rd) ? rd : (rd.reminders || rd || []);

      // Try to load team members if not cached
      if (!_users.length) {
        try {
          const uRes = await get('/users');
          const uData = uRes.data || uRes;
          _users = uData.users || (Array.isArray(uData) ? uData : []);
        } catch (_) { _users = []; }
      }

      // Set modal title
      document.getElementById('modal-lead-name').textContent = _lead.name || 'Lead Details';

      _renderActiveTab();
    } catch (err) {
      body.innerHTML = `<div style="text-align:center;padding:32px;color:var(--danger);">
        Failed to load lead details.<br>
        <span style="font-size:0.8125rem;color:var(--text-muted);">${_esc(err.message)}</span>
      </div>`;
    }

    // Bind close handlers
    document.getElementById('modal-close-btn').onclick = close;
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    // Tab handlers
    document.querySelectorAll('.modal-tab').forEach(tab => {
      tab.onclick = () => {
        _activeTab = tab.dataset.tab;
        _resetTabs();
        tab.style.borderBottomColor = 'var(--primary)';
        tab.style.color = 'var(--primary)';
        _renderActiveTab();
      };
    });
  }

  /* ────────── Close ────────── */

  function close() {
    const modal = document.getElementById('lead-modal');
    modal.classList.remove('active');
    _lead = null;
    _notes = [];
    _reminders = [];

    // Refresh current view
    const hash = window.location.hash.slice(1) || '/dashboard';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  /* ────────── Tab Navigation ────────── */

  function _resetTabs() {
    document.querySelectorAll('.modal-tab').forEach(t => {
      t.style.borderBottomColor = 'transparent';
      t.style.color = 'var(--text-muted)';
      if (t.dataset.tab === _activeTab) {
        t.style.borderBottomColor = 'var(--primary)';
        t.style.color = 'var(--primary)';
      }
    });
  }

  function _renderActiveTab() {
    const body = document.getElementById('modal-body');
    switch (_activeTab) {
      case 'info':      body.innerHTML = _renderInfo();      _bindInfoEvents(); break;
      case 'notes':     body.innerHTML = _renderNotes();     _bindNotesEvents(); break;
      case 'reminders': body.innerHTML = _renderReminders(); _bindRemindersEvents(); break;
    }
  }

  /* ═══════════════════════════════════════
     TAB 1: INFO
     ═══════════════════════════════════════ */

  function _renderInfo() {
    const l = _lead;
    if (!l) return '';

    // User options for assignment
    const userOpts = _users.map(u => {
      const uid = u._id || u.id;
      const assignedId = l.assignedTo ? (l.assignedTo._id || l.assignedTo) : '';
      const selected = (assignedId === uid) ? ' selected' : '';
      return `<option value="${uid}"${selected}>${_esc(u.name || u.email)}</option>`;
    }).join('');

    return `
      <div class="admin-form">
        <!-- Contact Info -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
          <div>
            <label style="font-size:0.6875rem;font-weight:600;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.05em;">Name</label>
            <p style="font-size:0.9375rem;font-weight:600;color:var(--text-dark);margin-top:4px;">${_esc(l.name || '-')}</p>
          </div>
          <div>
            <label style="font-size:0.6875rem;font-weight:600;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.05em;">Phone</label>
            <p style="font-size:0.9375rem;color:var(--text-body);margin-top:4px;">${_esc(l.phone || '-')}</p>
          </div>
          <div>
            <label style="font-size:0.6875rem;font-weight:600;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.05em;">Email</label>
            <p style="font-size:0.9375rem;color:var(--text-body);margin-top:4px;">${_esc(l.email || '-')}</p>
          </div>
          <div>
            <label style="font-size:0.6875rem;font-weight:600;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.05em;">Exam</label>
            <p style="font-size:0.9375rem;color:var(--text-body);margin-top:4px;">${_esc(l.exam || '-')}</p>
          </div>
        </div>

        <!-- Predictor Context (if exists) -->
        ${l.inputValue || l.predictedRank ? `
        <div style="background:var(--primary-light, #e8f5e9);border-radius:var(--radius-md, 10px);padding:16px;margin-bottom:24px;">
          <h4 style="font-size:0.8125rem;font-weight:600;color:var(--primary-dark, #0ea960);margin-bottom:8px;">Predictor Context</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:0.8125rem;color:var(--text-body);">
            ${l.inputValue != null ? `<div><strong>${_capitalize(l.inputType || 'Score')}:</strong> ${l.inputValue}</div>` : ''}
            ${l.predictedRank != null ? `<div><strong>Predicted Rank:</strong> ${l.predictedRank}</div>` : ''}
            ${l.category ? `<div><strong>Category:</strong> ${_esc(l.category)}</div>` : ''}
          </div>
        </div>` : ''}

        <!-- Editable CRM Fields -->
        <div style="border-top:1px solid var(--border-light);padding-top:20px;">
          <h4 style="font-size:0.875rem;font-weight:600;margin-bottom:16px;">CRM Fields</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div class="form-group">
              <label>Status</label>
              <select id="detail-status" class="form-control">
                <option value="new"${l.status==='new'?' selected':''}>New</option>
                <option value="contacted"${l.status==='contacted'?' selected':''}>Contacted</option>
                <option value="qualified"${l.status==='qualified'?' selected':''}>Qualified</option>
                <option value="enrolled"${l.status==='enrolled'?' selected':''}>Enrolled</option>
                <option value="lost"${l.status==='lost'?' selected':''}>Lost</option>
              </select>
            </div>
            <div class="form-group">
              <label>Priority</label>
              <select id="detail-priority" class="form-control">
                <option value="low"${l.priority==='low'?' selected':''}>Low</option>
                <option value="medium"${l.priority==='medium'?' selected':''}>Medium</option>
                <option value="high"${l.priority==='high'?' selected':''}>High</option>
                <option value="urgent"${l.priority==='urgent'?' selected':''}>Urgent</option>
              </select>
            </div>
            <div class="form-group">
              <label>Assigned To</label>
              <select id="detail-assigned" class="form-control">
                <option value="">Unassigned</option>
                ${userOpts}
              </select>
            </div>
            <div class="form-group">
              <label>Tags</label>
              <input type="text" id="detail-tags" class="form-control" placeholder="tag1, tag2, ..." value="${_esc((l.tags || []).join(', '))}">
            </div>
          </div>
          <button class="btn btn-primary btn-sm" id="save-lead-btn" style="margin-top:8px;">Save Changes</button>
          <span id="save-lead-msg" style="margin-left:12px;font-size:0.8125rem;color:var(--success);display:none;">Saved!</span>
        </div>

        <!-- Source & Dates -->
        <div style="border-top:1px solid var(--border-light);padding-top:16px;margin-top:20px;display:flex;gap:24px;flex-wrap:wrap;font-size:0.8125rem;color:var(--text-muted);">
          <div>Source: <strong style="color:var(--text-body);">${_esc(_capitalize(l.source || '-'))}</strong></div>
          <div>Created: <strong style="color:var(--text-body);">${_formatDate(l.createdAt || l.created_at)}</strong></div>
          <div>Updated: <strong style="color:var(--text-body);">${_formatDate(l.updatedAt || l.updated_at)}</strong></div>
        </div>
      </div>
    `;
  }

  function _bindInfoEvents() {
    const btn = document.getElementById('save-lead-btn');
    if (!btn || !_lead) return;

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Saving...';
      const msg = document.getElementById('save-lead-msg');
      msg.style.display = 'none';

      const oldStatus = _lead.status;
      const newStatus = document.getElementById('detail-status').value;

      try {
        const body = {
          status:     newStatus,
          priority:   document.getElementById('detail-priority').value,
          assignedTo: document.getElementById('detail-assigned').value || null,
          tags:       document.getElementById('detail-tags').value
                        .split(',').map(t => t.trim()).filter(Boolean)
        };

        await patch(`/leads/${_lead._id || _lead.id}`, body);

        // Add status change note if changed
        if (oldStatus !== newStatus) {
          try {
            await post(`/leads/${_lead._id || _lead.id}/notes`, {
              type: 'status_change',
              content: `Status changed from "${_capitalize(oldStatus)}" to "${_capitalize(newStatus)}"`
            });
          } catch (_) { /* non-critical */ }
        }

        // Update local data
        _lead.status   = body.status;
        _lead.priority = body.priority;
        _lead.assigned_to = body.assigned_to;
        _lead.tags = body.tags;

        msg.textContent = 'Saved!';
        msg.style.color = 'var(--success)';
        msg.style.display = 'inline';
        setTimeout(() => { msg.style.display = 'none'; }, 2000);
      } catch (err) {
        msg.textContent = 'Error: ' + (err.message || 'Failed');
        msg.style.color = 'var(--danger)';
        msg.style.display = 'inline';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
      }
    });
  }

  /* ═══════════════════════════════════════
     TAB 2: ACTIVITY / NOTES
     ═══════════════════════════════════════ */

  function _renderNotes() {
    const notesArr = Array.isArray(_notes) ? _notes : [];

    const timeline = notesArr.map(n => {
      const typeIcons = {
        note: '&#128221;',
        call: '&#128222;',
        email: '&#9993;',
        meeting: '&#128197;',
        status_change: '&#9889;',
        system: '&#9881;'
      };
      const icon = typeIcons[n.type] || '&#128221;';
      const typeColors = {
        note: 'var(--info)',
        call: 'var(--primary)',
        email: 'var(--accent)',
        meeting: '#9b59b6',
        status_change: 'var(--warning)',
        system: 'var(--text-muted)'
      };
      const color = typeColors[n.type] || 'var(--info)';

      return `
        <div style="display:flex;gap:12px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border-light);">
          <div style="width:32px;height:32px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.875rem;flex-shrink:0;">${icon}</div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:0.8125rem;font-weight:600;color:var(--text-dark);">${_esc(_capitalize(n.type || 'note'))}</span>
              <span style="font-size:0.6875rem;color:var(--text-muted);">${_relTime(n.createdAt || n.created_at)}</span>
            </div>
            <p style="font-size:0.8125rem;color:var(--text-body);line-height:1.5;">${_esc(n.content || '')}</p>
            ${n.author ? `<p style="font-size:0.6875rem;color:var(--text-muted);margin-top:4px;">by ${_esc(typeof n.author === 'object' ? n.author.name : n.author)}</p>` : ''}
          </div>
        </div>`;
    }).join('');

    return `
      <!-- Add Note Form -->
      <div style="margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid var(--border-light);">
        <div class="admin-form">
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <select id="note-type" class="form-control" style="width:auto;padding:9px 12px;font-size:0.8125rem;">
              <option value="note">Note</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
            </select>
            <div style="flex:1;">
              <textarea id="note-content" class="form-control" rows="2" placeholder="Add a note or activity..."></textarea>
            </div>
            <button class="btn btn-primary btn-sm" id="add-note-btn" style="white-space:nowrap;">Add</button>
          </div>
        </div>
      </div>

      <!-- Timeline -->
      <div id="notes-timeline">
        ${timeline || '<p style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.8125rem;">No activity yet. Add the first note above.</p>'}
      </div>
    `;
  }

  function _bindNotesEvents() {
    const btn = document.getElementById('add-note-btn');
    if (!btn || !_lead) return;

    btn.addEventListener('click', async () => {
      const content = document.getElementById('note-content').value.trim();
      if (!content) return;

      const type = document.getElementById('note-type').value;
      btn.disabled = true;
      btn.textContent = '...';

      try {
        await post(`/leads/${_lead._id || _lead.id}/notes`, { type, content });
        // Reload notes
        const ndRes = await _safeGet(`/leads/${_lead._id || _lead.id}/notes`);
        const ndData = ndRes.data || ndRes;
        _notes = Array.isArray(ndData) ? ndData : (ndData.notes || ndData || []);
        _renderActiveTab();
      } catch (err) {
        alert('Failed to add note: ' + (err.message || 'Unknown'));
      } finally {
        btn.disabled = false;
        btn.textContent = 'Add';
      }
    });
  }

  /* ═══════════════════════════════════════
     TAB 3: REMINDERS
     ═══════════════════════════════════════ */

  function _renderReminders() {
    const remArr = Array.isArray(_reminders) ? _reminders : [];

    const list = remArr.map(r => {
      const dueAt = r.dueAt || r.due_at;
      const completed = r.isCompleted || r.completed;
      const isOverdue = dueAt && new Date(dueAt) < new Date() && !completed;
      const dotClass  = completed ? 'low' : (isOverdue ? 'urgent' : 'normal');
      return `
        <div class="reminder-card" data-reminder-id="${r._id || r.id}">
          <span class="reminder-dot ${dotClass}"></span>
          <div class="reminder-info" style="flex:1;">
            <h4 style="${completed ? 'text-decoration:line-through;opacity:0.5;' : ''}">${_esc(r.title || r.content || 'Reminder')}</h4>
            <p>${dueAt ? 'Due: ' + _formatDateTime(dueAt) : ''} ${isOverdue ? '<span style="color:var(--danger);font-weight:600;">OVERDUE</span>' : ''}</p>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            ${!completed ? `<button class="btn btn-sm btn-primary complete-reminder-btn" data-id="${r._id || r.id}" style="padding:6px 12px;font-size:0.75rem;">Done</button>` : '<span class="tag-pill green">Completed</span>'}
          </div>
        </div>`;
    }).join('');

    return `
      <!-- Add Reminder Form -->
      <div style="margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid var(--border-light);">
        <div class="admin-form">
          <div style="display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:end;">
            <div class="form-group" style="margin-bottom:0;">
              <label>Reminder</label>
              <input type="text" id="reminder-title" class="form-control" placeholder="Follow up with student...">
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label>Due Date/Time</label>
              <input type="datetime-local" id="reminder-due" class="form-control">
            </div>
            <button class="btn btn-primary btn-sm" id="add-reminder-btn">Add</button>
          </div>
        </div>
      </div>

      <!-- Reminders List -->
      <div id="reminders-list">
        ${list || '<p style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.8125rem;">No reminders yet.</p>'}
      </div>
    `;
  }

  function _bindRemindersEvents() {
    // Add reminder
    const addBtn = document.getElementById('add-reminder-btn');
    if (addBtn && _lead) {
      addBtn.addEventListener('click', async () => {
        const title = document.getElementById('reminder-title').value.trim();
        const due   = document.getElementById('reminder-due').value;
        if (!title) return;

        addBtn.disabled = true;
        addBtn.textContent = '...';

        try {
          await post(`/leads/${_lead._id || _lead.id}/reminders`, {
            title,
            dueAt: due ? new Date(due).toISOString() : new Date(Date.now() + 86400000).toISOString()
          });
          const rdRes = await _safeGet(`/leads/${_lead._id || _lead.id}/reminders`);
          const rdData = rdRes.data || rdRes;
          _reminders = Array.isArray(rdData) ? rdData : (rdData.reminders || rdData || []);
          _renderActiveTab();
        } catch (err) {
          alert('Failed to add reminder: ' + (err.message || 'Unknown'));
        } finally {
          addBtn.disabled = false;
          addBtn.textContent = 'Add';
        }
      });
    }

    // Mark complete
    document.querySelectorAll('.complete-reminder-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        btn.disabled = true;
        btn.textContent = '...';

        try {
          await patch(`/reminders/${id}`, { isCompleted: true });
          const rdRes2 = await _safeGet(`/leads/${_lead._id || _lead.id}/reminders`);
          const rdData2 = rdRes2.data || rdRes2;
          _reminders = Array.isArray(rdData2) ? rdData2 : (rdData2.reminders || rdData2 || []);
          _renderActiveTab();
        } catch (err) {
          alert('Failed to complete reminder: ' + (err.message || 'Unknown'));
          btn.disabled = false;
          btn.textContent = 'Done';
        }
      });
    });
  }

  /* ────────── Utility ────────── */

  async function _safeGet(endpoint) {
    try { return await get(endpoint); } catch (_) { return []; }
  }

  function _esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function _capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '';
  }

  function _formatDate(d) {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (_) { return '-'; }
  }

  function _formatDateTime(d) {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (_) { return '-'; }
  }

  function _relTime(d) {
    if (!d) return '';
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
      return _formatDate(d);
    } catch (_) { return ''; }
  }

  /* ---- Public ---- */
  return { open, close };
})();
