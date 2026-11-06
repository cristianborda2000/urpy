(() => {
  'use strict';
  const responder = document.body.dataset.responder === 'true';
  const button = document.getElementById('maintenance-toggle');
  const status = document.getElementById('maintenance-status');
  let enabled = false, known = false, saving = false, revision = 0;
  let error = '', previousFocus = null;

  const screen = document.createElement('section');
  screen.className = 'maintenance-screen';
  screen.hidden = true;
  screen.setAttribute('aria-labelledby', 'maintenance-title');
  screen.innerHTML = '<div class="maintenance-card"><span class="maintenance-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/></svg></span><p class="maintenance-eyebrow">UMA BREVE PAUSA</p><h1 id="maintenance-title" tabindex="-1">Página em manutenção</h1><p>Estamos cuidando de alguns detalhes.<br>Voltaremos em breve.</p><span class="maintenance-return" role="status">Esta página volta automaticamente assim que estiver disponível.</span></div>';
  if (!responder) document.body.append(screen);

  function render() {
    const visibilityChanged = !responder && screen.hidden === enabled;
    if (visibilityChanged && enabled) previousFocus = document.activeElement;
    document.body.dataset.maintenance = String(enabled);
    if (button) {
      button.disabled = !known || saving;
      button.textContent = saving ? 'Salvando…' : !known ? 'Verificando…' : enabled ? 'Encerrar manutenção' : 'Ativar manutenção';
      button.setAttribute('aria-pressed', String(enabled));
      button.setAttribute('aria-busy', String(saving));
    }
    if (status) {
      const statusText = error || (enabled
        ? 'Manutenção ativa. Os visitantes veem o aviso e o envio está pausado.'
        : known ? 'Página disponível para conversar.' : 'Verificando o estado da página…');
      if (status.textContent !== statusText) status.textContent = statusText;
    }
    if (visibilityChanged) {
      screen.hidden = !enabled;
      if (enabled) {
        screen.querySelector('h1').focus({ preventScroll: true });
      }
    }
    window.dispatchEvent(new CustomEvent('maintenancechange', { detail: { enabled, known } }));
    if (visibilityChanged && !enabled && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }

  function apply(value) {
    if (typeof value?.enabled !== 'boolean') throw Error('Estado inválido');
    enabled = value.enabled;
    known = true;
    error = '';
    render();
  }

  async function refresh() {
    if (saving) return;
    const startedAt = revision;
    try {
      const response = await fetch('/api/maintenance', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw Error();
      const value = await response.json();
      if (startedAt === revision && !saving) apply(value);
    } catch {
      if (startedAt !== revision || saving) return;
      error = 'Não foi possível verificar a página. Tentando conectar novamente…';
      render();
    }
  }

  async function toggle() {
    if (!known || saving) return;
    saving = true;
    revision++;
    error = '';
    render();
    try {
      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw Error();
      apply(await response.json());
    } catch {
      error = 'Não foi possível confirmar a alteração. Tente novamente.';
    } finally {
      saving = false;
      revision++;
      render();
    }
  }

  window.urpyMaintenance = Object.freeze({
    get enabled() { return enabled; },
    // A send can encounter maintenance before the next status poll.
    markActive() { revision++; apply({ enabled: true }); }
  });
  button?.addEventListener('click', toggle);
  async function poll() {
    await refresh();
    setTimeout(poll, 2000);
  }
  render();
  if (location.protocol !== 'file:') poll();
  else if (status) status.textContent = 'Abra pelo endereço do servidor para controlar a manutenção.';
})();
