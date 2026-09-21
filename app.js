const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const I={en:{heroSub:'Speech becomes clarity. Audio never becomes a recording.',newLogg:'Start Meeting LOGG',meeting:'MEETING',started:'STARTED',privacy:'Audio is processed live for transcription and is not retained by LOGG.',meetingName:'Meeting name',outputLanguage:'Output language',listening:'Listening',consent:'I have informed participants that LOGG listens to create notes. LOGG does not retain an audio recording.',start:'Begin LOGG',recent:'Recent LOGGs',clear:'Clear',listeningNow:'LISTENING · AUDIO IS NOT SAVED',liveNotes:'Live notes',pause:'Pause',resume:'Resume',finish:'Finish LOGG',completed:'COMPLETED LOGG',copy:'Copy',word:'Export Word',transcriptPlaceholder:'Your live transcript will appear here. You can type or correct text at any time.',empty:'No LOGGs yet.',nameRequired:'Add a meeting name and confirm participant notice.',copied:'Copied',summary:'Summary',decisions:'Decisions',actions:'Actions',questions:'Open Questions',notes:'Meeting Notes',ready:'Ready',unsupported:'Speech recognition is not available in this browser. You can still type notes live.',paused:'Paused',listeningStatus:'Listening'},sv:{heroSub:'Tal blir tydlighet. Ljudet blir aldrig en inspelning.',newLogg:'Starta mötes-LOGG',meeting:'MÖTE',started:'STARTAD',privacy:'Ljud bearbetas live för transkribering och sparas inte av LOGG.',meetingName:'Mötesnamn',outputLanguage:'Output-språk',listening:'Lyssning',consent:'Jag har informerat deltagarna om att LOGG lyssnar för att skapa anteckningar. LOGG sparar ingen ljudinspelning.',start:'Starta LOGG',recent:'Senaste LOGGar',clear:'Rensa',listeningNow:'LYSSNAR · LJUD SPARAS INTE',liveNotes:'Live-anteckningar',pause:'Pausa',resume:'Fortsätt',finish:'Avsluta LOGG',completed:'AVSLUTAD LOGG',copy:'Kopiera',word:'Exportera Word',transcriptPlaceholder:'Din live-transkribering visas här. Du kan skriva eller korrigera text när som helst.',empty:'Inga LOGGar ännu.',nameRequired:'Fyll i mötesnamn och bekräfta att deltagarna informerats.',copied:'Kopierat',summary:'Sammanfattning',decisions:'Beslut',actions:'Åtgärder',questions:'Öppna frågor',notes:'Mötesanteckningar',ready:'Klar',unsupported:'Taligenkänning stöds inte i denna webbläsare. Du kan fortfarande skriva anteckningar live.',paused:'Pausad',listeningStatus:'Lyssnar'}};
let ui=localStorage.loggUi||'en', current=null, tick=null, recognition=null, paused=false, finalText='';
function t(k){return I[ui][k]||k} function toast(x){$('#toast').textContent=x;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),1800)}
function applyLang(){document.documentElement.lang=ui;$$('[data-i18n]').forEach(e=>e.textContent=t(e.dataset.i18n));$$('[data-i18n-placeholder]').forEach(e=>e.placeholder=t(e.dataset.i18nPlaceholder));$('#uiLang').textContent=ui==='en'?'SV':'EN';renderRecent()}
$('#uiLang').onclick=()=>{ui=ui==='en'?'sv':'en';localStorage.loggUi=ui;applyLang()};
function show(id){$$('.view').forEach(v=>v.classList.remove('active'));$('#'+id).classList.add('active');scrollTo(0,0)}
function fmt(d){return new Intl.DateTimeFormat(ui==='sv'?'sv-FI':'en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(d))} function duration(ms){let s=Math.floor(ms/1000),m=Math.floor(s/60);return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function getLogs(){try{return JSON.parse(localStorage.loggLogs||'[]')}catch{return[]}} function saveLogs(x){localStorage.loggLogs=JSON.stringify(x)}
function renderRecent(){let x=getLogs(),el=$('#recentList');el.innerHTML=x.length?x.slice().reverse().slice(0,8).map(l=>`<div class="recent-item" data-id="${l.id}"><div><div class="recent-title">${esc(l.name)}</div><div class="recent-meta">${fmt(l.start)} · ${duration((l.end||l.start)-l.start)}</div></div><div>›</div></div>`).join(''):`<div class="empty">${t('empty')}</div>`;$$('.recent-item').forEach(e=>e.onclick=()=>openLog(e.dataset.id))}
function esc(s=''){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
$('#clearAll').onclick=()=>{if(confirm(ui==='sv'?'Rensa alla lokalt sparade LOGGar?':'Clear all locally saved LOGGs?')){saveLogs([]);renderRecent()}};
$('#startBtn').onclick=()=>{let name=$('#meetingName').value.trim();if(!name||!$('#consent').checked){toast(t('nameRequired'));return}current={id:Date.now().toString(),name,start:Date.now(),end:null,output:$('#outputLang').value,transcript:'',sections:null};finalText='';$('#transcript').value='';$('#liveTitle').textContent=name;$('#liveDate').textContent=fmt(current.start);show('live');startTimer();startSpeech()};
function startTimer(){clearInterval(tick);let f=()=>$('#timer').textContent=duration(Date.now()-current.start);f();tick=setInterval(f,1000)}
function speechDetail(msg=''){const el=$('#speechDetail');if(el)el.textContent=msg}
let recorder=null, stream=null, chunks=[], uploadBusy=false, chunkTimer=null, audioCtx=null, analyser=null, meterRAF=null, stopping=false, chunkBytes=0, chunkCount=0;
const DEBUG=new URLSearchParams(location.search).get('debug')==='1'; if(DEBUG) document.documentElement.classList.add('debug-mode');
function diag(msg){const el=$('#diagnostics');if(DEBUG&&el){const stamp=new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});el.textContent=stamp+' · '+msg+'\n'+el.textContent.split('\n').slice(0,5).join('\n')}}
const MARINE_HINTS=['superyacht','sailing yacht','Baltic Yachts','fairing','prepreg','infusion','lamination','bulkhead','deckhouse','passerelle','tender garage','beach club','sea trial','commissioning','classification','class','flag state','HVAC','AV IT','joinery','outfitting','rigging','carbon mast','boom','standing rigging','running rigging','hydraulics','composites','teak deck'];
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
    recorder.ondataavailable=e=>{if(e.data&&e.data.size){chunks.push(e.data);chunkBytes+=e.data.size;chunkCount++;diag('AUDIO '+chunkCount+' chunks · '+Math.round(chunkBytes/1024)+' KB')}};
    recorder.onstop=async()=>{
      clearTimeout(chunkTimer);
      const blob=new Blob(chunks,{type}); chunks=[];
      diag('STOP ✓ · '+Math.round(blob.size/1024)+' KB');
      if(!stopping&&!paused&&current&&!current.end){
        if(blob.size<800){diag('AUDIO TOO SMALL · restarting'); setTimeout(()=>beginRecorder(type),250); return;}
        await sendChunk(blob,(window.LOGG_CONFIG?.API_BASE||'').replace(/\/$/,''),type);
        if(!stopping&&!paused&&current&&!current.end)setTimeout(()=>beginRecorder(type),150);
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
async function sendChunk(blob,base,type){
  if(uploadBusy){diag('UPLOAD BUSY · skipped');return} if(blob.size<800){diag('AUDIO <800B · skipped');return} uploadBusy=true; diag('UPLOADING '+Math.round(blob.size/1024)+' KB');
  try{
    $('#speechStatus').textContent=ui==='sv'?'Transkriberar…':'Transcribing…';
    const ext=type.includes('mp4')?'m4a':type.includes('webm')?'webm':'audio';
    let fd=new FormData(); fd.append('audio',blob,'chunk.'+ext); fd.append('phrases',JSON.stringify(MARINE_HINTS));
    let r=await fetch(base+'/api/transcribe',{method:'POST',body:fd}); diag('GOOGLE HTTP '+r.status);
    if(!r.ok) throw Error(await r.text()); let j=await r.json();
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
$('#pauseBtn').onclick=()=>{paused=!paused;if(paused){stopSpeech(true);$('#pauseBtn').textContent=t('resume');$('#speechStatus').textContent=t('paused')}else{stopping=false;startSpeech();$('#pauseBtn').textContent=t('pause')}};
function leaveMeeting(){if(current){current.transcript=$('#transcript').value.trim();localStorage.loggDraft=JSON.stringify(current)} stopSpeech(true);clearInterval(tick);current=null;show('home');renderRecent()}
$('#backLive').onclick=leaveMeeting;
$('#stayBtn').onclick=()=>{$('#leaveDialog').hidden=true};
$('#leaveBtn').onclick=()=>{if(current){current.transcript=$('#transcript').value.trim();localStorage.loggDraft=JSON.stringify(current)} stopSpeech(true);clearInterval(tick);current=null;$('#leaveDialog').hidden=true;show('home');renderRecent()};
$('#finishBtn').onclick=()=>{stopSpeech(true);clearInterval(tick);current.end=Date.now();current.transcript=$('#transcript').value.trim();current.sections=structure(current.transcript,current.output);let logs=getLogs();logs.push(current);saveLogs(logs.slice(-50));openLog(current.id)};
function structure(text,lang){let lines=text.split(/(?<=[.!?])\s+|\n+/).map(s=>s.trim()).filter(Boolean);let actionRx=/(will|shall|need to|needs to|must|action|follow up|send|check|confirm|ska|måste|behöver|åtgärd|skicka|kolla|kontrollera|bekräfta)/i,decisionRx=/(decided|agreed|approved|decision|beslut|beslöt|överens|godkänd)/i,questionRx=/\?$|open question|öppen fråga|unclear|oklart/i;let actions=lines.filter(x=>actionRx.test(x)).slice(0,8),decisions=lines.filter(x=>decisionRx.test(x)).slice(0,6),questions=lines.filter(x=>questionRx.test(x)).slice(0,6);let summary=lines.slice(0,Math.min(4,lines.length)).join(' ');if(!summary)summary=lang==='sv'?'Inga anteckningar registrerades.':'No notes were captured.';return{summary,decisions:decisions.join('\n')||'—',actions:actions.map(x=>'☐ '+x).join('\n')||'—',questions:questions.join('\n')||'—',notes:text||'—'}}
function openLog(id){let l=getLogs().find(x=>x.id===id);if(!l)return;current=l;$('#resultTitle').textContent=l.name;$('#resultMeta').textContent=`${fmt(l.start)} · ${duration((l.end||l.start)-l.start)}`;let s=l.sections||structure(l.transcript,l.output);let defs=[['summary','summary'],['decisions','decisions'],['actions','actions'],['questions','questions'],['notes','notes']];$('#sections').innerHTML=defs.map(([k,label])=>`<div class="section-card"><h3>${t(label)}</h3><textarea data-key="${k}">${esc(s[k])}</textarea></div>`).join('');$$('#sections textarea').forEach(a=>a.oninput=()=>{current.sections[a.dataset.key]=a.value;let logs=getLogs(),i=logs.findIndex(x=>x.id===current.id);logs[i]=current;saveLogs(logs)});show('result')}
$('#backHome').onclick=()=>{show('home');renderRecent()};
function plain(){let s=current.sections;return `${current.name}\n${fmt(current.start)} · ${duration(current.end-current.start)}\n\n${t('summary')}\n${s.summary}\n\n${t('decisions')}\n${s.decisions}\n\n${t('actions')}\n${s.actions}\n\n${t('questions')}\n${s.questions}\n\n${t('notes')}\n${s.notes}`}
$('#copyBtn').onclick=async()=>{await navigator.clipboard.writeText(plain());toast(t('copied'))};
// Minimal store-only ZIP writer for a dependency-free .docx (OOXML package).
const crcTable=(()=>{let t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();function crc32(a){let c=0xffffffff;for(let b of a)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}function u16(n){return[n&255,n>>>8&255]}function u32(n){return[n&255,n>>>8&255,n>>>16&255,n>>>24&255]}function zip(files){let enc=new TextEncoder(),out=[],central=[],off=0;for(let [name,content] of files){let nb=enc.encode(name),data=enc.encode(content),crc=crc32(data),h=[0x50,0x4b,3,4,...u16(20),0,0,0,0,0,0,...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),0,0,...nb,...data];out.push(...h);central.push([name,nb,data,crc,off]);off+=h.length}let cstart=off;for(let [name,nb,data,crc,loff] of central){let h=[0x50,0x4b,1,2,...u16(20),...u16(20),0,0,0,0,0,0,...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),0,0,0,0,0,0,0,0,...u32(loff),...nb];out.push(...h);off+=h.length}let csize=off-cstart;out.push(0x50,0x4b,5,6,0,0,0,0,...u16(central.length),...u16(central.length),...u32(csize),...u32(cstart),0,0);return new Uint8Array(out)}
function xml(s){return String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]))}function p(text,bold=false,size=22){return `<w:p><w:r><w:rPr>${bold?'<w:b/>':''}<w:sz w:val="${size}"/><w:rFonts w:ascii="Manrope" w:hAnsi="Manrope"/></w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`}
$('#wordBtn').onclick=()=>{let s=current.sections,body=p('LOGG',true,34)+p('MEETINGS ON COURSE',false,16)+p(current.name,true,28)+p(`${fmt(current.start)} · ${duration(current.end-current.start)}`,false,18);for(let [title,key] of [[t('summary'),'summary'],[t('decisions'),'decisions'],[t('actions'),'actions'],[t('questions'),'questions'],[t('notes'),'notes']]){body+=p(title.toUpperCase(),true,20);for(let line of s[key].split('\n'))body+=p(line,false,21)}let files=[['[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],['_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],['word/document.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`]];let blob=new Blob([zip(files)],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`LOGG_${current.name.replace(/[^a-z0-9åäö_-]+/gi,'_')}.docx`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$('#revealStart').onclick=()=>{$('#startSheet').classList.remove('hidden');setTimeout(()=>$('#startSheet').scrollIntoView({behavior:'smooth',block:'start'}),50)};if('serviceWorker' in navigator){
  window.addEventListener('load', async()=>{
    try{
      const reg=await navigator.serviceWorker.register('./sw.js?v=0.3.2',{updateViaCache:'none'});
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
applyLang();renderRecent(); setTimeout(()=>diag('JS ✓ v0.3.3 · '+navigator.userAgent.slice(0,55)),50);
