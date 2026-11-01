// Cloud sync shared by the two independent static study apps.
// Public project URL and publishable key; never use a service_role token in a browser.
const URL = 'https://oeblcfrygdrywdorengz.supabase.co';
const KEY = 'sb_publishable_3p2LCNY4f27D7mNn12bxtw_zPzgGfWD';
const AUTH_KEY = 'study-supabase-auth-v1';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const validObject = value => value && typeof value === 'object' && !Array.isArray(value);
function makeBackup(appId, state) {
  try {
    const key = 'study-backup:' + appId + ':' + new Date().toISOString() + ':' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(key, JSON.stringify(state));
    return true;
  } catch { return false; }
}
function parse(value) { try { return JSON.parse(value); } catch { return null; } }
export function startStudyCloud({ appId, localKey, getState, applyState, mount }) {
  const original = localStorage.getItem(localKey);
  let auth = parse(localStorage.getItem(AUTH_KEY));
  let revision = null, lastSynced = null, blocked = false, dirty = false, busy = false;
  let timer = null, generation = 0;
  const host = document.createElement('section');
  host.setAttribute('aria-label','Conta e sincronização de estudos');
  host.style.cssText = 'position:fixed;bottom:12px;left:12px;z-index:10000;max-width:min(360px,calc(100vw - 24px));background:#fff;color:#243e36;border:1px solid #b6cabc;border-radius:10px;box-shadow:0 4px 16px #0002;padding:12px;font:13px system-ui,sans-serif';
  host.innerHTML = '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><strong>☁ Progresso na nuvem</strong><span data-status role="status">Somente neste navegador</span></div><div data-controls style="margin-top:8px"></div>';
  (mount || document.body).appendChild(host);
  const status = host.querySelector('[data-status]');
  const controls = host.querySelector('[data-controls]');
  const msg = (s) => { status.textContent = s; };
  function button(label, fn) {
    const el = document.createElement('button');
    el.type='button'; el.textContent = label; el.onclick = fn;
    el.style.cssText='margin:3px;padding:7px 9px;border:1px solid #b6cabc;border-radius:6px;background:#edf1e7;color:#243e36;cursor:pointer';
    return el;
  }
  function clear() { controls.replaceChildren(); }
  function saveAuth(value) {
    auth = value;
    if (value) localStorage.setItem(AUTH_KEY, JSON.stringify(value));
    else localStorage.removeItem(AUTH_KEY);
  }
  async function request(path, { method='GET', data, token }={}) {
    const headers={apikey:KEY};
    if (data !== undefined) headers['Content-Type']='application/json';
    if (token) headers.Authorization='Bearer '+token;
    const response=await fetch(URL+path,{method,headers,body:data === undefined?undefined:JSON.stringify(data)});
    const body=await response.text();
    let result=parse(body);
    if (!response.ok) throw new Error((result && (result.msg||result.message||result.error_description||result.error)) || 'HTTP '+response.status);
    return result;
  }
  async function accessToken() {
    if (!auth) throw new Error('Entre na sua conta');
    if (auth.expires_at > Date.now()/1000+60) return auth.access_token;
    const renewed=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',data:{refresh_token:auth.refresh_token}});
    saveAuth({...renewed, expires_at:Math.floor(Date.now()/1000)+(renewed.expires_in||3600)});
    return auth.access_token;
  }
  async function cloudRead() {
    const token=await accessToken();
    const rows=await request('/rest/v1/study_progress?app_id=eq.'+encodeURIComponent(appId)+'&select=state,revision',{token});
    return rows?.[0] || null;
  }
  async function cloudWrite(state, expected) {
    const token=await accessToken();
    const result=await request('/rest/v1/rpc/save_study_progress',{method:'POST',token,data:{p_app_id:appId,p_state:state,p_expected_revision:expected}});
    return typeof result === 'number' ? result : null;
  }
  function signedOutUI() {
    clear();
    const email=document.createElement('input'), password=document.createElement('input');
    email.type='email';email.placeholder='E-mail'; email.autocomplete='email';
    password.type='password';password.placeholder='Senha';password.autocomplete='current-password';
    for(const el of [email,password]) { el.style.cssText='width:100%;box-sizing:border-box;margin:3px 0;padding:7px;border:1px solid #b6cabc;border-radius:5px';controls.appendChild(el); }
    const login=async(signUp)=>{
      if(!email.value||!password.value) {msg('Informe e-mail e senha');return;}
      msg('Autenticando…');
      try{
        const data=await request(signUp?'/auth/v1/signup':'/auth/v1/token?grant_type=password',{method:'POST',data:{email:email.value,password:password.value}});
        if(!data.access_token){msg('Verifique seu e-mail para confirmar a conta');return;}
        saveAuth({...data,expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600)});
        await initialize();
      }catch(e){msg('Erro: '+e.message);}
    };
    controls.append(button('Entrar',()=>login(false)),button('Criar conta',()=>login(true)));
  }
  function accountUI() {
    clear();
    controls.append(button('Sair da conta',()=>{
      // Never delete study progress when signing out.
      generation++;clearTimeout(timer);saveAuth(null);revision=null;lastSynced=null;blocked=false;dirty=false;msg('Somente neste navegador');signedOutUI();
    }));
  }
  function conflictUI(remote) {
    blocked=true;clearTimeout(timer);msg('Conflito: escolha a versão');
    accountUI();
    const note=document.createElement('p');note.textContent='Dados locais e da nuvem são diferentes. Nenhum será apagado sem sua escolha.';controls.appendChild(note);
    controls.append(button('Usar dados locais',async()=>{
      if(!makeBackup(appId,getState()) || !makeBackup(appId,remote.state)) {msg('Erro ao criar backup; operação cancelada');return;}
      blocked=false; revision=remote.revision;dirty=true;await push();
    }));
    controls.append(button('Usar dados da nuvem',()=>{
      if(!makeBackup(appId,getState())) {msg('Erro ao criar backup; operação cancelada');return;}
      generation++; clearTimeout(timer); blocked=false;dirty=false;revision=remote.revision;
      applyState(remote.state); // Each app must re-render after replacing its state.
      try{localStorage.setItem(localKey,JSON.stringify(remote.state));}
      catch{msg('Falha ao armazenar dados recuperados');return;}
      lastSynced=JSON.stringify(remote.state);msg('Sincronizado');accountUI();
    }));
  }
  async function push() {
    if (busy||blocked||!auth||revision===null||!navigator.onLine) {if(!navigator.onLine)msg('Offline · salvo localmente');return;}
    busy=true;let snapshot=JSON.stringify(getState());msg('Sincronizando…');
    const expected=revision, stamp=generation;
    try {
      const next=await cloudWrite(JSON.parse(snapshot), expected);
      if(stamp!==generation)return;
      if(next===null) {const remote=await cloudRead();if(remote)conflictUI(remote);return;}
      revision=next; lastSynced=snapshot;
      dirty=JSON.stringify(getState())!==snapshot;
      msg(dirty?'Alterações pendentes':'Sincronizado');
    } catch(e){dirty=true;msg('Erro de sincronização · salvo localmente');}
    finally{busy=false;if(dirty&&!blocked&&navigator.onLine&&auth){clearTimeout(timer);timer=setTimeout(push,1800);}}
  }
  function changed() {
    // Existing app code remains the source of truth for local persistence.
    if(!auth)return;
    dirty=true;
    if(blocked){msg('Conflito pendente · salvo localmente');return;}
    if(!navigator.onLine){msg('Offline · salvo localmente');return;}
    if(revision===null) return; // First load/reconciliation still in progress.
    msg('Salvo localmente');clearTimeout(timer);timer=setTimeout(push,900);
  }
  async function initialize() {
    if(!auth){signedOutUI();return;}
    generation++;const stamp=generation;revision=null;blocked=false;busy=false;clearTimeout(timer);
    accountUI();msg('Consultando nuvem…');
    try{
      const remote=await cloudRead();if(stamp!==generation)return;
      const local=getState(), localSnapshot=JSON.stringify(local);
      if(!remote){
        if(original!==null && !makeBackup(appId,parse(original))) {msg('Falha no backup local; migração suspensa');return;}
        const next=await cloudWrite(local,0);if(stamp!==generation)return;
        if(next===null){const fresh=await cloudRead();if(fresh)conflictUI(fresh);return;}
        revision=next;lastSynced=localSnapshot;
        dirty=JSON.stringify(getState())!==localSnapshot;
        msg('Sincronizado');if(dirty)changed();return;
      }
      if(original===null && !dirty) {
        if(!makeBackup(appId,local)) {msg('Falha no backup local');return;}
        applyState(remote.state);
        localStorage.setItem(localKey,JSON.stringify(remote.state));
        revision=remote.revision;lastSynced=JSON.stringify(remote.state);msg('Sincronizado');return;
      }
      if(localSnapshot===JSON.stringify(remote.state)) {
        revision=remote.revision;lastSynced=localSnapshot;msg('Sincronizado');return;
      }
      conflictUI(remote);
    }catch(e){msg('Erro de conexão · progresso local preservado');}
  }
  window.addEventListener('online',()=>{if(auth){if(revision===null)initialize();else if(dirty)push();}});
  window.addEventListener('offline',()=>{if(auth)msg('Offline · salvo localmente');});
  window.addEventListener('storage',e=>{if(e.key===AUTH_KEY){auth=parse(e.newValue);revision=null;initialize();}});
  if(!auth) signedOutUI();else initialize();
  return {changed};
}
