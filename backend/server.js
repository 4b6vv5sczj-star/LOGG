import express from 'express';
import cors from 'cors';
import multer from 'multer';
import {v2 as speechV2} from '@google-cloud/speech';
import {initializeApp as initializeFirebaseApp, applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';

initializeFirebaseApp({credential: applicationDefault()});
const firebaseAuth = getAuth();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const MAX_AUDIO_BYTES = Number(process.env.MAX_AUDIO_BYTES || 8 * 1024 * 1024);
const RATE_WINDOW_MS = Number(process.env.RATE_WINDOW_MS || 60_000);
const RATE_MAX = Number(process.env.RATE_MAX || 30);
const DEFAULT_ORIGINS = [
  'https://4b6vv5sczj-star.github.io',
  'https://nimble-skein-lfs6l.web.app',
  'https://nimble-skein-lfs6l.firebaseapp.com',
  'http://localhost:8080',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];
const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS || DEFAULT_ORIGINS.join(','))
  .split(',').map(s => s.trim()).filter(Boolean));

const corsOptions = {
  origin(origin, cb) {
    // Native/PWA requests normally carry an Origin. Allow no-origin only for health checks.
    if (!origin || allowedOrigins.has(origin)) return cb(null, true);
    return cb(new Error('Origin not allowed'));
  },
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  maxAge: 3600
};
app.use(cors(corsOptions));
app.use((req,res,next)=>{
  res.set({
    'Cache-Control':'no-store, max-age=0',
    'Pragma':'no-cache',
    'X-Content-Type-Options':'nosniff',
    'X-Frame-Options':'DENY',
    'Referrer-Policy':'no-referrer',
    'Permissions-Policy':'camera=(), geolocation=(), payment=(), usb=()'
  });
  next();
});

// Lightweight per-instance abuse guard. Cloud Run/IAM or an authenticated gateway remains
// the production-grade control; this protects the public pilot endpoint from accidental floods.
const buckets = new Map();
function rateLimit(req,res,next){
  const now=Date.now();
  const key=req.ip || 'unknown';
  let b=buckets.get(key);
  if(!b || now-b.start>=RATE_WINDOW_MS){ b={start:now,count:0}; buckets.set(key,b); }
  b.count++;
  res.set('RateLimit-Limit', String(RATE_MAX));
  res.set('RateLimit-Remaining', String(Math.max(0,RATE_MAX-b.count)));
  if(b.count>RATE_MAX) return res.status(429).json({error:'Too many requests'});
  next();
}
setInterval(()=>{const now=Date.now(); for(const [k,b] of buckets) if(now-b.start>RATE_WINDOW_MS*2) buckets.delete(k)}, RATE_WINDOW_MS).unref();


