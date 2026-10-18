// Server-Steckbrief – Seite: alles Wichtige über diesen PC und seine Dienste auf einer Seite (druckbar, kopierbar).
const { html, t } = Hostwerk;
const C = ServerCard;
let last = null;
const KEYS = ['title', 'cpu', 'cores', 'ram', 'used', 'port', 'kind.web', 'kind.db', 'kind.minecraft', 'kind.app', 'kind.mail', 'state.running', 'state.stopped', 'state.error', 'state.starting', 'state.stopping'];
async function load() {
  const [res, list] = await Promise.all([Hostwerk.get('/system/resources'), Hostwerk.services()]);
  const m = C.machine(res); const groups = C.services(list);
  last = { m, groups };
  const running = list.filter((s) => s.state === 'running').length;
  document.getElementById('stamp').textContent = t('stamp', { time: new Date().toLocaleString(Hostwerk.lang === 'de' ? 'de-DE' : 'en-US') });
  Hostwerk.render('#machine', html`
    <div class="card card-pad stat"><div class="k">${t('cpu')}</div><div class="v small-v">${m.cpu || '–'}</div><div class="tiny muted">${m.cores ? t('coresN', { n: m.cores }) : ''}${m.avgCpu != null ? ` · ${t('load', { n: m.avgCpu })}` : ''}</div></div>
    <div class="card card-pad stat"><div class="k">${t('ram')}</div><div class="v">${m.ramGB ? `${m.ramGB} GB` : '–'}</div><div class="tiny muted">${m.ramUsedPct != null ? t('usedPct', { n: m.ramUsedPct }) : ''}</div></div>
    <div class="card card-pad stat"><div class="k">${t('uptime')}</div><div class="v">${m.uptimeMs ? Hostwerk.fmt.duration(m.uptimeMs) : '–'}</div></div>
    <div class="card card-pad stat"><div class="k">${t('services')}</div><div class="v">${running} / ${list.length}</div><div class="tiny muted">${t('running')}</div></div>`);
  Hostwerk.render('#services', groups.length ? html`${groups.map((g) => html`<div class="card card-pad"><h3 class="card-title" style="margin:0 0 8px;font-size:14px">${t('kind.' + g.kind)}</h3><table class="table"><tbody>${g.items.map((s) => html`<tr><td><span class="dot ${s.state === 'running' ? 'ok' : s.state === 'error' ? 'err' : ''}"></span> ${s.name}</td><td class="muted">${t('state.' + s.state)}</td><td class="mono">${s.port || ''}</td><td class="ellipsis">${s.url || ''}</td></tr>`)}</tbody></table></div>`)}` : html`<div class="empty">${t('empty')}</div>`);
}
document.getElementById('copy').addEventListener('click', async () => {
  if (!last) return;
  const labels = Object.fromEntries(KEYS.map((k) => [k, t(k)]));
  try { await Hostwerk.copy(C.asText(last.m, last.groups, labels)); Hostwerk.toast(t('copied'), { kind: 'success' }); } catch { Hostwerk.toast(t('copyFailed'), { kind: 'error' }); }
});
document.getElementById('print').addEventListener('click', () => window.print());
Hostwerk.ready().then(() => { load(); setInterval(load, 30000); Hostwerk.on('service', load); Hostwerk.on('lang', load); });
