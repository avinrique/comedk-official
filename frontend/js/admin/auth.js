/* ============================================
   COMEDK Official — Auth Module
   ============================================ */
const Auth = (() => {
  const TOKEN_KEY = 'auth_token';
  const USER_KEY  = 'auth_user';

  /**
   * Initialise auth state.
   * If a valid token exists show the app shell, otherwise show login.
   */
  function init() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      _showApp();
    } else {
      _showLogin();
    }

    // Bind login form
    const form = document.getElementById('login-form');
    if (form) {
      form.addEventListener('submit', _handleSubmit);
    }

    // Bind logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }
  }

  /* ---- Login ---- */

  async function _handleSubmit(e) {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) return;
    await login(email, password);
  }

  async function login(email, password) {
    const btn   = document.getElementById('login-btn');
    const errEl = document.getElementById('login-error');

    btn.disabled  = true;
    btn.textContent = 'Signing in...';
    errEl.style.display = 'none';

    try {
      const res = await post('/auth/login', { email, password });
      const data = res.data || res;

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      _showApp();

      // Navigate to dashboard by default
      if (!window.location.hash || window.location.hash === '#') {
        window.location.hash = '#/dashboard';
      }
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      errEl.textContent   = err.message || 'Invalid email or password.';
      errEl.style.display = 'block';
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Sign In';
    }
  }

  /* ---- Logout ---- */

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    _showLogin();
  }

  /* ---- Helpers ---- */

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY)) || null;
    } catch (_) {
      return null;
    }
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function isAdmin() {
    const user = getUser();
    return user && (user.role === 'admin' || user.role === 'super_admin');
  }

  function _showApp() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('app').style.display = 'flex';

    // Populate user info in sidebar + topbar
    const user = getUser();
    if (user) {
      const initials = _initials(user.name || user.email);
      _setText('sidebar-avatar', initials);
      _setText('topbar-avatar', initials);
      _setText('sidebar-user-name', user.name || user.email);
      _setText('topbar-user-name', user.name || user.email);
      _setText('sidebar-user-role', _capitalize(user.role || 'counselor'));
    }

    // Show / hide admin-only nav
    const teamNav = document.getElementById('nav-team');
    if (teamNav) {
      teamNav.style.display = isAdmin() ? 'flex' : 'none';
    }
  }

  function _showLogin() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    const errEl = document.getElementById('login-error');
    if (errEl) errEl.style.display = 'none';
  }

  function _initials(name) {
    if (!name) return '--';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }

  function _capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '';
  }

  function _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  /* ---- Public API ---- */
  return { init, login, logout, getUser, getToken, isAdmin };
})();
