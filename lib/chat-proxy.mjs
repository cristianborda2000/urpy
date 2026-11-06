const upstream = 'https://urpy-conversa.sprysheep1.chatgpt.site';
const reply = (status, error) => Response.json({error}, {status, headers:{'Cache-Control':'no-store'}});
export async function proxyChat(request, route) {
  if (!['conversation', 'messages', 'maintenance'].includes(route)) return reply(404, 'Rota indisponivel.');
  const methods = route === 'conversation' ? ['GET'] : ['GET','POST'];
  if (!methods.includes(request.method)) return reply(405, 'Metodo indisponivel.');
  const origin = request.headers.get('origin');
  const url = new URL(request.url);
  if (request.method === 'POST' && origin && origin !== url.origin) return reply(403, 'Origem invalida.');
  const headers = new Headers({'Accept':'application/json'});
  if (route === 'messages') {
    const room = request.headers.get('x-chat-room');
    if (!/^[a-f0-9]{48}$/.test(room || '')) return reply(400, 'Conversa invalida.');
    headers.set('X-Chat-Room',room);
  }
  let body;
  if (request.method === 'POST') {
    if (Number(request.headers.get('content-length')) > 20000) return reply(413,'Mensagem muito grande.');
    const reader=request.body?.getReader();if(!reader)return reply(400,'Mensagem vazia.');
    const chunks=[];let length=0;
    while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>20000){await reader.cancel();return reply(413,'Mensagem muito grande.')}chunks.push(value)}
    body=new Uint8Array(length);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length}
    headers.set('Content-Type','application/json');
  }
  try {
    const response=await fetch(`${upstream}/api/${route}`,{method:request.method,headers,body,signal:AbortSignal.timeout(12000),redirect:'error'});
    if(!response.headers.get('content-type')?.includes('application/json'))return reply(502,'Servidor temporariamente indisponivel.');
    return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
  } catch { return reply(502,'Nao foi possivel conectar. Tente novamente.'); }
}
