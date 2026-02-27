// frontend/js/api.js  — shared across all pages
const API_BASE = (() => {
  try {
    const { protocol, hostname, port } = window.location;
    if (port === '5500' || port === '3000') return `${protocol}//${hostname}:5000/api`;
    if (protocol.startsWith('http')) return `${protocol}//${hostname}${port ? ':'+port : ''}/api`;
  } catch {}
  return 'http://localhost:5000/api';
})();

/* ── Token helpers ─────────────────────────────── */
let memoryToken = null;

const Auth = {
  getToken:   ()        => memoryToken || localStorage.getItem('ams_token'), // legacy fallback
  setToken:   (t)       => { memoryToken = t; localStorage.setItem('ams_session', '1'); localStorage.removeItem('ams_token'); },
  getUser:    ()        => { try { return JSON.parse(localStorage.getItem('ams_user')); } catch { return null; } },
  setUser:    (u)       => localStorage.setItem('ams_user', JSON.stringify(u)),
  isLoggedIn: ()        => localStorage.getItem('ams_session') === '1' || !!memoryToken || !!localStorage.getItem('ams_token'),
  logout:     ()        => {
    memoryToken = null;
    localStorage.removeItem('ams_token');
    localStorage.removeItem('ams_session');
    localStorage.removeItem('ams_user');
    fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
  },
};

/* ── Fetch wrapper ─────────────────────────────── */
async function apiFetch(endpoint, options = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res  = await fetch(`${API_BASE}${endpoint}`, { ...options, headers, credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, ...data };
    return data;
  } catch (err) {
    if (!err.status) {
      const offline = typeof navigator !== 'undefined' && navigator && navigator.onLine === false;
      const msg = offline
        ? 'No internet connection. Please reconnect and try again.'
        : `Cannot reach API at ${API_BASE}. Please start the backend server.`;
      throw { status: 0, success: false, message: msg };
    }
    if (err.status === 401) {
      Auth.logout();
      if (!window.location.pathname.includes('login') && !window.location.pathname.includes('index')) {
        window.location.href = 'login.html?expired=1';
      }
    }
    throw err;
  }
}

/* ── Toast notifications ───────────────────────── */
function toast(msg, type = 'success', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText =
      'position:fixed;top:1.2rem;right:1.2rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;';
    document.body.appendChild(container);
  }
  const colors = { success:'#22c55e', error:'#ef4444', warning:'#f59e0b', info:'#3b82f6' };
  const icons  = { success:'✓', error:'✕', warning:'⚠', info:'ℹ' };
  const el = document.createElement('div');
  el.style.cssText = `
    background:#1c1c1c; border:1px solid ${colors[type]}44; border-left:3px solid ${colors[type]};
    color:#f0ece4; padding:0.75rem 1rem; border-radius:6px; font-size:0.9rem;
    display:flex; align-items:center; gap:0.6rem;
    animation:fadeIn 0.25s ease; min-width:260px; max-width:360px; font-family:'Barlow',sans-serif;
    box-shadow:0 4px 20px rgba(0,0,0,0.5);
  `;
  const iconEl = document.createElement('span');
  iconEl.style.color = colors[type];
  iconEl.style.fontWeight = '700';
  iconEl.textContent = icons[type];
  const msgEl = document.createElement('span');
  msgEl.textContent = msg;
  el.appendChild(iconEl);
  el.appendChild(msgEl);
  container.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transition='opacity 0.3s'; setTimeout(()=>el.remove(), 300); }, duration);
}

/* ── Loading button helper ─────────────────────── */
function setLoading(btn, isLoading, originalText) {
  if (isLoading) {
    btn.disabled = true;
    btn.dataset.original = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Loading…';
  } else {
    btn.disabled = false;
    btn.innerHTML = originalText || btn.dataset.original || btn.innerHTML;
  }
}

/* ── Guard: redirect to login if not authenticated ─ */
function requireAuth(redirectTo = 'login.html') {
  if (!Auth.isLoggedIn()) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

/* ── Guard: redirect to profile if already logged in ─ */
function redirectIfLoggedIn(to = 'profile.html') {
  if (Auth.isLoggedIn()) window.location.href = to;
}

/* ── Animate elements on scroll ─────────────────── */
function initScrollAnimation() {
  const observer = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.1 }
  );
  document.querySelectorAll('.animate-in').forEach(el => observer.observe(el));
}

/* ── Capitalise first letter ─────────────────────── */
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '';

/* ── Format date ─────────────────────────────────── */
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' });
}

window.API_BASE = API_BASE;
window.Auth     = Auth;
window.apiFetch = apiFetch;
window.toast    = toast;
window.setLoading = setLoading;
window.requireAuth = requireAuth;
window.redirectIfLoggedIn = redirectIfLoggedIn;
window.initScrollAnimation = initScrollAnimation;
window.cap   = cap;
window.fmtDate = fmtDate;
