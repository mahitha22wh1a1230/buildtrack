const app=document.getElementById('app');

let state={
  user:null,
  page:'dashboard',
  units:[],
  projects:[],
  selected:null,
  search:'',
  tab:'overview'
};

const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmt=d=>d?new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—';
const roleName=r=>r==='site_manager'?'Site Manager':r==='customer'?'Customer':'Admin';

async function api(url,opt={}){
  const r=await fetch(url,opt);
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.error||'Something went wrong');
  return data;
}

function toast(msg){
  const x=document.createElement('div');
  x.textContent=msg;
  x.style='position:fixed;right:20px;bottom:20px;z-index:99;background:#10233f;color:#fff;padding:13px 16px;border-radius:10px;box-shadow:0 10px 25px #0003';
  document.body.appendChild(x);
  setTimeout(()=>x.remove(),2600);
}

/* ---------- LOGIN ---------- */

async function boot(){
  try{
    const m=await api('/api/me');
    if(m.user){
      state.user=m.user;
      state.page=m.user.role==='customer'?'my-home':'dashboard';
      await load();
    }else renderLogin('admin');
  }catch(e){renderLogin('admin')}
}

function renderLogin(role='admin'){
  const roles=[['admin','Admin'],['site_manager','Site Manager'],['customer','Customer']];
  const email=role==='admin'?'aarti@buildtrack.demo':role==='site_manager'?'arjun@buildtrack.demo':'rahul@buildtrack.demo';

  app.innerHTML=`
  <div class="login-shell">
    <section class="login-left">
      <div class="brand"><div class="brandmark">A</div><span>BuildTrack</span></div>
      <div>
        <div class="badge blue" style="background:#203d66;color:#dbe8fb">Construction Operations Platform</div>
        <h1>Every home.<br>Every stage.<br>One live system.</h1>
        <p>Track apartments, villas and villaments from foundation to handover. Give site teams the tools to update work daily and customers a clear view of their own home.</p>
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
        <div class="brand" style="margin:0 0 18px;color:#10233f"><div class="brandmark">A</div><span>BuildTrack</span></div>
        <h2 style="margin:0 0 6px">Sign in to your portal</h2>
        <p class="muted" style="margin-top:0">Choose the workspace that matches your role.</p>

        <div class="role-cards">
          ${roles.map(r=>`<button type="button" class="role-card ${r[0]===role?'active':''}" data-role="${r[0]}">${r[1]}</button>`).join('')}
        </div>

        <input type="hidden" name="role" value="${role}">

        <div class="field"><label>Email</label><input name="email" type="email" required value="${email}"></div>
        <div class="field" style="margin-top:12px"><label>Password</label><input name="password" type="password" required value="buildtrack"></div>
        <button class="btn primary" style="width:100%;margin-top:16px">Sign in</button>

        <div class="notice">Demo password for all sample accounts: <b>buildtrack</b></div>
        <div id="loginErr" class="small-note" style="color:#b42318;margin-top:10px"></div>
      </form>
    </section>
  </div>`;

  document.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>renderLogin(b.dataset.role));

  $('#loginForm').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    try{
      const x=await api('/api/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          email:f.get('email'),
          password:f.get('password'),
          expectedRole:f.get('role')
        })
      });
      state.user=x.user;
      state.page=x.user.role==='customer'?'my-home':'dashboard';
      await load();
    }catch(err){$('#loginErr').textContent=err.message}
  };
}

/* ---------- DATA ---------- */

async function load(){
  state.projects=await api('/api/projects');
  state.units=await api('/api/units');
  await render();
}

/* ---------- PROFILE ---------- */

function closeProfileMenu(){
  $('#profileMenu')?.classList.remove('open');
}

