import express from 'express'; import cors from 'cors'; import multer from 'multer'; import {v2 as speechV2} from '@google-cloud/speech';
const app=express(), upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024}}); app.use(cors());
const client=new speechV2.SpeechClient({apiEndpoint:`${process.env.GOOGLE_SPEECH_REGION||'eu'}-speech.googleapis.com`});
app.get('/health',(_,res)=>res.json({ok:true,service:'LOGG Speech',model:'chirp_3'}));
app.post('/api/transcribe',upload.single('audio'),async(req,res)=>{try{if(!req.file)return res.status(400).send('Missing audio'); const project=process.env.GOOGLE_CLOUD_PROJECT, region=process.env.GOOGLE_SPEECH_REGION||'eu'; if(!project)return res.status(500).send('GOOGLE_CLOUD_PROJECT missing'); let phrases=[];try{phrases=JSON.parse(req.body.phrases||'[]').slice(0,1000)}catch{};
const adaptation=phrases.length?{phraseSets:[{inlinePhraseSet:{phrases:phrases.map(value=>({value}))}}]}:undefined;
const [response]=await client.recognize({recognizer:`projects/${project}/locations/${region}/recognizers/_`,config:{autoDecodingConfig:{},languageCodes:['auto'],model:'chirp_3',features:{enableAutomaticPunctuation:true},adaptation},content:req.file.buffer});
const transcript=(response.results||[]).map(r=>r.alternatives?.[0]?.transcript||'').join(' ').trim();res.json({transcript});}catch(e){console.error(e);res.status(500).send(e.message||'Transcription failed')}});
const port=process.env.PORT||8080;app.listen(port,()=>console.log(`LOGG backend on ${port}`));
