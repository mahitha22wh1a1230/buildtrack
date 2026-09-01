const app = document.getElementById('app');

let state = {
  user: null,
  page: 'dashboard',
  units: [],
  projects: [],
  selected: null,
  search: '',
  tab: 'overview'
};

const $ = (s, r = document) => r.querySelector(s);

const esc = s =>
  String(s ?? '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[c]));

const fmt = d =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : '—';

const roleName = r =>
  r === 'site_manager'
    ? 'Site Manager'
    : r === 'customer'
    ? 'Customer'
    : 'Admin';

async function api(url, opt = {}) {
  const r = await fetch(url, opt);
  const data = await r.json().catch(() => ({}));

  if (!r.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

function toast(msg) {
  const x = document.createElement('div');

  x.textContent = msg;

  x.style = `
    position:fixed;
    right:20px;
    bottom:20px;
    z-index:99;
    background:#10233f;
    color:#fff;
    padding:13px 16px;
    border-radius:10px;
    box-shadow:0 10px 25px #0003;
  `;

  document.body.appendChild(x);

  setTimeout(() => x.remove(), 2600);
}


/* =========================================================
   LOGIN
========================================================= */

async function boot() {
  try {
    const m = await api('/api/me');

    if (m.user) {
      state.user = m.user;

      state.page =
        state.user.role === 'customer'
          ? 'my-home'
          : 'dashboard';

      await load();
    } else {
      renderLogin('admin');
    }
  } catch (err) {
    renderLogin('admin');
  }
}


function renderLogin(role = 'admin') {

  const roles = [
    ['admin', 'Admin'],
    ['site_manager', 'Site Manager'],
    ['customer', 'Customer']
  ];

  const email =
    role === 'admin'
      ? 'aarti@buildtrack.demo'
      : role === 'site_manager'
      ? 'arjun@buildtrack.demo'
      : 'rahul@buildtrack.demo';

  app.innerHTML = `
    <div class="login-shell">

      <section class="login-left">

        <div class="brand">
          <div class="brandmark">A</div>
          <span>BuildTrack</span>
        </div>

        <div>

          <div
            class="badge blue"
            style="background:#203d66;color:#dbe8fb"
          >
            Construction Operations Platform
          </div>

          <h1>
            Every home.<br>
            Every stage.<br>
            One live system.
          </h1>

          <p>
            Track apartments, villas and villaments from foundation
            to handover. Give site teams the tools to update work
            daily and customers a clear view of their own home.
          </p>

          <div class="feature-list">
            <div>✓ Package-based handover: Bare-Bone, Semi-Finished, Fully Finished</div>
            <div>✓ Daily progress updates with site photos</div>
            <div>✓ Customer customization and change approvals</div>
            <div>✓ Real-time ETA, issues, tasks and handover readiness</div>
          </div>

        </div>

      </section>


      <section class="login-right">

        <form class="login-card" id="loginForm">

          <div
            class="brand"
            style="margin:0 0 18px;color:#10233f"
          >
            <div class="brandmark">A</div>
            <span>BuildTrack</span>
          </div>

          <h2 style="margin:0 0 6px">
            Sign in to your portal
          </h2>

          <p class="muted" style="margin-top:0">
            Choose the workspace that matches your role.
          </p>


          <div class="role-cards">

            ${roles.map(x => `
              <button
                type="button"
                class="role-card ${x[0] === role ? 'active' : ''}"
                data-role="${x[0]}"
              >
                ${x[1]}
              </button>
            `).join('')}

          </div>


          <input
            type="hidden"
            name="role"
            value="${role}"
          >


          <div class="field">

            <label>Email</label>

            <input
              name="email"
              type="email"
              required
              value="${email}"
            >

          </div>


          <div
            class="field"
            style="margin-top:12px"
          >

            <label>Password</label>

            <input
              name="password"
              type="password"
              required
              value="buildtrack"
            >

          </div>


          <button
            class="btn primary"
            style="width:100%;margin-top:16px"
          >
            Sign in
          </button>


          <div class="notice">
            Demo password for all sample accounts:
            <b>buildtrack</b>
          </div>


          <div
            id="loginErr"
            class="small-note"
            style="color:#b42318;margin-top:10px"
          ></div>

        </form>

      </section>

    </div>
  `;


  document.querySelectorAll('[data-role]').forEach(b => {

    b.onclick = () => {
      renderLogin(b.dataset.role);
    };

  });


  $('#loginForm').onsubmit = async e => {

    e.preventDefault();

    const f = new FormData(e.target);

    try {

      const x = await api('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: f.get('email'),
          password: f.get('password'),
          expectedRole: f.get('role')
        })
      });

      state.user = x.user;

      state.page =
        x.user.role === 'customer'
          ? 'my-home'
          : 'dashboard';

      await load();

    } catch (err) {

      $('#loginErr').textContent = err.message;

    }

  };
}


