import {activitySchema} from '../../lib/activity';
import {studentActivity,checkAnswer,isTeacher} from '../../lib/server-rules';

class AppError extends Error {constructor(message:string,public status=400){super(message);}}
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
type Env={FIREBASE_SERVICE_ACCOUNT_JSON?:string;GEMINI_API_KEY?:string;GEMINI_MODEL?:string};
type ServiceAccount={project_id:string;client_email:string;private_key:string;token_uri?:string};
type AuthUser={uid:string;sub:string;email?:string;name?:string;email_verified?:boolean;firebase:{sign_in_provider?:string;[key:string]:unknown};aud:string;iss:string;exp:number;iat:number;auth_time?:number;[key:string]:unknown};
type FsDoc={id:string;[key:string]:any};

function str(v:unknown,max=5000){if(typeof v!=='string'||!v.trim()||v.length>max)throw new AppError('Sila lengkapkan maklumat dengan betul.');return v.trim();}
function docId(v:unknown){const s=str(v,160);if(!/^[a-zA-Z0-9:_-]+$/.test(s))throw new AppError('ID tidak sah.');return s;}
function serviceAccount(env:Env):ServiceAccount{
 const raw=env.FIREBASE_SERVICE_ACCOUNT_JSON;
 if(!raw)throw new AppError('Firebase pelayan belum dikonfigurasi. Tambah FIREBASE_SERVICE_ACCOUNT_JSON dalam Cloudflare.',503);
 try{
  const j=JSON.parse(raw);
  if(!j.project_id||!j.client_email||!j.private_key)throw new Error('missing fields');
  return j as ServiceAccount;
 }catch{throw new AppError('Format FIREBASE_SERVICE_ACCOUNT_JSON tidak sah.',503);}
}

