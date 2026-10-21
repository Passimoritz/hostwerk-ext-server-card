// Server-Steckbrief – Seite: alles Wichtige über diesen PC und seine Dienste auf einer Seite (druckbar, kopierbar).
const { html, t } = Hostwerk;
const C = ServerCard;
let card = null; // zuletzt geladener Steckbrief (ungekürzt)
let hideAddresses = false; // „Ohne Adressen“: zum Teilen ohne IPs, Webadressen und Domains
const KEYS = ['title', 'system', 'ip', 'ipPublic', 'cpu', 'cores', 'ram', 'used', 'uptime', 'port', 'certs', 'certMissing', 'daysLeft', 'ports', 'port.blocked', 'port.duplicate',
  ...C.KINDS.map((k) => 'kind.' + k), 'kind.other', 'state.running', 'state.stopped', 'state.error', 'state.starting', 'state.stopping'];
const locale = () => (Hostwerk.lang === 'de' ? 'de-DE' : 'en-GB');
const stamp = (ts) => new Date(ts).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' }); // Ortszeit, nicht UTC
const num = (n) => Hostwerk.fmt.number(n);
const shown = () => (card && hideAddresses ? C.redact(card) : card);
const $ = (id) => document.getElementById(id);

async function load() {
  let res, o;
  try { [res, o] = await Promise.all([Hostwerk.get('/system/resources'), Hostwerk.get('/overview')]); } catch (e) {
    // Ohne Grunddaten kein Steckbrief – deutlich sagen statt ewig das Skelett zu zeigen
    if (!card) {
      Hostwerk.render('#machine', html`<div class="empty"><h3>${t('loadFailed')}</h3><p class="small muted">${(e && e.message) || ''}</p><div class="empty-action"><button type="button" class="btn" id="retry">${t('retry')}</button></div></div>`);
      $('retry').addEventListener('click', load);
    } else $('stamp').textContent = t('staleSince', { time: stamp(card.at) });
    return;
  }
  // Zusätze: fehlt ein Recht oder eine Erweiterung (Router), fehlt nur dieser Teil
  const [net, certs, ports] = await Promise.all([
    Hostwerk.get('/router').catch(() => null),
    Hostwerk.get('/live/certs').catch(() => null),
    Hostwerk.get('/system/ports').catch(() => null),
  ]);
  const list = C.fromOverview(o);
  card = {
    at: Date.now(), about: C.about(o), machine: C.machine(res), groups: C.services(list), up: list.filter((s) => s.state === 'running').length, all: list.length,
    network: net ? { localIp: net.localIp || null, externalIp: net.externalIp || null } : null, certs: C.certs(certs), ports: C.ports(ports),
  };
  render();
}

function render() {
  const c = shown();
  if (!c) return;
  const m = c.machine;
  $('stamp').textContent = t('stamp', { time: stamp(c.at) });
  Hostwerk.render('#machine', html`
    <div class="card card-pad stat"><div class="k">${t('system')}</div><div class="v small-v">${c.about.os || '–'}</div><div class="tiny muted">${c.about.version ? `Hostwerk ${c.about.version}` : ''}</div></div>
    <div class="card card-pad stat"><div class="k">${t('cpu')}</div><div class="v small-v">${m.cpu || '–'}</div><div class="tiny muted">${m.cores ? t('coresN', { n: m.cores }) : ''}${m.avgCpu != null ? ` · ${t('load', { n: m.avgCpu })}` : ''}</div></div>
    <div class="card card-pad stat"><div class="k">${t('ram')}</div><div class="v">${m.ramGB ? `${num(m.ramGB)} GB` : '–'}</div><div class="tiny muted">${m.ramUsedPct != null ? t('usedPct', { n: m.ramUsedPct }) : ''}</div></div>
    <div class="card card-pad stat"><div class="k">${t('uptime')}</div><div class="v">${m.uptimeMs ? Hostwerk.fmt.duration(m.uptimeMs) : '–'}</div></div>
    <div class="card card-pad stat"><div class="k">${t('services')}</div><div class="v">${num(c.up)} / ${num(c.all)}</div><div class="tiny muted">${t('running')}</div></div>
    ${c.network ? html`<div class="card card-pad stat"><div class="k">${t('ip')}</div><div class="v small-v mono">${c.network.localIp || (hideAddresses ? t('hidden') : '–')}</div><div class="tiny muted">${c.network.externalIp ? `${t('ipPublic')} ${c.network.externalIp}` : ''}</div></div>` : ''}`);
  Hostwerk.render('#services', c.groups.length ? html`${c.groups.map((g) => html`<div class="card card-pad"><h3 class="card-title group-title">${t('kind.' + g.kind)}</h3><table class="table"><tbody>${g.items.map((s) => html`<tr><td><span class="dot ${s.state === 'running' ? 'ok' : s.state === 'error' ? 'err' : ''}"></span> ${s.name}</td><td class="muted">${t('state.' + s.state)}</td><td class="mono">${s.port || ''}</td><td class="ellipsis">${s.url || ''}</td></tr>`)}</tbody></table></div>`)}` : html`<div class="empty">${t('empty')}</div>`);
  Hostwerk.render('#extra', html`
    ${c.certs.length ? html`<div class="card card-pad"><h3 class="card-title group-title">${t('certs')}</h3><table class="table"><tbody>${c.certs.map((x) => html`<tr><td>${x.name}</td><td class="right"><span class="badge ${x.daysLeft == null ? 'warn' : x.daysLeft < 14 ? 'err' : x.daysLeft < 30 ? 'warn' : 'ok'}">${x.daysLeft == null ? t('certMissing') : t('daysLeft', { n: num(x.daysLeft) })}</span></td></tr>`)}</tbody></table></div>` : ''}
    ${c.ports.length ? html`<div class="card card-pad"><h3 class="card-title group-title">${t('ports')}</h3><table class="table"><tbody>${c.ports.map((p) => html`<tr><td class="mono">${p.port}</td><td>${p.name}</td><td class="right">${p.status === 'blocked' || p.status === 'duplicate' ? html`<span class="badge warn">${t('port.' + p.status)}</span>` : ''}</td></tr>`)}</tbody></table></div>` : ''}`);
}

function labels() { return Object.fromEntries(KEYS.map((k) => [k, t(k)])); }
$('copy').addEventListener('click', async () => {
  if (!card) return;
  try { await Hostwerk.copy(C.asText(shown(), labels(), { stamp: stamp(card.at), duration: Hostwerk.fmt.duration, number: num })); Hostwerk.toast(t('copied'), { kind: 'success' }); } catch { Hostwerk.toast(t('copyFailed'), { kind: 'error' }); }
});
$('json').addEventListener('click', async () => {
  if (!card) return;
  try { await Hostwerk.copy(C.asJson(shown())); Hostwerk.toast(t('copiedJson'), { kind: 'success' }); } catch { Hostwerk.toast(t('copyFailed'), { kind: 'error' }); }
});
// PDF: der Druckdialog bietet „Als PDF speichern“ – die Druckansicht blendet die Knöpfe aus
$('print').addEventListener('click', () => window.print());
$('noAddr').addEventListener('change', (e) => { hideAddresses = e.target.checked; render(); });

// Nachladen alle 30 s – nur solange die Seite sichtbar ist
setInterval(() => { if (!document.hidden) load(); }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && card && Date.now() - card.at > 30000) load(); });
Hostwerk.ready().then(() => { load(); Hostwerk.on('service', load); Hostwerk.on('lang', render); });