/* =========================================================
   DATA
========================================================= */

async function load() {

  state.projects = await api('/api/projects');
  state.units = await api('/api/units');

  render();
}


/* =========================================================
   PROFILE MENU
========================================================= */

function closeProfileMenu() {

  const menu = $('#profileMenu');

  if (menu) {
    menu.classList.remove('open');
  }

}


function showProfile() {

  const u = state.user;

  openModal(`
    <div class="modal-head">
      <div>
        <h2 style="margin:0">My Profile</h2>
        <div class="small-note">
          Your BuildTrack account
        </div>
      </div>

      <button
        class="close"
        onclick="closeModal()"
      >
        ×
      </button>
    </div>

    <div class="profile-menu-head"
         style="border:0;padding:10px 0">

      <div class="avatar large">
        ${esc(u.name?.[0] || 'A')}
      </div>

      <div>
        <h3 style="margin:0">
          ${esc(u.name)}
        </h3>

        <div class="small-note">
          ${roleName(u.role)}
        </div>
      </div>

    </div>

    <div class="checklist">

      <div class="check">
        <span>Name</span>
        <b>${esc(u.name)}</b>
      </div>

      <div class="check">
        <span>Role</span>
        <b>${roleName(u.role)}</b>
      </div>

      <div class="check">
        <span>Email</span>
        <b>${esc(u.email)}</b>
      </div>

      <div class="check">
        <span>Phone</span>
        <b>${esc(u.phone || 'Not available')}</b>
      </div>

    </div>
  `);

}


function showSettings() {

  openModal(`
    <div class="modal-head">

      <div>
        <h2 style="margin:0">
          Settings
        </h2>

        <div class="small-note">
          BuildTrack account settings
        </div>
      </div>

      <button
        class="close"
        onclick="closeModal()"
      >
        ×
      </button>

    </div>

    <div class="checklist">

      <div class="check">
        <span>Account</span>
        <b>${esc(state.user.name)}</b>
      </div>

      <div class="check">
        <span>Portal</span>
        <b>${roleName(state.user.role)}</b>
      </div>

      <div class="check">
        <span>Email</span>
        <b>${esc(state.user.email)}</b>
      </div>

      <div class="check">
        <span>Notifications</span>
        <span class="badge green">Enabled</span>
      </div>

    </div>
  `);

}


async function switchRole() {

  try {

    await api('/api/logout', {
      method: 'POST'
    });

  } catch (err) {}

  state.user = null;
  state.selected = null;
  state.page = 'dashboard';

  closeProfileMenu();

  renderLogin('admin');
}


async function logoutUser() {

  try {

    await api('/api/logout', {
      method: 'POST'
    });

  } catch (err) {}

  state.user = null;
  state.selected = null;
  state.page = 'dashboard';

  closeProfileMenu();

  renderLogin('admin');
}


/* =========================================================
   LAYOUT
========================================================= */

