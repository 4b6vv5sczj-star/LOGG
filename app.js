const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const I={en:{heroSub:'Speech becomes clarity. Audio never becomes a recording.',newLogg:'Start Meeting LOGG',saved:'Saved meetings',savedKicker:'ARCHIVE',meeting:'MEETING',started:'STARTED',privacy:'Audio is processed live for transcription and is not retained by LOGG.',meetingName:'Meeting name',outputLanguage:'Output language',listening:'Listening',consent:'I have informed participants that LOGG listens to create notes. LOGG does not retain an audio recording.',start:'Begin LOGG',cancelStart:'Cancel',recent:'Recent LOGGs',clear:'Clear',listeningNow:'LISTENING · AUDIO IS NOT SAVED',liveNotes:'Live notes',pause:'Pause',resume:'Resume',finish:'Finish LOGG',completed:'COMPLETED LOGG',copy:'Copy',word:'Export Word',transcriptPlaceholder:'Your live transcript will appear here. You can type or correct text at any time.',empty:'No LOGGs yet.',nameRequired:'Add a meeting name and confirm participant notice.',copied:'Copied',summary:'Summary',decisions:'Decisions',actions:'Actions',questions:'Open Questions',notes:'Meeting Notes',ready:'Ready',unsupported:'Speech recognition is not available in this browser. You can still type notes live.',paused:'Paused',listeningStatus:'Listening'},sv:{heroSub:'Tal blir tydlighet. Ljudet blir aldrig en inspelning.',newLogg:'Starta mötes-LOGG',saved:'Sparade möten',savedKicker:'ARKIV',meeting:'MÖTE',started:'STARTAD',privacy:'Ljud bearbetas live för transkribering och sparas inte av LOGG.',meetingName:'Mötesnamn',outputLanguage:'Output-språk',listening:'Lyssning',consent:'Jag har informerat deltagarna om att LOGG lyssnar för att skapa anteckningar. LOGG sparar ingen ljudinspelning.',start:'Starta LOGG',cancelStart:'Avbryt',recent:'Senaste LOGGar',clear:'Rensa',listeningNow:'LYSSNAR · LJUD SPARAS INTE',liveNotes:'Live-anteckningar',pause:'Pausa',resume:'Fortsätt',finish:'Avsluta LOGG',completed:'AVSLUTAD LOGG',copy:'Kopiera',word:'Exportera Word',transcriptPlaceholder:'Din live-transkribering visas här. Du kan skriva eller korrigera text när som helst.',empty:'Inga LOGGar ännu.',nameRequired:'Fyll i mötesnamn och bekräfta att deltagarna informerats.',copied:'Kopierat',summary:'Sammanfattning',decisions:'Beslut',actions:'Åtgärder',questions:'Öppna frågor',notes:'Mötesanteckningar',ready:'Klar',unsupported:'Taligenkänning stöds inte i denna webbläsare. Du kan fortfarande skriva anteckningar live.',paused:'Pausad',listeningStatus:'Lyssnar'}};
let ui=localStorage.loggUi||'en', current=null, tick=null, recognition=null, paused=false, finalText='';
let loggAuth=null, loggUser=null;
function updateAuthUI(){const b=$('#authBtn');if(!b)return;b.textContent=loggUser?(loggUser.email||'SIGNED IN').split('@')[0].slice(0,12).toUpperCase():'SIGN IN';b.classList.toggle('signed-in',!!loggUser);const msg=$('#authMessage'),out=$('#googleSignOut'),inn=$('#googleSignIn');if(msg)msg.textContent=loggUser?`Signed in as ${loggUser.email||loggUser.displayName||'Google user'}. Cloud speech requests are authenticated.`:'Sign in with an authorized Google account before using cloud speech.';if(out)out.hidden=!loggUser;if(inn)inn.hidden=!!loggUser;}
function openAuth(){const s=$('#authSheet');if(s)s.hidden=false;updateAuthUI()}
function closeAuth(){const s=$('#authSheet');if(s)s.hidden=true}
async function requireLoggUser(){if(loggUser)return true;openAuth();return false}
async function authHeaders(){if(!loggAuth?.currentUser)throw new Error(ui==='sv'?'LOGG kräver inloggning':'LOGG sign-in required');const token=await loggAuth.currentUser.getIdToken();return {Authorization:'Bearer '+token};}
function setAuthStatus(text='',isError=false){const el=$('#authStatus');if(!el)return;el.textContent=text;el.classList.toggle('auth-error',!!isError);el.hidden=!text;}
function authErrorText(e){const code=e?.code||'auth/unknown-error';const msg=e?.message||'';return `${code}${msg?` · ${msg.replace(/^Firebase:\s*/,'').slice(0,180)}`:''}`;}
async function initLoggAuth(){try{
  if(!window.firebase||!window.LOGG_CONFIG?.FIREBASE){setAuthStatus('Firebase Auth unavailable',true);return;}
  if(!firebase.apps.length)firebase.initializeApp(window.LOGG_CONFIG.FIREBASE);
  loggAuth=firebase.auth(); loggAuth.useDeviceLanguage();
  try{await loggAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);setAuthStatus('');}catch(e){setAuthStatus('Session persistence · '+authErrorText(e),true);}

  // Firebase Hosting and Firebase Auth now share the same Firebase project/domain context.
  // Complete a pending Google redirect before relying on auth state for the UI.
  try{
    const redirectResult=await loggAuth.getRedirectResult();
    if(redirectResult?.user){loggUser=redirectResult.user;setAuthStatus('Signed in securely.');setTimeout(closeAuth,450);}
  }catch(e){console.error('LOGG redirect result',e);setAuthStatus('Google redirect · '+authErrorText(e),true);}

  loggAuth.onAuthStateChanged(u=>{loggUser=u||null;updateAuthUI();if(u){setAuthStatus('Signed in securely.');setTimeout(closeAuth,450);}});
  $('#authBtn')?.addEventListener('click',openAuth); $('#closeAuth')?.addEventListener('click',closeAuth);
  $('#authSheet')?.addEventListener('click',e=>{if(e.target.id==='authSheet')closeAuth()});
  $('#googleSignIn')?.addEventListener('click',async()=>{
    const btn=$('#googleSignIn'); if(btn?.disabled)return;
    try{
      if(btn){btn.disabled=true;btn.textContent='Opening Google…';}
      setAuthStatus('Opening Google sign-in…');
      const provider=new firebase.auth.GoogleAuthProvider(); provider.setCustomParameters({prompt:'select_account'});
      await loggAuth.signInWithRedirect(provider);
    }catch(e){console.error('LOGG redirect auth',e);setAuthStatus('Google sign-in · '+authErrorText(e),true);toast('Sign-in failed');if(btn){btn.disabled=false;btn.textContent='Continue with Google';}}
  });
  $('#googleSignOut')?.addEventListener('click',async()=>{try{await loggAuth.signOut();setAuthStatus('Signed out.');}catch(e){setAuthStatus('Sign-out · '+authErrorText(e),true);}updateAuthUI();});
}catch(e){console.error('LOGG auth init',e);setAuthStatus('Auth init · '+authErrorText(e),true);}}

