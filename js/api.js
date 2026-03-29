/* ==============================
   AURA - Supabase API Helper
   ============================== */
const SUPABASE_URL = 'https://yggjpzjzlwxufocarpdh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YB6MUcbACGs4vkx25ZUazA_GeaHO3dO';
const sb = {
  async query(table, options = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    const params = [];
    if (options.select) params.push(`select=${options.select}`);
    if (options.filter) params.push(options.filter);
    if (options.limit) params.push(`limit=${options.limit}`);
    if (options.offset) params.push(`offset=${options.offset}`);
    if (options.order) params.push(`order=${options.order}`);
    if (params.length) url += '?' + params.join('&');

    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': options.prefer || 'return=representation'
      },
      method: options.method || 'GET',
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'API error');
    }

    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },

  async get(table, filter = '') {
    return this.query(table, { filter });
  },

  async getOne(table, filter) {
    const data = await this.query(table, { filter, limit: 1 });
    return data?.[0] || null;
  },

  async insert(table, body) {
    return this.query(table, { method: 'POST', body, prefer: 'return=representation' });
  },

  async update(table, filter, body) {
    return this.query(table, { method: 'PATCH', filter, body, prefer: 'return=representation' });
  },

  async remove(table, filter) {
    return this.query(table, { method: 'DELETE', filter });
  }
};

const AuraAPI = {

  // ── Password helpers
  hashPassword(pw) {
    return btoa(encodeURIComponent(pw + '_aura_salt_2024'));
  },

  checkPassword(pw, hash) {
    return this.hashPassword(pw) === hash;
  },

  // ── Token helpers
  generateToken(userId, role) {
    const payload = { id: userId, role, iat: Date.now() };
    return btoa(JSON.stringify(payload));
  },

  parseToken(token) {
    try { return JSON.parse(atob(token)); } catch { return null; }
  },

  getCurrentUser() {
    const token = localStorage.getItem('aura_token');
    if (!token) return null;
    return this.parseToken(token);
  },

  // ── Users
  async getUsers(page = 1, limit = 20, search = '') {
    let filter = `limit=${limit}&offset=${(page - 1) * limit}&order=created_at.desc`;
    if (search) filter += `&or=(username.ilike.*${search}*,email.ilike.*${search}*)`;
    const data = await sb.query('users', { filter });
    return { data: data || [] };
  },

  async getUserById(id) {
    return sb.getOne('users', `id=eq.${id}`);
  },

  async getUserByUsername(username) {
    return sb.getOne('users', `username=eq.${username.toLowerCase()}`);
  },

  async getUserByEmail(email) {
    return sb.getOne('users', `email=eq.${email.toLowerCase()}`);
  },

  async createUser(userData) {
    const data = await sb.insert('users', userData);
    return data?.[0] || null;
  },

  async updateUser(id, updates) {
    const data = await sb.update('users', `id=eq.${id}`, updates);
    return data?.[0] || null;
  },

  async deleteUser(id) {
    await sb.remove('users', `id=eq.${id}`);
  },

  // ── Invites
  async getInvites(page = 1, limit = 15) {
    const data = await sb.query('invites', {
      limit,
      offset: (page - 1) * limit,
      order: 'created_at.desc'
    });
    return { data: data || [] };
  },

  async getInviteByCode(code) {
    return sb.getOne('invites', `code=eq.${code.toUpperCase()}`);
  },

  async createInvite(inviteData) {
    const data = await sb.insert('invites', inviteData);
    return data?.[0] || null;
  },

  async updateInvite(id, updates) {
    const data = await sb.update('invites', `id=eq.${id}`, updates);
    return data?.[0] || null;
  },

  async deleteInvite(id) {
    await sb.remove('invites', `id=eq.${id}`);
  },

  // ── Auth
  async register({ username, email, password, inviteCode }) {
    const reserved = ['admin', 'dashboard', 'login', 'register', 'api', 'static', 'uploads', 'about', 'terms', 'privacy', 'support', 'profile'];
    if (reserved.includes(username.toLowerCase())) throw new Error('This username is reserved');
    if (!/^[a-z0-9_.-]+$/i.test(username)) throw new Error('Username can only contain letters, numbers, underscores, dots, and hyphens');
    if (username.length < 3 || username.length > 30) throw new Error('Username must be between 3 and 30 characters');
    if (password.length < 8) throw new Error('Password must be at least 8 characters');

    const invite = await this.getInviteByCode(inviteCode);
    if (!invite || !invite.is_active) throw new Error('Invalid or inactive invite code');
    if (invite.used_count >= invite.max_uses) throw new Error('This invite code has been fully used');
    if (invite.expires_at && new Date() > new Date(invite.expires_at)) throw new Error('This invite code has expired');

    const existingByName = await this.getUserByUsername(username);
    if (existingByName) throw new Error('Username already taken');
    const existingByEmail = await this.getUserByEmail(email);
    if (existingByEmail) throw new Error('Email already registered');

    const user = await this.createUser({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: this.hashPassword(password),
      display_name: username,
      bio: '',
      badge: '',
      avatar: '',
      role: 'user',
      social_links: '[]',
      background: JSON.stringify({ type: 'color', value: '#000000' }),
      accent_color: '#7c3aed',
      card_style: 'glass',
      profile_effect: 'none',
      music: JSON.stringify({ enabled: false, url: '', title: '', artist: '', autoplay: false }),
      views: 0,
      is_active: true,
      invite_used: inviteCode.toUpperCase()
    });

    await this.updateInvite(invite.id, { used_count: (invite.used_count || 0) + 1 });

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
    if (!user.is_active) throw new Error('Account is disabled');

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

  // ── Helpers
  parseJSON(str, fallback = []) {
    try { return JSON.parse(str); } catch { return fallback; }
  },

  stringifyLinks(links) { return JSON.stringify(links); },
  stringifyBg(bg) { return JSON.stringify(bg); },
  stringifyMusic(music) { return JSON.stringify(music); },
};

window.AuraAPI = AuraAPI;
