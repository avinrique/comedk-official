/* ============================================
   LS Predictor — Predictor Page Logic
   Handles: exam selection, input toggle, API
   prediction calls, results rendering,
   sorting, pagination, and lead capture.
   ============================================ */

var Predictor = (function () {
  'use strict';

  // ---- State ----
  var selectedExam = null;
  var examData = [];
  var results = null;
  var allResults = [];
  var currentPage = 1;
  var perPage = 20;
  var inputMode = 'marks'; // 'marks' or 'rank'
  var sortColumn = null;
  var sortDirection = 'asc';
  var predictedRankValue = null;
  var leadGateEnabled = true;  // toggled by admin via settings API
  var leadGateSubmitted = false; // becomes true after user submits gate form
  var pendingResults = null;  // holds results waiting behind the gate

  // ---- Default exam config (fallback if API fails) ----
  var defaultExams = [
    {
      id: 'jee_main',
      name: 'JEE Main',
      slug: 'jee_main',
      maxMarks: 300,
      iconClass: 'jee',
      iconText: 'JEE',
      description: 'NITs, IIITs & CFTIs',
      categories: ['General', 'OBC-NCL', 'SC', 'ST', 'EWS', 'PwD'],
      branches: ['Computer Science', 'Electronics', 'Electrical', 'Mechanical', 'Civil', 'Chemical', 'Information Technology']
    },
    {
      id: 'neet',
      name: 'NEET',
      slug: 'neet',
      maxMarks: 720,
      iconClass: 'neet',
      iconText: 'NEE',
      description: 'Medical & Dental',
      categories: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      branches: ['MBBS', 'BDS', 'BAMS', 'BHMS'],
      disabled: true
    },
    {
      id: 'comedk',
      name: 'COMEDK',
      slug: 'comedk',
      maxMarks: 180,
      iconClass: 'comedk',
      iconText: 'COM',
      description: 'Karnataka Engg.',
      categories: ['GM', 'KKR'],
      branches: ['Computer Science and Engineering', 'Electronics and Communication Engineering', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering'],
      rounds: ['Round 1', 'Round 2', 'Round 3']
    },
    {
      id: 'srm',
      name: 'SRMJEE',
      slug: 'srm',
      maxMarks: 180,
      iconClass: 'srm',
      iconText: 'SRM',
      description: 'SRM Universities',
      categories: ['General'],
      branches: ['Computer Science and Engineering', 'Electronics and Communication Engineering', 'Mechanical Engineering', 'Electrical and Electronics Engineering', 'Information Technology', 'Biotechnology']
    },
    {
      id: 'vit',
      name: 'VITEEE',
      slug: 'vit',
      maxMarks: 120,
      iconClass: 'vit',
      iconText: 'VIT',
      description: 'VIT Universities',
      categories: ['General'],
      branches: ['Computer Science and Engineering', 'Electronics and Communication Engineering', 'Mechanical Engineering', 'Electrical and Electronics Engineering', 'Information Technology', 'Biotechnology', 'Chemical Engineering']
    }
  ];

  // ---- DOM Caching ----
  var dom = {};

  function cacheDom() {
    dom.examOptions = document.getElementById('examOptions');
    dom.inputSection = document.getElementById('inputSection');
    dom.inputToggle = document.getElementById('inputToggle');
    dom.inputLabel = document.getElementById('inputLabel');
    dom.inputValue = document.getElementById('inputValue');
    dom.inputError = document.getElementById('inputError');
    dom.filterSection = document.getElementById('filterSection');
    dom.categoryFilter = document.getElementById('categoryFilter');
    dom.branchFilter = document.getElementById('branchFilter');
    dom.predictBtn = document.getElementById('predictBtn');
    dom.predictorLoading = document.getElementById('predictorLoading');
    dom.predictorErrorMsg = document.getElementById('predictorErrorMsg');
    dom.predictorErrorText = document.getElementById('predictorErrorText');
    dom.resultsWrapper = document.getElementById('resultsWrapper');
    dom.resultsStats = document.getElementById('resultsStats');
    dom.statPredictedRank = document.getElementById('statPredictedRank');
    dom.statOptimisticRank = document.getElementById('statOptimisticRank');
    dom.statPessimisticRank = document.getElementById('statPessimisticRank');
    dom.statTotalMatches = document.getElementById('statTotalMatches');
    dom.resultsSection = document.getElementById('resultsSection');
    dom.resultsCount = document.getElementById('resultsCount');
    dom.resultsTable = document.getElementById('resultsTable');
    dom.resultsTableBody = document.getElementById('resultsTableBody');
    dom.resultsEmpty = document.getElementById('resultsEmpty');
    dom.resultsPagination = document.getElementById('resultsPagination');
    dom.leadCaptureCard = document.getElementById('leadCaptureCard');
    dom.leadCaptureForm = document.getElementById('leadCaptureForm');
    dom.leadSuccessMsg = document.getElementById('leadSuccessMsg');
    dom.leadSubmitBtn = document.getElementById('leadSubmitBtn');
    // Gate modal
    dom.roundFilter = document.getElementById('roundFilter');
    dom.roundFilterGroup = document.getElementById('roundFilterGroup');
    dom.roundFilterDivider = document.getElementById('roundFilterDivider');
    dom.leadGateOverlay = document.getElementById('leadGateOverlay');
    dom.leadGateForm = document.getElementById('leadGateForm');
    dom.leadGateSubmit = document.getElementById('leadGateSubmit');
    dom.leadGateError = document.getElementById('leadGateError');
  }

  // ---- Init ----
  async function init() {
    cacheDom();
    await loadExams();
    await loadGateSetting();
    setupExamSelection();
    setupInputToggle();
    setupInputValidation();
    setupPredictButton();
    setupTableSorting();
    setupLeadCapture();
    setupLeadGate();
  }

  // ---- Load gate setting from backend ----
  async function loadGateSetting() {
    try {
      var res = await get('/settings/public/predictor_lead_gate');
      var data = res.data || res;
      leadGateEnabled = data.value !== false && data.value !== 'false';
    } catch (e) {
      // Default to enabled if setting can't be fetched
      leadGateEnabled = true;
    }
  }

  // ---- Lead Gate ----
  function setupLeadGate() {
    if (!dom.leadGateForm) return;

    dom.leadGateForm.addEventListener('submit', function (e) {
      e.preventDefault();
      handleGateSubmit();
    });

    // Close on overlay click (outside modal)
    if (dom.leadGateOverlay) {
      dom.leadGateOverlay.addEventListener('click', function (e) {
        if (e.target === dom.leadGateOverlay) {
          // Don't allow closing — they must fill the form
        }
      });
    }

    // Clear field errors on input
    var fields = ['gateName', 'gatePhone', 'gateEmail'];
    fields.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', function () {
          el.closest('.form-group').classList.remove('error');
        });
      }
    });
  }

  async function handleGateSubmit() {
    // Validate
    var name = document.getElementById('gateName').value.trim();
    var phone = document.getElementById('gatePhone').value.trim().replace(/[\s\-\(\)]/g, '');
    var email = document.getElementById('gateEmail').value.trim();
    var state = document.getElementById('gateState').value;
    var valid = true;

    if (!name || name.length < 2) {
      document.getElementById('gateName').closest('.form-group').classList.add('error');
      valid = false;
    }
    if (!phone || phone.length < 10) {
      document.getElementById('gatePhone').closest('.form-group').classList.add('error');
      valid = false;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.getElementById('gateEmail').closest('.form-group').classList.add('error');
      valid = false;
    }
    if (!valid) return;

    // Show loading on button
    dom.leadGateSubmit.disabled = true;
    dom.leadGateSubmit.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;"></span> Submitting...';
    dom.leadGateError.style.display = 'none';

    try {
      await post('/leads', {
        name: name,
        phone: phone,
        email: email || undefined,
        state: state || undefined,
        source: 'predictor',
        exam: selectedExam ? (selectedExam.name || selectedExam.id) : undefined,
        inputType: inputMode,
        inputValue: parseFloat(dom.inputValue.value.trim()) || undefined,
        predictedRank: predictedRankValue || undefined
      });

      leadGateSubmitted = true;

      // Close gate and show results
      dom.leadGateOverlay.style.display = 'none';
      document.body.style.overflow = '';

      if (pendingResults) {
        renderResults(pendingResults);
        showResults();
        pendingResults = null;
      }
    } catch (err) {
      dom.leadGateError.textContent = err.message || 'Something went wrong. Please try again.';
      dom.leadGateError.style.display = 'block';
    } finally {
      dom.leadGateSubmit.disabled = false;
      dom.leadGateSubmit.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Unlock Results';
    }
  }

  function showLeadGate() {
    if (dom.leadGateOverlay) {
      dom.leadGateOverlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      // Focus first field
      var nameField = document.getElementById('gateName');
      if (nameField) setTimeout(function () { nameField.focus(); }, 100);
    }
  }

  // ---- Load Exams from API ----
  async function loadExams() {
    try {
      var response = await get('/predictor/exams');
      if (response && response.data && response.data.exams && response.data.exams.length > 0) {
        examData = response.data.exams;
      } else {
        examData = defaultExams;
      }
    } catch (err) {
      // Fallback to defaults if API is unavailable
      console.warn('Failed to load exams from API, using defaults:', err.message);
      examData = defaultExams;
    }
    renderExamCards();
  }

  // ---- Icon mapping for API exams that don't have iconClass ----
  var iconMap = {
    'jee-main': { cls: 'jee', text: 'JEE' },
    'jee_main': { cls: 'jee', text: 'JEE' },
    'neet':     { cls: 'neet', text: 'NEE' },
    'comedk':   { cls: 'comedk', text: 'COM' },
    'srm':      { cls: 'srm', text: 'SRM' },
    'srmjee':   { cls: 'srm', text: 'SRM' },
    'vit':      { cls: 'vit', text: 'VIT' },
    'viteee':   { cls: 'vit', text: 'VIT' }
  };

  // ---- Render Exam Cards ----
  function renderExamCards() {
    if (!dom.examOptions || examData.length === 0) return;

    var html = '';
    examData.forEach(function (exam) {
      var mapped = iconMap[exam.id] || iconMap[exam.slug] || {};
      var iconClass = exam.iconClass || mapped.cls || exam.slug || exam.id;
      var iconText = exam.iconText || mapped.text || exam.name.substring(0, 3).toUpperCase();
      var description = exam.description || '';

      var isDisabled = exam.disabled === true;
      html += '<div class="exam-option' + (isDisabled ? ' exam-option-disabled' : '') + '">' +
        '<input type="radio" name="exam" id="exam-' + exam.id + '" value="' + exam.id + '"' + (isDisabled ? ' disabled' : '') + '>' +
        '<label for="exam-' + exam.id + '">' +
          '<div class="exam-option-icon ' + iconClass + '">' + iconText + '</div>' +
          '<span class="exam-option-name">' + escapeHtml(exam.name) + '</span>' +
          '<span class="exam-option-desc">' + escapeHtml(isDisabled ? 'Coming Soon' : description) + '</span>' +
        '</label>' +
      '</div>';
    });

    dom.examOptions.innerHTML = html;
  }

  // ---- Setup Exam Selection ----
  function setupExamSelection() {
    if (!dom.examOptions) return;

    dom.examOptions.addEventListener('change', function (e) {
      if (e.target.name === 'exam') {
        var examId = e.target.value;
        var exam = examData.find(function (ex) {
          return ex.id === examId || ex.slug === examId;
        });
        if (exam) {
          onExamSelected(exam);
        }
      }
    });
  }

  // ---- When Exam Is Selected ----
  function onExamSelected(exam) {
    selectedExam = exam;

    // Update input label based on mode
    updateInputLabel();

    // Update max value for marks mode
    if (inputMode === 'marks') {
      dom.inputValue.setAttribute('max', exam.maxMarks || 999);
      dom.inputValue.setAttribute('placeholder', 'e.g. ' + Math.round((exam.maxMarks || 300) * 0.7));
    }

    // Populate category dropdown
    populateCategories(exam.categories || []);

    // Populate branch dropdown
    populateBranches(exam.branches || []);

    // Show/hide round dropdown
    populateRounds(exam.rounds || []);

    // Enable predict button
    dom.predictBtn.disabled = false;

    // Clear previous results
    hideResults();
    clearErrors();
  }

  // ---- Update Input Label ----
  function updateInputLabel() {
    if (!dom.inputLabel || !selectedExam) return;

    if (inputMode === 'marks') {
      var maxMarks = selectedExam.maxMarks || 300;
      dom.inputLabel.textContent = 'Enter your ' + selectedExam.name + ' marks (out of ' + maxMarks + ')';
      dom.inputValue.setAttribute('placeholder', 'e.g. ' + Math.round(maxMarks * 0.7));
      dom.inputValue.setAttribute('max', maxMarks);
      dom.inputValue.setAttribute('min', '0');
    } else {
      dom.inputLabel.textContent = 'Enter your ' + selectedExam.name + ' rank';
      dom.inputValue.setAttribute('placeholder', 'e.g. 5000');
      dom.inputValue.removeAttribute('max');
      dom.inputValue.setAttribute('min', '1');
    }
  }

  // ---- Populate Category Dropdown ----
  function populateCategories(categories) {
    if (!dom.categoryFilter) return;

    dom.categoryFilter.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(function (cat) {
      var opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      dom.categoryFilter.appendChild(opt);
    });
  }

  // ---- Populate Branch Dropdown ----
  function populateBranches(branches) {
    if (!dom.branchFilter) return;

    dom.branchFilter.innerHTML = '<option value="">All Branches</option>';
    branches.forEach(function (branch) {
      var opt = document.createElement('option');
      opt.value = branch;
      opt.textContent = branch;
      dom.branchFilter.appendChild(opt);
    });
  }

  // ---- Populate Round Dropdown ----
  function populateRounds(rounds) {
    if (!dom.roundFilter || !dom.roundFilterGroup || !dom.roundFilterDivider) return;

    if (!rounds || rounds.length === 0) {
      dom.roundFilterGroup.style.display = 'none';
      dom.roundFilterDivider.style.display = 'none';
      dom.roundFilter.innerHTML = '<option value="">All Rounds</option>';
      return;
    }

    dom.roundFilterGroup.style.display = '';
    dom.roundFilterDivider.style.display = '';

    dom.roundFilter.innerHTML = '<option value="">All Rounds</option>';
    rounds.forEach(function (round) {
      var opt = document.createElement('option');
      opt.value = round;
      opt.textContent = round;
      dom.roundFilter.appendChild(opt);
    });

    // Default to the latest round (last in sorted list)
    dom.roundFilter.value = rounds[rounds.length - 1];
  }

  // ---- Input Toggle (Marks / Rank) ----
  function setupInputToggle() {
    if (!dom.inputToggle) return;

    var buttons = dom.inputToggle.querySelectorAll('button');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-mode');
        if (mode === inputMode) return;

        inputMode = mode;

        // Update active state
        buttons.forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-mode') === mode);
        });

        // Clear input
        dom.inputValue.value = '';
        clearErrors();

        // Update label
        updateInputLabel();
      });
    });
  }

  // ---- Input Validation ----
  function setupInputValidation() {
    if (!dom.inputValue) return;

    dom.inputValue.addEventListener('input', function () {
      clearErrors();
    });
  }

  function validateInput() {
    var value = dom.inputValue.value.trim();

    if (!selectedExam) {
      showInputError('Please select an exam first');
      return false;
    }

    if (value === '' || isNaN(value)) {
      showInputError('Please enter a valid number');
      return false;
    }

    var numValue = parseFloat(value);

    if (inputMode === 'marks') {
      var maxMarks = selectedExam.maxMarks || 300;
      if (numValue < 0 || numValue > maxMarks) {
        showInputError('Marks must be between 0 and ' + maxMarks);
        return false;
      }
    } else {
      if (numValue < 1 || !Number.isInteger(numValue)) {
        showInputError('Please enter a valid rank (positive integer)');
        return false;
      }
    }

    return true;
  }

  function showInputError(msg) {
    if (!dom.inputError) return;
    dom.inputError.textContent = msg;
    dom.inputValue.parentElement.classList.add('error');
  }

  function clearErrors() {
    if (dom.inputValue && dom.inputValue.parentElement) {
      dom.inputValue.parentElement.classList.remove('error');
    }
    if (dom.predictorErrorMsg) {
      dom.predictorErrorMsg.style.display = 'none';
    }
  }

  // ---- Predict Button ----
  function setupPredictButton() {
    if (!dom.predictBtn) return;

    dom.predictBtn.addEventListener('click', handlePredict);
  }

  async function handlePredict() {
    // Validate
    if (!validateInput()) return;

    var inputValue = parseFloat(dom.inputValue.value.trim());
    var category = dom.categoryFilter ? dom.categoryFilter.value : '';
    var branch = dom.branchFilter ? dom.branchFilter.value : '';
    var round = dom.roundFilter ? dom.roundFilter.value : '';

    // Show loading
    showLoading();
    hideResults();
    clearErrors();

    try {
      var payload = {
        exam: selectedExam.id || selectedExam.slug,
        inputType: inputMode,
        inputValue: inputValue,
        category: category,
        branch: branch,
        round: round
      };

      var response = await post('/predictor/predict', payload);

      if (response && response.data) {
        results = response.data;
        allResults = results.colleges || results.results || [];
        predictedRankValue = results.predictedRank || results.predicted_rank || null;
        currentPage = 1;
        sortColumn = null;
        sortDirection = 'asc';

        // If gate is enabled and user hasn't submitted yet, show gate modal
        if (leadGateEnabled && !leadGateSubmitted) {
          pendingResults = results;
          hideLoading();
          showLeadGate();
          return;
        }

        renderResults(results);
        showResults();
      } else {
        showError('Unexpected response from server. Please try again.');
      }
    } catch (err) {
      var msg = err.message || 'Something went wrong. Please try again.';
      showError(msg);
    } finally {
      hideLoading();
    }
  }

  // ---- Loading State ----
  function showLoading() {
    if (dom.predictorLoading) {
      dom.predictorLoading.classList.add('active');
    }
    if (dom.predictBtn) {
      dom.predictBtn.disabled = true;
      dom.predictBtn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div> Analyzing...';
    }
  }

  function hideLoading() {
    if (dom.predictorLoading) {
      dom.predictorLoading.classList.remove('active');
    }
    if (dom.predictBtn) {
      dom.predictBtn.disabled = false;
      dom.predictBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> Find Colleges';
    }
  }

  // ---- Error Display ----
  function showError(msg) {
    if (dom.predictorErrorMsg && dom.predictorErrorText) {
      dom.predictorErrorText.textContent = msg;
      dom.predictorErrorMsg.style.display = 'flex';
    }
  }

  // ---- Results Rendering ----
  function renderResults(data) {
    // Stats cards
    var predicted = data.predictedRank || data.predicted_rank || '--';
    var rr = data.rankRange || data.rank_range || {};
    var optimistic = rr.optimistic || data.optimisticRank || data.optimistic_rank || '--';
    var pessimistic = rr.pessimistic || data.pessimisticRank || data.pessimistic_rank || '--';
    var total = allResults.length;

    if (dom.statPredictedRank) dom.statPredictedRank.textContent = formatRank(predicted);
    if (dom.statOptimisticRank) dom.statOptimisticRank.textContent = formatRank(optimistic);
    if (dom.statPessimisticRank) dom.statPessimisticRank.textContent = formatRank(pessimistic);
    if (dom.statTotalMatches) dom.statTotalMatches.textContent = total;

    // Results count
    if (dom.resultsCount) {
      dom.resultsCount.textContent = total + ' college' + (total !== 1 ? 's' : '') + ' found';
    }

    // Render table or empty state
    if (total === 0) {
      showEmptyState();
    } else {
      hideEmptyState();
      renderTablePage();
      renderPagination();
    }
  }

  function renderTablePage() {
    if (!dom.resultsTableBody) return;

    var start = (currentPage - 1) * perPage;
    var end = start + perPage;
    var pageResults = allResults.slice(start, end);

    var html = '';
    pageResults.forEach(function (item) {
      var collegeName = item.name || item.collegeName || item.college_name || item.college || '';
      var location = item.location || item.city || '';
      var branch = item.branch || item.program || item.programme || '';
      var category = item.category || '';
      var cutoffRank = item.cutoffRank || item.cutoff_rank || item.closingRank || item.closing_rank || '--';
      var yourRank = item.yourRank || item.your_rank || predictedRankValue || '--';
      var chance = item.chance || item.probability || '';

      var chanceClass = getChanceClass(chance);
      var chanceLabel = getChanceLabel(chance);

      html += '<tr>' +
        '<td>' +
          '<div class="college-name">' + escapeHtml(collegeName) + '</div>' +
          (location ? '<div class="college-location">' + escapeHtml(location) + '</div>' : '') +
        '</td>' +
        '<td>' + escapeHtml(branch) + '</td>' +
        '<td>' + escapeHtml(category) + '</td>' +
        '<td>' + formatRank(cutoffRank) + '</td>' +
        '<td>' + formatRank(yourRank) + '</td>' +
        '<td>' +
          '<span class="chance-badge ' + chanceClass + '">' +
            '<span class="chance-dot"></span>' +
            chanceLabel +
          '</span>' +
        '</td>' +
      '</tr>';
    });

    dom.resultsTableBody.innerHTML = html;
  }

  // ---- Chance Badge Logic ----
  function getChanceClass(chance) {
    if (!chance) return 'good';

    var c = String(chance).toLowerCase();
    if (c === 'safe' || c === 'high' || c === 'excellent') return 'safe';
    if (c === 'good' || c === 'moderate' || c === 'medium') return 'good';
    if (c === 'reach' || c === 'low' || c === 'difficult') return 'reach';

    // If numeric probability
    var num = parseFloat(chance);
    if (!isNaN(num)) {
      if (num >= 70) return 'safe';
      if (num >= 40) return 'good';
      return 'reach';
    }

    return 'good';
  }

  function getChanceLabel(chance) {
    if (!chance) return 'Good';

    var c = String(chance).toLowerCase();
    if (c === 'safe' || c === 'high' || c === 'excellent') return 'Safe';
    if (c === 'good' || c === 'moderate' || c === 'medium') return 'Good';
    if (c === 'reach' || c === 'low' || c === 'difficult') return 'Reach';

    var num = parseFloat(chance);
    if (!isNaN(num)) {
      if (num >= 70) return 'Safe';
      if (num >= 40) return 'Good';
      return 'Reach';
    }

    return escapeHtml(String(chance));
  }

  // ---- Pagination ----
  function renderPagination() {
    if (!dom.resultsPagination) return;

    var totalPages = Math.ceil(allResults.length / perPage);

    if (totalPages <= 1) {
      dom.resultsPagination.style.display = 'none';
      return;
    }

    dom.resultsPagination.style.display = 'flex';

    var html = '';

    // Previous button
    html += '<button ' + (currentPage === 1 ? 'disabled' : '') + ' data-page="prev" aria-label="Previous page">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>' +
    '</button>';

    // Page numbers
    var pages = getPageNumbers(currentPage, totalPages);
    pages.forEach(function (p) {
      if (p === '...') {
        html += '<button disabled style="border:none;background:none;cursor:default;">...</button>';
      } else {
        html += '<button data-page="' + p + '" class="' + (p === currentPage ? 'active' : '') + '">' + p + '</button>';
      }
    });

    // Next button
    html += '<button ' + (currentPage === totalPages ? 'disabled' : '') + ' data-page="next" aria-label="Next page">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>' +
    '</button>';

    dom.resultsPagination.innerHTML = html;

    // Bind events
    var buttons = dom.resultsPagination.querySelectorAll('button:not([disabled])');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var page = btn.getAttribute('data-page');
        if (page === 'prev') {
          currentPage = Math.max(1, currentPage - 1);
        } else if (page === 'next') {
          currentPage = Math.min(totalPages, currentPage + 1);
        } else {
          currentPage = parseInt(page, 10);
        }
        renderTablePage();
        renderPagination();

        // Scroll to results table
        if (dom.resultsSection) {
          dom.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  function getPageNumbers(current, total) {
    if (total <= 7) {
      var arr = [];
      for (var i = 1; i <= total; i++) arr.push(i);
      return arr;
    }

    var pages = [];

    if (current <= 3) {
      pages = [1, 2, 3, 4, '...', total];
    } else if (current >= total - 2) {
      pages = [1, '...', total - 3, total - 2, total - 1, total];
    } else {
      pages = [1, '...', current - 1, current, current + 1, '...', total];
    }

    return pages;
  }

  // ---- Table Sorting ----
  function setupTableSorting() {
    if (!dom.resultsTable) return;

    var headers = dom.resultsTable.querySelectorAll('th[data-sort]');
    headers.forEach(function (th) {
      th.addEventListener('click', function () {
        var column = th.getAttribute('data-sort');

        // Toggle direction
        if (sortColumn === column) {
          sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          sortColumn = column;
          sortDirection = 'asc';
        }

        // Update visual state on headers
        headers.forEach(function (h) {
          h.classList.remove('sorted');
        });
        th.classList.add('sorted');

        // Update sort icon direction
        var icon = th.querySelector('.sort-icon');
        if (icon) {
          if (sortDirection === 'desc') {
            icon.style.transform = 'rotate(180deg)';
          } else {
            icon.style.transform = 'rotate(0deg)';
          }
        }

        // Sort allResults
        sortResults(column, sortDirection);

        // Re-render
        currentPage = 1;
        renderTablePage();
        renderPagination();
      });
    });
  }

  function sortResults(column, direction) {
    var keyMap = {
      collegeName: ['name', 'collegeName', 'college_name', 'college'],
      branch: ['branch', 'program', 'programme'],
      category: ['category'],
      cutoffRank: ['cutoffRank', 'cutoff_rank', 'closingRank', 'closing_rank'],
      yourRank: ['yourRank', 'your_rank'],
      chance: ['chance', 'probability']
    };

    var keys = keyMap[column] || [column];

    allResults.sort(function (a, b) {
      var aVal = getNestedValue(a, keys);
      var bVal = getNestedValue(b, keys);

      // Handle numeric comparison for rank columns
      if (column === 'cutoffRank' || column === 'yourRank') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (column === 'chance') {
        aVal = chanceToNumeric(aVal);
        bVal = chanceToNumeric(bVal);
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      var result;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        result = aVal - bVal;
      } else {
        result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }

      return direction === 'desc' ? -result : result;
    });
  }

  function getNestedValue(obj, keys) {
    for (var i = 0; i < keys.length; i++) {
      if (obj[keys[i]] !== undefined && obj[keys[i]] !== null) {
        return obj[keys[i]];
      }
    }
    return '';
  }

  function chanceToNumeric(chance) {
    if (!chance) return 50;
    var c = String(chance).toLowerCase();
    if (c === 'safe' || c === 'high' || c === 'excellent') return 90;
    if (c === 'good' || c === 'moderate' || c === 'medium') return 50;
    if (c === 'reach' || c === 'low' || c === 'difficult') return 10;
    var num = parseFloat(chance);
    return isNaN(num) ? 50 : num;
  }

  // ---- Show/Hide Results ----
  function showResults() {
    if (dom.resultsWrapper) {
      dom.resultsWrapper.style.display = 'block';
      // Animate in
      dom.resultsWrapper.style.opacity = '0';
      dom.resultsWrapper.style.transform = 'translateY(20px)';
      dom.resultsWrapper.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

      // Force reflow
      void dom.resultsWrapper.offsetHeight;

      dom.resultsWrapper.style.opacity = '1';
      dom.resultsWrapper.style.transform = 'translateY(0)';
    }

    // Show lead capture after a short delay
    if (dom.leadCaptureCard) {
      setTimeout(function () {
        dom.leadCaptureCard.style.display = 'block';
      }, 800);
    }
  }

  function hideResults() {
    if (dom.resultsWrapper) {
      dom.resultsWrapper.style.display = 'none';
    }
    if (dom.leadCaptureCard) {
      dom.leadCaptureCard.style.display = 'none';
    }
  }

  function showEmptyState() {
    if (dom.resultsEmpty) dom.resultsEmpty.style.display = 'block';
    if (dom.resultsTableBody) dom.resultsTableBody.innerHTML = '';
    if (dom.resultsPagination) dom.resultsPagination.style.display = 'none';

    // Hide table header row when empty
    var thead = dom.resultsTable ? dom.resultsTable.querySelector('thead') : null;
    if (thead) thead.style.display = 'none';
  }

  function hideEmptyState() {
    if (dom.resultsEmpty) dom.resultsEmpty.style.display = 'none';

    var thead = dom.resultsTable ? dom.resultsTable.querySelector('thead') : null;
    if (thead) thead.style.display = '';
  }

  // ---- Lead Capture ----
  function setupLeadCapture() {
    if (!dom.leadCaptureForm) return;

    dom.leadCaptureForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      // Validate
      var nameInput = document.getElementById('leadName');
      var phoneInput = document.getElementById('leadPhone');
      var emailInput = document.getElementById('leadEmail');

      var name = nameInput ? nameInput.value.trim() : '';
      var phone = phoneInput ? phoneInput.value.trim() : '';
      var email = emailInput ? emailInput.value.trim() : '';

      var isValid = true;

      // Name validation
      if (!name) {
        setFieldError(nameInput, true);
        isValid = false;
      } else {
        setFieldError(nameInput, false);
      }

      // Phone validation
      if (!phone || phone.length < 10) {
        setFieldError(phoneInput, true);
        isValid = false;
      } else {
        setFieldError(phoneInput, false);
      }

      // Email validation (optional but must be valid if provided)
      if (email && !isValidEmail(email)) {
        setFieldError(emailInput, true);
        isValid = false;
      } else {
        setFieldError(emailInput, false);
      }

      if (!isValid) return;

      // Disable button
      if (dom.leadSubmitBtn) {
        dom.leadSubmitBtn.disabled = true;
        dom.leadSubmitBtn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div> Submitting...';
      }

      try {
        var payload = {
          name: name,
          phone: phone,
          email: email || undefined,
          source: 'predictor',
          exam: selectedExam ? (selectedExam.id || selectedExam.slug) : undefined,
          inputType: inputMode,
          inputValue: dom.inputValue ? dom.inputValue.value.trim() : undefined,
          predictedRank: predictedRankValue || undefined
        };

        await post('/leads', payload);

        // Show success
        if (dom.leadSuccessMsg) {
          dom.leadSuccessMsg.style.display = 'flex';
        }
        dom.leadCaptureForm.style.display = 'none';
      } catch (err) {
        console.error('Lead capture error:', err);
        // Show inline error
        alert('Something went wrong while saving your details. Please try again or contact us directly.');
      } finally {
        if (dom.leadSubmitBtn) {
          dom.leadSubmitBtn.disabled = false;
          dom.leadSubmitBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Get Personalized Counseling';
        }
      }
    });
  }

  // ---- Utilities ----
  function formatRank(value) {
    if (value === '--' || value === null || value === undefined) return '--';
    var num = parseInt(value, 10);
    if (isNaN(num)) return String(value);
    return num.toLocaleString('en-IN');
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function isValidEmail(email) {
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  function setFieldError(input, hasError) {
    if (!input) return;
    var group = input.closest('.form-group');
    if (group) {
      if (hasError) {
        group.classList.add('error');
      } else {
        group.classList.remove('error');
      }
    }
  }

  // ---- Public API ----
  return { init: init };

})();

document.addEventListener('DOMContentLoaded', Predictor.init);