const SPEECH_LANGS=new Set(['sv-SE','en-GB','fi-FI','es-ES']);
let speechLang={mode:'auto',locked:null,candidate:null,score:0};
function t(k){return I[ui][k]||k} function toast(x){$('#toast').textContent=x;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),1800)}
function applyLang(){document.documentElement.lang=ui;$$('[data-i18n]').forEach(e=>e.textContent=t(e.dataset.i18n));$$('[data-i18n-placeholder]').forEach(e=>e.placeholder=t(e.dataset.i18nPlaceholder));$('#uiLang').textContent=ui==='en'?'SV':'EN';renderRecent()}
$('#uiLang').onclick=()=>{ui=ui==='en'?'sv':'en';localStorage.loggUi=ui;applyLang()};
function goTo(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.body.dataset.view=id;window.scrollTo(0,0)}
function fmt(d){return new Intl.DateTimeFormat(ui==='sv'?'sv-FI':'en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(d))} function duration(ms){let s=Math.floor(ms/1000),m=Math.floor(s/60);return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function getLogs(){try{return JSON.parse(localStorage.loggLogs||'[]')}catch{return[]}} function saveLogs(x){localStorage.loggLogs=JSON.stringify(x)}
function renderRecent(){let x=getLogs(),el=$('#recentList');el.innerHTML=x.length?x.slice().reverse().slice(0,8).map(l=>`<div class="recent-item" data-id="${l.id}"><div><div class="recent-title">${esc(l.name)}</div><div class="recent-meta">${fmt(l.start)} · ${duration((l.end||l.start)-l.start)}</div></div><div>›</div></div>`).join(''):`<div class="empty">${t('empty')}</div>`;$$('.recent-item').forEach(e=>e.onclick=()=>openLog(e.dataset.id))}
function esc(s=''){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
$('#clearAll').onclick=()=>{if(confirm(ui==='sv'?'Rensa alla lokalt sparade LOGGar?':'Clear all locally saved LOGGs?')){saveLogs([]);renderRecent()}};
$('#startBtn').onclick=async()=>{if(!(await requireLoggUser()))return;let name=$('#meetingName').value.trim();if(!name||!$('#consent').checked){toast(t('nameRequired'));return}speechLang={mode:$('#speechMode')?.value||'auto',locked:null,candidate:null,score:0}; localStorage.loggSpeechMode=speechLang.mode;
current={id:Date.now().toString(),name,start:Date.now(),end:null,output:$('#outputLang').value,speechMode:speechLang.mode,transcript:'',sections:null};finalText='';$('#transcript').value='';$('#liveTitle').textContent=name;$('#liveDate').textContent=fmt(current.start);goTo('live');startTimer();requestMeetingWakeLock();startReliabilityWatch();startSpeech()};
function startTimer(){clearInterval(tick);let f=()=>$('#timer').textContent=duration(Date.now()-current.start);f();tick=setInterval(f,1000)}
function speechDetail(msg=''){const el=$('#speechDetail');if(el)el.textContent=msg}
let recorder=null, stream=null, chunks=[], uploadBusy=false, chunkTimer=null, audioCtx=null, analyser=null, meterRAF=null, stopping=false, chunkBytes=0, chunkCount=0, finishFlush=false, finishWaiter=null;
let wakeLock=null, reliabilityTimer=null, lastAudioAt=0, reliabilityWarned=false;
function reliabilityText(msg,warning=false){const el=$('#reliabilityStatus');if(!el)return;el.textContent=msg;el.classList.toggle('warning',!!warning)}
async function requestMeetingWakeLock(){
  if(!current||current.end||paused)return;
  if(!('wakeLock' in navigator)){reliabilityText(ui==='sv'?'⚠ Håll skärmen aktiv under mötet':'⚠ Keep screen awake during meeting',true);diag('WAKE LOCK unsupported');return;}
  try{
    if(wakeLock&&!wakeLock.released)return;
    wakeLock=await navigator.wakeLock.request('screen');
    reliabilityText(ui==='sv'?'● Lyssnar · Skärmen hålls vaken':'● Listening · Screen awake');
    diag('WAKE LOCK ✓');
    wakeLock.addEventListener('release',()=>{if(current&&!current.end&&!paused){reliabilityText(ui==='sv'?'⚠ Skärmlås släppt — håll LOGG öppet':'⚠ Screen lock released — keep LOGG open',true);diag('WAKE LOCK RELEASED')}});
  }catch(e){reliabilityText(ui==='sv'?'⚠ Kunde inte hålla skärmen vaken':'⚠ Could not keep screen awake',true);diag('WAKE LOCK ERROR '+(e.message||e));}
}
async function releaseMeetingWakeLock(){try{if(wakeLock&&!wakeLock.released)await wakeLock.release()}catch(_){}wakeLock=null}
function startReliabilityWatch(){clearInterval(reliabilityTimer);lastAudioAt=Date.now();reliabilityWarned=false;reliabilityTimer=setInterval(()=>{
  if(!current||current.end||paused||stopping)return;
  const track=stream?.getAudioTracks?.()[0];
  const healthy=recorder&&recorder.state==='recording'&&track&&track.readyState==='live';
  if(!healthy||Date.now()-lastAudioAt>15000){
    if(!reliabilityWarned){reliabilityWarned=true;reliabilityText(ui==='sv'?'⚠ Inspelningen verkar ha avbrutits — öppna LOGG':'⚠ Recording may have stopped — open LOGG',true);diag('WATCHDOG WARNING');}
  }else if(reliabilityWarned){reliabilityWarned=false;reliabilityText(ui==='sv'?'● Lyssnar · Skärmen hålls vaken':'● Listening · Screen awake');}
},5000)}
function stopReliabilityWatch(){clearInterval(reliabilityTimer);reliabilityTimer=null;reliabilityWarned=false}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&current&&!current.end&&!paused){requestMeetingWakeLock();if(!stream||!stream.active||!recorder||recorder.state==='inactive'){diag('VISIBLE · recorder recovery');stopping=false;startSpeech();}}});
const DEBUG=new URLSearchParams(location.search).get('debug')==='1'; if(DEBUG) document.documentElement.classList.add('debug-mode');
function diag(msg){const el=$('#diagnostics');if(DEBUG&&el){const stamp=new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});el.textContent=stamp+' · '+msg+'\n'+el.textContent.split('\n').slice(0,5).join('\n')}}
const MARINE_HINTS=[
  'superyacht','sailing yacht','Baltic Yachts','yard','owner team','owners team','project manager','naval architect','designer',
  'class','classification','class society','flag state','survey','survey item','approval drawing','approved drawing','GA','general arrangement',
  'change order','variation order','NCR','non-conformance','punch list','snag list','long lead item','delivery schedule','milestone','critical path',
  'fairing','paint system','topcoat','primer','prepreg','infusion','lamination','composites','carbon','bulkhead','hull','deckhouse','superstructure',
  'joinery','outfitting','interior','teak deck','passerelle','tender garage','beach club','transom','hatch','door','glazing',
  'HVAC','AV IT','AV/IT','electrical','hydraulics','plumbing','ventilation','generator','shore power','battery bank','automation',
  'mast','carbon mast','boom','rigging','standing rigging','running rigging','forestay','backstay','shroud','winch','sail handling',
  'commissioning','harbour trial','harbor trial','sea trial','inclining test','load test','acceptance test','handover','delivery','warranty',
  'shipyard','subcontractor','supplier','vendor','owner representative','captain','crew','engine room','machinery','propulsion','steering'
];
async function checkBackend(base){
  const r=await fetch(base+'/health',{cache:'no-store'});
  if(!r.ok) throw new Error('Backend health check failed');
  return r.json();
}
function chooseMimeType(){
  if(!window.MediaRecorder) return '';
  const apple=/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
  const candidates=apple?['audio/mp4','audio/mp4;codecs=mp4a.40.2','audio/aac','audio/webm;codecs=opus','audio/webm']:['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/aac'];
  return candidates.find(x=>MediaRecorder.isTypeSupported(x))||'';
}
function startMeter(mediaStream){
  try{
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    analyser=audioCtx.createAnalyser(); analyser.fftSize=256;
    audioCtx.createMediaStreamSource(mediaStream).connect(analyser);
    const data=new Uint8Array(analyser.frequencyBinCount);
    const draw=()=>{ analyser.getByteFrequencyData(data); const avg=data.reduce((a,b)=>a+b,0)/data.length; const pct=Math.max(3,Math.min(100,avg*1.7)); const el=$('#audioLevel'); if(el)el.style.width=pct+'%'; meterRAF=requestAnimationFrame(draw)}; draw();
  }catch(_){}
}
function stopMeter(){if(meterRAF)cancelAnimationFrame(meterRAF);meterRAF=null;try{audioCtx?.close()}catch{}audioCtx=null;analyser=null;const el=$('#audioLevel');if(el)el.style.width='3%'}
async function startSpeech(){
  const base=(window.LOGG_CONFIG?.API_BASE||'').replace(/\/$/,'');
  stopping=false;
  $('#speechStatus').textContent=ui==='sv'?'Kontrollerar Google…':'Checking Google…'; speechDetail('');
  if(!base){ $('#speechStatus').textContent=ui==='sv'?'Google ej konfigurerad':'Google not configured'; return; }
  try{ const h=await checkBackend(base); diag('CLOUD ✓ '+(h.version||'')); }catch(e){ $('#speechStatus').textContent=ui==='sv'?'Google ej nåbar':'Google unavailable'; speechDetail(ui==='sv'?'Cloud Run svarar inte. Kontrollera backend-adressen.':'Cloud Run is not responding. Check the backend URL.'); return; }
  if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder){
    $('#speechStatus').textContent=ui==='sv'?'Mikrofon stöds inte':'Microphone unsupported'; return;
  }
  try{
    $('#speechStatus').textContent=ui==='sv'?'Begär mikrofon…':'Requesting microphone…';
    stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}}); diag('MIC ✓ track='+stream.getAudioTracks().length);
    startMeter(stream);
    const type=chooseMimeType();
    if(!type) throw new Error('No supported recording format');
    diag('FORMAT '+type); beginRecorder(type);
    $('#speechStatus').textContent=ui==='sv'?'Lyssnar':'Listening';
    speechDetail((ui==='sv'?'Google Chirp 3 · Auto språk · ':'Google Chirp 3 · Auto language · ')+type.replace('audio/','').toUpperCase());
  }catch(e){
    console.error(e); $('#speechStatus').textContent=ui==='sv'?'Mikrofon ej tillgänglig':'Microphone unavailable';
    speechDetail(ui==='sv'?'Kontrollera mikrofonbehörigheten i Safari.':'Check microphone permission in Safari.');
  }
}
function beginRecorder(type){
  if(!stream||stopping)return;
  try{
    recorder=new MediaRecorder(stream,{mimeType:type}); chunks=[]; chunkBytes=0; chunkCount=0;
    recorder.onerror=e=>diag('RECORDER ERROR '+(e.error?.message||e.error?.name||'unknown'));
    recorder.onstart=()=>diag('RECORDING ✓');
    recorder.ondataavailable=e=>{if(e.data&&e.data.size){lastAudioAt=Date.now();chunks.push(e.data);chunkBytes+=e.data.size;chunkCount++;diag('AUDIO '+chunkCount+' chunks · '+Math.round(chunkBytes/1024)+' KB')}};
    recorder.onstop=async()=>{
      clearTimeout(chunkTimer);
      const blob=new Blob(chunks,{type}); chunks=[];
      diag('STOP ✓ · '+Math.round(blob.size/1024)+' KB');
      try{
        if(finishFlush){
          finishFlush=false;
          if(blob.size>=800) await sendChunk(blob,(window.LOGG_CONFIG?.API_BASE||'').replace(/\/$/,''),type);
        }else if(!stopping&&!paused&&current&&!current.end){
          if(blob.size<800){diag('AUDIO TOO SMALL · restarting'); setTimeout(()=>beginRecorder(type),250); return;}
          await sendChunk(blob,(window.LOGG_CONFIG?.API_BASE||'').replace(/\/$/,''),type);
          if(!stopping&&!paused&&current&&!current.end)setTimeout(()=>beginRecorder(type),150);
        }
      }finally{
        if(finishWaiter){const done=finishWaiter;finishWaiter=null;done();}
      }
    };
    recorder.start(1000);
    chunkTimer=setTimeout(()=>{
      diag('8s · STOP REQUEST');
      if(recorder?.state==='recording'){
        try{recorder.requestData()}catch(_){}
        setTimeout(()=>{if(recorder?.state==='recording')recorder.stop()},150);
      }
    },8000);
  }catch(e){diag('RECORDER CREATE ERROR '+e.message);throw e}
}
function normalizeDetectedLanguage(code=''){
  const c=String(code).toLowerCase();
  if(c.startsWith('sv')) return 'sv-SE';
  if(c.startsWith('en')) return 'en-GB';
  if(c.startsWith('fi')) return 'fi-FI';
  if(c.startsWith('es')) return 'es-ES';
  return null; // German and unrelated detections never become a LOGG lock.
}
function observeLanguage(codes=[]){
  if(speechLang.mode!=='auto' || speechLang.locked) return;
  const lang=normalizeDetectedLanguage(codes[0]);
  if(!lang) return;
  if(speechLang.candidate===lang) speechLang.score += (lang==='sv-SE'?2:1);
  else { speechLang.candidate=lang; speechLang.score=(lang==='sv-SE'?2:1); }
  // Swedish locks quickly; other supported languages need repeated evidence.
  const threshold=lang==='sv-SE'?3:3;
  if(speechLang.score>=threshold){ speechLang.locked=lang; diag('LANG LOCK '+lang); }
}
function activeSpeechHint(){
  if(speechLang.mode!=='auto' && SPEECH_LANGS.has(speechLang.mode)) return speechLang.mode;
  return speechLang.locked||'';
}
function languageLabel(){
  const x=activeSpeechHint();
  if(!x) return ui==='sv'?'Smart auto · SV/FI/EN/ES':'Smart auto · SV/FI/EN/ES';
  return 'LOCK · '+x;
}
async function sendChunk(blob,base,type){
  if(uploadBusy){diag('UPLOAD BUSY · skipped');return} if(blob.size<800){diag('AUDIO <800B · skipped');return} uploadBusy=true; diag('UPLOADING '+Math.round(blob.size/1024)+' KB');
  try{
    $('#speechStatus').textContent=ui==='sv'?'Transkriberar…':'Transcribing…';
    const ext=type.includes('mp4')?'m4a':type.includes('webm')?'webm':'audio';
    let fd=new FormData(); fd.append('audio',blob,'chunk.'+ext); fd.append('phrases',JSON.stringify(MARINE_HINTS)); const hint=activeSpeechHint(); if(hint) fd.append('languageHint',hint);
    const headers=await authHeaders(); let r=await fetch(base+'/api/transcribe',{method:'POST',headers,body:fd}); diag('GOOGLE HTTP '+r.status);
    if(!r.ok) throw Error(await r.text()); let j=await r.json(); observeLanguage(j.detectedLanguages||[]); speechDetail('Google Chirp 3 · '+languageLabel()+' · '+type.replace('audio/','').toUpperCase());
    if(j.transcript){diag('TEXT ✓ '+j.transcript.length+' chars'); finalText=(finalText.trim()+' '+j.transcript.trim()).trim(); $('#transcript').value=finalText; current.transcript=finalText; localStorage.loggDraft=JSON.stringify(current); }
    $('#speechStatus').textContent=ui==='sv'?'Lyssnar':'Listening';
  }catch(e){ console.error(e); diag('ERROR '+(e.message||e)); $('#speechStatus').textContent=ui==='sv'?'Google-fel':'Google error'; speechDetail(e.message||'Transcription failed'); }finally{uploadBusy=false}
}
function stopSpeech(discard=true){
  stopping=true; clearTimeout(chunkTimer);
  if(recorder?.state==='recording'){ try{recorder.stop()}catch{} }
  stream?.getTracks().forEach(t=>t.stop()); stream=null; stopMeter();
}
$('#transcript').oninput=e=>{finalText=e.target.value+' ';if(current)current.transcript=e.target.value};
$('#pauseBtn').onclick=()=>{paused=!paused;if(paused){stopSpeech(true);releaseMeetingWakeLock();stopReliabilityWatch();reliabilityText(ui==='sv'?'Pausad':'Paused');$('#pauseBtn').textContent=t('resume');$('#speechStatus').textContent=t('paused')}else{stopping=false;requestMeetingWakeLock();startReliabilityWatch();startSpeech();$('#pauseBtn').textContent=t('pause')}};
function saveDraft(){
  if(!current)return;
  current.transcript=$('#transcript').value.trim();
  localStorage.loggDraft=JSON.stringify(current);
}
function leaveMeeting(){
  saveDraft();
  stopSpeech(true);
  releaseMeetingWakeLock(); stopReliabilityWatch();
  clearInterval(tick);
  current=null;
  goTo('home');
  renderRecent();
}