function showProfile(){
  const u=state.user;
  openModal(`
    <div class="modal-head">
      <div><h2 style="margin:0">My Profile</h2><div class="small-note">Your BuildTrack account</div></div>
      <button class="close" onclick="closeModal()">×</button>
    </div>
    <div class="profile-menu-head" style="border:0">
      <div class="avatar large">${esc(u.name?.[0]||'A')}</div>
      <div><h3 style="margin:0">${esc(u.name)}</h3><div class="small-note">${roleName(u.role)}</div></div>
    </div>
    <div class="checklist">
      <div class="check"><span>Name</span><b>${esc(u.name)}</b></div>
      <div class="check"><span>Role</span><b>${roleName(u.role)}</b></div>
      <div class="check"><span>Email</span><b>${esc(u.email)}</b></div>
      <div class="check"><span>Phone</span><b>${esc(u.phone||'Not available')}</b></div>
    </div>`);
}

function showSettings(){
  openModal(`
    <div class="modal-head">
      <div><h2 style="margin:0">Settings</h2><div class="small-note">BuildTrack account settings</div></div>
      <button class="close" onclick="closeModal()">×</button>
    </div>
    <div class="checklist">
      <div class="check"><span>Account</span><b>${esc(state.user.name)}</b></div>
      <div class="check"><span>Portal</span><b>${roleName(state.user.role)}</b></div>
      <div class="check"><span>Email</span><b>${esc(state.user.email)}</b></div>
      <div class="check"><span>Notifications</span><span class="badge green">Enabled</span></div>
    </div>`);
}

async function logoutUser(){
  try{await api('/api/logout',{method:'POST'})}catch(e){}
  state.user=null;
  state.selected=null;
  state.page='dashboard';
  closeProfileMenu();
  renderLogin('admin');
}

async function switchRole(){
  await logoutUser();
}

/* ---------- LAYOUT ---------- */

function pageTitle(){
  const m={
    dashboard:state.user.role==='admin'?'Portfolio Overview':state.user.role==='site_manager'?'Site Operations':'My Home',
    projects:'Projects',homes:'Homes & Units',updates:'Daily Site Updates',
    custom:'Customizations & Change Requests',issues:'Issues & Risks',
    tasks:'Tasks & Schedule',reports:'Reports & Delivery',team:'Team & Roles',
    'my-home':'My Home',handover:'Handover Center',unit:'Home Details'
  };
  return m[state.page]||'BuildTrack';
}

function layout(content){
  const u=state.user;
  const nav=u.role==='admin'
    ?[['dashboard','Dashboard','▦'],['projects','Projects','▣'],['homes','Homes','⌂'],['updates','Daily Updates','↻'],['custom','Customizations','✦'],['issues','Issues & Risks','!'],['tasks','Tasks','✓'],['reports','Reports','▤'],['team','Team','♙']]
    :u.role==='site_manager'
    ?[['dashboard','Site Dashboard','▦'],['homes','My Site Homes','⌂'],['updates','Daily Updates','↻'],['tasks','Tasks','✓'],['issues','Issues & Risks','!']]
    :[['my-home','My Home','⌂'],['updates','Updates & Photos','↻'],['custom','My Customizations','✦'],['handover','Handover','✓']];

  app.innerHTML=`
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><div class="brandmark">A</div><span>BuildTrack</span></div>
      <div class="role-pill">${roleName(u.role)} · ${esc(u.name)}</div>
      <nav class="nav">${nav.map(n=>`<button class="${state.page===n[0]?'active':''}" data-page="${n[0]}">${n[2]} <span>${n[1]}</span></button>`).join('')}</nav>
      <div class="sidebar-bottom"><button class="logout" id="sidebarLogout">⇥ <span>Sign out</span></button></div>
    </aside>

    <main class="main">
      <header class="topbar">
        <div class="top-title">${pageTitle()}</div>

        <div class="profile-wrap">
          <button class="user-mini profile-button" id="profileButton" type="button">
            <div style="text-align:right"><b>${esc(u.name)}</b><div class="small-note">${roleName(u.role)}</div></div>
            <div class="avatar">${esc(u.name?.[0]||'A')}</div>
          </button>

          <div class="profile-menu" id="profileMenu">
            <div class="profile-menu-head">
              <div class="avatar large">${esc(u.name?.[0]||'A')}</div>
              <div><b>${esc(u.name)}</b><div class="small-note">${roleName(u.role)}</div></div>
            </div>
            <button type="button" data-profile-action="profile">👤 <span>Profile</span></button>
            <button type="button" data-profile-action="settings">⚙️ <span>Settings</span></button>
            <button type="button" data-profile-action="switch">🔄 <span>Switch Role</span></button>
            <div class="profile-divider"></div>
            <button type="button" class="profile-logout" data-profile-action="logout">🚪 <span>Logout</span></button>
          </div>
        </div>
      </header>

      <section class="content">${content}</section>
    </main>

    <div class="mobile-nav">${nav.slice(0,5).map(n=>`<button data-page="${n[0]}">${n[2]}<br>${n[1]}</button>`).join('')}</div>
  </div>`;

  document.querySelectorAll('[data-page]').forEach(x=>x.onclick=async()=>{
    state.page=x.dataset.page;
    state.selected=null;
    await load();
  });

  $('#sidebarLogout').onclick=async()=>{
    if(confirm('Are you sure you want to logout?'))await logoutUser();
  };

  $('#profileButton').onclick=e=>{
    e.stopPropagation();
    $('#profileMenu')?.classList.toggle('open');
  };

  document.querySelectorAll('[data-profile-action]').forEach(b=>b.onclick=async e=>{
    e.stopPropagation();
    const action=b.dataset.profileAction;
    closeProfileMenu();

    if(action==='profile')showProfile();
    if(action==='settings')showSettings();
    if(action==='switch'&&confirm('Switch role and return to the login screen?'))await switchRole();
    if(action==='logout'&&confirm('Are you sure you want to logout?'))await logoutUser();
  });
}

