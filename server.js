const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const root = __dirname;
const dataFile = path.join(root, 'buildtrack-data.json');
const uploadDir = path.join(root, 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
app.use(express.json({limit:'2mb'}));
app.use(express.urlencoded({extended:true}));
app.use(session({secret: process.env.SESSION_SECRET || 'buildtrack-demo-secret-change-me', resave:false, saveUninitialized:false, cookie:{httpOnly:true, sameSite:'lax'}}));
app.use(express.static(path.join(root,'public')));
const upload = multer({storage:multer.diskStorage({destination:uploadDir, filename:(req,file,cb)=>cb(null, Date.now()+'-'+file.originalname.replace(/[^a-zA-Z0-9._-]/g,'_'))}), limits:{fileSize:8*1024*1024}});

const STAGES=['Foundation','Structure','Walls','Cladding','Plumbing','Electrical','Painting','Flooring','Interiors','Final Inspection'];
const END={'Bare-Bone':'Cladding','Semi-Finished':'Painting','Fully Finished':'Final Inspection'};
let nextId=1;
function id(){return nextId++;}
function iso(){return new Date().toISOString();}
function save(){fs.writeFileSync(dataFile, JSON.stringify(db,null,2));}
function find(table, n){return db[table].find(x=>x.id===Number(n));}
function userByEmail(email){return db.users.find(u=>u.email.toLowerCase()===String(email||'').toLowerCase() && u.active!==false);}
function projectForUnit(u){return find('projects',u.project_id);}
function customerForUnit(u){return find('users',u.customer_id);}
function managerForProject(p){return find('users',p && p.manager_id);}
function stageEnd(pkg){return END[pkg]||'Final Inspection';}
function recalcETA(u){
  const custom=db.customizations.filter(c=>c.unit_id===u.id && ['Approved','In Progress'].includes(c.status)).reduce((a,c)=>a+Number(c.impact_days||0),0);
  const issues=db.issues.filter(i=>i.unit_id===u.id && ['Open','Monitoring'].includes(i.status)).reduce((a,i)=>a+Number(i.impact_days||0),0);
  const base=new Date(u.base_delivery || iso()); base.setDate(base.getDate()+custom+issues+Number(u.delay_days||0));
  u.eta=base.toISOString().slice(0,10); return u.eta;
}
function unitAccess(req,u){
  if(!u) return false;
  const me=req.session.user;
  if(me.role==='admin') return true;
  if(me.role==='site_manager') return projectForUnit(u)?.manager_id===me.id;
  return u.customer_id===me.id;
}
function publicUser(u){if(!u)return null; const {password,...x}=u; return x;}
function notify(user_id,title,message){db.notifications.push({id:id(),user_id,title,message,read:0,created_at:iso()});save();}
function seed(){
  if(fs.existsSync(dataFile)){try{db=JSON.parse(fs.readFileSync(dataFile,'utf8'));nextId=Math.max(0,...Object.values(db).flatMap(a=>Array.isArray(a)?a.map(x=>Number(x.id)||0):[]))+1;return;}catch(e){}}
  const pass=bcrypt.hashSync('buildtrack',10);
  db={users:[],projects:[],units:[],stages:[],updates:[],customizations:[],issues:[],tasks:[],notifications:[]};
  const addUser=(name,email,role,phone)=>{const u={id:id(),name,email,password:pass,role,phone,active:true};db.users.push(u);return u.id;};
  const admin=addUser('Aarti Sharma','aarti@buildtrack.demo','admin','+91 90000 10001');
  const manager1=addUser('Arjun Rao','arjun@buildtrack.demo','site_manager','+91 90000 10002');
  const manager2=addUser('Meera Iyer','meera@buildtrack.demo','site_manager','+91 90000 10003');
  const c1=addUser('Rahul Verma','rahul@buildtrack.demo','customer','+91 90000 20001');
  const c2=addUser('Sneha Reddy','sneha@buildtrack.demo','customer','+91 90000 20002');
  const c3=addUser('Vikram Shah','vikram@buildtrack.demo','customer','+91 90000 20003');
  const addProject=(name,type,location,start,target,status,manager_id)=>{const p={id:id(),name,type,location,start_date:start,target_date:target,status,manager_id};db.projects.push(p);return p.id;};
  const p1=addProject('Green Valley Residences','Apartment Complex','Hyderabad','2026-04-01','2026-11-30','On Track',manager1);
  const p2=addProject('Lakeview Villas','Villa Community','Bengaluru','2026-05-15','2027-01-20','At Risk',manager2);
  const p3=addProject('Skyline Villaments','Villament','Pune','2026-06-01','2027-02-15','On Track',manager1);
  const addUnit=(project_id,code,type,floor,customer_id,pkg,progress,current_stage,base_delivery,status='Under Construction')=>{const u={id:id(),project_id,code,type,floor,customer_id,package:pkg,progress,current_stage,base_delivery,delay_days:0,status};db.units.push(u);STAGES.forEach((name,i)=>{const idx=STAGES.indexOf(current_stage);let st=i<idx?'Completed':i===idx?'In Progress':'Pending';db.stages.push({id:id(),unit_id:u.id,name,seq:i+1,status:st,percent:st==='Completed'?100:st==='In Progress'?50:0,planned_date:null,completed_date:st==='Completed'?new Date().toISOString().slice(0,10):null});});return u.id;};
  const u1=addUnit(p1,'A-101','Apartment','1',c1,'Semi-Finished',64,'Electrical','2026-09-25');
  const u2=addUnit(p1,'A-102','Apartment','1',c2,'Fully Finished',48,'Plumbing','2026-10-18');
  const u3=addUnit(p1,'B-204','Apartment','2',c3,'Bare-Bone',88,'Cladding','2026-09-08','Ready Soon');
  const u4=addUnit(p1,'B-205','Apartment','2',null,'Semi-Finished',35,'Walls','2026-11-05');
  const u5=addUnit(p2,'V-07','Villa','Ground',c1,'Fully Finished',71,'Painting','2026-12-15');
  const u6=addUnit(p2,'V-08','Villa','Ground',null,'Semi-Finished',55,'Plumbing','2027-01-05');
  const u7=addUnit(p3,'VM-12','Villament','3',c2,'Fully Finished',39,'Structure','2027-01-30');
  const u8=addUnit(p3,'VM-13','Villament','3',null,'Bare-Bone',92,'Cladding','2026-09-18','Ready Soon');
  const addUpdate=(unit_id,author_id,title,note,photo=null,days=0)=>db.updates.push({id:id(),unit_id,author_id,title,note,photo,created_at:new Date(Date.now()-days*86400000).toISOString()});
  addUpdate(u1,manager1,'Electrical work update','Living room conduits and switch boxes completed. Next: testing and wall chasing.',null,1);
  addUpdate(u1,manager1,'Site inspection','Bedroom electrical points checked against approved drawing.',null,0);
  addUpdate(u2,manager1,'Plumbing progress','Bathroom pressure testing started. Kitchen plumbing is scheduled next.',null,0);
  addUpdate(u3,manager1,'Cladding completed','External cladding completed as per bare-bone handover scope.',null,2);
  const addCust=(unit_id,customer_id,title,details,status,impact_days,cost)=>db.customizations.push({id:id(),unit_id,customer_id,title,details,status,impact_days,cost,created_at:iso()});
  addCust(u1,c1,'Warm-white lighting','Replace standard 4000K lights with warm-white fixtures in living room.','Approved',2,'₹18,500');
  addCust(u1,c1,'Extra wardrobe niche','Add a recessed niche in master bedroom wall.','Pending',3,'₹12,000');
  addCust(u2,c2,'Kitchen backsplash','Change backsplash tile to the selected premium finish.','In Review',4,'₹24,000');
  addCust(u5,c1,'Landscape package','Add low-maintenance front garden and pathway lights.','Pending',5,'₹35,000');
  db.issues.push({id:id(),project_id:p1,unit_id:u2,title:'Tile shipment delay',details:'Premium tiles are arriving later than planned.','severity':'High','status':'Open','impact_days':4,created_at:iso()});
  db.issues.push({id:id(),project_id:p2,unit_id:u5,title:'Rain impact',details:'Exterior painting paused for weather protection.','severity':'Medium','status':'Monitoring','impact_days':3,created_at:iso()});
  db.tasks.push({id:id(),unit_id:u1,title:'Electrical testing',stage:'Electrical',assignee_id:manager1,status:'In Progress',due_date:'2026-09-03',notes:'Test all circuits and record readings.'});
  db.tasks.push({id:id(),unit_id:u1,title:'Wall patching',stage:'Electrical',assignee_id:manager1,status:'To Do',due_date:'2026-09-05',notes:'Patch approved chases after testing.'});
  db.tasks.push({id:id(),unit_id:u2,title:'Bathroom pressure test',stage:'Plumbing',assignee_id:manager1,status:'In Progress',due_date:'2026-09-04',notes:'Capture test result in site update.'});
  db.tasks.push({id:id(),unit_id:u3,title:'Handover inspection',stage:'Cladding',assignee_id:manager1,status:'To Do',due_date:'2026-09-06',notes:'Check scope against bare-bone checklist.'});
  [c1,c2,c3].forEach(uid=>db.notifications.push({id:id(),user_id:uid,title:'New construction update',message:'Your BuildTrack project has a new site update.',read:0,created_at:iso()}));
  save();
}
let db; seed();

function auth(req,res,next){if(!req.session.user)return res.status(401).json({error:'Not signed in'});next();}
function role(...roles){return (req,res,next)=>roles.includes(req.session.user.role)?next():res.status(403).json({error:'Access denied'});}

app.post('/api/login',(req,res)=>{const {email,password,expectedRole}=req.body;const u=userByEmail(email);if(!u||!bcrypt.compareSync(password,u.password)||(expectedRole&&u.role!==expectedRole))return res.status(401).json({error:'Invalid login details for this portal.'});req.session.user=publicUser(u);res.json({user:req.session.user});});
app.post('/api/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/me',(req,res)=>res.json({user:req.session.user||null}));

app.get('/api/projects',auth,(req,res)=>{let rows=db.projects.map(p=>({...p,manager_name:managerForProject(p)?.name||'Unassigned',unit_count:db.units.filter(u=>u.project_id===p.id).length,avg_progress:Math.round((db.units.filter(u=>u.project_id===p.id).reduce((a,u)=>a+u.progress,0)/(db.units.filter(u=>u.project_id===p.id).length||1)))}));if(req.session.user.role==='site_manager')rows=rows.filter(x=>x.manager_id===req.session.user.id);if(req.session.user.role==='customer')rows=rows.filter(x=>db.units.some(u=>u.project_id===x.id&&u.customer_id===req.session.user.id));res.json(rows.sort((a,b)=>b.id-a.id));});
function unitRow(u){const p=projectForUnit(u),c=customerForUnit(u),m=managerForProject(p);return {...u,project_name:p?.name,project_type:p?.type,location:p?.location,customer_name:c?.name,customer_email:c?.email,manager_name:m?.name,eta:recalcETA(u),delivery_stage:stageEnd(u.package)};}
app.get('/api/units',auth,(req,res)=>{let rows=db.units.map(unitRow);if(req.session.user.role==='site_manager')rows=rows.filter(x=>x.manager_name===req.session.user.name);if(req.session.user.role==='customer')rows=rows.filter(x=>x.customer_id===req.session.user.id);save();res.json(rows.sort((a,b)=>a.project_id-b.project_id||a.code.localeCompare(b.code)));});
app.get('/api/units/:id',auth,(req,res)=>{const u=find('units',req.params.id);if(!u||!unitAccess(req,u))return res.status(404).json({error:'Unit not found'});const p=projectForUnit(u),c=customerForUnit(u);const stages=db.stages.filter(s=>s.unit_id===u.id).sort((a,b)=>a.seq-b.seq);const updates=db.updates.filter(x=>x.unit_id===u.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map(x=>({...x,author_name:find('users',x.author_id)?.name}));const custom=db.customizations.filter(x=>x.unit_id===u.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map(x=>({...x,customer_name:find('users',x.customer_id)?.name}));const tasks=db.tasks.filter(x=>x.unit_id===u.id).sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date))).map(x=>({...x,assignee_name:find('users',x.assignee_id)?.name}));const issues=db.issues.filter(x=>x.unit_id===u.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));res.json({...unitRow(u),manager_id:p?.manager_id,customer_name:c?.name,stages,updates,custom,tasks,issues});save();});
app.get('/api/dashboard',auth,(req,res)=>{let units=db.units;if(req.session.user.role==='site_manager')units=units.filter(u=>projectForUnit(u)?.manager_id===req.session.user.id);if(req.session.user.role==='customer')units=units.filter(u=>u.customer_id===req.session.user.id);const projects=[...new Set(units.map(u=>u.project_id))];const issues=db.issues.filter(i=>['Open','Monitoring'].includes(i.status)&&units.some(u=>u.id===i.unit_id||(i.project_id&&projects.includes(i.project_id))));const updates=db.updates.filter(x=>units.some(u=>u.id===x.unit_id)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,8).map(x=>({...x,author_name:find('users',x.author_id)?.name,unit_code:find('units',x.unit_id)?.code}));res.json({stats:{projects:projects.length,units:units.length,inProgress:units.filter(x=>x.status==='Under Construction').length,ready:units.filter(x=>['Ready Soon','Ready for Handover'].includes(x.status)).length,avg:units.length?Math.round(units.reduce((a,b)=>a+b.progress,0)/units.length):0,issues:issues.length},issues,updates});});
app.get('/api/notifications',auth,(req,res)=>res.json(db.notifications.filter(n=>n.user_id===req.session.user.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,30)));
app.post('/api/notifications/:id/read',auth,(req,res)=>{const n=find('notifications',req.params.id);if(n&&n.user_id===req.session.user.id)n.read=1;save();res.json({ok:true});});

