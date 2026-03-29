/* ==============================
   AURA - Profile Page JS
   Loads profile from Table API using ?u=username
   ============================== */

const platformIcons = {
  discord: 'fab fa-discord', instagram: 'fab fa-instagram', tiktok: 'fab fa-tiktok',
  youtube: 'fab fa-youtube', twitter: 'fab fa-twitter', github: 'fab fa-github',
  spotify: 'fab fa-spotify', twitch: 'fab fa-twitch', snapchat: 'fab fa-snapchat',
  telegram: 'fab fa-telegram', linkedin: 'fab fa-linkedin', pinterest: 'fab fa-pinterest',
  reddit: 'fab fa-reddit', steam: 'fab fa-steam', paypal: 'fab fa-paypal',
  cashapp: 'fas fa-dollar-sign', email: 'fas fa-envelope', website: 'fas fa-globe',
  custom: 'fas fa-link'
};

let profileData = null;
let isPlaying = false;
let audioEl = null;

function parseJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

// ── Get username from URL param
function getUsernameFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('u') || '';
}

// ── Load Profile from Table API
async function loadProfile() {
  const username = getUsernameFromURL();
  if (!username) {
    showError();
    return;
  }

  try {
    // Search for user by username
    const res = await fetch(`tables/users?search=${encodeURIComponent(username)}&limit=50`);
    const data = await res.json();
    const users = data.data || [];
    const user = users.find(u => u.username === username.toLowerCase());

    if (!user || !user.isActive) {
      showError();
      return;
    }

    profileData = user;

    // Increment view count (fire and forget)
    fetch(`tables/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ views: (user.views || 0) + 1 })
    }).catch(() => {});

    renderProfile(user);
  } catch (err) {
    console.error(err);
    showError();
  }
}

function showError() {
  document.getElementById('loaderScreen').classList.add('fade-out');
  setTimeout(() => {
    document.getElementById('loaderScreen').style.display = 'none';
    document.getElementById('errorScreen').style.display = 'flex';
  }, 500);
}

function renderProfile(p) {
  const links = parseJSON(p.socialLinks, []);
  const bg = parseJSON(p.background, { type: 'color', value: '#07070d' });
  const music = parseJSON(p.music, { enabled: false });
  const accent = p.accentColor || '#7c3aed';

  // Update page title
  document.title = `${p.displayName || p.username} — Aura`;

  // Meta description
  const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
  metaDesc.name = 'description';
  metaDesc.content = p.bio || `${p.username}'s Aura profile`;
  document.head.appendChild(metaDesc);

  // ── Background
  applyBackground(bg);

  // ── Avatar
  if (p.avatar) {
    document.getElementById('profileAvatar').src = p.avatar;
    document.getElementById('profileAvatar').style.display = 'block';
    document.getElementById('avatarPlaceholder').style.display = 'none';
  } else {
    const letter = (p.displayName || p.username || '?')[0].toUpperCase();
    document.getElementById('avatarPlaceholder').textContent = letter;
    document.getElementById('avatarPlaceholder').style.display = 'flex';
    document.getElementById('profileAvatar').style.display = 'none';
  }

  // ── Avatar effect
  const ring = document.getElementById('avatarRing');
  if (p.profileEffect && p.profileEffect !== 'none') {
    ring.className = `avatar-ring effect-${p.profileEffect}`;
  }

  // ── Names
  document.getElementById('profileDisplayName').textContent = p.displayName || p.username;
  document.getElementById('profileHandle').textContent = `@${p.username}`;

  // ── Badge
  if (p.badge) {
    document.getElementById('profileBadge').textContent = p.badge;
    document.getElementById('profileBadge').style.display = 'block';
  }

  // ── Bio
  if (p.bio) {
    document.getElementById('profileBio').textContent = p.bio;
    document.getElementById('profileBio').style.display = 'block';
  }

  // ── Accent color CSS vars
  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--accent-light', lightenColor(accent, 20));

  // ── Card style
  const card = document.getElementById('profileCard');
  if (p.cardStyle) card.classList.add(`style-${p.cardStyle}`);
  if (p.cardStyle === 'neon') {
    card.style.boxShadow = `0 0 40px ${accent}40, inset 0 0 40px ${accent}10`;
    card.style.borderColor = `${accent}40`;
  }

  // ── Links
  renderLinks(links, accent);

  // ── View count
  const views = (p.views || 0) + 1;
  if (views > 10) {
    document.getElementById('viewNumber').textContent = views.toLocaleString();
    document.getElementById('viewCount').style.display = 'flex';
  }

  // ── Music
  if (music.enabled && music.url) {
    initMusicPlayer(music, accent);
  }

  // ── Profile effects
  if (p.profileEffect === 'sparkle') initSparkles(accent);
  if (bg.type === 'animated') initAnimatedBg(bg.animationType, accent);

  // ── Show profile
  document.getElementById('loaderScreen').classList.add('fade-out');
  setTimeout(() => {
    document.getElementById('loaderScreen').style.display = 'none';
    document.getElementById('profileWrapper').style.display = 'flex';
  }, 500);
}

function applyBackground(bg) {
  const bgEl = document.getElementById('profileBg');
  if (!bg) return;
  switch (bg.type) {
    case 'color':
      bgEl.style.background = bg.value || '#07070d';
      break;
    case 'gradient':
      bgEl.style.background = `linear-gradient(${bg.gradientAngle || 135}deg, ${bg.gradientStart || '#0a0a2e'}, ${bg.gradientEnd || '#1a0a3e'})`;
      break;
    case 'image':
      if (bg.imageUrl) {
        bgEl.style.background = `url(${bg.imageUrl}) center/cover no-repeat`;
      }
      break;
    case 'animated':
      bgEl.style.background = 'linear-gradient(135deg, #07070d, #1a0a2e)';
      break;
  }
}

function renderLinks(links, accent) {
  const container = document.getElementById('profileLinks');
  if (!links.length) return;

  container.innerHTML = links.map(link => {
    const icon = platformIcons[link.platform] || platformIcons.custom;
    let href = link.url;
    if (link.platform === 'email' && !href.startsWith('mailto:')) href = `mailto:${href}`;
    else if (!href.startsWith('http') && !href.startsWith('mailto:')) href = `https://${href}`;

    return `
      <a href="${href}" target="_blank" rel="noopener noreferrer" class="social-link-btn">
        <span class="link-icon"><i class="${icon}" style="color:${accent}"></i></span>
        <span>${link.label || link.platform}</span>
        <i class="fas fa-chevron-right link-arrow"></i>
      </a>
    `;
  }).join('');

  document.querySelectorAll('.social-link-btn').forEach(btn => {
    btn.addEventListener('mouseenter', function() {
      this.style.borderColor = `${accent}50`;
      this.style.boxShadow = `0 6px 24px ${accent}25`;
    });
    btn.addEventListener('mouseleave', function() {
      this.style.borderColor = '';
      this.style.boxShadow = '';
    });
  });
}

// ── Music Player
function initMusicPlayer(music, accent) {
  const playerCard = document.getElementById('musicPlayerCard');
  playerCard.style.display = 'flex';
  playerCard.style.flexDirection = 'column';

  document.getElementById('musicTitle').textContent = music.title || 'Unknown Track';
  document.getElementById('musicArtist').textContent = music.artist || '';

  audioEl = document.getElementById('audioPlayer');
  audioEl.src = music.url;

  const playBtn = document.getElementById('musicPlay');
  const playIcon = document.getElementById('musicPlayIcon');
  const progressFill = document.getElementById('progressFill');
  const progressBar = document.getElementById('progressBar');

  audioEl.addEventListener('timeupdate', () => {
    if (audioEl.duration) {
      const pct = (audioEl.currentTime / audioEl.duration) * 100;
      progressFill.style.width = `${pct}%`;
      document.getElementById('currentTime').textContent = formatTime(audioEl.currentTime);
      document.getElementById('totalTime').textContent = formatTime(audioEl.duration);
    }
  });

  function togglePlay() {
    if (isPlaying) {
      audioEl.pause();
      playIcon.className = 'fas fa-play';
      playerCard.classList.remove('playing');
    } else {
      audioEl.play().catch(() => {});
      playIcon.className = 'fas fa-pause';
      playerCard.classList.add('playing');
    }
    isPlaying = !isPlaying;
  }

  playBtn.addEventListener('click', togglePlay);

  audioEl.addEventListener('ended', () => {
    isPlaying = false;
    playIcon.className = 'fas fa-play';
    playerCard.classList.remove('playing');
    progressFill.style.width = '0%';
  });

  progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    if (audioEl.duration) audioEl.currentTime = pct * audioEl.duration;
  });

  if (music.autoplay) {
    setTimeout(() => {
      audioEl.play().then(() => {
        isPlaying = true;
        playIcon.className = 'fas fa-pause';
        playerCard.classList.add('playing');
      }).catch(() => {});
    }, 1000);
  }
}

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

