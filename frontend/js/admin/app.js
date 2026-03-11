/* ============================================
   LS Predictor — SPA Router + Inline Views
   (Reminders & Team management)
   ============================================ */
const App = (() => {

  /* ═══════════════════════════════════════
     ROUTER
     ═══════════════════════════════════════ */

  const routes = {
    '/dashboard':  () => { _setTitle('Dashboard');  Analytics.render(); },
    '/leads':      () => { _setTitle('Leads');      Leads.render(); },
    '/pipeline':   () => { _setTitle('Pipeline');   Pipeline.render(); },
    '/reminders':  () => { _setTitle('Reminders');  Reminders.render(); },
    '/team':       () => { _setTitle('Team');       Team.render(); },
    '/settings':   () => { _setTitle('Settings');   Settings.render(); },
  };

  function init() {
    Auth.init();
    window.addEventListener('hashchange', route);

    // Sidebar toggle
    _bindSidebar();

    // Global search
    _bindGlobalSearch();

    // Mobile responsive check
    _handleResize();
    window.addEventListener('resize', _handleResize);

    // Initial route (wait a tick so Auth can show/hide properly)
    setTimeout(route, 0);
  }

  function route() {
    // Only route if logged in
    if (!Auth.getToken()) return;

    const hash = window.location.hash.slice(1) || '/dashboard';
    const renderFn = routes[hash];

    if (renderFn) {
      _updateActiveNav(hash);
      renderFn();
    } else {
      // Unknown route — fallback to dashboard
      window.location.hash = '#/dashboard';
    }
  }

  function _setTitle(title) {
    const el = document.getElementById('page-title');
    if (el) el.textContent = title;
  }

  function _updateActiveNav(hash) {
    document.querySelectorAll('.sidebar-link').forEach(link => {
      if (link.dataset.route === hash) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  /* ═══════════════════════════════════════
     SIDEBAR CONTROLS
     ═══════════════════════════════════════ */

  function _bindSidebar() {
    const sidebar    = document.getElementById('sidebar');
    const toggleBtn  = document.getElementById('sidebar-toggle-btn');
    const mobileBtn  = document.getElementById('mobile-menu-btn');
    const overlay    = document.getElementById('sidebar-overlay');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
      });
    }

    if (mobileBtn) {
      mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }
  }

  function _handleResize() {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    if (!mobileBtn) return;
    if (window.innerWidth <= 768) {
      mobileBtn.style.display = 'flex';
    } else {
      mobileBtn.style.display = 'none';
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
    }
  }

  /* ═══════════════════════════════════════
     GLOBAL SEARCH
     ═══════════════════════════════════════ */

  function _bindGlobalSearch() {
    const input = document.getElementById('global-search');
    if (!input) return;

    let debounce = null;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(debounce);
        const q = input.value.trim();
        if (q) {
          window.location.hash = '#/leads';
          // Wait for route to render, then set search
          setTimeout(() => {
            const searchField = document.getElementById('leads-search');
            if (searchField) {
              searchField.value = q;
              searchField.dispatchEvent(new Event('input'));
            }
          }, 100);
        }
      }
    });
  }

  /* ═══════════════════════════════════════
     REMINDERS VIEW
     ═══════════════════════════════════════ */

  const Reminders = (() => {

    async function render() {
      const content = document.getElementById('content');
      content.innerHTML = '<div style="text-align:center;padding:48px;color:var(--text-muted);">Loading reminders...</div>';

      try {
        const res = await get('/reminders');
        const rData = res.data || res;
        const all = Array.isArray(rData) ? rData : (rData.reminders || rData || []);

        // Separate overdue, upcoming, completed
        const now = new Date();
        const overdue   = all.filter(r => !r.isCompleted && (r.dueAt || r.due_at) && new Date(r.dueAt || r.due_at) < now);
        const upcoming  = all.filter(r => !r.isCompleted && (!(r.dueAt || r.due_at) || new Date(r.dueAt || r.due_at) >= now));
        const completed = all.filter(r => r.isCompleted);

        // Update badge
        _updateBadge(overdue.length + upcoming.length);

        content.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
            <div>
              <h2 style="font-size:1.125rem;font-weight:600;">All Reminders</h2>
              <p style="font-size:0.8125rem;color:var(--text-muted);">${overdue.length} overdue, ${upcoming.length} upcoming, ${completed.length} completed</p>
            </div>
          </div>

          ${overdue.length ? `
            <h3 style="font-size:0.875rem;font-weight:600;color:var(--danger);margin-bottom:12px;">Overdue (${overdue.length})</h3>
            <div style="margin-bottom:24px;">${_renderReminderCards(overdue, true)}</div>
          ` : ''}

          ${upcoming.length ? `
            <h3 style="font-size:0.875rem;font-weight:600;color:var(--text-dark);margin-bottom:12px;">Upcoming (${upcoming.length})</h3>
            <div style="margin-bottom:24px;">${_renderReminderCards(upcoming, false)}</div>
          ` : ''}

          ${completed.length ? `
            <h3 style="font-size:0.875rem;font-weight:600;color:var(--text-muted);margin-bottom:12px;">Completed (${completed.length})</h3>
            <div style="margin-bottom:24px;">${_renderReminderCards(completed, false)}</div>
          ` : ''}

          ${all.length === 0 ? '<div class="chart-card" style="text-align:center;padding:48px;color:var(--text-muted);">No reminders found. Create reminders from lead details.</div>' : ''}
        `;

        // Bind complete buttons
        content.querySelectorAll('.complete-reminder-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.textContent = '...';
            try {
              await patch(`/reminders/${btn.dataset.id}`, { isCompleted: true });
              render(); // refresh
            } catch (err) {
              alert('Failed: ' + (err.message || 'Unknown'));
              btn.disabled = false;
              btn.textContent = 'Done';
            }
          });
        });

        // Bind card clicks -> open lead detail
        content.querySelectorAll('.reminder-card[data-lead-id]').forEach(card => {
          card.style.cursor = 'pointer';
          card.addEventListener('click', (e) => {
            if (e.target.closest('.complete-reminder-btn')) return;
            LeadDetail.open(card.dataset.leadId);
          });
        });

      } catch (err) {
        content.innerHTML = `<div class="chart-card" style="text-align:center;padding:48px;color:var(--danger);">
          Failed to load reminders.<br>
          <span style="font-size:0.8125rem;color:var(--text-muted);">${_esc(err.message)}</span>
        </div>`;
      }
    }

    function _renderReminderCards(reminders, isOverdue) {
      return reminders.map(r => {
        const done = r.isCompleted || r.completed;
        const dueAt = r.dueAt || r.due_at;
        const leadId = r.lead ? (typeof r.lead === 'object' ? r.lead._id : r.lead) : '';
        const leadName = r.lead && typeof r.lead === 'object' ? r.lead.name : '';
        const dotClass = done ? 'low' : (isOverdue ? 'urgent' : 'normal');
        return `
          <div class="reminder-card" data-lead-id="${leadId}">
            <span class="reminder-dot ${dotClass}"></span>
            <div class="reminder-info" style="flex:1;">
              <h4 style="${done ? 'text-decoration:line-through;opacity:0.5;' : ''}">${_esc(r.title || 'Reminder')}</h4>
              <p>${leadName ? _esc(leadName) + ' &bull; ' : ''}${dueAt ? _formatDateTime(dueAt) : 'No due date'}</p>
            </div>
            <div class="reminder-time">${_relTime(dueAt)}</div>
            ${!done ? `<button class="btn btn-sm btn-primary complete-reminder-btn" data-id="${r._id || r.id}" style="padding:6px 12px;font-size:0.75rem;margin-left:8px;">Done</button>` : ''}
          </div>`;
      }).join('');
    }

    function _updateBadge(count) {
      const badge = document.getElementById('reminder-badge');
      const notifDot = document.getElementById('notif-dot');
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline' : 'none';
      }
      if (notifDot) {
        notifDot.style.display = count > 0 ? 'block' : 'none';
      }
    }

    return { render };
  })();

  /* ═══════════════════════════════════════
     TEAM VIEW (Admin only)
     ═══════════════════════════════════════ */

  const Team = (() => {

    let _users = [];

    async function render() {
      const content = document.getElementById('content');

      if (!Auth.isAdmin()) {
        content.innerHTML = '<div class="chart-card" style="text-align:center;padding:48px;color:var(--danger);">Access denied. Admin privileges required.</div>';
        return;
      }

      content.innerHTML = '<div style="text-align:center;padding:48px;color:var(--text-muted);">Loading team...</div>';

      try {
        const res = await get('/users');
        const uData = res.data || res;
        _users = uData.users || (Array.isArray(uData) ? uData : []);

        content.innerHTML = `
          <div class="data-table-card">
            <div class="data-table-header">
              <h3>Team Members</h3>
              <button class="btn btn-primary btn-sm" id="add-user-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add User
              </button>
            </div>
            <div class="data-table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Leads Assigned</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="team-tbody">
                  ${_renderUserRows()}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Add/Edit User Form -->
          <div id="user-form-card" class="chart-card" style="display:none;">
            <div class="chart-card-header">
              <h3 id="user-form-title">Add New User</h3>
              <button class="topbar-icon-btn" id="close-user-form" title="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form id="user-form" class="admin-form" onsubmit="return false;">
              <input type="hidden" id="user-form-id">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div class="form-group">
                  <label for="user-form-name">Name *</label>
                  <input type="text" id="user-form-name" class="form-control" required placeholder="Full name">
                </div>
                <div class="form-group">
                  <label for="user-form-email">Email *</label>
                  <input type="email" id="user-form-email" class="form-control" required placeholder="user@example.com">
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div class="form-group">
                  <label for="user-form-role">Role</label>
                  <select id="user-form-role" class="form-control">
                    <option value="counselor">Counselor</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div class="form-group" id="password-group">
                  <label for="user-form-password">Password *</label>
                  <input type="password" id="user-form-password" class="form-control" placeholder="Min 6 characters">
                </div>
              </div>
              <div style="display:flex;gap:8px;margin-top:8px;">
                <button type="submit" class="btn btn-primary btn-sm" id="user-form-submit">Add User</button>
                <button type="button" class="btn btn-secondary btn-sm" id="user-form-cancel">Cancel</button>
              </div>
              <p id="user-form-error" style="display:none;color:var(--danger);font-size:0.8125rem;margin-top:8px;"></p>
            </form>
          </div>
        `;

        _bindTeamEvents();

      } catch (err) {
        content.innerHTML = `<div class="chart-card" style="text-align:center;padding:48px;color:var(--danger);">
          Failed to load team data.<br>
          <span style="font-size:0.8125rem;color:var(--text-muted);">${_esc(err.message)}</span>
        </div>`;
      }
    }

    function _renderUserRows() {
      if (!_users.length) {
        return '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted);">No team members found</td></tr>';
      }

      return _users.map(u => {
        const uid = u._id || u.id;
        const statusBadge = (u.isActive !== false && u.active !== false)
          ? '<span class="status-badge active"><span class="status-dot"></span>Active</span>'
          : '<span class="status-badge inactive"><span class="status-dot"></span>Inactive</span>';

        return `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:32px;height:32px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;">${_initials(u.name || u.email)}</div>
                <strong>${_esc(u.name || '-')}</strong>
              </div>
            </td>
            <td>${_esc(u.email || '-')}</td>
            <td><span class="tag-pill ${_roleColor(u.role)}">${_esc(_capitalize(u.role || 'counselor'))}</span></td>
            <td>${statusBadge}</td>
            <td>${u.lead_count != null ? u.lead_count : '-'}</td>
            <td>
              <div style="display:flex;gap:4px;">
                <button class="topbar-icon-btn edit-user-btn" data-id="${uid}" title="Edit" style="width:30px;height:30px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </div>
            </td>
          </tr>`;
      }).join('');
    }

    function _bindTeamEvents() {
      // Add user
      document.getElementById('add-user-btn').addEventListener('click', () => {
        _showUserForm(null);
      });

      // Edit user
      document.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const user = _users.find(u => (u._id || u.id) === btn.dataset.id);
          if (user) _showUserForm(user);
        });
      });

      // Close form
      const closeBtn = document.getElementById('close-user-form');
      const cancelBtn = document.getElementById('user-form-cancel');
      if (closeBtn) closeBtn.addEventListener('click', _hideUserForm);
      if (cancelBtn) cancelBtn.addEventListener('click', _hideUserForm);

      // Submit form
      document.getElementById('user-form').addEventListener('submit', _submitUserForm);
      document.getElementById('user-form-submit').addEventListener('click', _submitUserForm);
    }

    function _showUserForm(user) {
      const card = document.getElementById('user-form-card');
      card.style.display = 'block';
      card.scrollIntoView({ behavior: 'smooth' });

      const isEdit = !!user;
      document.getElementById('user-form-title').textContent = isEdit ? 'Edit User' : 'Add New User';
      document.getElementById('user-form-submit').textContent = isEdit ? 'Save Changes' : 'Add User';
      document.getElementById('user-form-id').value = isEdit ? (user._id || user.id) : '';
      document.getElementById('user-form-name').value = isEdit ? (user.name || '') : '';
      document.getElementById('user-form-email').value = isEdit ? (user.email || '') : '';
      document.getElementById('user-form-role').value = isEdit ? (user.role || 'counselor') : 'counselor';
      document.getElementById('user-form-password').value = '';
      document.getElementById('user-form-error').style.display = 'none';

      // Password not required for edit
      const pwGroup = document.getElementById('password-group');
      const pwInput = document.getElementById('user-form-password');
      if (isEdit) {
        pwInput.required = false;
        pwInput.placeholder = 'Leave blank to keep current';
      } else {
        pwInput.required = true;
        pwInput.placeholder = 'Min 6 characters';
      }
    }

    function _hideUserForm() {
      document.getElementById('user-form-card').style.display = 'none';
      document.getElementById('user-form').reset();
    }

    async function _submitUserForm(e) {
      e.preventDefault();
      const errEl  = document.getElementById('user-form-error');
      const btn    = document.getElementById('user-form-submit');
      errEl.style.display = 'none';

      const id   = document.getElementById('user-form-id').value;
      const name = document.getElementById('user-form-name').value.trim();
      const email = document.getElementById('user-form-email').value.trim();
      const role  = document.getElementById('user-form-role').value;
      const pw    = document.getElementById('user-form-password').value;

      if (!name || !email) {
        errEl.textContent = 'Name and email are required.';
        errEl.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        if (id) {
          // Update
          const body = { name, email, role };
          if (pw) body.password = pw;
          await patch(`/users/${id}`, body);
        } else {
          // Create
          if (!pw || pw.length < 6) {
            errEl.textContent = 'Password must be at least 6 characters.';
            errEl.style.display = 'block';
            return;
          }
          await post('/users', { name, email, role, password: pw });
        }

        _hideUserForm();
        render(); // refresh
      } catch (err) {
        errEl.textContent = err.message || 'Failed to save user.';
        errEl.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = id ? 'Save Changes' : 'Add User';
      }
    }

    function _roleColor(role) {
      const map = { admin: 'red', super_admin: 'red', manager: 'purple', counselor: 'blue' };
      return map[(role || '').toLowerCase()] || 'gray';
    }

    return { render };
  })();

  /* ═══════════════════════════════════════
     SETTINGS VIEW (Admin only)
     ═══════════════════════════════════════ */

  const Settings = (() => {

    async function render() {
      const content = document.getElementById('content');
      const isAdmin = Auth.isAdmin();

      let settingsHTML = '';

      // Admin-only predictor settings
      if (isAdmin) {
        content.innerHTML = '<div style="text-align:center;padding:48px;color:var(--text-muted);">Loading settings...</div>';

        try {
          const res = await get('/settings');
          const data = res.data || res;
          const settings = data.settings || (Array.isArray(data) ? data : []);

          const leadGate = settings.find(s => s.key === 'predictor_lead_gate');
          const leadGateValue = leadGate ? leadGate.value : true;

          settingsHTML += `
            <div class="chart-card">
              <div class="chart-card-header"><h3>Predictor Settings</h3></div>
              <div style="padding:4px 0;">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 0;border-bottom:1px solid var(--border-light, #eee);">
                  <div>
                    <h4 style="font-size:0.9375rem;font-weight:600;color:var(--text-dark);margin-bottom:4px;">Lead Capture Gate</h4>
                    <p style="font-size:0.8125rem;color:var(--text-muted);max-width:480px;">
                      When enabled, users must enter their name, phone, and email before viewing prediction results. This captures leads from the predictor tool.
                    </p>
                  </div>
                  <label class="toggle-switch" style="position:relative;display:inline-block;width:52px;height:28px;flex-shrink:0;">
                    <input type="checkbox" id="setting-lead-gate" ${leadGateValue ? 'checked' : ''} style="opacity:0;width:0;height:0;">
                    <span class="toggle-slider" style="position:absolute;cursor:pointer;inset:0;background:${leadGateValue ? 'var(--primary, #0ea960)' : '#ccc'};border-radius:28px;transition:0.3s;">
                      <span style="position:absolute;content:'';height:22px;width:22px;left:${leadGateValue ? '27px' : '3px'};bottom:3px;background:#fff;border-radius:50%;transition:0.3s;box-shadow:0 1px 4px rgba(0,0,0,0.15);"></span>
                    </span>
                  </label>
                </div>
                <p id="settings-status" style="font-size:0.8125rem;margin-top:12px;display:none;"></p>
              </div>
            </div>
          `;
        } catch (err) {
          settingsHTML += `<div class="chart-card" style="text-align:center;padding:48px;color:var(--danger);">
            Failed to load settings.<br>
            <span style="font-size:0.8125rem;color:var(--text-muted);">${_esc(err.message)}</span>
          </div>`;
        }
      }

      // Change password (available to all users)
      settingsHTML += `
        <div class="chart-card" style="margin-top:24px;">
          <div class="chart-card-header"><h3>Change Password</h3></div>
          <form id="change-password-form" class="admin-form" onsubmit="return false;" style="max-width:400px;">
            <div class="form-group">
              <label for="cp-current">Current Password</label>
              <input type="password" id="cp-current" class="form-control" placeholder="Enter current password" required>
            </div>
            <div class="form-group">
              <label for="cp-new">New Password</label>
              <input type="password" id="cp-new" class="form-control" placeholder="Min 6 characters" required>
            </div>
            <div class="form-group">
              <label for="cp-confirm">Confirm New Password</label>
              <input type="password" id="cp-confirm" class="form-control" placeholder="Re-enter new password" required>
            </div>
            <button type="submit" class="btn btn-primary btn-sm" id="cp-submit-btn">Update Password</button>
            <p id="cp-msg" style="font-size:0.8125rem;margin-top:12px;display:none;"></p>
          </form>
        </div>
      `;

      content.innerHTML = settingsHTML;

      // Bind lead gate toggle (admin only)
      if (isAdmin) {
        const toggle = document.getElementById('setting-lead-gate');
        const statusEl = document.getElementById('settings-status');
        if (toggle) {
          toggle.addEventListener('change', async () => {
            const newVal = toggle.checked;
            const slider = toggle.nextElementSibling;
            const dot = slider.querySelector('span');

            slider.style.background = newVal ? 'var(--primary, #0ea960)' : '#ccc';
            dot.style.left = newVal ? '27px' : '3px';

            try {
              await apiRequest('/settings/predictor_lead_gate', {
                method: 'PUT',
                body: { value: newVal }
              });
              statusEl.textContent = 'Setting saved.';
              statusEl.style.color = 'var(--success, #0ea960)';
              statusEl.style.display = 'block';
              setTimeout(() => { statusEl.style.display = 'none'; }, 2000);
            } catch (err) {
              statusEl.textContent = 'Failed to save: ' + (err.message || 'Unknown error');
              statusEl.style.color = 'var(--danger, #e74c3c)';
              statusEl.style.display = 'block';
              toggle.checked = !newVal;
              slider.style.background = !newVal ? 'var(--primary, #0ea960)' : '#ccc';
              dot.style.left = !newVal ? '27px' : '3px';
            }
          });
        }
      }

      // Bind change password form
      const cpForm = document.getElementById('change-password-form');
      cpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('cp-submit-btn');
        const msg = document.getElementById('cp-msg');
        const currentPw = document.getElementById('cp-current').value;
        const newPw = document.getElementById('cp-new').value;
        const confirmPw = document.getElementById('cp-confirm').value;

        msg.style.display = 'none';

        if (!currentPw || !newPw || !confirmPw) {
          msg.textContent = 'All fields are required.';
          msg.style.color = 'var(--danger)';
          msg.style.display = 'block';
          return;
        }

        if (newPw.length < 6) {
          msg.textContent = 'New password must be at least 6 characters.';
          msg.style.color = 'var(--danger)';
          msg.style.display = 'block';
          return;
        }

        if (newPw !== confirmPw) {
          msg.textContent = 'New passwords do not match.';
          msg.style.color = 'var(--danger)';
          msg.style.display = 'block';
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Updating...';

        try {
          await post('/auth/change-password', { currentPassword: currentPw, newPassword: newPw });
          msg.textContent = 'Password updated successfully!';
          msg.style.color = 'var(--success, #0ea960)';
          msg.style.display = 'block';
          cpForm.reset();
        } catch (err) {
          msg.textContent = err.message || 'Failed to update password.';
          msg.style.color = 'var(--danger)';
          msg.style.display = 'block';
        } finally {
          btn.disabled = false;
          btn.textContent = 'Update Password';
        }
      });
    }

    return { render };
  })();

  /* ═══════════════════════════════════════
     SHARED UTILITIES
     ═══════════════════════════════════════ */

  function _esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function _capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '';
  }

  function _initials(name) {
    if (!name) return '--';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }

  function _formatDateTime(d) {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (_) { return '-'; }
  }

  function _relTime(d) {
    if (!d) return '';
    try {
      const dt = new Date(d);
      const diff = Date.now() - dt.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 0) {
        const absMins = Math.abs(mins);
        if (absMins < 60) return 'in ' + absMins + 'm';
        const hrs = Math.floor(absMins / 60);
        if (hrs < 24) return 'in ' + hrs + 'h';
        return 'in ' + Math.floor(hrs / 24) + 'd';
      }
      if (mins < 1) return 'Just now';
      if (mins < 60) return mins + 'm ago';
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return hrs + 'h ago';
      return Math.floor(hrs / 24) + 'd ago';
    } catch (_) { return ''; }
  }

  /* ---- Public ---- */
  return { init };
})();

/* ── Bootstrap ── */
document.addEventListener('DOMContentLoaded', App.init);