document.addEventListener('click',e=>{
  if(!e.target.closest('#profileButton')&&!e.target.closest('#profileMenu'))closeProfileMenu();
});

/* ---------- DASHBOARD ---------- */

function statCards(d){
  const s=d.stats;
  return `
  <div class="grid grid4">
    <div class="card stat"><div><div class="label">${state.user.role==='customer'?'Homes':'Projects'}</div><h3>${s.projects}</h3><div class="small-note">Visible to you</div></div><div class="iconbox">▦</div></div>
    <div class="card stat"><div><div class="label">Units / Homes</div><h3>${s.units}</h3><div class="small-note">Tracked individually</div></div><div class="iconbox">⌂</div></div>
    <div class="card stat"><div><div class="label">Average Progress</div><h3>${s.avg}%</h3><div class="progress"><span style="width:${s.avg}%"></span></div></div><div class="iconbox">↗</div></div>
    <div class="card stat"><div><div class="label">Open Issues</div><h3>${s.issues}</h3><div class="small-note">Affecting delivery</div></div><div class="iconbox">!</div></div>
  </div>`;
}

async function dashboard(){
  const d=await api('/api/dashboard');
  return `
  ${statCards(d)}
  <div style="height:18px"></div>
  <div class="two-col">
    <div class="card">
      <div class="section-title"><h2>${state.user.role==='site_manager'?'My Site Progress':'Project Portfolio'}</h2><button class="btn small" onclick="state.page='homes';load()">View homes</button></div>
      <div class="grid grid2">${state.projects.map(p=>`
        <div class="project-card">
          <div><h3>${esc(p.name)}</h3><div class="small-note">${esc(p.type)} · ${esc(p.location||'')}</div></div>
          <div class="project-meta"><span>${p.unit_count} units</span><span>${p.avg_progress||0}%</span></div>
          <div class="progress"><span style="width:${p.avg_progress||0}%"></span></div>
          <div class="project-meta"><span>Manager: ${esc(p.manager_name||'Unassigned')}</span><span>${esc(p.status)}</span></div>
        </div>`).join('')}</div>
    </div>
    <div class="card">
      <div class="section-title"><h2>Delivery watch</h2></div>
      ${state.units.slice().sort((a,b)=>String(a.eta).localeCompare(String(b.eta))).slice(0,5).map(u=>`
        <div class="check"><div><b>${esc(u.code)}</b><div class="small-note">${esc(u.package)} · ${esc(u.current_stage)}</div></div><div style="text-align:right"><b>${fmt(u.eta)}</b><div class="small-note">${u.progress}% complete</div></div></div>`).join('')}
    </div>
  </div>
  <div style="height:18px"></div>
  <div class="card">
    <div class="section-title"><h2>Recent daily updates</h2><button class="btn small" onclick="state.page='updates';load()">Open feed</button></div>
    ${d.updates.slice(0,6).map(x=>`<div class="update"><div class="update-head"><b>${esc(x.title)}</b><span class="small-note">${fmt(x.created_at)}</span></div><div class="small-note">${esc(x.note)}</div></div>`).join('')}
  </div>`;
}