// v0.6.0 Home Navigation: every back action returns to the lifestyle home.
$('#backLive').addEventListener('click', leaveMeeting);
function goHome(){ goTo('home'); $('#startSheet').classList.add('hidden'); renderRecent(); }
$('#backHome').addEventListener('click',goHome);
$('#backArchive').addEventListener('click',goHome);
$('#openArchive').addEventListener('click',()=>{renderRecent();goTo('archive')});

// Swipe right on the document itself (not Safari's reserved screen edge).
// Interactive controls/text fields are excluded so normal editing and scrolling stay reliable.
let swipeStart=null;
function installSwipeBack(selector,handler){
  const el=$(selector); if(!el)return;
  el.addEventListener('touchstart',e=>{
    if(e.touches.length!==1 || e.target.closest('button,input,select,textarea,a')){swipeStart=null;return;}
    const t=e.touches[0]; swipeStart={x:t.clientX,y:t.clientY,time:Date.now()};
  },{passive:true});
  el.addEventListener('touchend',e=>{
    if(!swipeStart)return;
    const t=e.changedTouches[0],s=swipeStart; swipeStart=null;
    if(!t)return;
    const dx=t.clientX-s.x,dy=t.clientY-s.y,dt=Date.now()-s.time;
    if(dx>=90 && Math.abs(dx)>Math.abs(dy)*1.5 && dt<900) handler();
  },{passive:true});
}
installSwipeBack('#live .stationery',leaveMeeting);
installSwipeBack('#result .stationery',goHome);
installSwipeBack('#archive .stationery',goHome);

