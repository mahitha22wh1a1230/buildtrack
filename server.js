const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const root = __dirname;
const db = new Database(path.join(root, 'buildtrack.db'));
const uploadDir = path.join(root, 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

app.use(express.json({limit:'2mb'}));
app.use(express.urlencoded({extended:true}));
app.use(session({secret: process.env.SESSION_SECRET || 'buildtrack-demo-secret-change-me', resave:false, saveUninitialized:false, cookie:{httpOnly:true, sameSite:'lax'}}));
app.use(express.static(path.join(root,'public')));

const upload = multer({storage:multer.diskStorage({destination:uploadDir, filename:(req,file,cb)=>cb(null, Date.now()+'-'+file.originalname.replace(/[^a-zA-Z0-9._-]/g,'_'))}), limits:{fileSize:8*1024*1024}});

// ---------- database ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL, phone TEXT, active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS projects(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL, location TEXT, start_date TEXT, target_date TEXT, status TEXT DEFAULT 'On Track', manager_id INTEGER);
CREATE TABLE IF NOT EXISTS units(id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, code TEXT NOT NULL, type TEXT NOT NULL, floor TEXT, customer_id INTEGER, package TEXT NOT NULL, progress INTEGER DEFAULT 0, current_stage TEXT NOT NULL, base_delivery TEXT, delay_days INTEGER DEFAULT 0, status TEXT DEFAULT 'Under Construction');
CREATE TABLE IF NOT EXISTS stages(id INTEGER PRIMARY KEY AUTOINCREMENT, unit_id INTEGER NOT NULL, name TEXT NOT NULL, seq INTEGER NOT NULL, status TEXT DEFAULT 'Pending', percent INTEGER DEFAULT 0, planned_date TEXT, completed_date TEXT);
CREATE TABLE IF NOT EXISTS updates(id INTEGER PRIMARY KEY AUTOINCREMENT, unit_id INTEGER NOT NULL, author_id INTEGER NOT NULL, title TEXT, note TEXT, photo TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS customizations(id INTEGER PRIMARY KEY AUTOINCREMENT, unit_id INTEGER NOT NULL, customer_id INTEGER NOT NULL, title TEXT NOT NULL, details TEXT, status TEXT DEFAULT 'Pending', impact_days INTEGER DEFAULT 0, cost TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS issues(id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, unit_id INTEGER, title TEXT NOT NULL, details TEXT, severity TEXT DEFAULT 'Medium', status TEXT DEFAULT 'Open', impact_days INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY AUTOINCREMENT, unit_id INTEGER NOT NULL, title TEXT NOT NULL, stage TEXT, assignee_id INTEGER, status TEXT DEFAULT 'To Do', due_date TEXT, notes TEXT);
CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, read INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
`);

function seed(){
  if(db.prepare('SELECT COUNT(*) c FROM users').get().c) return;
  const pass = bcrypt.hashSync('buildtrack', 10);
  const addUser = db.prepare('INSERT INTO users(name,email,password,role,phone) VALUES(?,?,?,?,?)');
  const admin = addUser.run('Aarti Sharma','aarti@buildtrack.demo',pass,'admin','+91 90000 10001').lastInsertRowid;
  const manager1 = addUser.run('Arjun Rao','arjun@buildtrack.demo',pass,'site_manager','+91 90000 10002').lastInsertRowid;
  const manager2 = addUser.run('Meera Iyer','meera@buildtrack.demo',pass,'site_manager','+91 90000 10003').lastInsertRowid;
  const c1 = addUser.run('Rahul Verma','rahul@buildtrack.demo',pass,'customer','+91 90000 20001').lastInsertRowid;
  const c2 = addUser.run('Sneha Reddy','sneha@buildtrack.demo',pass,'customer','+91 90000 20002').lastInsertRowid;
  const c3 = addUser.run('Vikram Shah','vikram@buildtrack.demo',pass,'customer','+91 90000 20003').lastInsertRowid;
  const project = db.prepare('INSERT INTO projects(name,type,location,start_date,target_date,status,manager_id) VALUES(?,?,?,?,?,?,?)');
  const p1 = project.run('Green Valley Residences','Apartment Complex','Hyderabad','2026-04-01','2026-11-30','On Track',manager1).lastInsertRowid;
  const p2 = project.run('Lakeview Villas','Villa Community','Bengaluru','2026-05-15','2027-01-20','At Risk',manager2).lastInsertRowid;
  const p3 = project.run('Skyline Villaments','Villament','Pune','2026-06-01','2027-02-15','On Track',manager1).lastInsertRowid;
  const addUnit = db.prepare('INSERT INTO units(project_id,code,type,floor,customer_id,package,progress,current_stage,base_delivery,status) VALUES(?,?,?,?,?,?,?,?,?,?)');
  const u1=addUnit.run(p1,'A-101','Apartment','1',c1,'Semi-Finished',64,'Electrical','2026-09-25','Under Construction').lastInsertRowid;
  const u2=addUnit.run(p1,'A-102','Apartment','1',c2,'Fully Finished',48,'Plumbing','2026-10-18','Under Construction').lastInsertRowid;
  const u3=addUnit.run(p1,'B-204','Apartment','2',c3,'Bare-Bone',88,'Cladding','2026-09-08','Ready Soon').lastInsertRowid;
  const u4=addUnit.run(p1,'B-205','Apartment','2',null,'Semi-Finished',35,'Walls','2026-11-05','Under Construction').lastInsertRowid;
  const u5=addUnit.run(p2,'V-07','Villa','Ground',c1,'Fully Finished',71,'Painting','2026-12-15','Under Construction').lastInsertRowid;
  const u6=addUnit.run(p2,'V-08','Villa','Ground',null,'Semi-Finished',55,'Plumbing','2027-01-05','Under Construction').lastInsertRowid;
  const u7=addUnit.run(p3,'VM-12','Villament','3',c2,'Fully Finished',39,'Structure','2027-01-30','Under Construction').lastInsertRowid;
  const u8=addUnit.run(p3,'VM-13','Villament','3',null,'Bare-Bone',92,'Cladding','2026-09-18','Ready Soon').lastInsertRowid;
  const stageNames=['Foundation','Structure','Walls','Cladding','Plumbing','Electrical','Painting','Flooring','Interiors','Final Inspection'];
  const packageEnd={'Bare-Bone':'Cladding','Semi-Finished':'Painting','Fully Finished':'Final Inspection'};
  const addStage=db.prepare('INSERT INTO stages(unit_id,name,seq,status,percent,planned_date,completed_date) VALUES(?,?,?,?,?,?,?)');
  const today=new Date();
  for(const u of [u1,u2,u3,u4,u5,u6,u7,u8]){
    const row=db.prepare('SELECT package,progress,current_stage FROM units WHERE id=?').get(u);
    const currentIndex=stageNames.indexOf(row.current_stage);
    for(let i=0;i<stageNames.length;i++){
      const d=new Date(today); d.setDate(d.getDate()+(i-currentIndex)*9);
      const status=i<currentIndex?'Completed':i===currentIndex?'In Progress':'Pending';
      addStage.run(u,stageNames[i],i+1,status,status==='Completed'?100:status==='In Progress'?50:0,d.toISOString().slice(0,10),status==='Completed'?today.toISOString().slice(0,10):null);
    }
  }
  const addUpdate=db.prepare('INSERT INTO updates(unit_id,author_id,title,note,photo,created_at) VALUES(?,?,?,?,?,?)');
  addUpdate.run(u1,manager1,'Electrical work update','Living room conduits and switch boxes completed. Next: testing and wall chasing.',null,new Date(Date.now()-86400000).toISOString());
  addUpdate.run(u1,manager1,'Site inspection','Bedroom electrical points checked against approved drawing.',null,new Date().toISOString());
  addUpdate.run(u2,manager1,'Plumbing progress','Bathroom pressure testing started. Kitchen plumbing is scheduled next.',null,new Date().toISOString());
  addUpdate.run(u3,manager1,'Cladding completed','External cladding completed as per bare-bone handover scope.',null,new Date(Date.now()-2*86400000).toISOString());
  const addCust=db.prepare('INSERT INTO customizations(unit_id,customer_id,title,details,status,impact_days,cost) VALUES(?,?,?,?,?,?,?)');
  addCust.run(u1,c1,'Warm-white lighting','Replace standard 4000K lights with warm-white fixtures in living room.', 'Approved',2,'₹18,500');
  addCust.run(u1,c1,'Extra wardrobe niche','Add a recessed niche in master bedroom wall.', 'Pending',3,'₹12,000');
  addCust.run(u2,c2,'Kitchen backsplash','Change backsplash tile to the selected premium finish.', 'In Review',4,'₹24,000');
  addCust.run(u5,c1,'Landscape package','Add low-maintenance front garden and pathway lights.', 'Pending',5,'₹35,000');
  const addIssue=db.prepare('INSERT INTO issues(project_id,unit_id,title,details,severity,status,impact_days) VALUES(?,?,?,?,?,?,?)');
  addIssue.run(p1,u2,'Tile shipment delay','Premium tiles are arriving later than planned.','High','Open',4);
  addIssue.run(p2,u5,'Rain impact','Exterior painting paused for weather protection.','Medium','Monitoring',3);
  const addTask=db.prepare('INSERT INTO tasks(unit_id,title,stage,assignee_id,status,due_date,notes) VALUES(?,?,?,?,?,?,?)');
  addTask.run(u1,'Electrical testing','Electrical',manager1,'In Progress','2026-09-03','Test all circuits and record readings.');
  addTask.run(u1,'Wall patching','Electrical',manager1,'To Do','2026-09-05','Patch approved chases after testing.');
  addTask.run(u2,'Bathroom pressure test','Plumbing',manager1,'In Progress','2026-09-04','Capture test result in site update.');
  addTask.run(u3,'Handover inspection','Cladding',manager1,'To Do','2026-09-06','Check scope against bare-bone checklist.');
  [c1,c2,c3].forEach((uid,i)=>db.prepare('INSERT INTO notifications(user_id,title,message) VALUES(?,?,?)').run(uid,'New construction update','Your BuildTrack project has a new site update.'));
}
seed();

function auth(req,res,next){ if(!req.session.user) return res.status(401).json({error:'Not signed in'}); next(); }
function role(...roles){return (req,res,next)=>roles.includes(req.session.user.role)?next():res.status(403).json({error:'Access denied'});}
function user(){return req.session.user;}
function stageEnd(pkg){return pkg==='Bare-Bone'?'Cladding':pkg==='Semi-Finished'?'Painting':'Final Inspection';}
function recalcETA(unitId){
  const u=db.prepare('SELECT * FROM units WHERE id=?').get(unitId); if(!u) return null;
  const custom=db.prepare("SELECT COALESCE(SUM(impact_days),0) d FROM customizations WHERE unit_id=? AND status IN ('Approved','In Progress')").get(unitId).d;
  const issues=db.prepare("SELECT COALESCE(SUM(impact_days),0) d FROM issues WHERE unit_id=? AND status IN ('Open','Monitoring')").get(unitId).d;
  const base=new Date(u.base_delivery); base.setDate(base.getDate()+custom+issues+u.delay_days);
  const eta=base.toISOString().slice(0,10);
  db.prepare('UPDATE units SET base_delivery=? WHERE id=?').run(eta,unitId);
  return eta;
}
function unitAccess(req,u){
  if(req.session.user.role==='admin') return true;
  if(req.session.user.role==='site_manager'){
    return !!db.prepare('SELECT 1 FROM projects WHERE id=? AND manager_id=?').get(u.project_id,req.session.user.id);
  }
  return u.customer_id===req.session.user.id;
}

// ---------- auth ----------
app.post('/api/login', (req,res)=>{
  const {email,password,expectedRole}=req.body;
  const u=db.prepare('SELECT id,name,email,password,role,phone FROM users WHERE email=? AND active=1').get(email);
  if(!u || !bcrypt.compareSync(password,u.password) || (expectedRole && u.role!==expectedRole)) return res.status(401).json({error:'Invalid login details for this portal.'});
  delete u.password; req.session.user=u; res.json({user:u});
});
app.post('/api/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/me',(req,res)=>res.json({user:req.session.user||null}));

// ---------- common ----------
app.get('/api/projects',auth,(req,res)=>{
  let rows=db.prepare(`SELECT p.*, u.name manager_name, (SELECT COUNT(*) FROM units x WHERE x.project_id=p.id) unit_count, (SELECT ROUND(AVG(x.progress)) FROM units x WHERE x.project_id=p.id) avg_progress FROM projects p LEFT JOIN users u ON u.id=p.manager_id ORDER BY p.id DESC`).all();
  if(req.session.user.role==='site_manager') rows=rows.filter(x=>x.manager_id===req.session.user.id);
  if(req.session.user.role==='customer') rows=rows.filter(x=>db.prepare('SELECT 1 FROM units WHERE project_id=? AND customer_id=?').get(x.id,req.session.user.id));
  res.json(rows);
});
app.get('/api/units',auth,(req,res)=>{
  let sql=`SELECT u.*,p.name project_name,p.type project_type,p.location,cu.name customer_name,cu.email customer_email,sm.name manager_name FROM units u JOIN projects p ON p.id=u.project_id LEFT JOIN users cu ON cu.id=u.customer_id LEFT JOIN users sm ON sm.id=p.manager_id ORDER BY p.id,u.code`;
  let rows=db.prepare(sql).all();
  if(req.session.user.role==='site_manager') rows=rows.filter(x=>x.manager_name && x.manager_name===req.session.user.name);
  if(req.session.user.role==='customer') rows=rows.filter(x=>x.customer_id===req.session.user.id);
  rows=rows.map(x=>({...x,eta:recalcETA(x.id),delivery_stage:stageEnd(x.package)}));
  res.json(rows);
});
app.get('/api/units/:id',auth,(req,res)=>{
  const u=db.prepare(`SELECT u.*,p.name project_name,p.type project_type,p.location,p.manager_id,cu.name customer_name,cu.email customer_email FROM units u JOIN projects p ON p.id=u.project_id LEFT JOIN users cu ON cu.id=u.customer_id WHERE u.id=?`).get(req.params.id);
  if(!u||!unitAccess(req,u)) return res.status(404).json({error:'Unit not found'});
  const stages=db.prepare('SELECT * FROM stages WHERE unit_id=? ORDER BY seq').all(u.id);
  const updates=db.prepare('SELECT x.*,usr.name author_name FROM updates x JOIN users usr ON usr.id=x.author_id WHERE x.unit_id=? ORDER BY datetime(x.created_at) DESC').all(u.id);
  const custom=db.prepare('SELECT c.*,usr.name customer_name FROM customizations c JOIN users usr ON usr.id=c.customer_id WHERE c.unit_id=? ORDER BY datetime(c.created_at) DESC').all(u.id);
  const tasks=db.prepare('SELECT t.*,usr.name assignee_name FROM tasks t LEFT JOIN users usr ON usr.id=t.assignee_id WHERE t.unit_id=? ORDER BY t.due_date').all(u.id);
  const issues=db.prepare('SELECT * FROM issues WHERE unit_id=? ORDER BY datetime(created_at) DESC').all(u.id);
  res.json({...u,eta:recalcETA(u.id),delivery_stage:stageEnd(u.package),stages,updates,custom,tasks,issues});
});
app.get('/api/dashboard',auth,(req,res)=>{
  const all=db.prepare('SELECT * FROM units').all();
  let units=all;
  if(req.session.user.role==='site_manager') units=all.filter(x=>db.prepare('SELECT manager_id FROM projects WHERE id=?').get(x.project_id)?.manager_id===req.session.user.id);
  if(req.session.user.role==='customer') units=all.filter(x=>x.customer_id===req.session.user.id);
  const projects=[...new Set(units.map(x=>x.project_id))];
  const issues=db.prepare("SELECT * FROM issues WHERE status IN ('Open','Monitoring')").all().filter(i=>units.some(u=>u.id===i.unit_id || (i.project_id&&projects.includes(i.project_id))));
  const updates=db.prepare('SELECT * FROM updates ORDER BY datetime(created_at) DESC LIMIT 8').all();
  const visibleUpdates=updates.filter(x=>units.some(u=>u.id===x.unit_id));
  res.json({stats:{projects:projects.length,units:units.length,inProgress:units.filter(x=>x.status==='Under Construction').length,ready:units.filter(x=>x.status==='Ready Soon').length,avg:units.length?Math.round(units.reduce((a,b)=>a+b.progress,0)/units.length):0,issues:issues.length},issues,updates:visibleUpdates});
});
app.get('/api/notifications',auth,(req,res)=>res.json(db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY datetime(created_at) DESC LIMIT 30').all(req.session.user.id)));
app.post('/api/notifications/:id/read',auth,(req,res)=>{db.prepare('UPDATE notifications SET read=1 WHERE id=? AND user_id=?').run(req.params.id,req.session.user.id);res.json({ok:true})});

// ---------- manager/admin operations ----------
app.post('/api/units/:id/stage',auth,role('admin','site_manager'),(req,res)=>{
  const u=db.prepare('SELECT * FROM units WHERE id=?').get(req.params.id); if(!u||!unitAccess(req,u)) return res.status(404).json({error:'Unit not found'});
  const {stage,status='In Progress'}=req.body; const s=db.prepare('SELECT * FROM stages WHERE unit_id=? AND name=?').get(u.id,stage); if(!s) return res.status(400).json({error:'Stage not found'});
  const seq=s.seq; const stages=db.prepare('SELECT * FROM stages WHERE unit_id=? ORDER BY seq').all(u.id); const end=stages.findIndex(x=>x.name===stage);
  stages.forEach((x,i)=>{let st=i<end?'Completed':i===end?status:'Pending';db.prepare('UPDATE stages SET status=?,percent=?,completed_date=? WHERE id=?').run(st,st==='Completed'?100:st==='In Progress'?50:0,st==='Completed'?new Date().toISOString().slice(0,10):null,x.id);});
  const pkgEnd=stageEnd(u.package); const progress=Math.min(100,Math.round(((end+1)/stages.filter(x=>x.name===pkgEnd)[0].seq)*100));
  const finalStatus=stage===pkgEnd?'Ready for Handover':'Under Construction';
  db.prepare('UPDATE units SET current_stage=?,progress=?,status=? WHERE id=?').run(stage,progress,finalStatus,u.id);
  if(u.customer_id) db.prepare('INSERT INTO notifications(user_id,title,message) VALUES(?,?,?)').run(u.customer_id,'Construction stage updated',`${u.code} is now at ${stage}. Progress: ${progress}%.`);
  res.json({ok:true});
});
app.post('/api/updates',auth,role('admin','site_manager'),upload.single('photo'),(req,res)=>{
  const {unit_id,title,note}=req.body; const u=db.prepare('SELECT * FROM units WHERE id=?').get(unit_id); if(!u||!unitAccess(req,u)) return res.status(404).json({error:'Unit not found'});
  const photo=req.file?'/uploads/'+req.file.filename:null;
  const id=db.prepare('INSERT INTO updates(unit_id,author_id,title,note,photo) VALUES(?,?,?,?,?)').run(unit_id,req.session.user.id,title||'Daily site update',note||'',photo).lastInsertRowid;
  if(u.customer_id) db.prepare('INSERT INTO notifications(user_id,title,message) VALUES(?,?,?)').run(u.customer_id,'New daily site update',`${u.code}: ${title||'A new construction update is available.'}`);
  res.json({id,photo});
});
app.post('/api/customizations',auth,role('admin','site_manager','customer'),(req,res)=>{
  const {unit_id,title,details,cost,impact_days=0}=req.body; const u=db.prepare('SELECT * FROM units WHERE id=?').get(unit_id); if(!u||!unitAccess(req,u)||!u.customer_id) return res.status(400).json({error:'You cannot add a customization for this unit.'});
  const cid=req.session.user.role==='customer'?req.session.user.id:u.customer_id;
  const id=db.prepare('INSERT INTO customizations(unit_id,customer_id,title,details,status,impact_days,cost) VALUES(?,?,?,?,?,?,?)').run(unit_id,cid,title,details||'','Pending',Number(impact_days)||0,cost||'').lastInsertRowId;
  if(req.session.user.role!=='customer') db.prepare('INSERT INTO notifications(user_id,title,message) VALUES(?,?,?)').run(cid,'New customization request',`A new change request was added for ${u.code}.`);
  res.json({id});
});
app.post('/api/customizations/:id/status',auth,role('admin','site_manager','customer'),(req,res)=>{
  const c=db.prepare('SELECT c.*,u.code FROM customizations c JOIN units u ON u.id=c.unit_id WHERE c.id=?').get(req.params.id); if(!c) return res.status(404).json({error:'Not found'});
  const u=db.prepare('SELECT * FROM units WHERE id=?').get(c.unit_id); if(!unitAccess(req,u)) return res.status(403).json({error:'Access denied'});
  const allowed=['Pending','In Review','Approved','Rejected','In Progress','Completed']; if(!allowed.includes(req.body.status)) return res.status(400).json({error:'Invalid status'});
  db.prepare('UPDATE customizations SET status=? WHERE id=?').run(req.body.status,c.id);
  if(c.customer_id!==req.session.user.id) db.prepare('INSERT INTO notifications(user_id,title,message) VALUES(?,?,?)').run(c.customer_id,'Customization status changed',`${c.title} for ${c.code} is now ${req.body.status}.`);
  recalcETA(u.id); res.json({ok:true});
});
app.post('/api/issues',auth,role('admin','site_manager'),(req,res)=>{
  const {project_id,unit_id,title,details,severity='Medium',impact_days=0}=req.body; const p=db.prepare('SELECT * FROM projects WHERE id=?').get(project_id); if(!p|| (req.session.user.role==='site_manager'&&p.manager_id!==req.session.user.id)) return res.status(403).json({error:'Access denied'});
  const id=db.prepare('INSERT INTO issues(project_id,unit_id,title,details,severity,status,impact_days) VALUES(?,?,?,?,?,?,?)').run(project_id,unit_id||null,title,details||'',severity,'Open',Number(impact_days)||0).lastInsertRowid;
  if(unit_id){const u=db.prepare('SELECT customer_id FROM units WHERE id=?').get(unit_id); if(u?.customer_id) db.prepare('INSERT INTO notifications(user_id,title,message) VALUES(?,?,?)').run(u.customer_id,'Project issue logged',`A ${severity.toLowerCase()} issue may affect your delivery timeline.`);}
  res.json({id});
});
app.post('/api/tasks/:id/status',auth,role('admin','site_manager'),(req,res)=>{const t=db.prepare('SELECT t.*,u.project_id,u.customer_id FROM tasks t JOIN units u ON u.id=t.unit_id WHERE t.id=?').get(req.params.id);if(!t)return res.status(404).json({error:'Not found'});if(req.session.user.role==='site_manager'&&!db.prepare('SELECT 1 FROM projects WHERE id=? AND manager_id=?').get(t.project_id,req.session.user.id))return res.status(403).json({error:'Access denied'});db.prepare('UPDATE tasks SET status=? WHERE id=?').run(req.body.status,t.id);if(t.customer_id)db.prepare('INSERT INTO notifications(user_id,title,message) VALUES(?,?,?)').run(t.customer_id,'Work task updated',`A site task for your home is now ${req.body.status}.`);res.json({ok:true});});

// Admin project creation
app.post('/api/projects',auth,role('admin'),(req,res)=>{const {name,type,location,start_date,target_date,manager_id}=req.body;const id=db.prepare('INSERT INTO projects(name,type,location,start_date,target_date,status,manager_id) VALUES(?,?,?,?,?,?,?)').run(name,type,location,start_date,target_date,'On Track',manager_id||null).lastInsertRowid;res.json({id});});
app.post('/api/units',auth,role('admin'),(req,res)=>{const {project_id,code,type,floor,customer_id,package:pkg,base_delivery}=req.body;const id=db.prepare('INSERT INTO units(project_id,code,type,floor,customer_id,package,progress,current_stage,base_delivery,status) VALUES(?,?,?,?,?,?,?,?,?,?)').run(project_id,code,type,floor||'',customer_id||null,pkg,0,'Foundation',base_delivery,'Under Construction').lastInsertRowid;const names=['Foundation','Structure','Walls','Cladding','Plumbing','Electrical','Painting','Flooring','Interiors','Final Inspection'];const st=db.prepare('INSERT INTO stages(unit_id,name,seq,status,percent) VALUES(?,?,?,?,?)');names.forEach((n,i)=>st.run(id,n,i+1,'Pending',0));res.json({id});});
app.get('/api/users',auth,role('admin'),(req,res)=>res.json(db.prepare('SELECT id,name,email,role,phone,active FROM users ORDER BY role,name').all()));
app.get('/api/issues',auth,role('admin','site_manager'),(req,res)=>{let rows=db.prepare(`SELECT i.*,p.name project_name,u.code unit_code FROM issues i JOIN projects p ON p.id=i.project_id LEFT JOIN units u ON u.id=i.unit_id ORDER BY datetime(i.created_at) DESC`).all();if(req.session.user.role==='site_manager')rows=rows.filter(x=>db.prepare('SELECT manager_id FROM projects WHERE id=?').get(x.project_id)?.manager_id===req.session.user.id);res.json(rows)});
app.get('/api/tasks',auth,role('admin','site_manager'),(req,res)=>{let rows=db.prepare(`SELECT t.*,u.code unit_code,p.name project_name,usr.name assignee_name FROM tasks t JOIN units u ON u.id=t.unit_id JOIN projects p ON p.id=u.project_id LEFT JOIN users usr ON usr.id=t.assignee_id ORDER BY t.due_date`).all();if(req.session.user.role==='site_manager')rows=rows.filter(x=>db.prepare('SELECT manager_id FROM projects WHERE id=?').get(x.project_id)?.manager_id===req.session.user.id);res.json(rows)});

app.get('/api/report',auth,role('admin'),(req,res)=>{
  const rows=db.prepare(`SELECT p.name project, p.type, COUNT(u.id) units, ROUND(AVG(u.progress)) avg_progress, SUM(CASE WHEN u.status='Ready for Handover' THEN 1 ELSE 0 END) ready, MIN(u.base_delivery) earliest_delivery, MAX(u.base_delivery) latest_delivery FROM projects p LEFT JOIN units u ON u.project_id=p.id GROUP BY p.id ORDER BY p.id`).all();res.json(rows);
});

app.get('*',(req,res)=>res.sendFile(path.join(root,'public','index.html')));
app.listen(PORT,()=>console.log(`BuildTrack running at http://localhost:${PORT}`));
