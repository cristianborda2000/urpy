import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import maintenanceProxy from './api/maintenance.mjs';
import messagesProxy from './api/messages.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const directory = mkdtempSync(path.join(tmpdir(), 'chat-maintenance-test-'));
const port = String(20000 + Math.floor(Math.random() * 20000));
const base = `http://127.0.0.1:${port}`;
const expectedError = { code: 'MAINTENANCE', error: 'Página em manutenção. Voltaremos em breve.' };
const message = { id: 'b'.repeat(48), sender: 'c'.repeat(48), name: 'Teste', text: 'Histórico preservado' };
let server;

async function start() {
  server = spawn(process.execPath, ['local-server.js'], {
    cwd: root, env: { ...process.env, PORT: port, HOST: '127.0.0.1', CHAT_DATA_DIR: directory }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('Servidor não iniciou')), 5000);
    server.stdout.once('data', () => { clearTimeout(timeout); resolve(); });
    server.once('error', error => { clearTimeout(timeout); reject(error); });
    server.once('exit', code => { clearTimeout(timeout); reject(Error(`Servidor encerrou: ${code}`)); });
  });
}

async function stop() {
  if (!server || server.exitCode !== null) { server = null; return; }
  const current = server;
  await new Promise(resolve => { current.once('exit', resolve); current.kill(); });
  server = null;
}

const localPost = (route, body, headers = {}) => fetch(base + route, {
  method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', ...headers }, body,
});

try {
  await start();
  const { room } = await (await fetch(base + '/api/conversation')).json();
  const headers = { 'X-Chat-Room': room };
  const history = async () => (await fetch(base + '/api/messages', { headers })).json();
  const state = async () => (await fetch(base + '/api/maintenance')).json();
  assert.deepEqual(await state(), { enabled: false });
  for (const body of ['{', 'null', '{}', '{"enabled":"true"}']) {
    assert.equal((await localPost('/api/maintenance', body)).status, 400);
  }
  assert.equal((await localPost('/api/maintenance', '{"enabled":true}', { Origin: 'https://other.example' })).status, 403);
  assert.equal((await localPost('/api/maintenance', 'x'.repeat(20001))).status, 413);
  assert.equal((await fetch(base + '/api/maintenance', { method: 'PUT' })).status, 405);
  assert.equal((await localPost('/api/messages', JSON.stringify(message), headers)).status, 201);
  assert.equal((await localPost('/api/maintenance', '{"enabled":true}')).status, 200);
  assert.deepEqual(await state(), { enabled: true });
  for (const sender of ['c'.repeat(48), 'd'.repeat(48)]) {
    const blocked = await localPost('/api/messages', JSON.stringify({ ...message, sender }), headers);
    assert.equal(blocked.status, 503);
    assert.deepEqual(await blocked.json(), expectedError);
  }
  assert.equal((await history()).length, 1);
  await stop();
  await start();
  assert.deepEqual(await state(), { enabled: true });
  assert.equal((await localPost('/api/messages', JSON.stringify(message), headers)).status, 503);
  assert.equal((await history())[0].text, message.text);
  assert.equal((await fetch(base + '/chat-data/maintenance.json')).status, 404);
  assert.equal((await localPost('/api/maintenance', '{"enabled":false}')).status, 200);
  assert.equal((await localPost('/api/messages', JSON.stringify({ ...message, id: 'e'.repeat(48) }), headers)).status, 201);
  assert.equal((await history()).length, 2);
  await stop();
  await start();
  assert.deepEqual(await state(), { enabled: false });
  assert.equal((await history()).length, 2);
  console.log('PASS: manutenção local, validações, bloqueio, histórico e persistência após reinício.');
} finally {
  await stop();
  for (const filename of readdirSync(directory)) unlinkSync(path.join(directory, filename));
  rmdirSync(directory);
}

const realFetch = globalThis.fetch;
try {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    assert.equal(options.headers.get('origin'), null);
    return url.endsWith('/maintenance') ? Response.json({ enabled: options.method === 'POST' }) : Response.json(expectedError, { status: 503 });
  };
  const origin = 'https://urpy.com.br';
  const post = (body, headers = {}) => new Request(origin + '/api/maintenance', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body,
  });
  assert.deepEqual(await (await maintenanceProxy.fetch(new Request(origin + '/api/maintenance'))).json(), { enabled: false });
  assert.deepEqual(await (await maintenanceProxy.fetch(post('{"enabled":true}'))).json(), { enabled: true });
  assert.equal(requests[1].url, 'https://urpy-conversa.sprysheep1.chatgpt.site/api/maintenance');
  assert.equal(requests[1].options.headers.get('x-chat-room'), null);
  assert.deepEqual(JSON.parse(new TextDecoder().decode(requests[1].options.body)), { enabled: true });
  assert.equal((await maintenanceProxy.fetch(post('{"enabled":true}', { Origin: 'https://other.example' }))).status, 403);
  assert.equal((await maintenanceProxy.fetch(post('x'.repeat(20001)))).status, 413);
  assert.equal((await maintenanceProxy.fetch(new Request(origin + '/api/maintenance', { method: 'DELETE' }))).status, 405);
  assert.equal(requests.length, 2);
  const blocked = await messagesProxy.fetch(new Request(origin + '/api/messages', {
    method: 'POST', headers: { 'X-Chat-Room': 'a'.repeat(48), Origin: origin }, body: JSON.stringify(message),
  }));
  assert.equal(blocked.status, 503);
  assert.equal(blocked.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await blocked.json(), expectedError);
  console.log('PASS: proxy de manutenção, validações e propagação de 503 sem gravar em servidor remoto.');
} finally { globalThis.fetch = realFetch; }