async function finishMeeting(){
  if(!current || current.end) return;
  const btn=$('#finishBtn');
  btn.disabled=true;
  btn.textContent=ui==='sv'?'Avslutar…':'Finishing…';
  $('#speechStatus').textContent=ui==='sv'?'Slutför transkribering…':'Finishing transcription…';
  diag('FINISH REQUEST');
  clearInterval(tick); clearTimeout(chunkTimer); releaseMeetingWakeLock(); stopReliabilityWatch();
  stopping=true; paused=false;

  // Flush the final partial MediaRecorder segment before creating Smart Notes.
  if(recorder?.state==='recording'){
    finishFlush=true;
    const stopped=new Promise(resolve=>{
      finishWaiter=resolve;
      setTimeout(()=>{if(finishWaiter){finishWaiter=null;resolve();}},12000);
    });
    try{recorder.requestData()}catch(_){}
    try{recorder.stop()}catch(_){if(finishWaiter){const done=finishWaiter;finishWaiter=null;done();}}
    await stopped;
  }
  stream?.getTracks().forEach(t=>t.stop()); stream=null; stopMeter();

  current.transcript=$('#transcript').value.trim();
  current.end=Date.now();
  current.sections=structure(current.transcript,current.output);
  const logs=getLogs();
  const i=logs.findIndex(x=>x.id===current.id);
  if(i>=0) logs[i]=current; else logs.push(current);
  saveLogs(logs);
  localStorage.removeItem('loggDraft');
  diag('FINISH ✓ saved');
  openLog(current.id);
  btn.disabled=false;
  btn.textContent=t('finish');
}
$('#finishBtn').addEventListener('click',finishMeeting);

