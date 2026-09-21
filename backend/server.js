import express from 'express';
import cors from 'cors';
import multer from 'multer';
import {v2 as speechV2} from '@google-cloud/speech';

const app = express();
const upload = multer({storage: multer.memoryStorage(), limits:{fileSize:8*1024*1024}});
app.use(cors());
app.use((_,res,next)=>{res.set('Cache-Control','no-store');next()});

const region = process.env.GOOGLE_SPEECH_REGION || 'eu';
const project = process.env.GOOGLE_CLOUD_PROJECT;
const client = new speechV2.SpeechClient({apiEndpoint:`${region}-speech.googleapis.com`});

app.get('/',(_,res)=>res.json({ok:true,service:'LOGG Speech',version:'0.4.0'}));
app.get('/health',(_,res)=>res.json({
  ok:true, service:'LOGG Speech', model:'chirp_3', region, version:'0.4.0',
  projectConfigured:Boolean(project), endpoint:`${region}-speech.googleapis.com`
}));

app.post('/api/transcribe', upload.single('audio'), async(req,res)=>{
  try {
    if(!req.file) return res.status(400).send('Missing audio');
    if(!project) return res.status(500).send('GOOGLE_CLOUD_PROJECT missing');

    const recognizer = `projects/${project}/locations/${region}/recognizers/_`;
    console.log('STT request', {recognizer, endpoint:`${region}-speech.googleapis.com`, bytes:req.file.size, mime:req.file.mimetype});

    // Keep this first live test deliberately minimal. Once base transcription is
    // verified, LOGG Marine Lexicon/adaptation can be re-enabled separately.
    const [response] = await client.recognize({
      recognizer,
      config:{
        autoDecodingConfig:{},
        languageCodes:['auto'],
        model:'chirp_3',
        features:{enableAutomaticPunctuation:true}
      },
      content:req.file.buffer
    });

    const transcript=(response.results||[])
      .map(r=>r.alternatives?.[0]?.transcript||'')
      .join(' ').trim();
    const detectedLanguages=[...new Set((response.results||[]).map(r=>r.languageCode).filter(Boolean))];
    res.json({transcript, detectedLanguages, version:'0.4.0'});
  } catch(e) {
    console.error('STT ERROR', e);
    const code=e?.code ?? 'unknown';
    const details=e?.details || e?.message || 'Transcription failed';
    res.status(500).json({error:String(details), code:String(code), region, version:'0.4.0'});
  }
});

const port=process.env.PORT||8080;
app.listen(port,()=>console.log(`LOGG backend v0.4.0 on ${port}; STT=${region}-speech.googleapis.com`));
