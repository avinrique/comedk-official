/* ============================================
   COMEDK Official — Pipeline / Kanban View
   HTML5 Drag & Drop — no libraries.
   ============================================ */
const Pipeline = (() => {

  const STATUSES = [
    { key: 'new',       label: 'New',       dotClass: 'new' },
    { key: 'contacted', label: 'Contacted', dotClass: 'contacted' },
    { key: 'qualified', label: 'Qualified', dotClass: 'qualified' },
    { key: 'enrolled',  label: 'Enrolled',  dotClass: 'converted' },
    { key: 'lost',      label: 'Lost',      dotClass: 'lost' }
  ];

  let _allLeads = [];

  /* ────────── Main render ────────── */

  async function render() {
    const content = document.getElementById('content');
    content.innerHTML = '<div style="text-align:center;padding:48px;color:var(--text-muted);">Loading pipeline...</div>';

    try {
      await _loadData();
      _renderBoard();
    } catch (err) {
      content.innerHTML = `<div class="chart-card" style="text-align:center;padding:48px;color:var(--danger);">
        <p>Failed to load pipeline.</p>
        <p style="font-size:0.8125rem;color:var(--text-muted);margin-top:8px;">${_esc(err.message)}</p>
      </div>`;
    }
  }

  /* ────────── Data ────────── */

  async function _loadData() {
    // Fetch all leads (no pagination for kanban — reasonable size)
    const res = await get('/leads', { limit: 500 });
    const data = res.data || res;
    _allLeads = data.leads || data || [];
  }

  /* ────────── Board Rendering ────────── */

  function _renderBoard() {
    const content = document.getElementById('content');
    const board = document.createElement('div');
    board.className = 'kanban-board';
    board.id = 'kanban-board';

    STATUSES.forEach(status => {
      const leads = _allLeads.filter(l => (l.status || 'new').toLowerCase() === status.key);

      const col = document.createElement('div');
      col.className = 'kanban-column';
      col.dataset.status = status.key;

      col.innerHTML = `
        <div class="kanban-column-header">
          <div class="kanban-column-title">
            <span class="kanban-status-dot ${status.dotClass}"></span>
            ${status.label}
          </div>
          <span class="kanban-column-count">${leads.length}</span>
        </div>
      `;

      const cardsContainer = document.createElement('div');
      cardsContainer.className = 'kanban-cards';
      cardsContainer.dataset.status = status.key;

      leads.forEach(lead => {
        cardsContainer.appendChild(_createCard(lead));
      });

      col.appendChild(cardsContainer);
      board.appendChild(col);
    });

    content.innerHTML = '';
    content.appendChild(board);

    _setupDragAndDrop();
  }

  /* ────────── Card ────────── */

  function _createCard(lead) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.draggable = true;
    card.dataset.id = lead._id || lead.id;

    const priorityColors = { low: 'blue', medium: 'orange', high: 'red', urgent: 'red' };
    const pColor = priorityColors[(lead.priority || '').toLowerCase()] || 'gray';

    card.innerHTML = `
      <div class="kanban-card-header">
        <span class="kanban-card-name">${_esc(lead.name || 'Unknown')}</span>
        ${lead.exam ? `<span class="kanban-card-exam">${_esc(lead.exam)}</span>` : ''}
      </div>
      <div class="kanban-card-details">
        ${lead.phone ? lead.phone + '<br>' : ''}
        ${lead.source ? _capitalize(lead.source) : ''}
      </div>
      <div class="kanban-card-footer">
        <div class="kanban-card-tags">
          <span class="tag-pill ${pColor}">${_esc(_capitalize(lead.priority || 'medium'))}</span>
        </div>
        <span class="kanban-card-date">${_relDate(lead.createdAt || lead.created_at)}</span>
      </div>
    `;

    // Click to open detail
    card.addEventListener('click', (e) => {
      // Ignore if dragging
      if (card.classList.contains('dragging')) return;
      LeadDetail.open(card.dataset.id);
    });

    return card;
  }

  /* ────────── Drag & Drop ────────── */

  function _setupDragAndDrop() {
    const cards = document.querySelectorAll('.kanban-card');
    const columns = document.querySelectorAll('.kanban-cards');

    cards.forEach(card => {
      card.addEventListener('dragstart', _onDragStart);
      card.addEventListener('dragend', _onDragEnd);
    });

    columns.forEach(col => {
      col.addEventListener('dragover', _onDragOver);
      col.addEventListener('dragenter', _onDragEnter);
      col.addEventListener('dragleave', _onDragLeave);
      col.addEventListener('drop', _onDrop);
    });
  }

  let _draggedCard = null;

  function _onDragStart(e) {
    _draggedCard = e.target.closest('.kanban-card');
    if (!_draggedCard) return;
    _draggedCard.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', _draggedCard.dataset.id);
    // Slight delay to let the browser capture the drag image
    setTimeout(() => {
      if (_draggedCard) _draggedCard.style.opacity = '0.4';
    }, 0);
  }

  function _onDragEnd(e) {
    if (_draggedCard) {
      _draggedCard.style.opacity = '1';
      _draggedCard.classList.remove('dragging');
    }
    _draggedCard = null;
    // Remove all highlights
    document.querySelectorAll('.kanban-cards').forEach(c => {
      c.style.background = '';
    });
  }

  function _onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Position card among siblings
    const container = e.currentTarget;
    const afterElement = _getDragAfterElement(container, e.clientY);
    if (_draggedCard) {
      if (afterElement == null) {
        container.appendChild(_draggedCard);
      } else {
        container.insertBefore(_draggedCard, afterElement);
      }
    }
  }

  function _onDragEnter(e) {
    e.preventDefault();
    e.currentTarget.style.background = 'rgba(14, 169, 96, 0.04)';
  }

  function _onDragLeave(e) {
    // Only if leaving the container itself
    if (!e.currentTarget.contains(e.relatedTarget)) {
      e.currentTarget.style.background = '';
    }
  }

  async function _onDrop(e) {
    e.preventDefault();
    const container = e.currentTarget;
    container.style.background = '';

    const leadId = e.dataTransfer.getData('text/plain');
    const newStatus = container.dataset.status;
    if (!leadId || !newStatus) return;

    // Find old status
    const lead = _allLeads.find(l => (l._id || l.id) === leadId);
    const oldStatus = lead ? (lead.status || 'new') : '';

    if (oldStatus === newStatus) return;

    // Optimistic update in memory
    if (lead) lead.status = newStatus;

    // Update column counts
    _updateColumnCounts();

    // API call
    try {
      await patch(`/leads/${leadId}`, { status: newStatus });
    } catch (err) {
      // Revert on failure
      if (lead) lead.status = oldStatus;
      _renderBoard();
      alert('Failed to update status: ' + (err.message || 'Unknown error'));
    }
  }

  function _getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.kanban-card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  function _updateColumnCounts() {
    STATUSES.forEach(status => {
      const col = document.querySelector(`.kanban-column[data-status="${status.key}"]`);
      if (!col) return;
      const count = col.querySelectorAll('.kanban-card').length;
      const badge = col.querySelector('.kanban-column-count');
      if (badge) badge.textContent = count;
    });
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

  function _relDate(d) {
    if (!d) return '';
    try {
      const dt = new Date(d);
      const diff = Date.now() - dt.getTime();
      const days = Math.floor(diff / 86400000);
      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 7) return days + 'd ago';
      return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch (_) { return ''; }
  }

  /* ---- Public ---- */
  return { render };
})();