/* ---------- HOMES ---------- */

function homes(){
  const rows=state.units.filter(u=>!state.search||(`${u.code} ${u.customer_name||''} ${u.project_name||''}`).toLowerCase().includes(state.search.toLowerCase()));
  return `
  <div class="page-head">
    <div><h1>Homes & Units</h1><div class="muted">Track every house independently, even inside the same apartment complex.</div></div>
    <div class="toolbar"><input class="btn search" placeholder="Search home, customer or project" value="${esc(state.search)}" id="searchHomes">${state.user.role==='admin'?'<button class="btn primary" onclick="openCreateUnit()">+ Add home</button>':''}</div>
  </div>
  <div class="card"><div class="table-wrap"><table class="table">
    <thead><tr><th>Home</th><th>Project</th><th>Customer</th><th>Package</th><th>Current stage</th><th>Progress</th><th>Expected delivery</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows.map(u=>`
      <tr>
        <td><b>${esc(u.code)}</b><div class="small-note">${esc(u.type)} · Floor ${esc(u.floor)}</div></td>
        <td>${esc(u.project_name)}</td><td>${esc(u.customer_name||'Unassigned')}</td>
        <td><span class="badge ${u.package==='Fully Finished'?'blue':u.package==='Semi-Finished'?'orange':'green'}">${esc(u.package)}</span></td>
        <td>${esc(u.current_stage)}<div class="small-note">handover after ${esc(u.delivery_stage)}</div></td>
        <td style="min-width:130px"><div class="progress"><span style="width:${u.progress}%"></span></div><div class="small-note">${u.progress}%</div></td>
        <td><b>${fmt(u.eta)}</b></td><td><span class="badge blue">${esc(u.status)}</span></td>
        <td><button class="btn small" onclick="openUnit(${u.id})">Open</button></td>
      </tr>`).join('')}</tbody>
  </table></div></div>`;
}

document.addEventListener('input',e=>{
  if(e.target.id==='searchHomes'){
    state.search=e.target.value;
    render();
  }
});

/* ---------- UNIT ---------- */

async function openUnit(id){
  try{
    state.selected=await api('/api/units/'+id);
    state.page='unit';
    await render();
  }catch(e){toast(e.message)}
}

function closeUnit(){
  state.selected=null;
  state.page=state.user.role==='customer'?'my-home':'homes';
  load();
}

