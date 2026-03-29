/* ==============================
   AURA - Dashboard JS
   Uses Table API instead of Node/Express backend
   ============================== */

let userData = null;
let editingLinkIndex = null;

const platformIcons = {
  discord: 'fab fa-discord', instagram: 'fab fa-instagram', tiktok: 'fab fa-tiktok',
  youtube: 'fab fa-youtube', twitter: 'fab fa-twitter', github: 'fab fa-github',
  spotify: 'fab fa-spotify', twitch: 'fab fa-twitch', snapchat: 'fab fa-snapchat',
  telegram: 'fab fa-telegram', linkedin: 'fab fa-linkedin', pinterest: 'fab fa-pinterest',
  reddit: 'fab fa-reddit', steam: 'fab fa-steam', paypal: 'fab fa-paypal',
  cashapp: 'fas fa-dollar-sign', email: 'fas fa-envelope', website: 'fas fa-globe',
  custom: 'fas fa-link'
};

// ── Toast notification
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  const icon = type === 'success' ? '✓' : '✗';
  el.innerHTML = `<span style="color:${type === 'success' ? 'var(--success)' : 'var(--danger)'}">${icon}</span> ${msg}`;
  el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3500);
}

// ── Load user data
async function loadUser() {
  userData = await AuraAPI.requireAuth();
  if (!userData) return;
  applyUserData();
}

function applyUserData() {
  const u = userData;
  const links = AuraAPI.parseJSON(u.socialLinks, []);
  const bg = AuraAPI.parseJSON(u.background, { type: 'color', value: '#07070d' });
  const music = AuraAPI.parseJSON(u.music, { enabled: false });

  // Profile tab
  document.getElementById('displayName').value = u.displayName || '';
  document.getElementById('bio').value = u.bio || '';
  document.getElementById('badge').value = u.badge || '';
  document.getElementById('bioCount').textContent = (u.bio || '').length;
  document.getElementById('profileUrlUsername').textContent = u.username;

  // View Profile link — use profile.html?u=username
  const profileHref = `profile.html?u=${u.username}`;
  document.getElementById('viewProfileBtn').href = profileHref;

  // Avatar
  if (u.avatar) {
    document.getElementById('avatarImg').src = u.avatar;
    document.getElementById('avatarImg').style.display = 'block';
    document.getElementById('avatarPlaceholder').style.display = 'none';
    document.getElementById('pfAvatar').src = u.avatar;
    document.getElementById('pfAvatar').style.display = 'block';
    document.getElementById('pfAvatarPlaceholder').style.display = 'none';
  } else {
    const letter = (u.displayName || u.username || '?')[0].toUpperCase();
    document.getElementById('avatarPlaceholder').textContent = letter;
    document.getElementById('pfAvatarPlaceholder').textContent = letter;
    document.getElementById('avatarImg').style.display = 'none';
    document.getElementById('pfAvatar').style.display = 'none';
    document.getElementById('avatarPlaceholder').style.display = 'flex';
    document.getElementById('pfAvatarPlaceholder').style.display = 'flex';
  }

  // Appearance
  document.getElementById('bgColor').value = bg.value || '#07070d';
  document.getElementById('gradStart').value = bg.gradientStart || '#0a0a2e';
  document.getElementById('gradEnd').value = bg.gradientEnd || '#1a0a3e';
  document.getElementById('gradAngle').value = bg.gradientAngle || 135;
  document.getElementById('gradAngleVal').textContent = bg.gradientAngle || 135;
  document.getElementById('bgImageUrl').value = bg.imageUrl || '';
  document.getElementById('accentColor').value = u.accentColor || '#7c3aed';
  document.getElementById('profileEffect').value = u.profileEffect || 'none';

  // Set active bg tab
  const bgType = bg.type || 'color';
  document.querySelectorAll('.bg-tab').forEach(t => t.classList.toggle('active', t.dataset.type === bgType));
  document.querySelectorAll('.bg-option').forEach(o => o.classList.toggle('active', o.id === `bg-${bgType}`));

  // Card style
  document.querySelectorAll('.card-style-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.style === (u.cardStyle || 'glass'));
  });

  // Admin link
  if (u.role === 'admin') {
    document.getElementById('adminLink').style.display = 'flex';
  }

  // Music
  document.getElementById('musicEnabled').checked = music.enabled || false;
  document.getElementById('musicUrl').value = music.url || '';
  document.getElementById('musicTitle').value = music.title || '';
  document.getElementById('musicArtist').value = music.artist || '';
  document.getElementById('musicAutoplay').checked = music.autoplay || false;

  // Analytics
  document.getElementById('statViews').textContent = (u.views || 0).toLocaleString();
  document.getElementById('statLinks').textContent = links.length;
  document.getElementById('statJoined').textContent = new Date(u.created_at).toLocaleDateString('en', { month: 'short', year: 'numeric' });
  document.getElementById('statUsername').textContent = `@${u.username}`;

  renderLinks();
  updatePreview();
}