// ── Sparkle Effect
function initSparkles(accent) {
  const layer = document.getElementById('sparkleLayer');
  function createSparkle() {
    const s = document.createElement('div');
    s.className = 'sparkle';
    s.style.left = `${Math.random() * 100}%`;
    s.style.top = `${Math.random() * 100}%`;
    s.style.setProperty('--dx', `${(Math.random() - 0.5) * 100}px`);
    s.style.setProperty('--dy', `${-Math.random() * 120 - 20}px`);
    s.style.background = accent;
    s.style.boxShadow = `0 0 6px ${accent}`;
    s.style.animationDuration = `${Math.random() * 2 + 2}s`;
    s.style.animationDelay = `${Math.random() * 2}s`;
    layer.appendChild(s);
    setTimeout(() => s.remove(), 5000);
  }
  setInterval(createSparkle, 300);
}

// ── Animated Background
function initAnimatedBg(type, accent) {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  if (type === 'particles' || type === 'stars') {
    const particles = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: type === 'stars' ? Math.random() * 2 + 0.5 : Math.random() * 1.5 + 0.3,
      dx: (Math.random() - 0.5) * 0.5,
      dy: type === 'stars' ? 0 : -(Math.random() * 0.5 + 0.1),
      alpha: Math.random() * 0.7 + 0.2
    }));

    function animateParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0) p.y = canvas.height;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = type === 'stars' ? '#ffffff' : accent;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      requestAnimationFrame(animateParticles);
    }
    animateParticles();
  }

  if (type === 'matrix') {
    const cols = Math.floor(canvas.width / 18);
    const drops = Array(cols).fill(0);
    const chars = '01アイウエオカキクケコ'.split('');

    function animateMatrix() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = accent;
      ctx.font = '14px monospace';
      drops.forEach((y, i) => {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * 18, y);
        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 18;
      });
      requestAnimationFrame(animateMatrix);
    }
    animateMatrix();
  }
}

// ── Copy link button
document.getElementById('copyLinkBtn')?.addEventListener('click', () => {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const btn = document.getElementById('copyLinkBtn');
    btn.innerHTML = '<i class="fas fa-check"></i>';
    btn.style.color = '#10b981';
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-link"></i>';
      btn.style.color = '';
    }, 2000);
  });
});

// ── Color utility
function lightenColor(hex, pct) {
  try {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + Math.round(2.55 * pct));
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(2.55 * pct));
    const b = Math.min(255, (num & 0xff) + Math.round(2.55 * pct));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  } catch { return hex; }
}

// ── Init
loadProfile();