function layout(content) {

  const u = state.user;

  const nav =
    u.role === 'admin'
      ? [
          ['dashboard', 'Dashboard', '▦'],
          ['projects', 'Projects', '▣'],
          ['homes', 'Homes', '⌂'],
          ['updates', 'Daily Updates', '↻'],
          ['custom', 'Customizations', '✦'],
          ['issues', 'Issues & Risks', '!'],
          ['tasks', 'Tasks', '✓'],
          ['reports', 'Reports', '▤'],
          ['team', 'Team', '♙']
        ]
      : u.role === 'site_manager'
      ? [
          ['dashboard', 'Site Dashboard', '▦'],
          ['homes', 'My Site Homes', '⌂'],
          ['updates', 'Daily Updates', '↻'],
          ['tasks', 'Tasks', '✓'],
          ['issues', 'Issues & Risks', '!']
        ]
      : [
          ['my-home', 'My Home', '⌂'],
          ['updates', 'Updates & Photos', '↻'],
          ['custom', 'My Customizations', '✦'],
          ['handover', 'Handover', '✓']
        ];


  app.innerHTML = `

    <div class="app-shell">

      <aside class="sidebar">

        <div class="brand">

          <div class="brandmark">
            A
          </div>

          <span>
            BuildTrack
          </span>

        </div>


        <div class="role-pill">
          ${roleName(u.role)} · ${esc(u.name)}
        </div>


        <nav class="nav">

          ${nav.map(n => `
            <button
              class="${state.page === n[0] ? 'active' : ''}"
              data-page="${n[0]}"
            >
              ${n[2]}
              <span>${n[1]}</span>
            </button>
          `).join('')}

        </nav>


        <div class="sidebar-bottom">

          <button
            class="logout"
            id="sidebarLogout"
          >
            ⇥
            <span>Sign out</span>
          </button>

        </div>

      </aside>


      <main class="main">

        <header class="topbar">

          <div class="top-title">
            ${pageTitle()}
          </div>


          <div class="profile-wrap">

            <button
              class="user-mini profile-button"
              id="profileButton"
              type="button"
            >

              <div style="text-align:right">

                <b>
                  ${esc(u.name)}
                </b>

                <div class="small-note">
                  ${roleName(u.role)}
                </div>

              </div>


              <div class="avatar">
                ${esc(u.name?.[0] || 'A')}
              </div>

            </button>


            <div
              class="profile-menu"
              id="profileMenu"
            >

              <div class="profile-menu-head">

                <div class="avatar large">
                  ${esc(u.name?.[0] || 'A')}
                </div>

                <div>

                  <b>
                    ${esc(u.name)}
                  </b>

                  <div class="small-note">
                    ${roleName(u.role)}
                  </div>

                </div>

              </div>


              <button
                type="button"
                data-profile-action="profile"
              >
                👤
                <span>Profile</span>
              </button>


              <button
                type="button"
                data-profile-action="settings"
              >
                ⚙️
                <span>Settings</span>
              </button>


              <button
                type="button"
                data-profile-action="switch"
              >
                🔄
                <span>Switch Role</span>
              </button>


              <div class="profile-divider"></div>


              <button
                type="button"
                class="profile-logout"
                data-profile-action="logout"
              >
                🚪
                <span>Logout</span>
              </button>

            </div>

          </div>

        </header>


        <section class="content">
          ${content}
        </section>

      </main>


      <div class="mobile-nav">

        ${nav.slice(0, 5).map(n => `
          <button data-page="${n[0]}">
            ${n[2]}<br>
            ${n[1]}
          </button>
        `).join('')}

      </div>

    </div>
  `;


  document
    .querySelectorAll('[data-page]')
    .forEach(x => {

      x.onclick = async () => {

        state.page = x.dataset.page;
        state.selected = null;

        await load();

      };

    });


  $('#sidebarLogout').onclick = async () => {

    if (
      confirm('Are you sure you want to logout?')
    ) {
      await logoutUser();
    }

  };


  $('#profileButton').onclick = e => {

    e.stopPropagation();

    const menu = $('#profileMenu');

    if (menu) {
      menu.classList.toggle('open');
    }

  };


  document
    .querySelectorAll('[data-profile-action]')
    .forEach(btn => {

      btn.onclick = async e => {

        e.stopPropagation();

        const action =
          btn.dataset.profileAction;

        closeProfileMenu();

        if (action === 'profile') {
          showProfile();
        }

        if (action === 'settings') {
          showSettings();
        }

        if (action === 'switch') {

          if (
            confirm(
              'Switch role and return to the login screen?'
            )
          ) {
            await switchRole();
          }

        }

        if (action === 'logout') {

          if (
            confirm(
              'Are you sure you want to logout?'
            )
          ) {
            await logoutUser();
          }

        }

      };

    });

}