// ── Save updated user to API
async function saveUser(updates) {
  const id = userData.id || userData.id;
  const result = await fetch(`tables/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  const updated = await result.json();
  userData = updated;
  return updated;
}

// ── Tab Navigation
document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const tab = item.dataset.tab;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tab}`)?.classList.add('active');
    if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
  });
});

// ── Mobile sidebar
document.getElementById('sidebarToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

document.getElementById('mobilePreviewBtn')?.addEventListener('click', () => {
  document.getElementById('previewPanel').classList.toggle('mobile-visible');
});

document.getElementById('closePreviewBtn')?.addEventListener('click', () => {
  document.getElementById('previewPanel').classList.remove('mobile-visible');
});

// ── Logout
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  AuraAPI.logout();
  window.location.href = 'index.html';
});

// ── Bio char counter
document.getElementById('bio')?.addEventListener('input', (e) => {
  document.getElementById('bioCount').textContent = e.target.value.length;
  updatePreview();
});

// ── Avatar URL set
document.getElementById('setAvatarUrlBtn')?.addEventListener('click', async () => {
  const url = document.getElementById('avatarUrlInput').value.trim();
  if (!url) { toast('Enter a valid image URL', 'error'); return; }
  try {
    await saveUser({ avatar: url });
    document.getElementById('avatarImg').src = url;
    document.getElementById('avatarImg').style.display = 'block';
    document.getElementById('avatarPlaceholder').style.display = 'none';
    document.getElementById('pfAvatar').src = url;
    document.getElementById('pfAvatar').style.display = 'block';
    document.getElementById('pfAvatarPlaceholder').style.display = 'none';
    toast('Avatar updated!');
    updatePreview();
  } catch (err) { toast('Failed to update avatar', 'error'); }
});

document.getElementById('uploadAvatarBtn')?.addEventListener('click', () => {
  document.getElementById('avatarUrlInput').focus();
  toast('Paste an image URL in the field below', 'success');
});

document.getElementById('removeAvatarBtn')?.addEventListener('click', async () => {
  try {
    await saveUser({ avatar: '' });
    const letter = (userData.displayName || userData.username || '?')[0].toUpperCase();
    document.getElementById('avatarImg').style.display = 'none';
    document.getElementById('avatarPlaceholder').textContent = letter;
    document.getElementById('avatarPlaceholder').style.display = 'flex';
    document.getElementById('pfAvatar').style.display = 'none';
    document.getElementById('pfAvatarPlaceholder').textContent = letter;
    document.getElementById('pfAvatarPlaceholder').style.display = 'flex';
    toast('Avatar removed');
    updatePreview();
  } catch { toast('Failed to remove avatar', 'error'); }
});

// ── Save Profile
document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
  try {
    await saveUser({
      displayName: document.getElementById('displayName').value.trim(),
      bio: document.getElementById('bio').value.trim(),
      badge: document.getElementById('badge').value.trim()
    });
    toast('Profile saved!');
    updatePreview();
  } catch { toast('Failed to save profile', 'error'); }
});

// ── Copy profile link
document.getElementById('copyLinkBtn')?.addEventListener('click', () => {
  const url = `${window.location.origin}${window.location.pathname.replace('dashboard.html', '')}profile.html?u=${userData?.username}`;
  navigator.clipboard.writeText(url).then(() => toast('Link copied!'));
});

