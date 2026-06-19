// Supabase auth + data client for Simplicity Living
// Tables: self_assessments, a4a5_user_projects (user-owned, RLS-protected)
// The 4 main Simplicity project data stays in client-side sql.js (public/shared)

const SUPABASE_URL = 'https://faltilsbkrrmjugxhako.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Lx64Hp7qIUHnSzMdphDTRw_O2kF-nsD';

const { createClient } = window.supabase;
const _db = createClient(SUPABASE_URL, SUPABASE_KEY);

let _user = null;
const _authListeners = [];

// ── Auth state ───────────────────────────────────────────────────────────────

async function initSupabaseAuth() {
    _db.auth.onAuthStateChange((event, session) => {
        _user = session?.user ?? null;
        _renderNavBadge();
        _authListeners.forEach(fn => fn(_user, event));
        if (window.selfLoadAssessments) window.selfLoadAssessments();
    });
    const { data: { session } } = await _db.auth.getSession();
    _user = session?.user ?? null;
    _renderNavBadge();
    if (window.selfLoadAssessments) window.selfLoadAssessments();
    return _user;
}

window.sbGetUser    = () => _user;
window.sbIsLoggedIn = () => !!_user;
window.sbOnAuth     = fn => _authListeners.push(fn);

// ── Sign in / up / out ───────────────────────────────────────────────────────

window.sbSignIn = async (email, password) =>
    _db.auth.signInWithPassword({ email, password });

window.sbSignUp = async (email, password, displayName) =>
    _db.auth.signUp({ email, password, options: { data: { display_name: displayName } } });

window.sbSignOut = async () => {
    await _db.auth.signOut();
    _user = null;
    _renderNavBadge();
};

// ── Self-assessments ─────────────────────────────────────────────────────────

window.sbSaveAssessment = async (project, scores) => {
    if (!_user) return { error: { message: 'Not signed in' } };
    return _db.from('self_assessments').insert({
        user_id:      _user.id,
        project_name: project.name,
        project_type: project.type,
        notes:        project.notes || '',
        energy:       scores.energy     || 0,
        ieq:          scores.ieq        || 0,
        carbon:       scores.carbon     || 0,
        site:         scores.site       || 0,
        water:        scores.water      || 0,
        waste:        scores.waste      || 0,
        innovation:   scores.innovation || 0,
        total: Object.values(scores).reduce((a, b) => a + (b || 0), 0)
    }).select().single();
};

window.sbLoadAssessments = async () => {
    if (!_user) return { data: [], error: null };
    return _db.from('self_assessments')
        .select('*').eq('user_id', _user.id)
        .order('created_at', { ascending: false });
};

window.sbDeleteAssessment = async id =>
    _db.from('self_assessments').delete().eq('id', id).eq('user_id', _user.id);

// ── A4-A5 user projects ──────────────────────────────────────────────────────

window.sbSaveA4A5Project = async (name, dataJson) => {
    if (!_user) return { error: { message: 'Not signed in' } };
    return _db.from('a4a5_user_projects').insert({
        user_id: _user.id, name, data_json: dataJson
    }).select().single();
};

window.sbLoadA4A5Projects = async () => {
    if (!_user) return { data: [], error: null };
    return _db.from('a4a5_user_projects')
        .select('*').eq('user_id', _user.id)
        .order('created_at', { ascending: false });
};

window.sbDeleteA4A5Project = async id =>
    _db.from('a4a5_user_projects').delete().eq('id', id).eq('user_id', _user.id);

// ── Nav badge ────────────────────────────────────────────────────────────────

function _renderNavBadge() {
    const el = document.getElementById('authNavBadge');
    if (!el) return;
    if (_user) {
        const email       = _user.email || '';
        const initial     = email.charAt(0).toUpperCase();
        const displayName = _user.user_metadata?.display_name || email.split('@')[0];
        el.innerHTML = `
            <div class="auth-user-wrap">
                <button class="auth-avatar-btn" onclick="sbToggleMenu()" title="${email}">
                    <span class="auth-avatar">${initial}</span>
                    <span class="auth-display-name">${_esc(displayName)}</span>
                    <span class="auth-chevron">▾</span>
                </button>
                <div class="auth-dropdown" id="authDropdown" style="display:none;">
                    <div class="auth-dd-email">${_esc(email)}</div>
                    <button class="auth-dd-btn" onclick="sbSignOut()">Sign out</button>
                </div>
            </div>`;
    } else {
        el.innerHTML = `<button class="auth-signin-btn" onclick="openAuthModal()">Sign In</button>`;
    }
}