const allowedEmails = new Set((process.env.AUTH_ALLOWED_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
async function requireIdentity(req,res,next){
  const header=String(req.get('Authorization')||'');
  if(!header.startsWith('Bearer ')) return res.status(401).json({error:'Authentication required'});
  try{
    const decoded=await firebaseAuth.verifyIdToken(header.slice(7).trim(), true);
    const email=String(decoded.email||'').toLowerCase();
    if(!decoded.email_verified) return res.status(403).json({error:'Verified Google account required'});
    if(allowedEmails.size && !allowedEmails.has(email)) return res.status(403).json({error:'Account not authorized for LOGG'});
    req.loggUser={uid:decoded.uid,email}; next();
  }catch(_){ return res.status(401).json({error:'Invalid or expired authentication'}); }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits:{fileSize:MAX_AUDIO_BYTES, files:1, fields:4}
});
const region = process.env.GOOGLE_SPEECH_REGION || 'eu';
const project = process.env.GOOGLE_CLOUD_PROJECT;
const client = new speechV2.SpeechClient({apiEndpoint:`${region}-speech.googleapis.com`});

app.get('/',(_,res)=>res.json({ok:true,service:'LOGG Speech',version:'0.12.0'}));
app.get('/health',(_,res)=>res.json({
  ok:true, service:'LOGG Speech', model:'chirp_3', region, version:'0.12.0',
  projectConfigured:Boolean(project), security:'identity-platform', authRequired:true, allowlistEnabled:allowedEmails.size>0
}));

app.post('/api/transcribe', rateLimit, requireIdentity, upload.single('audio'), async(req,res)=>{
  try {
    if(!req.file) return res.status(400).json({error:'Missing audio'});
    if(!project) return res.status(500).json({error:'Service configuration error'});
    if(!/^audio\//i.test(req.file.mimetype || '')) return res.status(415).json({error:'Unsupported media type'});

    const recognizer = `projects/${project}/locations/${region}/recognizers/_`;
    const allowedHints=new Set(['sv-SE','en-GB','fi-FI','es-ES']);
    const requestedHint=String(req.body?.languageHint||'');
    const languageCodes=allowedHints.has(requestedHint)?[requestedHint]:['auto'];

    // LOGG Speech Intelligence v1: use Chirp 3 model adaptation for yacht/project terminology.
    // Client phrases are treated as hints only, sanitized, deduplicated and capped server-side.
    let clientPhrases=[];
    try{
      const parsed=JSON.parse(String(req.body?.phrases||'[]'));
      if(Array.isArray(parsed)) clientPhrases=parsed;
    }catch(_){ /* malformed hints are ignored, never fatal */ }
    const serverPhrases=[
      'Baltic Yachts','superyacht','sailing yacht','naval architecture','classification society','DNV','Cayman Islands',
      'carbon composite','carbon fibre','carbon fiber','prepreg','laminate','bulkhead','scantling','load case','keel','rudder',
      'daggerboard','mast','boom','rigging','standing rigging','running rigging','Harken','Lewmar','Rondal','Hall Spars','North Sails',
      'HVAC','fancoil','bilge','bilge pump','sea trial','harbour trial','harbor trial','commissioning','inclining test','load test',
      'engine room','machinery','propulsion','steering','PLC','BMS','P&ID','owner representative','shipyard','subcontractor','handover'
    ];
    const cleanPhrase=v=>String(v||'').replace(/[\r\n\t]/g,' ').replace(/\s+/g,' ').trim().slice(0,100);
    const phraseValues=[...new Set([...serverPhrases,...clientPhrases].map(cleanPhrase).filter(v=>v.length>=2))].slice(0,250);
    const adaptation=phraseValues.length?{
      phraseSets:[{inlinePhraseSet:{
        phrases:phraseValues.map(value=>({value,boost:8})),
        displayName:'LOGG marine project vocabulary'
      }}]
    }:undefined;

    // Deliberately do not log transcript, audio, language content, filenames, hints or request bodies.
    const [response] = await client.recognize({
      recognizer,
      config:{
        autoDecodingConfig:{},
        languageCodes,
        model:'chirp_3',
        features:{enableAutomaticPunctuation:true},
        ...(adaptation?{adaptation}:{})
      },
      content:req.file.buffer
    });
    const transcript=(response.results||[]).map(r=>r.alternatives?.[0]?.transcript||'').join(' ').trim();
    const detectedLanguages=[...new Set((response.results||[]).map(r=>r.languageCode).filter(Boolean))];
    res.json({transcript, detectedLanguages, version:'0.12.0'});
  } catch(e) {
    // Keep server-side diagnostics content-free and return a generic client error.
    console.error('STT request failed', {code:String(e?.code ?? 'unknown')});
    res.status(500).json({error:'Transcription failed', code:String(e?.code ?? 'unknown'), version:'0.12.0'});
  }
});

app.use((err,req,res,next)=>{
  if(err?.code==='LIMIT_FILE_SIZE') return res.status(413).json({error:'Audio chunk too large'});
  if(err?.message==='Origin not allowed') return res.status(403).json({error:'Origin not allowed'});
  console.error('Request rejected', {type:err?.name || 'Error'});
  res.status(400).json({error:'Request rejected'});
});

const port=process.env.PORT||8080;
app.listen(port,()=>console.log(`LOGG backend v0.12.0 ready; region=${region}; allowedOrigins=${allowedOrigins.size}`));
