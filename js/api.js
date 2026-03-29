/* ==============================
   AURA - Table API Helper
   Replaces the Node/MongoDB backend
   ============================== */

const AuraAPI = {
  // ── Base URL for tables
  base: 'tables',

  // ── Generate short unique ID
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  // ── Simple password hash (base64 for demo; in production use bcrypt)
  hashPassword(pw) {
    return btoa(encodeURIComponent(pw + '_aura_salt_2024'));
  },

  checkPassword(pw, hash) {
    return this.hashPassword(pw) === hash;
  },

  // ── Generate JWT-like token (simple, stored in localStorage)
  generateToken(userId, role) {
    const payload = { id: userId, role, iat: Date.now() };
    return btoa(JSON.stringify(payload));
  },

  parseToken(token) {
    try {
      return JSON.parse(atob(token));
    } catch {
      return null;
    }
  },

  // ── Get current user from token
  getCurrentUser() {
    const token = localStorage.getItem('aura_token');
    if (!token) return null;
    return this.parseToken(token);
  },

  // ── Users API
  async getUsers(page = 1, limit = 20, search = '') {
    let url = `${this.base}/users?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const res = await fetch(url);
    return res.json();
  },

  async getUserById(id) {
    const res = await fetch(`${this.base}/users/${id}`);
    if (!res.ok) return null;
    return res.json();
  },

  async getUserByUsername(username) {
    const res = await fetch(`${this.base}/users?search=${encodeURIComponent(username)}&limit=100`);
    const data = await res.json();
    return (data.data || []).find(u => u.username === username.toLowerCase()) || null;
  },

  async getUserByEmail(email) {
    const res = await fetch(`${this.base}/users?search=${encodeURIComponent(email)}&limit=100`);
    const data = await res.json();
    return (data.data || []).find(u => u.email === email.toLowerCase()) || null;
  },

  async createUser(userData) {
    const res = await fetch(`${this.base}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return res.json();
  },

  async updateUser(id, updates) {
    const res = await fetch(`${this.base}/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  async deleteUser(id) {
    await fetch(`${this.base}/users/${id}`, { method: 'DELETE' });
  },

  // ── Invites API
  async getInvites(page = 1, limit = 15) {
    const res = await fetch(`${this.base}/invites?page=${page}&limit=${limit}&sort=created_at`);
    return res.json();
  },

  async getInviteByCode(code) {
    const res = await fetch(`${this.base}/invites?search=${encodeURIComponent(code)}&limit=50`);
    const data = await res.json();
    return (data.data || []).find(i => i.code === code.toUpperCase()) || null;
  },

  async createInvite(inviteData) {
    const res = await fetch(`${this.base}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteData)
    });
    return res.json();
  },

  async updateInvite(id, updates) {
    const res = await fetch(`${this.base}/invites/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  async deleteInvite(id) {
    await fetch(`${this.base}/invites/${id}`, { method: 'DELETE' });
  },

  // ── Auth
  async register({ username, email, password, inviteCode }) {
    const reserved = ['admin', 'dashboard', 'login', 'register', 'api', 'static', 'uploads', 'about', 'terms', 'privacy', 'support', 'profile'];
    if (reserved.includes(username.toLowerCase())) throw new Error('This username is reserved');
    if (!/^[a-z0-9_.-]+$/i.test(username)) throw new Error('Username can only contain letters, numbers, underscores, dots, and hyphens');
    if (username.length < 3 || username.length > 30) throw new Error('Username must be between 3 and 30 characters');
    if (password.length < 8) throw new Error('Password must be at least 8 characters');

    // Check invite
    const invite = await this.getInviteByCode(inviteCode);
    if (!invite || !invite.isActive) throw new Error('Invalid or inactive invite code');
    if (invite.usedCount >= invite.maxUses) throw new Error('This invite code has been fully used');
    if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) throw new Error('This invite code has expired');

    // Check uniqueness
    const existingByName = await this.getUserByUsername(username);
    if (existingByName) throw new Error('Username already taken');
    const existingByEmail = await this.getUserByEmail(email);
    if (existingByEmail) throw new Error('Email already registered');

    // Create user
    const user = await this.createUser({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: this.hashPassword(password),
      displayName: username,
      bio: '',
      badge: '',
      avatar: '',
      role: 'user',
      socialLinks: '[]',
      background: JSON.stringify({ type: 'color', value: '#07070d' }),
      accentColor: '#7c3aed',
      cardStyle: 'glass',
      profileEffect: 'none',
      music: JSON.stringify({ enabled: false, url: '', title: '', artist: '', autoplay: false }),
      views: 0,
      isActive: true,
      inviteUsed: inviteCode.toUpperCase()
    });

    // Update invite usage
    await this.updateInvite(invite.id, { usedCount: (invite.usedCount || 0) + 1 });

    const token = this.generateToken(user.id, 'user');
    localStorage.setItem('aura_token', token);
    localStorage.setItem('aura_uid', user.id);
    return { user, token };
  },

  async login({ username, password }) {
    let user = await this.getUserByUsername(username);
    if (!user) user = await this.getUserByEmail(username);
    if (!user) throw new Error('Invalid credentials');
    if (!this.checkPassword(password, user.password)) throw new Error('Invalid credentials');
    if (!user.isActive) throw new Error('Account is disabled');

    const token = this.generateToken(user.id, user.role);
    localStorage.setItem('aura_token', token);
    localStorage.setItem('aura_uid', user.id);
    return { user, token };
  },

  logout() {
    localStorage.removeItem('aura_token');
    localStorage.removeItem('aura_uid');
  },

  async requireAuth() {
    const tokenData = this.getCurrentUser();
    if (!tokenData) { window.location.href = 'index.html'; return null; }
    const user = await this.getUserById(localStorage.getItem('aura_uid'));
    if (!user) { this.logout(); window.location.href = 'index.html'; return null; }
    return user;
  },

  async requireAdmin() {
    const user = await this.requireAuth();
    if (!user || user.role !== 'admin') { window.location.href = 'dashboard.html'; return null; }
    return user;
  },

  // ── Helpers for JSON fields
  parseJSON(str, fallback = []) {
    try { return JSON.parse(str); } catch { return fallback; }
  },

  stringifyLinks(links) { return JSON.stringify(links); },
  stringifyBg(bg) { return JSON.stringify(bg); },
  stringifyMusic(music) { return JSON.stringify(music); },
};

window.AuraAPI = AuraAPI;