window.sbToggleMenu = () => {
    const dd = document.getElementById('authDropdown');
    if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
};

document.addEventListener('click', e => {
    const wrap = document.querySelector('.auth-user-wrap');
    if (wrap && !wrap.contains(e.target)) {
        const dd = document.getElementById('authDropdown');
        if (dd) dd.style.display = 'none';
    }
});

// ── Auth Modal ───────────────────────────────────────────────────────────────

window.openAuthModal = (tab = 'signin') => {
    if (!document.getElementById('authModal')) _injectModal();
    document.getElementById('authModal').style.display = 'flex';
    switchAuthTab(tab);
};

window.closeAuthModal = () => {
    const m = document.getElementById('authModal');
    if (m) m.style.display = 'none';
};

window.switchAuthTab = tab => {
    ['signin', 'signup'].forEach(t => {
        document.getElementById(`auth-tab-${t}`).classList.toggle('active', t === tab);
        document.getElementById(`auth-form-${t}`).style.display = t === tab ? '' : 'none';
    });
    document.getElementById('authMsg').textContent = '';
};

function _injectModal() {
    const el = document.createElement('div');
    el.id = 'authModal';
    el.className = 'auth-overlay';
    el.addEventListener('click', e => { if (e.target === el) closeAuthModal(); });
    el.innerHTML = `
        <div class="auth-card">
            <div class="auth-card-header">
                <img src="assets/images/simplicity-logo.svg" alt="Simplicity Living" class="auth-logo">
                <button class="auth-x" onclick="closeAuthModal()">✕</button>
            </div>
            <div class="auth-tabs">
                <button id="auth-tab-signin" class="auth-tab active" onclick="switchAuthTab('signin')">Sign In</button>
                <button id="auth-tab-signup" class="auth-tab" onclick="switchAuthTab('signup')">Create Account</button>
            </div>
            <p id="authMsg" class="auth-msg"></p>
            <div id="auth-form-signin">
                <label class="auth-lbl">Email
                    <input id="si-email" class="auth-inp" type="email" placeholder="you@example.com" autocomplete="email">
                </label>
                <label class="auth-lbl">Password
                    <input id="si-pass" class="auth-inp" type="password" placeholder="Password" autocomplete="current-password">
                </label>
                <button class="auth-submit" onclick="_doSignIn()">Sign In →</button>
            </div>
            <div id="auth-form-signup" style="display:none;">
                <label class="auth-lbl">Name
                    <input id="su-name" class="auth-inp" type="text" placeholder="Your name" autocomplete="name">
                </label>
                <label class="auth-lbl">Email
                    <input id="su-email" class="auth-inp" type="email" placeholder="you@example.com" autocomplete="email">
                </label>
                <label class="auth-lbl">Password
                    <input id="su-pass" class="auth-inp" type="password" placeholder="At least 6 characters" autocomplete="new-password">
                </label>
                <button class="auth-submit" onclick="_doSignUp()">Create Account →</button>
            </div>
        </div>`;
    document.body.appendChild(el);
}

window._doSignIn = async () => {
    const email = document.getElementById('si-email').value.trim();
    const pass  = document.getElementById('si-pass').value;
    const msg   = document.getElementById('authMsg');
    if (!email || !pass) { _setMsg('Please enter your email and password.', 'error'); return; }
    _setMsg('Signing in…', 'info');
    const { error } = await sbSignIn(email, pass);
    if (error) _setMsg(error.message, 'error');
    else closeAuthModal();
};

window._doSignUp = async () => {
    const name  = document.getElementById('su-name').value.trim();
    const email = document.getElementById('su-email').value.trim();
    const pass  = document.getElementById('su-pass').value;
    if (!email || !pass) { _setMsg('Please enter email and password.', 'error'); return; }
    if (pass.length < 6) { _setMsg('Password must be at least 6 characters.', 'error'); return; }
    _setMsg('Creating account…', 'info');
    const { error } = await sbSignUp(email, pass, name);
    if (error) _setMsg(error.message, 'error');
    else _setMsg('Account created! Check your email to confirm, then sign in.', 'success');
};

function _setMsg(text, type) {
    const el = document.getElementById('authMsg');
    if (!el) return;
    el.textContent = text;
    el.className = `auth-msg ${type}`;
}

function _esc(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Auto-init ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => initSupabaseAuth());
