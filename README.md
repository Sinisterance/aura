# ✦ Aura — Your Digital Identity

> A full-featured "link in bio" platform — 100% static, no backend required.

**Live URL:** https://rvlqjafp.gensparkspace.com/

---

## 🚀 Quick Start

1. Go to `/setup.html` to create the first **admin account**
2. Use invite code `WELCOME1` during registration
3. After setup → redirected to `/dashboard.html`

**Default Invite Codes:**
| Code | Max Uses |
|------|----------|
| WELCOME1 | 10 |
| WELCOME2 | 10 |
| BETA001 | 5 |
| AURA2024 | 100 |

---

## 📁 File Structure

```
index.html        ← Landing page (login / register modals)
dashboard.html    ← User dashboard (profile editor, links, appearance, music, analytics)
profile.html      ← Public profile page (?u=username)
admin.html        ← Admin panel (users, invite codes, stats)
setup.html        ← First-time admin setup
js/
  api.js          ← Table API helper + auth logic
  main.js         ← Landing page logic
  dashboard.js    ← Dashboard logic
  profile.js      ← Profile page logic
  admin.js        ← Admin panel logic
css/              ← (legacy CSS files — now embedded inline in each HTML page)
```

---

## ✅ Features Implemented

- **Landing page** with animated background, hero section, feature cards
- **Registration** with invite code system
- **Login / Logout** with token stored in localStorage
- **Dashboard** tabs: Profile, Links, Appearance, Music, Analytics
- **Live preview panel** showing real-time profile changes
- **16+ social platforms** supported (Instagram, Discord, TikTok, GitHub, etc.)
- **Background options**: Solid color, Gradient, Image URL, Animated (particles/stars/matrix/waves)
- **Card styles**: Glass, Solid, Minimal, Neon
- **Profile effects**: Glow, Sparkles, Rainbow Border
- **Music player** with audio URL, title, artist, autoplay
- **Public profile page** with animated background canvas
- **Admin panel**: overview stats, manage users, manage invite codes
- **Full CSS embedded inline** in every HTML file (no external CSS dependency)

---

## 🔗 Page URLs

| Page | URL |
|------|-----|
| Home | `/index.html` |
| Dashboard | `/dashboard.html` |
| Public Profile | `/profile.html?u=USERNAME` |
| Admin Panel | `/admin.html` |
| Setup | `/setup.html` |

---

## 🗄️ Data Models (Table API)

### `users` table
| Field | Type | Description |
|-------|------|-------------|
| id | text | UUID (auto) |
| username | text | Unique username (lowercase) |
| email | text | Email address |
| password | text | Hashed password |
| displayName | text | Display name |
| bio | rich_text | Profile bio |
| badge | text | Badge/role label |
| avatar | text | Avatar image URL |
| role | text | "user" or "admin" |
| socialLinks | text | JSON array of links |
| background | text | JSON background config |
| accentColor | text | Hex color |
| cardStyle | text | glass/solid/minimal/neon |
| profileEffect | text | none/glow/sparkle/rainbow |
| music | text | JSON music config |
| views | number | Profile view count |
| isActive | bool | Account active status |
| inviteUsed | text | Invite code used |

### `invites` table
| Field | Type | Description |
|-------|------|-------------|
| id | text | UUID (auto) |
| code | text | Invite code (uppercase) |
| maxUses | number | Max allowed uses |
| usedCount | number | Times used |
| isActive | bool | Active status |
| expiresAt | text | Expiry datetime |
| createdBy | text | Creator user ID |
| note | text | Internal note |

---

## 📌 Notes

- All CSS is **embedded inline** in each HTML file to ensure styles load correctly in all hosting environments
- Authentication uses **localStorage** tokens (base64 encoded payloads)
- Passwords are hashed with a simple base64 + salt method (suitable for demo; use bcrypt in production)
- The Table API (`tables/`) is provided by the Genspark hosting environment