function unitDetail(u){
  if(!u)return '<div class="empty">No home selected.</div>';
  const canManage=['admin','site_manager'].includes(state.user.role);

  return `
  <div class="page-head">
    <div><button class="btn small" onclick="closeUnit()">← Back</button><h1 style="margin-top:12px">${esc(u.code)} · ${esc(u.project_name)}</h1><div class="muted">${esc(u.type)} · Floor ${esc(u.floor)} · ${esc(u.package)} · Customer: ${esc(u.customer_name||'Unassigned')}</div></div>
    <div class="toolbar">${canManage?`<button class="btn primary" onclick="openUpdate(${u.id})">+ Daily update</button>`:''}<button class="btn gold" onclick="openCustomization(${u.id})">+ Change request</button></div>
  </div>

  <div class="grid grid4">
    <div class="card stat"><div><div class="label">Progress</div><h3>${u.progress}%</h3><div class="progress"><span style="width:${u.progress}%"></span></div></div></div>
    <div class="card stat"><div><div class="label">Expected handover</div><h3 style="font-size:22px">${fmt(u.eta)}</h3></div></div>
    <div class="card stat"><div><div class="label">Handover stage</div><h3 style="font-size:22px">${esc(u.delivery_stage)}</h3></div></div>
    <div class="card stat"><div><div class="label">Current stage</div><h3 style="font-size:22px">${esc(u.current_stage)}</h3><div class="small-note">${esc(u.status)}</div></div></div>
  </div>

  <div style="height:18px"></div>

  <div class="two-col">
    <div class="card">
      <div class="section-title"><h2>Construction lifecycle</h2>${canManage?`<button class="btn small" onclick="openStage(${u.id})">Update stage</button>`:''}</div>
      <div class="timeline">${u.stages.map(s=>`
        <div class="timeline-item"><div class="dot ${s.status==='Completed'?'done':s.status==='In Progress'?'live':''}"></div>
        <div><h4>${esc(s.name)} ${s.status==='Completed'?'✓':s.status==='In Progress'?'•':''}</h4><p>${esc(s.status)} · Planned ${fmt(s.planned_date)}${s.completed_date?' · Completed '+fmt(s.completed_date):''}</p></div></div>`).join('')}</div>
    </div>

    <div>
      <div class="card"><div class="section-title"><h2>Customer customizations</h2></div>
        ${u.custom.length?u.custom.map(c=>`<div class="check"><div><b>${esc(c.title)}</b><div class="small-note">${esc(c.details)}</div><div class="small-note">${esc(c.cost||'Cost pending')} · +${c.impact_days} days</div></div><span class="badge ${c.status==='Approved'?'green':c.status==='Rejected'?'red':'orange'}">${esc(c.status)}</span></div>`).join(''):'<div class="empty">No change requests yet.</div>'}
      </div>
      <div style="height:18px"></div>
      <div class="card"><div class="section-title"><h2>Recent site updates</h2></div>
        ${u.updates.length?u.updates.map(x=>`<div class="update">${x.photo?`<img class="photo" src="${esc(x.photo)}">`:''}<div class="update-head"><b>${esc(x.title)}</b><span class="small-note">${fmt(x.created_at)}</span></div><div class="small-note">${esc(x.note)}</div><div class="small-note">Posted by ${esc(x.author_name)}</div></div>`).join(''):'<div class="empty">No updates yet.</div>'}
      </div>
    </div>
  </div>`;
}

/* ---------- OTHER PAGES ---------- */

function updates(){
  return `<div class="page-head"><div><h1>Daily Site Updates</h1><div class="muted">Coordinators post what happened today, with photos and notes customers can see remotely.</div></div>${['admin','site_manager'].includes(state.user.role)?'<button class="btn primary" onclick="openUpdate()">+ Post update</button>':''}</div>
  <div class="grid grid2">${state.units.map(u=>`<div class="card"><div class="section-title"><h2>${esc(u.code)} · ${esc(u.project_name)}</h2><button class="btn small" onclick="openUnit(${u.id})">View</button></div><div class="small-note">${esc(u.current_stage)} · ${u.progress}% · ETA ${fmt(u.eta)}</div></div>`).join('')}</div>`;
}

function customPage(){
  return `<div class="page-head"><div><h1>Customizations & Change Requests</h1><div class="muted">Keep customer choices inside the construction workflow.</div></div></div>
  <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Home</th><th>Package</th><th>Customer</th><th>Stage</th><th>ETA</th><th>Action</th></tr></thead><tbody>
  ${state.units.map(u=>`<tr><td><b>${esc(u.code)}</b><div class="small-note">${esc(u.project_name)}</div></td><td>${esc(u.package)}</td><td>${esc(u.customer_name||'')}</td><td>${esc(u.current_stage)}</td><td>${fmt(u.eta)}</td><td><button class="btn small" onclick="openCustomization(${u.id})">${state.user.role==='customer'?'Request change':'Manage requests'}</button></td></tr>`).join('')}
  </tbody></table></div></div>`;
}