/* Firebase ID-token verification, Cloudflare-native Web Crypto */
let jwksCache:{keys:any[];expires:number}|null=null;
function b64urlBytes(input:string){const s=input.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(input.length/4)*4,'=');const bin=atob(s);const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;}
function parseJsonPart(part:string){return JSON.parse(new TextDecoder().decode(b64urlBytes(part)));}
async function googleJwks(){
 if(jwksCache&&jwksCache.expires>Date.now())return jwksCache.keys;
 const r=await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',{headers:{Accept:'application/json'}});
 if(!r.ok)throw new AppError('Tidak dapat mendapatkan kunci pengesahan Firebase. Cuba lagi.',503);
 const body:any=await r.json();const keys=Array.isArray(body.keys)?body.keys:[];
 if(!keys.length)throw new AppError('Kunci pengesahan Firebase tidak tersedia.',503);
 jwksCache={keys,expires:Date.now()+60*60*1000};return keys;
}
async function identity(req:Request,env:Env):Promise<AuthUser>{
 const bearer=req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
 if(!bearer)throw new AppError('Sila log masuk atau sertai sesi dahulu.',401);
 const parts=bearer.split('.');if(parts.length!==3)throw new AppError('Sesi log masuk tidak sah (token-format). Log masuk semula.',401);
 try{
  const header:any=parseJsonPart(parts[0]),payload:any=parseJsonPart(parts[1]);
  if(header.alg!=='RS256'||!header.kid)throw new Error('header');
  const projectId=serviceAccount(env).project_id;const now=Math.floor(Date.now()/1000),skew=60;
  if(payload.aud!==projectId||payload.iss!==`https://securetoken.google.com/${projectId}`)throw new Error('project');
  if(typeof payload.sub!=='string'||!payload.sub||payload.sub.length>128)throw new Error('subject');
  if(typeof payload.exp!=='number'||payload.exp<now-skew)throw new Error('expired');
  if(typeof payload.iat!=='number'||payload.iat>now+skew)throw new Error('issued');
  if(typeof payload.auth_time==='number'&&payload.auth_time>now+skew)throw new Error('auth-time');
  const keys=await googleJwks();const jwk=keys.find((k:any)=>k.kid===header.kid);if(!jwk)throw new Error('kid');
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const ok=await crypto.subtle.verify({name:'RSASSA-PKCS1-v1_5'},key,b64urlBytes(parts[2]),new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if(!ok)throw new Error('signature');return {...payload,uid:payload.sub} as AuthUser;
 }catch(e:any){console.error('Firebase JWT verification failed',e?.message||e);throw new AppError(`Sesi log masuk tidak sah (${e?.message||'token-error'}). Log masuk semula.`,401);}
}
function teacher(user:AuthUser){if(!isTeacher(user as any))throw new AppError('Log masuk sebagai guru menggunakan akaun Google atau e-mel yang telah disahkan.',403);}

/* Firestore REST client for Cloudflare Workers. No firebase-admin/firestore runtime. */
let oauthCache:{token:string;expires:number}|null=null;
function base64Url(input:Uint8Array|string){
 const bytes=typeof input==='string'?new TextEncoder().encode(input):input;let s='';for(const b of bytes)s+=String.fromCharCode(b);
 return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function pemPkcs8(pem:string){const clean=pem.replace(/-----BEGIN PRIVATE KEY-----/g,'').replace(/-----END PRIVATE KEY-----/g,'').replace(/\s+/g,'');const bin=atob(clean);const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;}
async function googleAccessToken(env:Env){
 if(oauthCache&&oauthCache.expires>Date.now()+60_000)return oauthCache.token;
 const sa=serviceAccount(env);const now=Math.floor(Date.now()/1000);
 const header=base64Url(JSON.stringify({alg:'RS256',typ:'JWT'}));
 const claims=base64Url(JSON.stringify({iss:sa.client_email,scope:'https://www.googleapis.com/auth/datastore',aud:sa.token_uri||'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}));
 const signingInput=`${header}.${claims}`;
 let key:CryptoKey;
 try{key=await crypto.subtle.importKey('pkcs8',pemPkcs8(sa.private_key),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);}
 catch{throw new AppError('Private key Firebase tidak dapat dibaca oleh Cloudflare. Jana semula service account key dan kemas kini FIREBASE_SERVICE_ACCOUNT_JSON.',503);}
 const signature=new Uint8Array(await crypto.subtle.sign({name:'RSASSA-PKCS1-v1_5'},key,new TextEncoder().encode(signingInput)));
 const assertion=`${signingInput}.${base64Url(signature)}`;
 const r=await fetch(sa.token_uri||'https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
 const body:any=await r.json().catch(()=>({}));
 if(!r.ok||!body.access_token)throw new AppError(`Firebase service account gagal mendapatkan akses Firestore (${body.error||r.status}).`,503);
 oauthCache={token:String(body.access_token),expires:Date.now()+(Number(body.expires_in||3600)*1000)};return oauthCache.token;
}
function fsBase(env:Env){return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(serviceAccount(env).project_id)}/databases/(default)/documents`;}
function fsValue(v:any):any{
 if(v===null||v===undefined)return {nullValue:null};
 if(typeof v==='string')return {stringValue:v};
 if(typeof v==='boolean')return {booleanValue:v};
 if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};
 if(Array.isArray(v))return {arrayValue:{values:v.map(fsValue)}};
 if(typeof v==='object'){const fields:any={};for(const [k,x] of Object.entries(v))fields[k]=fsValue(x);return {mapValue:{fields}};}
 return {stringValue:String(v)};
}
function fsFields(obj:any){const fields:any={};for(const [k,v] of Object.entries(obj||{}))fields[k]=fsValue(v);return fields;}
function fromFs(v:any):any{
 if(!v||typeof v!=='object')return null;
 if('nullValue'in v)return null;if('stringValue'in v)return v.stringValue;if('booleanValue'in v)return !!v.booleanValue;
 if('integerValue'in v)return Number(v.integerValue);if('doubleValue'in v)return Number(v.doubleValue);if('timestampValue'in v)return v.timestampValue;
 if('arrayValue'in v)return (v.arrayValue?.values||[]).map(fromFs);
 if('mapValue'in v){const o:any={};for(const [k,x] of Object.entries(v.mapValue?.fields||{}))o[k]=fromFs(x);return o;}
 return null;
}
function decodeDoc(doc:any):FsDoc{const o:any={};for(const [k,v] of Object.entries(doc?.fields||{}))o[k]=fromFs(v);return {id:String(doc?.name||'').split('/').pop()||'',...o};}
async function fsFetch(env:Env,url:string,init:RequestInit={}){
 const token=await googleAccessToken(env);const headers=new Headers(init.headers||{});headers.set('Authorization',`Bearer ${token}`);headers.set('Accept','application/json');if(init.body)headers.set('Content-Type','application/json');
 const r=await fetch(url,{...init,headers});if(r.status===404)return {ok:false,status:404,body:null as any};const body:any=await r.json().catch(()=>({}));
 if(!r.ok){const msg=body?.error?.message||body?.error?.status||`HTTP ${r.status}`;const status=r.status===403?403:r.status===401?401:r.status===409?409:r.status===404?404:500;throw new AppError(`Firestore REST: ${msg}`,status);}
 return {ok:true,status:r.status,body};
}
async function fsGet(env:Env,col:string,id:string):Promise<FsDoc|null>{const r=await fsFetch(env,`${fsBase(env)}/${encodeURIComponent(col)}/${encodeURIComponent(id)}`);return r.ok?decodeDoc(r.body):null;}
async function fsSet(env:Env,col:string,id:string,data:any){const url=`${fsBase(env)}/${encodeURIComponent(col)}/${encodeURIComponent(id)}`;await fsFetch(env,url,{method:'PATCH',body:JSON.stringify({fields:fsFields(data)})});return id;}
async function fsUpdate(env:Env,col:string,id:string,data:any){const qs=new URLSearchParams();for(const k of Object.keys(data))qs.append('updateMask.fieldPaths',k);const url=`${fsBase(env)}/${encodeURIComponent(col)}/${encodeURIComponent(id)}?${qs}`;await fsFetch(env,url,{method:'PATCH',body:JSON.stringify({fields:fsFields(data)})});}
async function fsCreate(env:Env,col:string,id:string,data:any){const url=`${fsBase(env)}/${encodeURIComponent(col)}?documentId=${encodeURIComponent(id)}`;const r=await fsFetch(env,url,{method:'POST',body:JSON.stringify({fields:fsFields(data)})});return decodeDoc(r.body);}
async function fsQuery(env:Env,col:string,field:string,value:any):Promise<FsDoc[]>{
 const body={structuredQuery:{from:[{collectionId:col}],where:{fieldFilter:{field:{fieldPath:field},op:'EQUAL',value:fsValue(value)}}}};
 const r=await fsFetch(env,`${fsBase(env)}:runQuery`,{method:'POST',body:JSON.stringify(body)});return (Array.isArray(r.body)?r.body:[]).filter((x:any)=>x.document).map((x:any)=>decodeDoc(x.document));
}
async function sha256Hex(s:string){const h=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));return [...h].map(x=>x.toString(16).padStart(2,'0')).join('');}
function sessionCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const bytes=new Uint8Array(6);crypto.getRandomValues(bytes);return Array.from(bytes,x=>chars[x%chars.length]).join('');}
async function ownedSession(env:Env,sid:unknown,uid:string){const id=docId(sid),data=await fsGet(env,'sessions',id);if(!data||data.owner!==uid)throw new AppError('Sesi tidak ditemui.',404);return {id,data};}
async function participation(env:Env,uid:string){const m=await fsGet(env,'memberships',uid);if(!m)throw new AppError('Sila sertai sesi dahulu.',404);const p=await fsGet(env,'pupils',m.pupilId);if(!p||p.uid!==uid)throw new AppError('Penyertaan tidak sah.',403);const s=await fsGet(env,'sessions',p.session_id);if(!s)throw new AppError('Sesi tidak ditemui.',404);return {p,s};}
async function pupilResponses(env:Env,pid:string){return fsQuery(env,'responses','pupil_id',pid);}

async function handler(req:Request,env:Env):Promise<Response>{
 try{
  const url=new URL(req.url);const op=url.searchParams.get('op');
  if(!['GET','POST'].includes(req.method))return json({error:'Kaedah tidak dibenarkan.'},405);
  if(req.method==='GET'&&op==='me'&&!req.headers.get('authorization'))return json({user:null,ai:!!env.GEMINI_API_KEY});
  const user=await identity(req,env);const now=new Date().toISOString();
  if(req.method==='GET'){
   if(op==='me'){if(user.firebase.sign_in_provider==='anonymous')return json({user:null,ai:!!env.GEMINI_API_KEY});teacher(user);return json({user:{name:user.name||'Cikgu',email:user.email},ai:!!env.GEMINI_API_KEY});}
   if(op==='restore'||op==='progress'){const {p,s}=await participation(env,user.uid);const responses=await pupilResponses(env,p.id);if(op==='progress')return json({status:s.status,responses});return json({pupil:{id:p.id,nickname:p.nickname,avatar:JSON.parse(p.avatar)},session:{id:s.id,title:s.title,status:s.status,sequential:s.sequential},activity:studentActivity(s.activity),responses});}
   teacher(user);
   if(op==='responses'){const {id}=await ownedSession(env,url.searchParams.get('session'),user.uid);const [pupilsRaw,responsesRaw]=await Promise.all([fsQuery(env,'pupils','session_id',id),fsQuery(env,'responses','session_id',id)]);const pupils=pupilsRaw.map(p=>({id:p.id,nickname:p.nickname,avatar:p.avatar,created:p.created}));const names=new Map(pupils.map(p=>[p.id,p.nickname]));const responses=responsesRaw.map(r=>({...r,nickname:names.get(r.pupil_id)||'Murid'}));return json({pupils,responses,updated:now});}
   const [activities,sessionsRaw]=await Promise.all([fsQuery(env,'activities','owner',user.uid),fsQuery(env,'sessions','owner',user.uid)]);const sessions=sessionsRaw.map(({activity,...s})=>({...s,count:s.count||0}));const newest=(a:any,b:any)=>String(b.created||'').localeCompare(String(a.created||''));return json({activities:activities.sort(newest),sessions:sessions.sort(newest)});
  }
  const origin=req.headers.get('origin');if(origin&&origin!==url.origin)throw new AppError('Permintaan tidak dibenarkan.',403);
  if(Number(req.headers.get('content-length')||0)>65000)throw new AppError('Kandungan terlalu panjang.',413);
  const raw=await req.text();if(raw.length>65000)throw new AppError('Kandungan terlalu panjang.',413);let b:any;try{b=JSON.parse(raw);}catch{throw new AppError('Permintaan tidak sah.');}
  if(b.op==='join'){
   const code=str(b.code,6).toUpperCase();if(!/^[A-Z2-9]{6}$/.test(code))throw new AppError('Semak kod sesi enam aksara.');const nickname=str(b.nickname,24);const avatar=JSON.stringify(b.avatar||{});if(avatar.length>1000)throw new AppError('Avatar tidak sah.');
   const s=await fsGet(env,'sessions',code);if(!s||s.status!=='Aktif')throw new AppError('Kod tidak sah, atau sesi belum bermula / telah tamat. Semak dengan cikgu.',404);
   const pid=await sha256Hex(user.uid+':'+code);const prev=await fsGet(env,'pupils',pid);
   await fsSet(env,'pupils',pid,{uid:user.uid,session_id:code,nickname,avatar,created:prev?.created||now});
   await fsSet(env,'memberships',user.uid,{pupilId:pid});
   if(!prev)await fsUpdate(env,'sessions',code,{count:(Number(s.count)||0)+1});
   return json({pupil:{id:pid,nickname,avatar:b.avatar},session:{id:code,title:s.title,status:s.status,sequential:s.sequential},activity:studentActivity(s.activity)});
  }
  if(b.op==='answer'){
   const {p,s}=await participation(env,user.uid);const station=Number(b.station),qi=Number(b.question);const answer=str(b.answer,3000);const mode=['teks','suara','kad idea','gerakan','pilihan'].includes(b.mode)?b.mode:'teks';let evaluated;try{evaluated=checkAnswer(s.activity,station,qi,answer);}catch(e){throw new AppError((e as Error).message);}
   const current=await fsGet(env,'sessions',s.id);if(!current||current.status!=='Aktif')throw new AppError('Sesi telah tamat. Jawapan ini belum disimpan. Hubungi cikgu.');
   if(current.sequential&&station>1){const needed=station-1<3?3:1;const previous=await Promise.all(Array.from({length:needed},(_,i)=>fsGet(env,'responses',`${p.id}:${station-1}:${i}`)));if(previous.some(x=>!x))throw new AppError('Lengkapkan stesen sebelumnya dahulu.');}
   const rid=`${p.id}:${station}:${qi}`;await fsSet(env,'responses',rid,{pupil_id:p.id,session_id:s.id,station,question:qi,answer,mode,score:evaluated.score,feedback:evaluated.feedback,final_score:null,review:'Perlu semakan guru',created:now});return json({saved:true,id:rid,...evaluated});
  }
  teacher(user);
  if(b.op==='save'){
   const activity=activitySchema.parse(b.activity),aid=b.id?docId(b.id):crypto.randomUUID(),status=b.approved?'Diluluskan':'Draf';const prev=await fsGet(env,'activities',aid);if(b.id&&(!prev||prev.owner!==user.uid))throw new AppError('Aktiviti tidak ditemui.',404);await fsSet(env,'activities',aid,{owner:user.uid,body:activity,status,created:prev?.created||now});return json({id:aid,status});
  }
  if(b.op==='session'){
   const a=await fsGet(env,'activities',docId(b.activityId));if(!a||a.owner!==user.uid||a.status!=='Diluluskan')throw new AppError('Luluskan aktiviti sebelum mencipta sesi.');
   for(let attempt=0;attempt<5;attempt++){const code=sessionCode();try{await fsCreate(env,'sessions',code,{owner:user.uid,code,title:a.body.title,activity:a.body,status:b.status==='Belum Bermula'?'Belum Bermula':'Aktif',sequential:b.sequential===false?0:1,count:0,created:now});return json({id:code,code});}catch(e:any){if(e instanceof AppError&&e.status===409)continue;throw e;}}
   throw new AppError('Tidak dapat mencipta kod unik. Cuba lagi.',503);
  }
  if(b.op==='status'){const {id}=await ownedSession(env,b.id,user.uid);if(!['Aktif','Belum Bermula','Tamat'].includes(b.status))throw new AppError('Status tidak sah.');await fsUpdate(env,'sessions',id,{status:b.status});return json({saved:true});}
  if(b.op==='review'){const id=docId(b.id),r=await fsGet(env,'responses',id);if(!r)throw new AppError('Jawapan tidak ditemui.',404);await ownedSession(env,r.session_id,user.uid);const score=Number(b.score);if(!Number.isInteger(score)||score<0||score>1)throw new AppError('Markah mesti 0 atau 1.');await fsUpdate(env,'responses',id,{final_score:score,review:'Disahkan guru',feedback:String(b.feedback||'Telah disemak oleh cikgu.').slice(0,1000)});return json({saved:true});}
  if(b.op==='generate'){
   if(!env.GEMINI_API_KEY)throw new AppError('Penjana Gemini belum disambungkan. Tambah GEMINI_API_KEY dalam Cloudflare dan deploy semula.',503);
   const input=activitySchema.parse(b.activity);
   const system='Anda pembina draf aktiviti Bahasa Melayu inklusif sekolah rendah Malaysia. Hasilkan JSON sahaja dengan semua keys dan jenis data seperti input. Ikuti tema title, year, skill, difficulty, sk, sp, supports dan emk yang diberi guru. Tulis kandungan baharu yang sesuai untuk murid Tahun 2 atau Tahun 3. questions mesti tepat 3 soalan berdasarkan audio. moves mesti tepat 3 aktiviti pilihan untuk Stesen 2. Setiap soalan mengandungi question, options tepat 3 string, answer sebagai indeks 0 hingga 2, dan feedback ringkas. Sertakan objektif yang boleh diukur, note, audio pendek dan mudah didengar, speaking bercapah, ideas 3 contoh, frame, examples dan assessment. Gunakan Bahasa Melayu Malaysia yang mudah dan natural. Jangan nilai loghat, kelajuan atau kelantangan murid. Kandungan ialah draf dan mesti disemak guru sebelum diluluskan.';
   const model=env.GEMINI_MODEL||'gemini-2.5-flash-lite';
   const prompt=`${system}\n\nMaklumat dan draf semasa daripada guru:\n${JSON.stringify(input)}`;
   let r:Response|undefined;
   for(let attempt=0;attempt<2;attempt++){
    r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
     method:'POST',signal:AbortSignal.timeout(30000),
     headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},
     body:JSON.stringify({
      contents:[{role:'user',parts:[{text:prompt}]}],
      generationConfig:{responseMimeType:'application/json',temperature:0.7,maxOutputTokens:8192}
     })
    });
    if(r.status<500||attempt===1)break;
    await new Promise(resolve=>setTimeout(resolve,1000+Math.floor(Math.random()*500)));
   }
   if(!r?.ok){
    const status=r?.status||502;let detail='';
    try{const err:any=await r?.json();detail=String(err?.error?.message||err?.error?.status||'').slice(0,180);}catch{}
    console.error('Gemini API request rejected',status,detail);
    if(status===400)throw new AppError(`Gemini menolak permintaan. ${detail||'Semak format input atau model.'}`,502);
    if(status===401||status===403)throw new AppError('Gemini menolak API key. Semak GEMINI_API_KEY dalam Cloudflare.',502);
    if(status===404)throw new AppError('Model Gemini tidak ditemui. Semak GEMINI_MODEL dalam Cloudflare.',502);
    if(status===429)throw new AppError('Had atau kuota Gemini dicapai. Tunggu sebentar dan cuba lagi, atau semak kuota projek Google AI Studio.',502);
    if(status>=500)throw new AppError(`Pelayan Gemini sedang bermasalah (${status}). Sistem sudah cuba semula sekali; cuba lagi kemudian.`,502);
    throw new AppError(`Gemini API membalas ralat ${status}${detail?': '+detail:''}.`,502);
   }
   const data:any=await r.json();
   const text=(data?.candidates?.[0]?.content?.parts||[]).map((p:any)=>p?.text||'').join('').trim();
   if(!text){
    const reason=String(data?.candidates?.[0]?.finishReason||data?.promptFeedback?.blockReason||'').slice(0,100);
    throw new AppError(`Gemini tidak memulangkan draf${reason?` (${reason})`:''}. Cuba jana semula.`,502);
   }
   let generated:any;
   try{generated=JSON.parse(text);}catch{throw new AppError('Gemini memulangkan format yang tidak dapat dibaca. Cuba jana semula.',502);}
   try{return json({activity:activitySchema.parse(generated)});}catch(e:any){console.error('Gemini activity validation failed',e?.message||e);throw new AppError('Draf Gemini tidak lengkap atau format aktiviti tidak tepat. Cuba jana semula.',502);}
  }
  throw new AppError('Tindakan tidak sah.');
 }catch(e:any){
  if(e instanceof AppError)return json({error:e.message},e.status);
  if(e?.name==='ZodError')return json({error:'Semak semua medan aktiviti dan tiga soalan bagi setiap stesen.'},400);
  console.error('skuad function failed',e?.name||'unknown',e?.message||'');return json({error:`Operasi backend gagal: ${String(e?.message||'Ralat tidak diketahui.').slice(0,220)}`},500);
 }
}

export const onRequest=async(context:{request:Request;env:Env})=>handler(context.request,context.env);