// ── Links Management
function renderLinks() {
  const list = document.getElementById('linksList');
  const links = AuraAPI.parseJSON(userData?.socialLinks, []);

  if (!links.length) {
    list.innerHTML = `<div class="empty-links"><i class="fas fa-link fa-2x"></i><p>No links yet. Add your first one!</p></div>`;
    return;
  }

  list.innerHTML = links.map((link, i) => {
    const icon = platformIcons[link.platform] || platformIcons.custom;
    return `
      <div class="link-item" data-index="${i}">
        <div class="link-icon"><i class="${icon}"></i></div>
        <div class="link-info">
          <div class="link-label">${link.label || link.platform}</div>
          <div class="link-url">${link.url}</div>
        </div>
        <div class="link-actions">
          <button class="icon-btn" onclick="editLink(${i})" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="icon-btn danger" onclick="deleteLink(${i})" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('addLinkBtn')?.addEventListener('click', () => {
  editingLinkIndex = null;
  document.getElementById('linkModalTitle').textContent = 'Add Link';
  document.getElementById('linkPlatform').value = 'custom';
  document.getElementById('linkLabel').value = '';
  document.getElementById('linkUrl').value = '';
  document.getElementById('linkModal').style.display = 'flex';
});

document.getElementById('cancelLinkBtn')?.addEventListener('click', () => {
  document.getElementById('linkModal').style.display = 'none';
});

window.editLink = function(i) {
  editingLinkIndex = i;
  const links = AuraAPI.parseJSON(userData.socialLinks, []);
  const link = links[i];
  document.getElementById('linkModalTitle').textContent = 'Edit Link';
  document.getElementById('linkPlatform').value = link.platform || 'custom';
  document.getElementById('linkLabel').value = link.label || '';
  document.getElementById('linkUrl').value = link.url || '';
  document.getElementById('linkModal').style.display = 'flex';
};

window.deleteLink = async function(i) {
  if (!confirm('Delete this link?')) return;
  const links = AuraAPI.parseJSON(userData.socialLinks, []);
  links.splice(i, 1);
  await saveLinks(links);
};

document.getElementById('linkPlatform')?.addEventListener('change', (e) => {
  const plat = e.target.value;
  const label = document.getElementById('linkLabel');
  if (plat !== 'custom') {
    label.value = plat.charAt(0).toUpperCase() + plat.slice(1);
  }
});

document.getElementById('saveLinkBtn')?.addEventListener('click', async () => {
  const platform = document.getElementById('linkPlatform').value;
  const label = document.getElementById('linkLabel').value.trim();
  const url = document.getElementById('linkUrl').value.trim();

  if (!url) { toast('URL is required', 'error'); return; }

  const links = AuraAPI.parseJSON(userData.socialLinks, []);
  const link = { platform, label: label || platform, url };

  if (editingLinkIndex !== null) {
    links[editingLinkIndex] = link;
  } else {
    links.push(link);
  }

  await saveLinks(links);
  document.getElementById('linkModal').style.display = 'none';
  document.getElementById('statLinks').textContent = links.length;
});

async function saveLinks(links) {
  try {
    await saveUser({ socialLinks: JSON.stringify(links) });
    renderLinks();
    updatePreview();
    toast('Links saved!');
  } catch { toast('Failed to save links', 'error'); }
}

// ── Appearance
document.querySelectorAll('.bg-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.bg-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.bg-option').forEach(o => o.classList.remove('active'));
    document.getElementById(`bg-${tab.dataset.type}`)?.classList.add('active');
    updatePreview();
  });
});

document.getElementById('gradAngle')?.addEventListener('input', (e) => {
  document.getElementById('gradAngleVal').textContent = e.target.value;
  updatePreview();
});

document.querySelectorAll('.color-swatch').forEach(s => {
  s.addEventListener('click', () => {
    document.getElementById('accentColor').value = s.dataset.color;
    updatePreview();
  });
});

document.querySelectorAll('.card-style-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.card-style-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updatePreview();
  });
});

['bgColor', 'gradStart', 'gradEnd', 'accentColor', 'bgImageUrl', 'animationType', 'profileEffect'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', updatePreview);
  document.getElementById(id)?.addEventListener('change', updatePreview);
});

['displayName', 'badge'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', updatePreview);
});

document.getElementById('saveAppearanceBtn')?.addEventListener('click', async () => {
  const bgType = document.querySelector('.bg-tab.active')?.dataset.type || 'color';
  const cardStyle = document.querySelector('.card-style-btn.active')?.dataset.style || 'glass';

  const bgObj = {
    type: bgType,
    value: document.getElementById('bgColor').value,
    gradientStart: document.getElementById('gradStart').value,
    gradientEnd: document.getElementById('gradEnd').value,
    gradientAngle: parseInt(document.getElementById('gradAngle').value),
    imageUrl: document.getElementById('bgImageUrl').value,
    animationType: document.getElementById('animationType').value
  };

  try {
    await saveUser({
      background: JSON.stringify(bgObj),
      accentColor: document.getElementById('accentColor').value,
      cardStyle,
      profileEffect: document.getElementById('profileEffect').value
    });
    toast('Appearance saved!');
    updatePreview();
  } catch { toast('Failed to save appearance', 'error'); }
});

// ── Music
document.getElementById('saveMusicBtn')?.addEventListener('click', async () => {
  const musicObj = {
    enabled: document.getElementById('musicEnabled').checked,
    url: document.getElementById('musicUrl').value.trim(),
    title: document.getElementById('musicTitle').value.trim(),
    artist: document.getElementById('musicArtist').value.trim(),
    autoplay: document.getElementById('musicAutoplay').checked
  };
  try {
    await saveUser({ music: JSON.stringify(musicObj) });
    toast('Music settings saved!');
    updatePreview();
  } catch { toast('Failed to save music settings', 'error'); }
});

['musicEnabled', 'musicUrl', 'musicTitle', 'musicArtist'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', updatePreview);
  document.getElementById(id)?.addEventListener('change', updatePreview);
});

// ── Live Preview Update
function updatePreview() {
  if (!userData) return;

  const bgType = document.querySelector('.bg-tab.active')?.dataset.type || 'color';
  const accent = document.getElementById('accentColor')?.value || '#7c3aed';
  const cardStyle = document.querySelector('.card-style-btn.active')?.dataset.style || 'glass';
  const effect = document.getElementById('profileEffect')?.value || 'none';

  // BG
  const pfBg = document.getElementById('pfBg');
  switch (bgType) {
    case 'color':
      pfBg.style.background = document.getElementById('bgColor').value;
      break;
    case 'gradient': {
      const s = document.getElementById('gradStart').value;
      const e = document.getElementById('gradEnd').value;
      const a = document.getElementById('gradAngle').value;
      pfBg.style.background = `linear-gradient(${a}deg, ${s}, ${e})`;
      break;
    }
    case 'image': {
      const url = document.getElementById('bgImageUrl').value;
      pfBg.style.background = url ? `url(${url}) center/cover no-repeat` : '#07070d';
      break;
    }
    default:
      pfBg.style.background = 'linear-gradient(135deg, #07070d, #1a0a2e)';
  }

  // Card style
  const pfCard = document.getElementById('pfCard');
  pfCard.className = `pf-card style-${cardStyle}`;
  if (cardStyle === 'neon') pfCard.style.boxShadow = `0 0 30px ${accent}50`;
  else pfCard.style.boxShadow = '';

  // Profile effect
  const pfEffect = document.getElementById('pfEffect');
  pfEffect.className = `pf-effect ${effect !== 'none' ? effect : ''}`;

  // Avatar
  const av = userData.avatar;
  if (av) {
    document.getElementById('pfAvatar').src = av;
    document.getElementById('pfAvatar').style.display = 'block';
    document.getElementById('pfAvatarPlaceholder').style.display = 'none';
  } else {
    const letter = (document.getElementById('displayName')?.value || userData.username || '?')[0].toUpperCase();
    document.getElementById('pfAvatar').style.display = 'none';
    document.getElementById('pfAvatarPlaceholder').textContent = letter;
    document.getElementById('pfAvatarPlaceholder').style.display = 'flex';
  }

  // Name / bio / badge
  const displayName = document.getElementById('displayName')?.value || userData.username || 'User';
  const bio = document.getElementById('bio')?.value || '';
  const badge = document.getElementById('badge')?.value || '';

  document.getElementById('pfName').textContent = displayName;
  document.getElementById('pfBio').textContent = bio || 'No bio yet...';

  const pfBadge = document.getElementById('pfBadge');
  if (badge) { pfBadge.textContent = badge; pfBadge.style.display = 'block'; }
  else pfBadge.style.display = 'none';

  // Links
  const pfLinks = document.getElementById('pfLinks');
  const links = AuraAPI.parseJSON(userData.socialLinks, []);
  pfLinks.innerHTML = links.slice(0, 5).map(link => {
    const icon = platformIcons[link.platform] || platformIcons.custom;
    return `<div class="pf-link-btn" style="border-color:${accent}30"><i class="${icon}" style="color:${accent}"></i> ${link.label || link.platform}</div>`;
  }).join('');
  if (links.length > 5) pfLinks.innerHTML += `<div class="pf-link-btn" style="border-color:${accent}30;justify-content:center;color:var(--text-muted)">+${links.length - 5} more</div>`;

  // Music
  const musicEnabled = document.getElementById('musicEnabled')?.checked;
  const musicTitle = document.getElementById('musicTitle')?.value || 'Song Title';
  const musicArtist = document.getElementById('musicArtist')?.value || 'Artist';
  const pfMusicPlayer = document.getElementById('pfMusicPlayer');
  pfMusicPlayer.style.display = musicEnabled ? 'flex' : 'none';
  document.getElementById('pfMusicTitle').textContent = musicTitle;
  document.getElementById('pfMusicArtist').textContent = musicArtist;
}

// ── Init
loadUser();