async function issues(){
  const rows=await api('/api/issues');
  return `<div class="page-head"><div><h1>Issues & Risks</h1><div class="muted">Track blockers that can change expected delivery.</div></div><button class="btn primary" onclick="openIssue()">+ Log issue</button></div>
  <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Issue</th><th>Project / Home</th><th>Severity</th><th>Status</th><th>Impact</th><th>Created</th></tr></thead><tbody>
  ${rows.map(i=>`<tr><td><b>${esc(i.title)}</b><div class="small-note">${esc(i.details)}</div></td><td>${esc(i.project_name)} / ${esc(i.unit_code||'Project')}</td><td>${esc(i.severity)}</td><td>${esc(i.status)}</td><td>+${i.impact_days} days</td><td>${fmt(i.created_at)}</td></tr>`).join('')}
  </tbody></table></div></div>`;
}

async function tasks(){
  const rows=await api('/api/tasks');
  return `<div class="page-head"><div><h1>Tasks & Schedule</h1><div class="muted">See what is due and who owns it.</div></div></div>
  <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Task</th><th>Home</th><th>Stage</th><th>Assignee</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>
  ${rows.map(t=>`<tr><td><b>${esc(t.title)}</b></td><td>${esc(t.unit_code)}</td><td>${esc(t.stage)}</td><td>${esc(t.assignee_name||'')}</td><td>${fmt(t.due_date)}</td><td>${esc(t.status)}</td><td><button class="btn small" onclick="taskStatus(${t.id},'${t.status==='To Do'?'In Progress':t.status==='In Progress'?'Done':'To Do'}')">Advance</button></td></tr>`).join('')}
  </tbody></table></div></div>`;
}

async function reports(){
  const rows=await api('/api/report');
  return `<div class="page-head"><div><h1>Reports & Delivery</h1><div class="muted">Portfolio-level visibility for handovers and progress.</div></div><button class="btn gold" onclick="downloadReport()">Export CSV</button></div>
  <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Project</th><th>Type</th><th>Homes</th><th>Avg progress</th><th>Ready</th><th>Earliest delivery</th><th>Latest delivery</th></tr></thead><tbody>
  ${rows.map(r=>`<tr><td><b>${esc(r.project)}</b></td><td>${esc(r.type)}</td><td>${r.units}</td><td>${r.avg_progress||0}%</td><td>${r.ready||0}</td><td>${fmt(r.earliest_delivery)}</td><td>${fmt(r.latest_delivery)}</td></tr>`).join('')}
  </tbody></table></div></div>`;
}