app.post('/api/units/:id/stage',auth,role('admin','site_manager'),(req,res)=>{const u=find('units',req.params.id);if(!u||!unitAccess(req,u))return res.status(404).json({error:'Unit not found'});const s=db.stages.find(x=>x.unit_id===u.id&&x.name===req.body.stage);if(!s)return res.status(400).json({error:'Stage not found'});const stages=db.stages.filter(x=>x.unit_id===u.id).sort((a,b)=>a.seq-b.seq);const end=stages.findIndex(x=>x.name===s.name);stages.forEach((x,i)=>{x.status=i<end?'Completed':i===end?(req.body.status||'In Progress'):'Pending';x.percent=x.status==='Completed'?100:x.status==='In Progress'?50:0;x.completed_date=x.status==='Completed'?new Date().toISOString().slice(0,10):null;});const pkgEnd=stageEnd(u.package);const endIndex=stages.findIndex(x=>x.name===pkgEnd);u.current_stage=s.name;u.progress=Math.min(100,Math.round(((end+1)/(endIndex+1))*100));u.status=s.name===pkgEnd?'Ready for Handover':'Under Construction';if(u.customer_id)notify(u.customer_id,'Construction stage updated',`${u.code} is now at ${s.name}. Progress: ${u.progress}%.`);save();res.json({ok:true,eta:recalcETA(u)});});
app.post('/api/updates',auth,role('admin','site_manager'),upload.single('photo'),(req,res)=>{const u=find('units',req.body.unit_id);if(!u||!unitAccess(req,u))return res.status(404).json({error:'Unit not found'});const photo=req.file?'/uploads/'+req.file.filename:null;const up={id:id(),unit_id:u.id,author_id:req.session.user.id,title:req.body.title||'Daily site update',note:req.body.note||'',photo,created_at:iso()};db.updates.push(up);if(u.customer_id)notify(u.customer_id,'New daily site update',`${u.code}: ${up.title}`);save();res.json({id:up.id,photo});});
app.post('/api/customizations',auth,role('admin','site_manager','customer'),(req,res)=>{const u=find('units',req.body.unit_id);if(!u||!unitAccess(req,u)||!u.customer_id)return res.status(400).json({error:'You cannot add a customization for this unit.'});const cid=req.session.user.role==='customer'?req.session.user.id:u.customer_id;const c={id:id(),unit_id:u.id,customer_id:cid,title:req.body.title,details:req.body.details||'',status:'Pending',impact_days:Number(req.body.impact_days)||0,cost:req.body.cost||'',created_at:iso()};db.customizations.push(c);if(req.session.user.role!=='customer')notify(cid,'New customization request',`A new change request was added for ${u.code}.`);save();res.json({id:c.id});});
app.post('/api/customizations/:id/status',auth,role('admin','site_manager','customer'),(req,res)=>{const c=find('customizations',req.params.id);if(!c)return res.status(404).json({error:'Not found'});const u=find('units',c.unit_id);if(!unitAccess(req,u))return res.status(403).json({error:'Access denied'});const allowed=['Pending','In Review','Approved','Rejected','In Progress','Completed'];if(!allowed.includes(req.body.status))return res.status(400).json({error:'Invalid status'});c.status=req.body.status;if(c.customer_id!==req.session.user.id)notify(c.customer_id,'Customization status changed',`${c.title} for ${u.code} is now ${c.status}.`);recalcETA(u);save();res.json({ok:true,eta:u.eta});});
app.post('/api/issues',auth,role('admin','site_manager'),(req,res)=>{const p=find('projects',req.body.project_id);if(!p||(req.session.user.role==='site_manager'&&p.manager_id!==req.session.user.id))return res.status(403).json({error:'Access denied'});const issue={id:id(),project_id:p.id,unit_id:req.body.unit_id?Number(req.body.unit_id):null,title:req.body.title,details:req.body.details||'',severity:req.body.severity||'Medium',status:'Open',impact_days:Number(req.body.impact_days)||0,created_at:iso()};db.issues.push(issue);if(issue.unit_id){const u=find('units',issue.unit_id);if(u?.customer_id)notify(u.customer_id,'Project issue logged',`A ${issue.severity.toLowerCase()} issue may affect your delivery timeline.`);}save();res.json({id:issue.id});});
app.post('/api/tasks/:id/status',auth,role('admin','site_manager'),(req,res)=>{const t=find('tasks',req.params.id),u=t&&find('units',t.unit_id);if(!t)return res.status(404).json({error:'Not found'});if(req.session.user.role==='site_manager'&&!unitAccess(req,u))return res.status(403).json({error:'Access denied'});t.status=req.body.status;if(u?.customer_id)notify(u.customer_id,'Work task updated',`A site task for your home is now ${t.status}.`);save();res.json({ok:true});});
app.post('/api/projects',auth,role('admin'),(req,res)=>{const p={id:id(),name:req.body.name,type:req.body.type,location:req.body.location,start_date:req.body.start_date,target_date:req.body.target_date,status:'On Track',manager_id:req.body.manager_id?Number(req.body.manager_id):null};db.projects.push(p);save();res.json({id:p.id});});
app.post('/api/units',auth,role('admin'),(req,res)=>{const u={id:id(),project_id:Number(req.body.project_id),code:req.body.code,type:req.body.type,floor:req.body.floor||'',customer_id:req.body.customer_id?Number(req.body.customer_id):null,package:req.body.package,progress:0,current_stage:'Foundation',base_delivery:req.body.base_delivery,delay_days:0,status:'Under Construction'};db.units.push(u);STAGES.forEach((name,i)=>db.stages.push({id:id(),unit_id:u.id,name,seq:i+1,status:'Pending',percent:0}));save();res.json({id:u.id});});
app.get('/api/users',auth,role('admin'),(req,res)=>res.json(db.users.map(publicUser).sort((a,b)=>a.role.localeCompare(b.role)||a.name.localeCompare(b.name))));
app.get('/api/issues',auth,role('admin','site_manager'),(req,res)=>{let rows=db.issues.map(i=>({...i,project_name:find('projects',i.project_id)?.name,unit_code:find('units',i.unit_id)?.code})).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));if(req.session.user.role==='site_manager')rows=rows.filter(x=>find('projects',x.project_id)?.manager_id===req.session.user.id);res.json(rows);});
app.get('/api/tasks',auth,role('admin','site_manager'),(req,res)=>{let rows=db.tasks.map(t=>({...t,unit_code:find('units',t.unit_id)?.code,project_name:projectForUnit(find('units',t.unit_id))?.name,assignee_name:find('users',t.assignee_id)?.name})).sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)));if(req.session.user.role==='site_manager')rows=rows.filter(x=>unitAccess(req,find('units',x.unit_id)));res.json(rows);});
app.get('/api/report',auth,role('admin'),(req,res)=>res.json(db.projects.map(p=>{const us=db.units.filter(u=>u.project_id===p.id);return {project:p.name,type:p.type,units:us.length,avg_progress:us.length?Math.round(us.reduce((a,u)=>a+u.progress,0)/us.length):0,ready:us.filter(u=>['Ready Soon','Ready for Handover'].includes(u.status)).length,earliest_delivery:us.length?us.map(u=>recalcETA(u)).sort()[0]:null,latest_delivery:us.length?us.map(u=>recalcETA(u)).sort().slice(-1)[0]:null};})));
app.get('*',(req,res)=>res.sendFile(path.join(root,'public','index.html')));
app.listen(PORT,()=>console.log(`BuildTrack running at http://localhost:${PORT}`));
