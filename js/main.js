/* ==============================
   AURA - Home Page JS
   ============================== */

// ── Check if already logged in
(function checkAuth() {
  const token = localStorage.getItem('aura_token');
  const uid = localStorage.getItem('aura_uid');
  if (token && uid) {
    // Redirect to dashboard
    window.location.href = 'dashboard.html';
  }
})();

// ── Navbar scroll effect
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 40);
});

// ── Typing animation
const typingWords = ['yourname', 'alexrivera', 'sam_chen', 'maya.k', 'creator', 'gamer'];
let wordIdx = 0, charIdx = 0, deleting = false;
const typingEl = document.getElementById('typingText');

function typeLoop() {
  if (!typingEl) return;
  const word = typingWords[wordIdx];
  if (!deleting) {
    typingEl.textContent = word.slice(0, ++charIdx);
    if (charIdx === word.length) { deleting = true; setTimeout(typeLoop, 1800); return; }
  } else {
    typingEl.textContent = word.slice(0, --charIdx);
    if (charIdx === 0) { deleting = false; wordIdx = (wordIdx + 1) % typingWords.length; }
  }
  setTimeout(typeLoop, deleting ? 60 : 100);
}
typeLoop();

// ── Particle Canvas
const canvas = document.getElementById('particleCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });

  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.5 + 0.3,
    dx: (Math.random() - 0.5) * 0.4,
    dy: (Math.random() - 0.5) * 0.4,
    alpha: Math.random() * 0.5 + 0.1
  }));

  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    requestAnimationFrame(animateParticles);
  }
  animateParticles();
}

// ── Modal logic
function openModal(id) {
  document.getElementById(id)?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
  document.body.style.overflow = '';
}

document.getElementById('loginBtn')?.addEventListener('click', () => openModal('loginModal'));
document.getElementById('registerBtn')?.addEventListener('click', () => openModal('registerModal'));
document.getElementById('heroCta')?.addEventListener('click', () => openModal('registerModal'));
document.getElementById('heroLogin')?.addEventListener('click', () => openModal('loginModal'));

document.getElementById('closeLogin')?.addEventListener('click', () => closeModal('loginModal'));
document.getElementById('closeRegister')?.addEventListener('click', () => closeModal('registerModal'));

document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
  e.preventDefault();
  closeModal('loginModal');
  setTimeout(() => openModal('registerModal'), 200);
});

document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
  e.preventDefault();
  closeModal('registerModal');
  setTimeout(() => openModal('loginModal'), 200);
});

// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
});

// ── Password toggle
document.getElementById('toggleLoginPw')?.addEventListener('click', () => {
  const inp = document.getElementById('loginPassword');
  const icon = document.querySelector('#toggleLoginPw i');
  if (inp.type === 'password') { inp.type = 'text'; icon.className = 'fas fa-eye-slash'; }
  else { inp.type = 'password'; icon.className = 'fas fa-eye'; }
});

document.getElementById('toggleRegPw')?.addEventListener('click', () => {
  const inp = document.getElementById('regPassword');
  const icon = document.querySelector('#toggleRegPw i');
  if (inp.type === 'password') { inp.type = 'text'; icon.className = 'fas fa-eye-slash'; }
  else { inp.type = 'password'; icon.className = 'fas fa-eye'; }
});

// ── Username live preview
document.getElementById('regUsername')?.addEventListener('input', async (e) => {
  const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  e.target.value = val;
  document.getElementById('previewSlug').textContent = val || 'yourname';

  const statusEl = document.getElementById('usernameStatus');
  if (val.length < 3) { statusEl.textContent = ''; statusEl.className = 'input-status'; return; }

  // Debounce check
  clearTimeout(window._uCheck);
  window._uCheck = setTimeout(async () => {
    const reserved = ['admin', 'dashboard', 'login', 'register', 'api', 'uploads', 'about', 'terms', 'privacy', 'support', 'profile'];
    if (reserved.includes(val)) {
      statusEl.textContent = '✗ Reserved';
      statusEl.className = 'input-status invalid';
      return;
    }
    try {
      const existing = await AuraAPI.getUserByUsername(val);
      if (existing) {
        statusEl.textContent = '✗ Taken';
        statusEl.className = 'input-status invalid';
      } else {
        statusEl.textContent = '✓ Available';
        statusEl.className = 'input-status valid';
      }
    } catch {}
  }, 500);
});

// ── Password strength
document.getElementById('regPassword')?.addEventListener('input', (e) => {
  const pw = e.target.value;
  const bar = document.getElementById('pwBar');
  let strength = 0;
  if (pw.length >= 8) strength++;
  if (/[A-Z]/.test(pw)) strength++;
  if (/[0-9]/.test(pw)) strength++;
  if (/[^a-zA-Z0-9]/.test(pw)) strength++;
  const colors = ['#ef4444', '#f59e0b', '#10b981', '#7c3aed'];
  bar.style.width = `${strength * 25}%`;
  bar.style.background = colors[strength - 1] || 'transparent';
});

// ── Invite code uppercase
document.getElementById('regInvite')?.addEventListener('input', (e) => {
  e.target.value = e.target.value.toUpperCase();
});

// ── Login Form
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('loginSubmit');
  const errEl = document.getElementById('loginError');
  errEl.classList.remove('show');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

  try {
    await AuraAPI.login({
      username: document.getElementById('loginUsername').value.trim(),
      password: document.getElementById('loginPassword').value
    });
    btn.innerHTML = '<i class="fas fa-check"></i> Welcome back!';
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('show');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
  }
});

// ── Register Form
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('registerSubmit');
  const errEl = document.getElementById('registerError');
  errEl.classList.remove('show');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating your Aura...';

  try {
    await AuraAPI.register({
      username: document.getElementById('regUsername').value.trim(),
      email: document.getElementById('regEmail').value.trim(),
      password: document.getElementById('regPassword').value,
      inviteCode: document.getElementById('regInvite').value.trim()
    });
    btn.innerHTML = '<i class="fas fa-check"></i> Aura created!';
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('show');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-magic"></i> Create My Aura';
  }
});