function structure(text,lang){
  // Intelligence v3 — context-aware, zero-cost, on-device meeting analysis.
  // The raw transcript remains the source of truth. LOGG extracts commitments and
  // decisions conservatively and marks low-confidence items for confirmation.
  const raw=(text||'').trim();
  const sv=lang==='sv';
  const empty=sv?'Inga anteckningar registrerades.':'No notes were captured.';
  if(!raw)return{summary:empty,decisions:'—',actions:'—',questions:'—',notes:'—'};

  const clean=raw.replace(/\s+/g,' ').replace(/\s+([,.!?;:])/g,'$1').trim();
  const sentences=(clean.match(/[^.!?]+[.!?]?/g)||[clean]).map(x=>x.trim()).filter(x=>x.length>2);
  const lower=s=>String(s||'').toLocaleLowerCase(sv?'sv-FI':'en-GB');
  const norm=s=>lower(s).normalize('NFKD').replace(/[^a-z0-9åäöéüñ]+/g,' ').trim();
  const unique=[]; const seen=new Set();
  for(const s of sentences){const k=norm(s);if(k&&!seen.has(k)){seen.add(k);unique.push(s)}}

  // Multilingual meeting language + code-switching. Patterns intentionally include
  // ordinary project speech, not only explicit words such as "decision" or "action".
  const decisionStrong=/\b(beslut(?:et|ade|at)?|beslöt|bestäm(?:de|t)|överens(?:kom|kommelse)?|godkän(?:d|t|de)|vi kör på|vi väljer|vi tar alternativ|vi går vidare med|då gör vi så|det blir|päät(?:ös|ettiin|ämme)|sovittiin|hyväksyttiin|decid(?:ed|e)|decision|agreed|approved|we(?:'ll| will) proceed|we(?:'ll| will) go with|let'?s go with|we chose|we choose|that'?s settled|se decidió|acordamos|aprobado|vamos con)\b/i;
  const decisionWeak=/\b(landar i|enades om|inriktningen är|planen är|the plan is|direction is|preferred option|linja on|suunnitelma on|el plan es|la opción es)\b/i;
  const actionVerb=/\b(ska|skall|måste|behöver|tar|fixar|skickar|kollar|kontrollerar|bekräftar|bokar|uppdaterar|följer upp|återkommer|kontaktar|förbereder|levererar|ordnar|säkerställer|will|shall|must|need(?:s)? to|going to|send|check|confirm|book|update|follow up|come back|contact|prepare|deliver|arrange|verify|review|issue|provide|selvittää|tarkistaa|lähettää|vahvistaa|päivittää|hoitaa|pitää|täytyy|järjestää|enviar|revisar|confirmar|actualizar|preparar|contactar|debe|tenemos que|organizar)\b/i;
  const futureCommit=/\b(i'?ll|i will|we'?ll|we will|jag tar|jag fixar|jag återkommer|vi tar|vi fixar|minä hoidan|me hoidamme|yo lo hago|nosotros lo hacemos)\b/i;
  const actionCue=/\b(action|action point|åtgärd|att göra|todo|to-do|uppföljning|follow[- ]?up|tehtävä|acción|tarea)\b/i;
  const requestCue=/\b(kan du|kan ni|skulle du|could you|can you|would you|please|voitko|voitteko|podrías|puedes)\b/i;
  const tentative=/\b(bör|borde|kanske|eventuellt|kan vi|skulle kunna|should|could|maybe|perhaps|might|what if|ehkä|pitäisi|voitaisiin|quizá|tal vez|deberíamos|podríamos)\b/i;
  const questionCue=/\?$|\b(öppen fråga|oklart|återstår|behöver avgöras|behöver reda ut|vem ska|när ska|hur ska|open question|unclear|to be decided|to be confirmed|who will|when will|how will|avoin kysymys|epäselvä|kuka|milloin|cómo|cuándo|quién|pregunta abierta|por decidir)\b/i;
  const blockerCue=/\b(blocker|blocked|risk|riskerar|försen|delay|late|waiting for|väntar på|pending|saknas|missing|not approved|inte godkänd|ei hyväksytty|retraso|pendiente)\b/i;
  const deadlineRx=/\b(idag|imorgon|övermorgon|denna vecka|nästa vecka|före lunch|innan lunch|innan mötet|innan fredag|före fredag|måndag|tisdag|onsdag|torsdag|fredag|lördag|söndag|today|tomorrow|this week|next week|before lunch|before the meeting|before friday|by monday|by tuesday|by wednesday|by thursday|by friday|by saturday|by sunday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tänään|huomenna|ensi viikolla|maanantai|tiistai|keskiviikko|torstai|perjantai|hoy|mañana|esta semana|próxima semana|lunes|martes|miércoles|jueves|viernes|\d{1,2}[.\/-]\d{1,2}(?:[.\/-]\d{2,4})?)\b/i;
  const explicitOwner=/\b(?:ansvar(?:ig)?|owner|responsible|vastuu|responsable)\s*[:=-]?\s*([A-ZÅÄÖÉÜÑ][\p{L}'-]{1,24})/iu;
  const addressedOwner=/^([A-ZÅÄÖÉÜÑ][\p{L}'-]{1,24})[,,:]\s*(?:kan|could|can|would|please|voitko|puedes)\b/iu;
  const personCommit=/^([A-ZÅÄÖÉÜÑ][\p{L}'-]{1,24})\s+(?:ska|skall|tar|fixar|kollar|kontrollerar|skickar|bekräftar|återkommer|will|shall|is going to|checks|sends|confirms|reviews|provides|hoitaa|tarkistaa|lähettää|vahvistaa|revisa|envía|confirma)\b/iu;
  const pronounOwner=/^(jag|vi|du|han|hon|de|i|we|you|he|she|they|minä|me|sinä|hän|yo|nosotros)\b/iu;
  const filler=/^(ja|jo|nej|okej|ok|okay|right|yes|no|joo|kyllä|ei|sí|vale|bra|good|fine|selvä)[,.!\s]*$/i;
  const continuation=/^(och|men|så|dessutom|sedan|sen|also|and|but|so|then|plus|ja|och då|mutta|ja sitten|también|y|pero|entonces)\b/i;

  const domainScore=s=>{const n=lower(s);let score=0;for(const h of MARINE_HINTS)if(n.includes(h.toLowerCase()))score++;return Math.min(score,3)};
  const findOwner=s=>(s.match(explicitOwner)||s.match(addressedOwner)||s.match(personCommit)||s.match(pronounOwner)||[])[1]||'';
  const findDue=s=>(s.match(deadlineRx)||[])[0]||'';
  const decisions=[], actionObjs=[], questions=[], score=[];

  // Pass 1: classify each utterance, retaining neighbours for context in pass 2.
  const rows=unique.map((s,i)=>{
    const isQuestion=questionCue.test(s);
    const dStrong=decisionStrong.test(s), dWeak=decisionWeak.test(s);
    const actionStrength=(actionCue.test(s)?3:0)+(requestCue.test(s)?2:0)+(futureCommit.test(s)?2:0)+(actionVerb.test(s)?2:0)+(findOwner(s)?1:0)+(findDue(s)?1:0);
    return {s,i,isQuestion,dStrong,dWeak,actionStrength,domain:domainScore(s),tentative:tentative.test(s),blocker:blockerCue.test(s)};
  });

  for(const r of rows){
    const s=r.s, prev=rows[r.i-1], next=rows[r.i+1];
    if(filler.test(lower(s)))continue;

    // Questions remain questions unless they contain a real commitment/request.
    if(r.isQuestion && r.actionStrength<2){questions.push(s);score.push({s,type:'q',weight:2+r.domain});continue}

    // Explicit/implicit decisions. A weak decision gets stronger when the previous sentence
    // presents alternatives or the next sentence starts implementation.
    let decisionConfidence=r.dStrong?0.95:r.dWeak?0.68:0;
    if(!decisionConfidence && /\b(option|alternativ|vaihtoehto|opción)\b/i.test(prev?.s||'') && /\b(we go with|vi tar|vi kör|det blir|let'?s|vamos con)\b/i.test(s)) decisionConfidence=.82;
    if(decisionConfidence){
      decisions.push(s+(decisionConfidence<.75?(sv?'  [bekräfta]':'  [confirm]'):''));
      score.push({s,type:'d',weight:decisionConfidence>.8?5:3});
      continue;
    }

    // Context-aware actions. A sentence may supply the owner/task while the next sentence
    // supplies the deadline, or the previous sentence may supply the object/background.
    if(r.actionStrength>=2){
      let owner=findOwner(s), due=findDue(s), combined=s;
      let confidence=.56 + Math.min(r.actionStrength,5)*.07;
      if(owner)confidence+=.08;
      if(due)confidence+=.08;
      if(r.tentative)confidence-=.22;

      // Attach a short following deadline/context sentence instead of creating a duplicate action.
      if(next && !next.dStrong && next.actionStrength<2 && (findDue(next.s)||/^we need it|^vi behöver (?:det|den)|^det behövs|^needed|^tarvitaan|^lo necesitamos/i.test(next.s))){
        const nd=findDue(next.s); if(nd&&!due){due=nd;confidence+=.08}
        combined=s+' '+next.s;
        next.consumed=true;
      }
      // If the action is a pronoun-only continuation, use the immediately preceding technical
      // sentence as context so "Peter will check it" does not lose what "it" refers to.
      if(prev && r.i>0 && /\b(it|det|den|detta|this|that|sen|se|lo|la)\b/i.test(s) && (prev.domain||prev.blocker) && !prev.dStrong){
        combined=prev.s+' → '+combined;
        confidence+=.05;
      }
      confidence=Math.max(.2,Math.min(.99,confidence));
      const meta=[];
      if(owner)meta.push((sv?'Ansvar: ':'Owner: ')+owner);
      if(due)meta.push((sv?'Tid: ':'Due: ')+due);
      if(confidence<.74)meta.push(sv?'bekräfta':'confirm');
      actionObjs.push({text:'☐ '+combined+(meta.length?'  ['+meta.join(' · ')+']':''),confidence,source:s});
      score.push({s,type:'a',weight:confidence>.8?5:3+r.domain});
      continue;
    }

    if(r.isQuestion){questions.push(s);score.push({s,type:'q',weight:2+r.domain});continue}
    if(r.consumed)continue;

    // Discussion/background. Risks, blockers and domain-specific sentences are more summary-worthy.
    let weight=(s.length>55?2:1)+r.domain+(r.blocker?2:0);
    if(continuation.test(s) && prev)weight+=.3;
    score.push({s,type:'body',weight});
  }

  // Remove near-duplicate extracted items without altering the raw notes.
  const dedupe=arr=>{const out=[],keys=[];for(const x of arr){const k=norm(typeof x==='string'?x:x.text);if(!k)continue;if(keys.some(q=>q===k||q.includes(k)||k.includes(q)))continue;keys.push(k);out.push(x)}return out};
  const d2=dedupe(decisions), q2=dedupe(questions), a2=dedupe(actionObjs);

  // Extractive summary only: prefer project substance, blockers and decisions. Preserve transcript order
  // among selected sentences so the summary reads naturally rather than as a score-sorted list.
  let candidates=score.filter(x=>x.type==='body'||x.type==='d').sort((a,b)=>b.weight-a.weight).slice(0,7);
  if(candidates.length<2)candidates=candidates.concat(score.filter(x=>x.type==='a').slice(0,2));
  const picked=[...new Map(candidates.map(x=>[norm(x.s),x])).values()].sort((a,b)=>unique.indexOf(a.s)-unique.indexOf(b.s));
  const summary=[];let chars=0;
  for(const x of picked){if(summary.length>=4||chars+x.s.length>700)break;summary.push(x.s);chars+=x.s.length}

  return{
    summary:summary.join(' ')||empty,
    decisions:d2.slice(0,14).join('\n')||'—',
    actions:a2.slice(0,20).map(x=>x.text).join('\n')||'—',
    questions:q2.slice(0,14).join('\n')||'—',
    notes:raw
  };
}
function openLog(id){let l=getLogs().find(x=>x.id===id);if(!l)return;current=l;$('#resultTitle').textContent=l.name;$('#resultMeta').textContent=`${fmt(l.start)} · ${duration((l.end||l.start)-l.start)}`;let s=l.sections||structure(l.transcript,l.output);let defs=[['summary','summary'],['decisions','decisions'],['actions','actions'],['questions','questions'],['notes','notes']];$('#sections').innerHTML='<div class="intelligence-note"><span>LOGG INTELLIGENCE · v3</span><b>'+(ui==='sv'?'Råtranskriptionen bevaras alltid':'Raw transcript always preserved')+'</b></div>'+defs.map(([k,label])=>`<div class="section-card"><h3>${t(label)}</h3><textarea data-key="${k}">${esc(s[k])}</textarea></div>`).join('');$$('#sections textarea').forEach(a=>a.oninput=()=>{current.sections[a.dataset.key]=a.value;let logs=getLogs(),i=logs.findIndex(x=>x.id===current.id);logs[i]=current;saveLogs(logs)});goTo('result')}
function plain(){let s=current.sections;return `${current.name}\n${fmt(current.start)} · ${duration(current.end-current.start)}\n\n${t('summary')}\n${s.summary}\n\n${t('decisions')}\n${s.decisions}\n\n${t('actions')}\n${s.actions}\n\n${t('questions')}\n${s.questions}\n\n${t('notes')}\n${s.notes}`}
$('#copyBtn').onclick=async()=>{await navigator.clipboard.writeText(plain());toast(t('copied'))};
// Minimal store-only ZIP writer for a dependency-free .docx (OOXML package).
const crcTable=(()=>{let t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();function crc32(a){let c=0xffffffff;for(let b of a)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}function u16(n){return[n&255,n>>>8&255]}function u32(n){return[n&255,n>>>8&255,n>>>16&255,n>>>24&255]}function zip(files){
  const enc=new TextEncoder(), localParts=[], entries=[]; let offset=0;
  const le16=n=>new Uint8Array([n&255,(n>>>8)&255]);
  const le32=n=>new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);
  const join=parts=>{const len=parts.reduce((s,p)=>s+p.length,0), out=new Uint8Array(len);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out};
  for(const [name,content] of files){
    const nameBytes=enc.encode(name), data=enc.encode(content), crc=crc32(data);
    const header=join([new Uint8Array([0x50,0x4b,0x03,0x04]),le16(20),le16(0),le16(0),le16(0),le16(0),le32(crc),le32(data.length),le32(data.length),le16(nameBytes.length),le16(0),nameBytes]);
    localParts.push(header,data); entries.push({nameBytes,data,crc,offset}); offset+=header.length+data.length;
  }
  const centralStart=offset, centralParts=[];
  for(const e of entries){
    const header=join([new Uint8Array([0x50,0x4b,0x01,0x02]),le16(20),le16(20),le16(0),le16(0),le16(0),le16(0),le32(e.crc),le32(e.data.length),le32(e.data.length),le16(e.nameBytes.length),le16(0),le16(0),le16(0),le16(0),le32(0),le32(e.offset),e.nameBytes]);
    centralParts.push(header); offset+=header.length;
  }
  const centralSize=offset-centralStart;
  const eocd=join([new Uint8Array([0x50,0x4b,0x05,0x06]),le16(0),le16(0),le16(entries.length),le16(entries.length),le32(centralSize),le32(centralStart),le16(0)]);
  return join([...localParts,...centralParts,eocd]);
}
function xml(s){return String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]))}
function dl(blob,name){let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1800)}
function wp(text,opt={}){let size=opt.size||21,color=opt.color||'242521',bold=opt.bold?'<w:b/>':'',caps=opt.caps?'<w:caps/>':'',space=opt.after??110,before=opt.before??0,keep=opt.keep?'<w:keepNext/>':'';return `<w:p><w:pPr>${keep}<w:spacing w:before="${before}" w:after="${space}"/><w:jc w:val="${opt.align||'left'}"/>${opt.border?'<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="7" w:color="B89B67"/></w:pBdr>':''}</w:pPr><w:r><w:rPr>${bold}${caps}<w:color w:val="${color}"/><w:sz w:val="${size}"/><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/></w:rPr><w:t xml:space="preserve">${xml(text||' ')}</w:t></w:r></w:p>`}
function wordPackage(body,kind){let header=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="5" w:space="8" w:color="B89B67"/></w:pBdr></w:pPr><w:r><w:rPr><w:b/><w:color w:val="242521"/><w:sz w:val="24"/><w:spacing w:val="32"/></w:rPr><w:t>LOGG</w:t></w:r><w:r><w:rPr><w:color w:val="8D734A"/><w:sz w:val="13"/></w:rPr><w:t xml:space="preserve">   MEETINGS ON COURSE · ${kind}</w:t></w:r></w:p></w:hdr>`;
let footer=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:color w:val="8D867B"/><w:sz w:val="14"/></w:rPr><w:t>LOGG · PRIVATE DOCUMENT</w:t></w:r></w:p></w:ftr>`;
let doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr><w:headerReference w:type="default" r:id="rId2"/><w:footerReference w:type="default" r:id="rId3"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1276" w:bottom="1276" w:left="1276" w:header="650" w:footer="650"/></w:sectPr></w:body></w:document>`;
let types='<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>';
let rels='<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
let drels='<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>';
return zip([['[Content_Types].xml',types],['_rels/.rels',rels],['word/_rels/document.xml.rels',drels],['word/document.xml',doc],['word/header1.xml',header],['word/footer1.xml',footer]])}
function meetingBody(){let s=current.sections||structure(current.transcript,current.output),body=wp('MEETING RECORD',{size:15,color:'8D734A',bold:true,caps:true,after:80})+wp(current.name,{size:34,bold:true,after:100})+wp(`${fmt(current.start)}   ·   ${duration((current.end||current.start)-current.start)}`,{size:18,color:'766F64',border:true,after:300});for(let [title,key] of [[t('summary'),'summary'],[t('decisions'),'decisions'],[t('actions'),'actions'],[t('questions'),'questions'],[t('notes'),'notes']]){body+=wp(title.toUpperCase(),{size:16,color:'8D734A',bold:true,caps:true,before:170,after:90,keep:true});let lines=String(s[key]||'—').split('\n');for(let line of lines){let isList=/^\s*(?:[-•☐☑]|\d+[.)])\s+/.test(line);body+=wp(line||' ',{size:21,after:isList?65:110})}}return body}
$('#wordBtn').onclick=()=>{let blob=new Blob([wordPackage(meetingBody(),ui==='sv'?'MÖTE':'MEETING')],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});dl(blob,`LOGG_${current.name.replace(/[^a-z0-9åäö_-]+/gi,'_')}.docx`)};
function printMeeting(){let s=current.sections||structure(current.transcript,current.output),sections=[[t('summary'),'summary'],[t('decisions'),'decisions'],[t('actions'),'actions'],[t('questions'),'questions'],[t('notes'),'notes']].map(([title,key])=>`<section><h2>${xml(title)}</h2><div>${xml(s[key]||'—')}</div></section>`).join('');printLogg(current.name,`${fmt(current.start)} · ${duration((current.end||current.start)-current.start)}`,ui==='sv'?'MÖTE':'MEETING',sections)}
function printLogg(title,meta,kind,content){let f=document.createElement('iframe');f.style.cssText='position:fixed;width:0;height:0;border:0;opacity:0';document.body.appendChild(f);let d=f.contentDocument||f.contentWindow.document;d.open();d.write(`<!doctype html><html><head><meta charset="utf-8"><title>${xml(title)}</title><style>@page{size:A4;margin:24mm 20mm 20mm}*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#242521;margin:0;line-height:1.58}.head{border-bottom:1px solid #b89b67;padding-bottom:9px;margin-bottom:34px;display:flex;align-items:baseline;gap:14px}.logo{font-weight:800;letter-spacing:.18em;font-size:20px}.strap{color:#8d734a;font-size:8px;letter-spacing:.18em;font-weight:700}.kind{color:#8d734a;font-size:9px;letter-spacing:.16em;font-weight:700}.title{font-size:27px;line-height:1.12;font-weight:650;margin:8px 0 10px}.meta{font-size:10px;color:#766f64;border-bottom:1px solid #d9d0c0;padding-bottom:16px;margin-bottom:28px}section{break-inside:auto;border-top:1px solid #e1dbcf;padding-top:17px;margin-top:22px}h2{font-size:9px;letter-spacing:.18em;color:#8d734a;margin:0 0 10px;text-transform:uppercase}section div{white-space:pre-wrap;font-size:11.5px}.foot{position:fixed;bottom:-12mm;right:0;color:#8d867b;font-size:7px;letter-spacing:.12em}@media print{.head{break-after:avoid}.title{break-after:avoid}h2{break-after:avoid}}</style></head><body><div class="head"><span class="logo">LOGG</span><span class="strap">MEETINGS ON COURSE</span></div><div class="kind">${xml(kind)}</div><div class="title">${xml(title)}</div><div class="meta">${xml(meta)}</div>${content}<div class="foot">LOGG · PRIVATE DOCUMENT</div></body></html>`);d.close();setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print()}finally{setTimeout(()=>f.remove(),1800)}},300)}
$('#pdfBtn').onclick=printMeeting;
$('#revealStart').onclick=()=>{$('#startSheet').classList.remove('hidden');setTimeout(()=>$('#startSheet').scrollIntoView({behavior:'smooth',block:'start'}),50)};
$('#cancelStart').onclick=()=>{$('#startSheet').classList.add('hidden');$('#meetingName').value='';$('#consent').checked=false;window.scrollTo({top:0,behavior:'smooth'});};if('serviceWorker' in navigator){
  window.addEventListener('load', async()=>{
    try{
      const reg=await navigator.serviceWorker.register('./sw.js?v=0.10.5',{updateViaCache:'none'});
      await reg.update();
      if(reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
      reg.addEventListener('updatefound',()=>{
        const worker=reg.installing;
        if(worker) worker.addEventListener('statechange',()=>{
          if(worker.state==='installed' && navigator.serviceWorker.controller) worker.postMessage('SKIP_WAITING');
        });
      });
    }catch(e){ console.warn('LOGG service worker update failed',e); }
  });
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(refreshing) return; refreshing=true; window.location.reload();
  });
}
// Purge legacy PWA caches once so iPhone cannot keep executing stale 0.3.x JS.
(async()=>{try{if('caches'in window){for(const k of await caches.keys())if(k.startsWith('logg-') && k!=='logg-v0.10.6')await caches.delete(k)}}catch{}})();

if($('#speechMode')) $('#speechMode').value=localStorage.loggSpeechMode||'auto';
window.LOGG?.modules?.meetings?.init?.();
window.LOGG?.modules?.notes?.init?.();
goTo('home');applyLang();renderRecent(); setTimeout(()=>diag('JS ✓ v0.9.3 · '+navigator.userAgent.slice(0,55)),50);


// v0.10.4 · How-to / pilot security sheet. Deliberately isolated from Core/Meetings/Notes.
(()=>{
 const sheet=document.getElementById('helpSheet'), open=document.getElementById('openHelp');
 const close=()=>{if(sheet) sheet.hidden=true};
 if(open&&sheet) open.addEventListener('click',()=>{sheet.hidden=false});
 document.getElementById('closeHelp')?.addEventListener('click',close);
 document.getElementById('helpDone')?.addEventListener('click',close);
 sheet?.addEventListener('click',e=>{if(e.target===sheet)close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sheet&&!sheet.hidden)close()});
})();

initLoggAuth();
