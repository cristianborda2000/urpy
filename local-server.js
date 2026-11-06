const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname,dir=process.env.CHAT_DATA_DIR||path.join(root,'chat-data');fs.mkdirSync(dir,{recursive:true});
const conversationFile=path.join(dir,'conversation.json');
if(!fs.existsSync(conversationFile))fs.writeFileSync(conversationFile,JSON.stringify({room:require('node:crypto').randomBytes(24).toString('hex')}),{mode:0o600});
const conversation=JSON.parse(fs.readFileSync(conversationFile,'utf8'));
const maintenanceFile=path.join(dir,'maintenance.json');
let maintenance=fs.existsSync(maintenanceFile)?JSON.parse(fs.readFileSync(maintenanceFile,'utf8')):{enabled:false};
const maintenanceError={code:'MAINTENANCE',error:'Página em manutenção. Voltaremos em breve.'};
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
http.createServer(async(req,res)=>{try{
const url=new URL(req.url,'http://localhost');
if(url.pathname==='/api/conversation'&&req.method==='GET')return json(res,200,conversation);
if(url.pathname==='/api/maintenance'){
if(req.method==='GET')return json(res,200,{enabled:maintenance.enabled===true});
if(req.method!=='POST')return json(res,405,{});
if(req.headers.origin&&!['http://'+req.headers.host,'https://'+req.headers.host].includes(req.headers.origin))return json(res,403,{});
if(Number(req.headers['content-length'])>20000)return json(res,413,{});
let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>20000)return json(res,413,{});}
let v;try{v=JSON.parse(body)}catch{return json(res,400,{})}
if(!v||typeof v.enabled!=='boolean')return json(res,400,{});
const updated={enabled:v.enabled};
fs.writeFileSync(maintenanceFile+'.tmp',JSON.stringify(updated),{mode:0o600});
fs.renameSync(maintenanceFile+'.tmp',maintenanceFile);maintenance=updated;
return json(res,200,maintenance);
}
if(url.pathname==='/api/messages'){
const room=req.headers['x-chat-room'];if(!/^[a-f0-9]{48}$/.test(room||''))return json(res,400,{error:'Convite inválido'});
const file=path.join(dir,room+'.jsonl');const read=()=>fs.existsSync(file)?fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
if(req.method==='GET')return json(res,200,read());
if(req.method!=='POST')return json(res,405,{});
if(req.headers.origin&&!['http://'+req.headers.host,'https://'+req.headers.host].includes(req.headers.origin))return json(res,403,{});
if(maintenance.enabled)return json(res,503,maintenanceError);
let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>20000)return json(res,413,{});}
let v;try{v=JSON.parse(body)}catch{return json(res,400,{})}
if(!v||typeof v.name!=='string'||!v.name.trim()||v.name.length>40||typeof v.text!=='string'||!v.text.trim()||v.text.length>4000||!/^[a-f0-9]{48}$/.test(v.sender||'')||!/^[a-f0-9]{48}$/.test(v.id||''))return json(res,400,{});
if(maintenance.enabled)return json(res,503,maintenanceError);
const previous=read().find(m=>m.id===v.id&&m.sender===v.sender);if(previous)return json(res,200,previous);
const message={id:v.id,sender:v.sender,name:v.name.trim(),text:v.text.trim(),time:new Date().toISOString()};fs.appendFileSync(file,JSON.stringify(message)+'\n',{mode:0o600});return json(res,201,message);
}
if(!['GET','HEAD'].includes(req.method))return json(res,405,{});
const target=decodeURIComponent(url.pathname)==='/'?'index.html':decodeURIComponent(url.pathname).slice(1);
if(!['index.html','style.css','script.js','chat.html','chat.css','chat.js','responder.html','fenix.html','maintenance.js','maintenance.css'].includes(target)&&!target.startsWith('assets/'))return json(res,404,{});
const file=path.resolve(root,target);if(!file.startsWith(root+path.sep)||target.split('/').some(p=>p.startsWith('.'))||target.includes('\\'))return json(res,403,{});
fs.readFile(file,(err,data)=>{if(err)return json(res,404,{});const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mp3':'audio/mpeg','.jpg':'image/jpeg','.png':'image/png','.mp4':'video/mp4'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data)});
}catch(e){console.error(e.message);if(!res.headersSent)json(res,500,{error:'Não foi possível salvar ou carregar.'})}}).listen(Number(process.env.PORT||5500),process.env.HOST||'127.0.0.1',()=>console.log('Chat: http://localhost:'+(process.env.PORT||5500)+'/chat.html'));