/* =========================================================
   CLOSE PROFILE WHEN CLICKING OUTSIDE
========================================================= */

document.addEventListener('click', e => {

  if (
    !e.target.closest('#profileButton') &&
    !e.target.closest('#profileMenu')
  ) {
    closeProfileMenu();
  }

});


/* =========================================================
   PAGE TITLE
========================================================= */

function pageTitle() {

  const map = {

    dashboard:
      state.user.role === 'admin'
        ? 'Portfolio Overview'
        : state.user.role === 'site_manager'
        ? 'Site Operations'
        : 'My Home',

    projects: 'Projects',

    homes: 'Homes & Units',

    updates: 'Daily Site Updates',

    custom:
      'Customizations & Change Requests',

    issues:
      'Issues & Risks',

    tasks:
      'Tasks & Schedule',

    reports:
      'Reports & Delivery',

    team:
      'Team & Roles',

    'my-home':
      'My Home',

    handover:
      'Handover Center',

    unit:
      'Home Details'

  };

  return map[state.page] || 'BuildTrack';
}


/* =========================================================
   DASHBOARD
========================================================= */

function statCards(d) {

  const s = d.stats;

  return `

    <div class="grid grid4">

      <div class="card stat">

        <div>

          <div class="label">
            ${state.user.role === 'customer'
              ? 'Homes'
              : 'Projects'}
          </div>

          <h3>${s.projects}</h3>

          <div class="small-note">
            Visible to you
          </div>

        </div>

        <div class="iconbox">
          ▦
        </div>

      </div>


      <div class="card stat">

        <div>

          <div class="label">
            Units / Homes
          </div>

          <h3>${s.units}</h3>

          <div class="small-note">
            Tracked individually
          </div>

        </div>

        <div class="iconbox">
          ⌂
        </div>

      </div>


      <div class="card stat">

        <div>

          <div class="label">
            Average Progress
          </div>

          <h3>${s.avg}%</h3>

          <div class="progress">
            <span style="width:${s.avg}%"></span>
          </div>

        </div>

        <div class="iconbox">
          ↗
        </div>

      </div>


      <div class="card stat">

        <div>

          <div class="label">
            Open Issues
          </div>

          <h3>${s.issues}</h3>

          <div class="small-note">
            Affecting delivery
          </div>

        </div>

        <div class="iconbox">
          !
        </div>

      </div>

    </div>

  `;
}


async function dashboard() {

  const d = await api('/api/dashboard');

  return `

    ${statCards(d)}

    <div style="height:18px"></div>

    <div class="two-col">

      <div class="card">

        <div class="section-title">

          <h2>
            ${
              state.user.role === 'site_manager'
                ? 'My Site Progress'
                : 'Project Portfolio'
            }
          </h2>

          <button
            class="btn small"
            onclick="state.page='homes';load()"
          >
            View homes
          </button>

        </div>


        <div class="grid grid2">

          ${
            state.projects.length
              ? state.projects.map(p => `

                <div class="project-card">

                  <div>

                    <h3>
                      ${esc(p.name)}
                    </h3>

                    <div class="small-note">
                      ${esc(p.type)}
                      ·
                      ${esc(p.location || '')}
                    </div>

                  </div>


                  <div class="project-meta">

                    <span>
                      ${p.unit_count} units
                    </span>

                    <span>
                      ${p.avg_progress || 0}%
                    </span>

                  </div>


                  <div class="progress">
                    <span
                      style="width:${p.avg_progress || 0}%"
                    ></span>
                  </div>


                  <div class="project-meta">

                    <span>
                      Manager:
                      ${esc(p.manager_name || 'Unassigned')}
                    </span>

                    <span>
                      ${esc(p.status)}
                    </span>

                  </div>

                </div>

              `).join('')
              : `<div class="empty">
                  No projects found.
                 </div>`
          }

        </div>

      </div>


      <div class="card">

        <div class="section-title">

          <h2>
            Delivery watch
          </h2>

        </div>


        ${
          state.units
            .slice()
            .sort((a, b) =>
              String(a.eta).localeCompare(String(b.eta))
            )
            .slice(0, 5)
            .map(u => `

              <div class="check">

                <div>

                  <b>
                