// Execute the actual TypeScript route handlers against SQLite using the D1 method shape.
const sites = path.join(root, 'sites/urpy-online');
const require = createRequire(path.join(sites, 'package.json'));
const ts = require('typescript');
function loadRoute(relative, dependencies) {
  const filename = path.join(sites, relative);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, filename,
  });
  const exports = {};
  runInNewContext(outputText, { exports, require: id => {
    if (!(id in dependencies)) throw Error(`Unexpected dependency: ${id}`);
    return dependencies[id];
  }, Response, TextDecoder, URL }, { filename });
  return exports;
}

const sqlite = new DatabaseSync(':memory:');
try {
  for (const filename of readdirSync(path.join(sites, 'drizzle')).filter(name => name.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(path.join(sites, 'drizzle', filename), 'utf8'));
  }
  const room = 'a'.repeat(48);
  sqlite.prepare('INSERT INTO conversations (id,room) VALUES (?,?)').run('default', room);
  let beforeMessageWrite, afterMessageWrite;
  const db = { prepare(sql) {
    return { bind(...values) {
      return {
        async first() { return sqlite.prepare(sql).get(...values) ?? null; },
        async all() { return { results: sqlite.prepare(sql).all(...values) }; },
        async run() {
          if (sql.startsWith('INSERT OR IGNORE INTO messages') && beforeMessageWrite) {
            beforeMessageWrite(); beforeMessageWrite = null;
          }
          const changes = sqlite.prepare(sql).run(...values).changes;
          if (sql.startsWith('INSERT OR IGNORE INTO messages') && afterMessageWrite) {
            afterMessageWrite(); afterMessageWrite = null;
          }
          return { meta: { changes } };
        },
      };
    } };
  } };
  const helper = loadRoute('lib/maintenance.ts', {});
  const dependencies = { 'cloudflare:workers': { env: { DB: db } }, '../../../lib/maintenance': helper };
  const maintenance = loadRoute('app/api/maintenance/route.ts', dependencies);
  const messages = loadRoute('app/api/messages/route.ts', dependencies);
  const request = (route, body, headers = {}) => new Request('https://site.example/api/' + route, {
    method: 'POST', headers: { Origin: 'https://site.example', 'Content-Type': 'application/json', 'X-Chat-Room': room, ...headers }, body,
  });
  const history = () => messages.GET(new Request('https://site.example/api/messages', { headers: { 'X-Chat-Room': room } }));
  assert.deepEqual(await (await maintenance.GET()).json(), { enabled: false });
  for (const body of ['{', 'null', '{}', '{"enabled":"true"}']) assert.equal((await maintenance.POST(request('maintenance', body))).status, 400);
  assert.equal((await maintenance.POST(request('maintenance', 'x'.repeat(20001)))).status, 413);
  assert.equal((await maintenance.POST(request('maintenance', '{"enabled":true}', { Origin: 'https://other.example' }))).status, 403);
  assert.equal((await messages.POST(request('messages', JSON.stringify(message)))).status, 201);
  assert.equal((await maintenance.POST(request('maintenance', '{"enabled":true}'))).status, 200);
  assert.deepEqual(await (await maintenance.GET()).json(), { enabled: true });
  const blocked = await messages.POST(request('messages', JSON.stringify({ ...message, id: 'e'.repeat(48) })));
  assert.equal(blocked.status, 503);
  assert.deepEqual(await blocked.json(), expectedError);
  assert.equal((await (await history()).json()).length, 1);
  await maintenance.POST(request('maintenance', '{"enabled":false}'));
  assert.equal((await messages.POST(request('messages', JSON.stringify({ ...message, id: 'e'.repeat(48) })))).status, 201);
  beforeMessageWrite = () => sqlite.prepare('UPDATE site_maintenance SET enabled=1 WHERE id=?').run('default');
  assert.equal((await messages.POST(request('messages', JSON.stringify({ ...message, id: 'f'.repeat(48) })))).status, 503);
  assert.equal((await (await history()).json()).length, 2);
  await maintenance.POST(request('maintenance', '{"enabled":false}'));
  beforeMessageWrite = () => sqlite.prepare('UPDATE site_maintenance SET enabled=1 WHERE id=?').run('default');
  afterMessageWrite = () => sqlite.prepare('UPDATE site_maintenance SET enabled=0 WHERE id=?').run('default');
  assert.equal((await messages.POST(request('messages', JSON.stringify({ ...message, id: 'f'.repeat(48) })))).status, 503);
  assert.equal((await (await history()).json()).length, 2);
  console.log('PASS: rotas Sites, migrações SQL, bloqueio durante envio, retomada e histórico preservado.');
} finally { sqlite.close(); }
