import { proxyChat } from '../lib/chat-proxy.mjs';
export default { fetch(request) { return proxyChat(request, 'maintenance'); } };
