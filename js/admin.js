/* ==============================
   AURA - Admin Panel JS
   Uses Table API instead of Node/Express backend
   ============================== */

let currentUser = null;
let invitesPage = 1;
let usersPage = 1;
let searchTimer;

// ── Toast
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  const icon = type === 'success' ? '✓' : '✗';
  el.innerHTML = `<span style="color:${type === 'success' ? 'var(--success)' : 'var(--danger)'}">${icon}</span> ${msg}`;
  el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3500);
}

// ── Init: require admin
async function init() {
  currentUser = await AuraAPI.requireAdmin();
  if (!currentUser) return;
  loadStats();
}

// ── Tabs
document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const tab = item.dataset.tab;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tab}`)?.classList.add('active');
    if (tab === 'invites') loadInvites();
    if (tab === 'users') loadUsers();
  });
});

document.getElementById('sidebarToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  AuraAPI.logout();
  window.location.href = 'index.html';
});

// ── Load Stats
async function loadStats() {
  try {
    const usersData = await fetch('tables/users?limit=1000').then(r => r.json());
    const invitesData = await fetch('tables/invites?limit=1000').then(r => r.json());
    const allUsers = usersData.data || [];
    const allInvites = invitesData.data || [];

    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter(u => u.isActive).length;
    const activeInvites = allInvites.filter(i => i.isActive).length;
    const totalViews = allUsers.reduce((sum, u) => sum + (u.views || 0), 0);

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentUsers = allUsers.filter(u => new Date(u.created_at).getTime() > sevenDaysAgo).length;

    document.getElementById('statTotalUsers').textContent = totalUsers.toLocaleString();
    document.getElementById('statActiveUsers').textContent = activeUsers.toLocaleString();
    document.getElementById('statActiveInvites').textContent = activeInvites.toLocaleString();
    document.getElementById('statTotalViews').textContent = totalViews.toLocaleString();
    document.getElementById('statRecentUsers').textContent = recentUsers.toLocaleString();
  } catch (err) {
    toast('Failed to load stats', 'error');
  }
}

// ── Invites
async function loadInvites(page = 1) {
  invitesPage = page;
  try {
    const data = await AuraAPI.getInvites(page, 15);
    const invites = data.data || [];
    const total = data.total || 0;
    const pages = Math.ceil(total / 15);
    renderInvites(invites);
    renderPagination('invitesPagination', page, pages, loadInvites);
  } catch (err) {
    toast('Failed to load invites', 'error');
  }
}

function renderInvites(invites) {
  const tbody = document.getElementById('invitesBody');
  if (!invites.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No invite codes yet</td></tr>';
    return;
  }

  tbody.innerHTML = invites.map(inv => {
    const usedCount = inv.usedCount || 0;
    const maxUses = inv.maxUses || 1;
    const usePct = Math.min(100, (usedCount / maxUses) * 100);
    const isFullyUsed = usedCount >= maxUses;
    const isExpired = inv.expiresAt && new Date() > new Date(inv.expiresAt);
    const status = !inv.isActive ? 'inactive' : isExpired ? 'inactive' : isFullyUsed ? 'used' : 'active';
    const statusLabels = { active: 'Active', inactive: 'Inactive', used: 'Exhausted' };
    const expires = inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString() : '—';

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="code-badge">${inv.code}</span>
            <button class="action-btn action-btn-ghost" onclick="copyCode('${inv.code}')" title="Copy"><i class="fas fa-copy"></i></button>
          </div>
        </td>
        <td>
          <div class="uses-bar">
            <div class="uses-progress"><div class="uses-fill" style="width:${usePct}%"></div></div>
            <span>${usedCount}/${maxUses}</span>
          </div>
        </td>
        <td><span class="status-badge status-${status}">${statusLabels[status]}</span></td>
        <td style="color:var(--text-secondary);font-size:0.8rem;">${expires}</td>
        <td style="color:var(--text-muted);font-size:0.8rem;max-width:150px;overflow:hidden;text-overflow:ellipsis;">${inv.note || '—'}</td>
        <td>
          <div class="table-actions">
            ${inv.isActive
              ? `<button class="action-btn action-btn-warning" onclick="toggleInvite('${inv.id}', false)"><i class="fas fa-ban"></i> Disable</button>`
              : `<button class="action-btn action-btn-success" onclick="toggleInvite('${inv.id}', true)"><i class="fas fa-check"></i> Enable</button>`
            }
            <button class="action-btn action-btn-danger" onclick="deleteInvite('${inv.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ── Create Invite
document.getElementById('createInviteBtn')?.addEventListener('click', async () => {
  try {
    const codeInput = document.getElementById('newCode').value.trim().toUpperCase();
    const maxUses = parseInt(document.getElementById('newMaxUses').value) || 1;
    const expiresAt = document.getElementById('newExpires').value || '';
    const note = document.getElementById('newNote').value.trim();

    // Auto-generate if blank
    const code = codeInput || (Math.random().toString(36).slice(2, 7) + Math.random().toString(36).slice(2, 7)).toUpperCase().slice(0, 10);

    // Check for duplicates
    const existing = await AuraAPI.getInviteByCode(code);
    if (existing) { toast('Code already exists', 'error'); return; }

    await AuraAPI.createInvite({ code, maxUses, usedCount: 0, isActive: true, expiresAt, note, createdBy: currentUser.id });

    document.getElementById('newCode').value = '';
    document.getElementById('newMaxUses').value = '1';
    document.getElementById('newExpires').value = '';
    document.getElementById('newNote').value = '';

    toast('Invite code created!');
    loadInvites();
  } catch (err) {
    toast(err.message || 'Failed to create invite', 'error');
  }
});

window.toggleInvite = async function(id, isActive) {
  try {
    await AuraAPI.updateInvite(id, { isActive });
    toast(isActive ? 'Invite enabled' : 'Invite disabled');
    loadInvites(invitesPage);
  } catch { toast('Failed to update invite', 'error'); }
};

window.deleteInvite = async function(id) {
  if (!confirm('Delete this invite code?')) return;
  try {
    await AuraAPI.deleteInvite(id);
    toast('Invite deleted');
    loadInvites(invitesPage);
  } catch { toast('Failed to delete invite', 'error'); }
};

window.copyCode = function(code) {
  navigator.clipboard.writeText(code).then(() => toast('Code copied!'));
};

// ── Users
async function loadUsers(page = 1, search = '') {
  usersPage = page;
  try {
    const data = await AuraAPI.getUsers(page, 15, search);
    const users = data.data || [];
    const total = data.total || 0;
    const pages = Math.ceil(total / 15);
    renderUsers(users);
    renderPagination('usersPagination', page, pages, (p) => loadUsers(p, document.getElementById('userSearch').value));
  } catch { toast('Failed to load users', 'error'); }
}

function renderUsers(users) {
  const tbody = document.getElementById('usersBody');
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No users found</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td>
        <a href="profile.html?u=${u.username}" target="_blank" class="user-link">@${u.username}</a>
        ${u.displayName && u.displayName !== u.username ? `<br><span style="color:var(--text-muted);font-size:0.75rem;">${u.displayName}</span>` : ''}
      </td>
      <td style="color:var(--text-secondary);font-size:0.8rem;">${u.email || '—'}</td>
      <td><span class="status-badge role-${u.role || 'user'}">${u.role || 'user'}</span></td>
      <td style="color:var(--text-secondary);">${(u.views || 0).toLocaleString()}</td>
      <td style="color:var(--text-muted);font-size:0.8rem;">${new Date(u.created_at).toLocaleDateString()}</td>
      <td><span class="status-badge ${u.isActive ? 'status-active' : 'status-inactive'}">${u.isActive ? 'Active' : 'Banned'}</span></td>
      <td>
        <div class="table-actions">
          ${u.isActive
            ? `<button class="action-btn action-btn-danger" onclick="banUser('${u.id}')"><i class="fas fa-ban"></i> Ban</button>`
            : `<button class="action-btn action-btn-success" onclick="unbanUser('${u.id}')"><i class="fas fa-check"></i> Unban</button>`
          }
          ${(u.role || 'user') !== 'admin'
            ? `<button class="action-btn action-btn-ghost" onclick="promoteUser('${u.id}')" title="Promote to admin"><i class="fas fa-shield-alt"></i></button>`
            : `<button class="action-btn action-btn-ghost" onclick="demoteUser('${u.id}')" title="Demote to user"><i class="fas fa-user"></i></button>`
          }
          <button class="action-btn action-btn-danger" onclick="deleteUser('${u.id}', '${u.username}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

document.getElementById('userSearch')?.addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadUsers(1, e.target.value), 400);
});

window.banUser = async function(id) {
  if (!confirm('Ban this user?')) return;
  try {
    await AuraAPI.updateUser(id, { isActive: false });
    toast('User banned');
    loadUsers(usersPage, document.getElementById('userSearch').value);
  } catch { toast('Failed to ban user', 'error'); }
};

window.unbanUser = async function(id) {
  try {
    await AuraAPI.updateUser(id, { isActive: true });
    toast('User unbanned');
    loadUsers(usersPage, document.getElementById('userSearch').value);
  } catch { toast('Failed to unban user', 'error'); }
};

window.promoteUser = async function(id) {
  if (!confirm('Promote this user to admin?')) return;
  try {
    await AuraAPI.updateUser(id, { role: 'admin' });
    toast('User promoted to admin');
    loadUsers(usersPage, document.getElementById('userSearch').value);
  } catch { toast('Failed to promote user', 'error'); }
};

window.demoteUser = async function(id) {
  if (!confirm('Demote this admin to regular user?')) return;
  try {
    await AuraAPI.updateUser(id, { role: 'user' });
    toast('Admin demoted');
    loadUsers(usersPage, document.getElementById('userSearch').value);
  } catch { toast('Failed to demote user', 'error'); }
};

window.deleteUser = async function(id, username) {
  if (!confirm(`Permanently delete @${username}? This cannot be undone.`)) return;
  try {
    await AuraAPI.deleteUser(id);
    toast('User deleted');
    loadUsers(usersPage, document.getElementById('userSearch').value);
  } catch { toast('Failed to delete user', 'error'); }
};

// ── Pagination
function renderPagination(containerId, page, pages, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container || !pages || pages <= 1) { if (container) container.innerHTML = ''; return; }

  let html = '';
  for (let i = 1; i <= Math.min(pages, 10); i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="(${onPageChange.toString()})(${i})">${i}</button>`;
  }
  container.innerHTML = html;
}

// ── Init
init();