async function team(){
  const rows=await api('/api/users');
  return `<div class="page-head"><div><h1>Team & Roles</h1><div class="muted">Manage visibility by role.</div></div></div>
  <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Phone</th><th>Status</th></tr></thead><tbody>
  ${rows.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td><span class="badge blue">${roleName(x.role)}</span></td><td>${esc(x.email)}</td><td>${esc(x.phone||'')}</td><td>${x.active?'Active':'Disabled'}</td></tr>`).join('')}
  </tbody></table></div></div>`;
}

async function customerHome(){
  const u=state.units[0];
  if(!u)return '<div class="empty">No home is assigned to this account.</div>';
  const d=state.selected||await api('/api/units/'+u.id);
  state.selected=d;
  return `<div class="customer-hero"><div class="small-note" style="color:#c9d5e7">YOUR HOME · ${esc(d.project_name)}</div><h1 style="margin:8px 0">${esc(d.code)}</h1><div class="muted">${esc(d.type)} · ${esc(d.package)} package · ${esc(d.current_stage)} in progress</div><div class="kpi-line"><div><b>${d.progress}%</b><span class="small-note" style="color:#c9d5e7">Overall progress</span></div><div><b>${fmt(d.eta)}</b><span class="small-note" style="color:#c9d5e7">Expected handover</span></div></div></div>`;
}

async function handover(){
  const u=state.units[0];
  if(!u)return '<div class="empty">No home assigned.</div>';
  const d=await api('/api/units/'+u.id);
  return `<div class="page-head"><div><h1>Handover Center</h1><div class="muted">Track the final readiness of your home.</div></div></div><div class="card"><div class="check"><span>Progress</span><b>${d.progress}%</b></div><div class="check"><span>Expected handover</span><b>${fmt(d.eta)}</b></div><div class="check"><span>Handover scope</span><b>${esc(d.delivery_stage)}</b></div></div>`;
}

function projectsPage(){
  return `<div class="page-head"><div><h1>Projects</h1><div class="muted">Manage construction projects and their homes.</div></div>${state.user.role==='admin'?'<button class="btn primary" onclick="openCreateProject()">+ Add project</button>':''}</div>
  <div class="grid grid2">${state.projects.map(p=>`<div class="card project-card"><div><h2 style="margin:0">${esc(p.name)}</h2><div class="small-note">${esc(p.type)} · ${esc(p.location||'')}</div></div><div class="project-meta"><span>${p.unit_count} homes</span><span>${p.avg_progress||0}%</span></div><div class="progress"><span style="width:${p.avg_progress||0}%"></span></div></div>`).join('')}</div>`;
}

/* ---------- MODALS / ACTIONS ---------- */

function ensureModal(){
  if($('#globalModal'))return;
  const d=document.createElement('div');
  d.id='globalModal';
  d.className='modal';
  d.innerHTML='<div class="modal-box" id="modalContent"></div>';
  document.body.appendChild(d);
  d.onclick=e=>{if(e.target===d)closeModal()};
}
function openModal(html){ensureModal();$('#modalContent').innerHTML=html;$('#globalModal').classList.add('open')}
function closeModal(){$('#globalModal')?.classList.remove('open')}

function openStage(id){
  const u=state.selected||state.units.find(x=>x.id===id);
  if(!u)return;
  openModal(`<div class="modal-head"><h2 style="margin:0">Update construction stage</h2><button class="close" onclick="closeModal()">×</button></div>
  <form id="stageForm"><div class="field"><label>Stage</label><select name="stage">${u.stages.map(s=>`<option ${s.name===u.current_stage?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div><div class="field" style="margin-top:12px"><label>Status</label><select name="status"><option>In Progress</option><option>Completed</option></select></div><button class="btn primary" style="margin-top:16px">Update stage</button></form>`);
  $('#stageForm').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    try{
      await api(`/api/units/${id}/stage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stage:f.get('stage'),status:f.get('status')})});
      closeModal();toast('Construction stage updated');await load();
    }catch(err){toast(err.message)}
  };
}

function openUpdate(unitId=''){
  openModal(`<div class="modal-head"><h2 style="margin:0">Post daily update</h2><button class="close" onclick="closeModal()">×</button></div>
  <form id="updateForm"><div class="form-grid"><div class="field"><label>Home</label><select name="unit_id">${state.units.map(u=>`<option value="${u.id}" ${String(u.id)===String(unitId)?'selected':''}>${esc(u.code)}</option>`).join('')}</select></div><div class="field"><label>Title</label><input name="title" required></div><div class="field full"><label>Note</label><textarea name="note"></textarea></div><div class="field full"><label>Photo</label><input type="file" name="photo" accept="image/*"></div></div><button class="btn primary" style="margin-top:16px">Post update</button></form>`);
  $('#updateForm').onsubmit=async e=>{
    e.preventDefault();
    try{await api('/api/updates',{method:'POST',body:new FormData(e.target)});closeModal();toast('Daily update posted');await load()}catch(err){toast(err.message)}
  };
}

function openCustomization(unitId){
  openModal(`<div class="modal-head"><h2 style="margin:0">Change request</h2><button class="close" onclick="closeModal()">×</button></div>
  <form id="customForm"><div class="field"><label>Request title</label><input name="title" required></div><div class="field" style="margin-top:12px"><label>Details</label><textarea name="details"></textarea></div><div class="form-grid" style="margin-top:12px"><div class="field"><label>Extra days</label><input type="number" name="impact_days" value="0" min="0"></div><div class="field"><label>Cost</label><input name="cost" placeholder="₹25,000"></div></div><button class="btn primary" style="margin-top:16px">Submit request</button></form>`);
  $('#customForm').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    try{
      await api('/api/customizations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({unit_id:unitId,title:f.get('title'),details:f.get('details'),impact_days:Number(f.get('impact_days')||0),cost:f.get('cost')})});
      closeModal();toast('Change request submitted');await load();
    }catch(err){toast(err.message)}
  };
}

async function changeCust(id,status){
  try{
    await api(`/api/customizations/${id}/status`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
    toast('Status updated');await load();
  }catch(err){toast(err.message)}
}

async function taskStatus(id,status){
  try{
    await api(`/api/tasks/${id}/status`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
    toast('Task status updated');await load();
  }catch(err){toast(err.message)}
}

function openCreateProject(){
  openModal(`<div class="modal-head"><h2 style="margin:0">Add project</h2><button class="close" onclick="closeModal()">×</button></div><form id="projectForm"><div class="form-grid"><div class="field"><label>Project name</label><input name="name" required></div><div class="field"><label>Type</label><input name="type" required></div><div class="field"><label>Location</label><input name="location" required></div><div class="field"><label>Start date</label><input type="date" name="start_date" required></div><div class="field"><label>Target date</label><input type="date" name="target_date" required></div></div><button class="btn primary" style="margin-top:16px">Create project</button></form>`);
  $('#projectForm').onsubmit=async e=>{
    e.preventDefault();const f=new FormData(e.target);
    try{await api('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(f))});closeModal();toast('Project created');await load()}catch(err){toast(err.message)}
  };
}

function openCreateUnit(){
  openModal(`<div class="modal-head"><h2 style="margin:0">Add home</h2><button class="close" onclick="closeModal()">×</button></div><form id="unitForm"><div class="form-grid"><div class="field"><label>Project</label><select name="project_id">${state.projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div><div class="field"><label>Home code</label><input name="code" required></div><div class="field"><label>Type</label><input name="type" value="Apartment"></div><div class="field"><label>Floor</label><input name="floor"></div><div class="field"><label>Package</label><select name="package"><option>Bare-Bone</option><option>Semi-Finished</option><option>Fully Finished</option></select></div><div class="field"><label>Base delivery</label><input type="date" name="base_delivery"></div></div><button class="btn primary" style="margin-top:16px">Add home</button></form>`);
  $('#unitForm').onsubmit=async e=>{
    e.preventDefault();const f=new FormData(e.target);
    try{await api('/api/units',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(f))});closeModal();toast('Home added');await load()}catch(err){toast(err.message)}
  };
}

function openIssue(){
  openModal(`<div class="modal-head"><h2 style="margin:0">Log issue</h2><button class="close" onclick="closeModal()">×</button></div><form id="issueForm"><div class="field"><label>Project</label><select name="project_id">${state.projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div><div class="field" style="margin-top:12px"><label>Issue title</label><input name="title" required></div><div class="field" style="margin-top:12px"><label>Details</label><textarea name="details"></textarea></div><div class="form-grid" style="margin-top:12px"><div class="field"><label>Severity</label><select name="severity"><option>Low</option><option selected>Medium</option><option>High</option></select></div><div class="field"><label>Impact days</label><input type="number" name="impact_days" value="0"></div></div><button class="btn primary" style="margin-top:16px">Log issue</button></form>`);
  $('#issueForm').onsubmit=async e=>{
    e.preventDefault();const f=new FormData(e.target);
    try{await api('/api/issues',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(f))});closeModal();toast('Issue logged');await load()}catch(err){toast(err.message)}
  };
}

function downloadReport(){window.location.href='/api/report/export'}

/* ---------- RENDER ---------- */

async function render(){
  if(!state.user){renderLogin('admin');return}
  try{
    let content;
    if(state.page==='dashboard')content=await dashboard();
    else if(state.page==='projects')content=projectsPage();
    else if(state.page==='homes')content=homes();
    else if(state.page==='updates')content=updates();
    else if(state.page==='custom')content=customPage();
    else if(state.page==='issues')content=await issues();
    else if(state.page==='tasks')content=await tasks();
    else if(state.page==='reports')content=await reports();
    else if(state.page==='team')content=await team();
    else if(state.page==='my-home')content=await customerHome();
    else if(state.page==='handover')content=await handover();
    else if(state.page==='unit')content=unitDetail(state.selected);
    else content='<div class="empty">Page not found.</div>';
    layout(content);
  }catch(err){
    console.error(err);
    layout(`<div class="card"><h2>Something went wrong</h2><p class="muted">${esc(err.message)}</p></div>`);
  }
}

boot();
