// Server-Steckbrief – Reiter unter System: alles Wichtige über diesen PC und seine Dienste (druckbar, kopierbar, mit Vergleich).
const { html, raw, t } = Hostwerk;
const C = ServerCard;
let card = null; // zuletzt geladener Steckbrief (ungekürzt)
let hideAddresses = false; // „Ohne Adressen“: zum Teilen ohne IPs, Webadressen und Domains
let deviceName = ''; // optionaler Name dieses PCs (Hostwerk.storage)
let saved = null; // gemerkter Stand für „Vergleich zu vorher“ ({ at, … } aus C.snapshot) – null = noch keiner
let firstSnap = false; // gerade zum ersten Mal gemerkt
let extras = { at: 0 }; // Zusätze (Router, Zertifikate, Ports, Laufwerk, Sicherheit) – höchstens jede Minute neu
let secAt = 0; // Sicherheitslage prüft Firewall & Co. – höchstens alle 5 Minuten
let loading = false;
const $ = (id) => document.getElementById(id);
const locale = () => (Hostwerk.lang === 'de' ? 'de-DE' : 'en-GB');
const stamp = (ts) => new Date(ts).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' }); // Ortszeit, nicht UTC
const num = (n) => Hostwerk.fmt.number(n);
const shown = () => (card && hideAddresses ? C.redact(card) : card);
const fmt = () => ({ stamp: stamp(card.at), duration: Hostwerk.fmt.duration, number: num, bytes: Hostwerk.fmt.bytes });
const kindLabel = (k) => t('kind.' + (C.KINDS.includes(k) ? k : 'other'));

// Linien-Symbole wie in Hostwerk (Lucide-Stil), Farbe aus dem Text
const svg = (d) => raw(`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`);
const I = {
  share: svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>'),
  down: svg('<path d="m6 9 6 6 6-6"/>'),
  copy: svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  doc: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>'),
  code: svg('<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>'),
  shield: svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
  print: svg('<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  refresh: svg('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'),
  pencil: svg('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  open: svg('<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
  info: svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'),
  bookmark: svg('<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>'),
};
let tipSeq = 0;
/** ⓘ mit Erklärung – Hostwerks InfoTip (Klassen aus dem Baukasten), öffnet bei Zeigen, Fokus und Klick. */
const tip = (label, text) => { const id = `tip-${++tipSeq}`; return html`<span class="info-tip"><button type="button" class="info-tip-btn" aria-label="${label}" aria-describedby="${id}">${I.info}</button><span class="info-tip-pop" role="tooltip" id="${id}"><b>${label}</b><span class="info-tip-body">${text}</span></span></span>`; };
/** Balken für Anteile (CPU, Speicher, Laufwerk): ab 80 % gelb, ab 90 % rot. */
const meter = (n, label) => (n == null ? '' : html`<div class="meter ${n >= 90 ? 'err' : n >= 80 ? 'warn' : ''}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${n}" aria-label="${label}: ${n} %"><span style="width: ${Math.max(2, n)}%"></span></div>`);
const dotClass = (st) => (st === 'running' ? 'ok' : st === 'error' ? 'err' : st === 'starting' || st === 'stopping' ? 'warn' : '');

async function load(force) {
  if (loading) return;
  loading = true;
  try {
    let res, o;
    try { [res, o] = await Promise.all([Hostwerk.get('/system/resources'), Hostwerk.get('/overview')]); } catch (e) {
      // Ohne Grunddaten kein Steckbrief – deutlich sagen statt ewig das Skelett zu zeigen
      if (!card) {
        Hostwerk.render('#main', html`<div class="empty"><h3>${t('loadFailed')}</h3><p class="small muted">${(e && e.message) || ''}</p><div class="empty-action"><button type="button" class="btn" id="retry">${t('retry')}</button></div></div>`);
        $('retry').addEventListener('click', () => load(true));
      } else $('stamp').textContent = t('staleSince', { time: stamp(card.at) });
      return;
    }
    // Zusätze: fehlt ein Recht oder eine Erweiterung (Router), fehlt nur dieser Teil
    if (force || Date.now() - extras.at > 60000) {
      const sec = force || Date.now() - secAt > 300000;
      const [router, certs, ports, du, security] = await Promise.all([
        Hostwerk.get('/router').catch(() => null), Hostwerk.get('/live/certs').catch(() => null), Hostwerk.get('/system/ports').catch(() => null),
        Hostwerk.get('/system/disk-usage').catch(() => null), sec ? Hostwerk.get('/live/security').catch(() => null) : Promise.resolve(extras.security),
      ]);
      if (sec) secAt = Date.now();
      // Laufwerk wird im Hintergrund berechnet – bis dahin den letzten Stand behalten und bald nachfragen
      extras = { at: du && du.computing ? Date.now() - 50000 : Date.now(), router, certs, ports, du: du && du.computing && extras.du ? extras.du : du, security: security || null };
    }
    const list = C.fromOverview(o);
    card = {
      at: Date.now(), name: deviceName || null, about: { ...C.about(o), uiPort: C.uiPort(extras.ports) }, machine: C.machine(res), disk: C.disk(extras.du),
      network: C.network(extras.router), groups: C.services(list), up: list.filter((s) => s.state === 'running').length, all: list.length,
      certs: C.certs(extras.certs), ports: C.ports(extras.ports), software: C.software(o, list), security: C.security(extras.security),
      down: (o.live && Array.isArray(o.live.down)) ? o.live.down : [],
    };
    card.health = C.health(card);
    // Vergleichsstand: beim allerersten Mal still merken, damit es beim nächsten Besuch etwas zu vergleichen gibt
    if (saved === null) {
      const s = await Hostwerk.storage.get('snapshot').catch(() => null);
      if (s && s.at) saved = s; else { saved = C.snapshot(card); firstSnap = true; Hostwerk.storage.set('snapshot', saved).catch(() => {}); }
    }
    render();
  } finally { loading = false; }
}

function kpis(c) {
  const m = c.machine; const a = c.about; const n = c.network; const d = c.disk;
  const since = m.uptimeMs ? stamp(c.at - m.uptimeMs) : '';
  return html`<div class="kpis">
    <div class="card stat kpi"><div class="k">${t('system')}</div><div class="v">${a.os || '–'}</div>
      <div class="s">${[a.version ? `Hostwerk ${a.version}` : '', a.service ? t('asService') : '', a.headless ? t('headless') : ''].filter(Boolean).join(' · ')}</div></div>
    <div class="card stat kpi"><div class="k">${t('cpu')}</div><div class="v long" title="${m.cpu || ''}">${m.cpu || '–'}</div>
      <div class="s">${[m.cores ? t('coresN', { n: m.cores }) : '', m.avgCpu != null ? t('load', { n: m.avgCpu }) : ''].filter(Boolean).join(' · ')}</div>${meter(m.avgCpu, t('cpuLoad'))}</div>
    <div class="card stat kpi"><div class="k">${t('ram')}</div><div class="v">${m.ramGB ? `${num(m.ramGB)} GB` : '–'}</div>
      <div class="s">${m.ramUsedGB != null ? t('ramUsed', { used: num(m.ramUsedGB), n: m.ramUsedPct }) : ''}</div>${meter(m.ramUsedPct, t('ram'))}</div>
    <div class="card stat kpi"><div class="k">${t('disk')} ${tip(t('disk'), t('diskTip'))}</div>
      <div class="v">${d && d.total ? t('freeN', { n: Hostwerk.fmt.bytes(d.free) }) : '–'}</div>
      <div class="s">${d && d.total ? [t('ofTotal', { n: Hostwerk.fmt.bytes(d.total) }), d.services != null ? t('svcBytes', { n: Hostwerk.fmt.bytes(d.services) }) : ''].filter(Boolean).join(' · ') : t('computing')}</div>${d ? meter(d.usedPct, t('disk')) : ''}</div>
    <div class="card stat kpi"><div class="k">${t('uptime')}</div><div class="v">${m.uptimeMs ? Hostwerk.fmt.duration(m.uptimeMs) : '–'}</div><div class="s">${since ? t('sinceTime', { time: since }) : ''}</div></div>
    <div class="card stat kpi"><div class="k">${t('ip')}</div>
      <div class="v long mono" title="${(n && n.localIp) || ''}">${n ? n.localIp || (hideAddresses ? t('hidden') : '–') : '–'}</div>
      <div class="s">${n ? [n.externalIp ? `${t('ipPublic')} ${n.externalIp}` : '', n.ipv6 ? t('ipv6Yes') : ''].filter(Boolean).join(' · ') : t('noRouter')}</div></div>
  </div>`;
}

function servicesCard(c) {
  const list = C.flat(c.groups);
  const body = list.length ? html`<div class="scroll-x"><table class="table svc-table"><thead><tr><th scope="col">${t('thName')}</th><th scope="col">${t('thKind')}</th><th scope="col">${t('thState')}</th><th scope="col">${t('port')}</th><th scope="col">${t('thAddress')}</th><th scope="col">${t('thVersion')}</th></tr></thead><tbody>
    ${list.map((s, i) => html`<tr data-svc="${i}"><td><span class="cell-name"><span class="dot ${dotClass(s.state)}" aria-hidden="true"></span><button type="button" class="open-btn" data-open="${i}" title="${t('openIn', { name: s.name })}">${s.name}</button></span></td>
      <td class="muted">${kindLabel(s.kind)}</td><td>${t('state.' + s.state)}</td><td class="mono">${s.port || '–'}</td>
      <td class="addr mono small" title="${s.url || ''}">${s.url || (hideAddresses && s.kind === 'web' ? t('hidden') : '–')}</td>
      <td class="small">${[s.type, s.version].filter(Boolean).join(' ') || '–'}${s.php ? html` <span class="badge">PHP ${s.php}</span>` : ''}</td></tr>`)}
  </tbody></table></div>` : html`<div class="empty"><p>${t('empty')}</p></div>`;
  return html`<div class="card"><div class="card-head"><h3>${t('services')}</h3>${list.length ? html`<span class="badge ${c.up === c.all ? 'ok' : ''}">${t('upOf', { up: num(c.up), all: num(c.all) })}</span>` : ''}</div>${body}</div>`;
}

const val = (v) => (v == null || v === '' ? '–' : v);
function changeText(x) {
  const v = { from: val(x.from), to: val(x.to), name: x.name || '', kind: x.kind ? kindLabel(x.kind) : '' };
  if ((x.type === 'ip' || x.type === 'publicIp') && hideAddresses) return t(`chg.${x.type}Hidden`);
  return t('chg.' + x.type, v);
}
function compareCard() {
  const changes = saved ? C.diff(saved, C.snapshot(card)) : [];
  const badge = (x) => (x.type === 'added' || x.type === 'phpAdded' || x.type === 'forwardAdded' ? html`<span class="badge ok">${t('chgNew')}</span>`
    : x.type === 'removed' || x.type === 'phpRemoved' || x.type === 'forwardRemoved' ? html`<span class="badge err">${t('chgGone')}</span>` : html`<span class="badge accent">${t('chgChanged')}</span>`);
  const body = firstSnap ? html`<p class="small muted">${t('snapFirst')}</p>`
    : changes.length ? html`<ul class="changes">${changes.map((x) => html`<li>${badge(x)}<span>${changeText(x)}</span></li>`)}</ul>`
      : html`<p class="small muted">${t('noChanges')}</p>`;
  return html`<div class="card no-print"><div class="card-head"><h3>${t('compare')} ${tip(t('compare'), t('compareTip'))}</h3>
    <button type="button" class="btn xs" id="snapBtn">${I.bookmark} ${t('snapNow')}</button></div>
    <div class="card-body"><p class="tiny muted">${saved ? t('snapAt', { time: stamp(saved.at) }) : ''}</p>${body}</div></div>`;
}

function healthCard(c) {
  const h = c.health;
  return html`<div class="card card-pad"><div class="score">
      <div class="ring ${h.grade === 'good' ? '' : h.grade}" style="--p: ${h.score}" role="img" aria-label="${t('scoreAria', { n: h.score })}"><b>${h.score}</b></div>
      <div><div class="bold">${t('grade.' + h.grade)} ${tip(t('health'), t('healthTip'))}</div><div class="small muted">${t('scoreOf', { n: h.score })}</div></div>
    </div>
    ${h.why.length ? html`<ul class="why">${h.why.map((w) => html`<li><span class="dot ${w.weight >= 10 ? 'err' : 'warn'}" aria-hidden="true"></span><span>${t('why.' + w.key, { n: num(w.n) })}</span><span class="minus">−${w.weight}</span></li>`)}</ul>` : html`<p class="small muted" style="margin: var(--sp-3, 12px) 0 0">${t('allGood')}</p>`}
  </div>`;
}

function networkCard(c) {
  const n = c.network;
  if (!n) return html`<div class="card card-pad"><h3>${t('network')}</h3><p class="small muted">${t('noRouterLong')}</p></div>`;
  // [Bezeichnung, Wert, Adresse in Festbreitenschrift?]
  const rows = [[t('ip'), n.localIp, 1], [t('ipPublicLabel'), n.externalIp, 1], ['IPv6', n.ipv6, 1], [t('gateway'), n.gateway, 1], [t('router'), n.router], [t('linkLabel'), n.link ? t('link.' + n.link) : null], ['DynDNS', n.dyndns, 1]]
    .filter(([, v]) => v);
  return html`<div class="card card-pad"><h3>${t('network')}</h3>
    ${rows.length ? html`<dl class="facts">${rows.map(([k, v, mono]) => html`<dt>${k}</dt><dd class="${mono ? 'mono' : ''}">${v}</dd>`)}</dl>` : html`<p class="small muted">${t('hiddenAll')}</p>`}
    <div style="margin-top: var(--sp-3, 12px)"><div class="small bold">${t('forwards')} ${tip(t('forwards'), t('forwardsTip'))}</div>
      ${n.forwards.length ? html`<div class="chips" style="margin-top: var(--sp-1, 4px)">${n.forwards.map((f) => html`<span class="badge mono" title="${f.label}">${f.port}/${f.protocol}</span>`)}</div>` : html`<p class="small muted" style="margin: var(--sp-1, 4px) 0 0">${t('noForwards')}</p>`}</div>
  </div>`;
}

function softwareCard(c) {
  const s = c.software;
  if (!s.php.length && !s.programs.length && !s.ai) return '';
  return html`<div class="card card-pad"><h3>${t('software')}</h3><dl class="facts">
    ${s.php.length ? html`<dt>PHP</dt><dd><span class="chips">${s.php.map((p) => html`<span class="badge ${p.active ? 'accent' : ''}" title="${p.active ? t('active') : ''}">${p.version}${p.active ? ` · ${t('active')}` : ''}</span>`)}</span></dd>` : ''}
    ${s.programs.map((p) => html`<dt>${kindLabel(p.kind)}</dt><dd>${p.name}${p.version ? ` ${p.version}` : ''}</dd>`)}
    ${s.ai ? html`<dt>${t('ai')}</dt><dd>${[s.ai.provider, s.ai.model].filter(Boolean).join(' · ') || '–'}</dd>` : ''}
    ${c.about.uiPort ? html`<dt>${t('uiPort')}</dt><dd class="mono">${c.about.uiPort}</dd>` : ''}
  </dl></div>`;
}

function certsCard(c) {
  if (!c.certs.length) return '';
  return html`<div class="card"><div class="card-head"><h3>${t('certs')}</h3></div><table class="table"><tbody>${c.certs.map((x) => html`<tr><td class="small" style="overflow-wrap: anywhere">${x.name}</td><td class="right"><span class="badge ${x.daysLeft == null ? 'warn' : x.daysLeft < 14 ? 'err' : x.daysLeft < 30 ? 'warn' : 'ok'}">${x.daysLeft == null ? t('certMissing') : t('daysLeft', { n: num(x.daysLeft) })}</span></td></tr>`)}</tbody></table></div>`;
}

function securityCard(c) {
  const s = c.security;
  if (!s || (!s.err && !s.warn)) return '';
  return html`<div class="card card-pad"><div class="row-tight" style="margin-bottom: var(--sp-2, 8px)"><h3 style="margin: 0; flex: 1">${t('security')}</h3>
      ${s.err ? html`<span class="badge err">${t('secErrN', { n: s.err })}</span>` : ''}${s.warn ? html`<span class="badge warn">${t('secWarnN', { n: s.warn })}</span>` : ''}</div>
    <ul class="why" style="margin: 0">${s.items.slice(0, 6).map((x) => html`<li><span class="dot ${x.level === 'err' ? 'err' : 'warn'}" aria-hidden="true"></span><span>${x.title}</span></li>`)}</ul>
    ${s.items.length > 6 ? html`<p class="tiny muted" style="margin: var(--sp-2, 8px) 0 0">${t('moreN', { n: s.items.length - 6 })}</p>` : ''}</div>`;
}

function conflictsCard(c) {
  if (!c.ports.length) return '';
  return html`<div class="callout warn"><div class="callout-body"><div class="callout-title">${t('conflicts')}</div>
    ${c.ports.map((p) => html`<div class="small"><span class="mono">${p.port}</span> ${p.name} – ${t('port.' + p.status)}${p.by ? ` (${p.by})` : ''}</div>`)}</div></div>`;
}

function render() {
  const c = shown();
  if (!c) return;
  tipSeq = 0;
  $('stamp').textContent = t('stamp', { time: stamp(c.at) });
  Hostwerk.render('#aboutTip', tip(t('title'), t('aboutTip')));
  Hostwerk.render('#main', html`${kpis(c)}
    <div class="layout">
      <div class="col">${servicesCard(c)}${conflictsCard(c)}${compareCard()}</div>
      <div class="col">${healthCard(c)}${networkCard(c)}${softwareCard(c)}${certsCard(c)}${securityCard(c)}</div>
    </div>`);
  $('snapBtn').addEventListener('click', remember);
  renderName();
}

// ——— Name dieses PCs (optional) ———
function renderName() {
  const h = $('deviceName'); const b = $('nameBtn');
  h.hidden = !deviceName; h.textContent = deviceName;
  Hostwerk.render(b, deviceName ? I.pencil : html`${I.pencil} ${t('nameAdd')}`);
  b.setAttribute('aria-label', deviceName ? t('nameEdit') : t('nameAdd'));
  b.title = t('nameHint');
}
$('nameBtn').addEventListener('click', () => { const i = $('nameInput'); i.value = deviceName; i.hidden = false; $('nameBtn').hidden = true; i.focus(); i.select(); });
function closeName(save) {
  const i = $('nameInput');
  if (i.hidden) return;
  if (save) {
    deviceName = i.value.trim().slice(0, 60);
    Hostwerk.storage.set('name', deviceName).catch(() => {});
    if (card) card.name = deviceName || null;
  }
  i.hidden = true; $('nameBtn').hidden = false; renderName(); $('nameBtn').focus();
}
$('nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') closeName(true); else if (e.key === 'Escape') closeName(false); });
$('nameInput').addEventListener('blur', () => closeName(true));

// ——— Vergleich ———
async function remember() {
  if (!card) return;
  saved = C.snapshot(card); firstSnap = false;
  try { await Hostwerk.storage.set('snapshot', saved); Hostwerk.toast(t('snapSaved'), { kind: 'success' }); } catch { Hostwerk.toast(t('snapFailed'), { kind: 'error' }); }
  render();
}

// ——— Teilen ———
async function share(kind) {
  if (!card) return;
  const src = kind === 'support' ? C.redact(card, { support: true }) : shown();
  const f = fmt();
  const text = kind === 'json' ? C.asJson(src) : kind === 'text' ? C.asText(src, t, f) : C.asMarkdown(src, t, f);
  try { await Hostwerk.copy(text); Hostwerk.toast(t('copied.' + kind), { kind: 'success' }); } catch { Hostwerk.toast(t('copyFailed'), { kind: 'error' }); }
}
function printCard() {
  if (!card) return;
  $('printTitle').textContent = t('title'); // der Gerätename steht darunter in der Kopfzeile
  window.print(); // „Als PDF speichern“ im Druckdialog ergibt die PDF-Datei; die Druckansicht ist hell und ohne Knöpfe
}
function renderShareMenu() {
  Hostwerk.render('#shareBtn', html`${I.share} ${t('share')} ${I.down}`);
  Hostwerk.render('#shareMenu', html`
    <div class="menu-title" role="presentation">${t('copyAs')}</div>
    <button type="button" class="mi" role="menuitem" data-act="text" tabindex="-1">${I.copy}<span>${t('asText')}</span></button>
    <button type="button" class="mi" role="menuitem" data-act="md" tabindex="-1">${I.doc}<span>${t('asMarkdown')}</span><span class="mi-key">.md</span></button>
    <button type="button" class="mi" role="menuitem" data-act="json" tabindex="-1">${I.code}<span>${t('asJson')}</span><span class="mi-key">.json</span></button>
    <div class="menu-sep" role="separator"></div>
    <button type="button" class="mi" role="menuitem" data-act="support" tabindex="-1" title="${t('supportHint')}">${I.shield}<span>${t('forSupport')}</span></button>
    <button type="button" class="mi" role="menuitem" data-act="print" tabindex="-1" title="${t('printHint')}">${I.print}<span>${t('print')}</span></button>
    <div class="menu-sep" role="separator"></div>
    <button type="button" class="mi" role="menuitemcheckbox" aria-checked="${hideAddresses ? 'true' : 'false'}" data-act="noaddr" tabindex="-1"><span class="check-box">${I.check}</span><span>${t('noAddr')}</span></button>`);
}

// Menüs: Pfeiltasten, Pos1/Ende, Esc schließt und gibt den Fokus zurück, Klick daneben schließt
let menuOpen = null; // { el, back }
function openMenu(el, back, at) {
  closeMenu(false);
  el.hidden = false;
  if (at) { el.style.left = `${Math.max(4, Math.min(at.x, document.documentElement.clientWidth - el.offsetWidth - 4))}px`; el.style.top = `${at.y}px`; }
  menuOpen = { el, back };
  if (back && back.id === 'shareBtn') back.setAttribute('aria-expanded', 'true');
  const first = el.querySelector('.mi'); if (first) first.focus();
}
function closeMenu(focusBack = true) {
  if (!menuOpen) return;
  const { el, back } = menuOpen;
  el.hidden = true; menuOpen = null;
  if (back && back.id === 'shareBtn') back.setAttribute('aria-expanded', 'false');
  if (focusBack && back && document.contains(back)) back.focus();
}
function menuKeys(e) {
  const items = [...e.currentTarget.querySelectorAll('.mi')];
  const i = items.indexOf(document.activeElement);
  const go = (n) => { e.preventDefault(); items[(n + items.length) % items.length].focus(); };
  if (e.key === 'ArrowDown') go(i + 1); else if (e.key === 'ArrowUp') go(i - 1); else if (e.key === 'Home') go(0); else if (e.key === 'End') go(items.length - 1);
  else if (e.key === 'Escape') { e.preventDefault(); closeMenu(); } else if (e.key === 'Tab') closeMenu(false);
}
$('shareBtn').addEventListener('click', () => { if (menuOpen && menuOpen.el.id === 'shareMenu') closeMenu(); else openMenu($('shareMenu'), $('shareBtn')); });
$('shareBtn').addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); openMenu($('shareMenu'), $('shareBtn')); } });
$('shareMenu').addEventListener('keydown', menuKeys);
$('shareMenu').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'noaddr') { hideAddresses = !hideAddresses; b.setAttribute('aria-checked', String(hideAddresses)); render(); return; }
  closeMenu();
  if (act === 'print') printCard(); else share(act);
});
$('rowMenu').addEventListener('keydown', menuKeys);
document.addEventListener('mousedown', (e) => { if (menuOpen && !menuOpen.el.contains(e.target) && !(menuOpen.back && menuOpen.back.contains(e.target))) closeMenu(false); });

// Rechtsklick auf einen Dienst: öffnen oder Werte kopieren (Tastatur: Kontextmenü-Taste bzw. Umschalt+F10 auf dem Namen)
const svcAt = (i) => C.flat((shown() || {}).groups)[Number(i)];
function openService(s) { const r = C.ROUTES[s.kind]; if (r) Hostwerk.navigate(r(encodeURIComponent(s.id))); }
document.addEventListener('click', (e) => {
  const o = e.target.closest('[data-open]'); if (o) { const s = svcAt(o.dataset.open); if (s) openService(s); }
  const tb = e.target.closest('.info-tip-btn'); if (tb) tb.parentElement.classList.toggle('open');
  if (e.target.closest('#refresh')) load(true);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') for (const x of document.querySelectorAll('.info-tip.open')) x.classList.remove('open'); });
document.addEventListener('contextmenu', (e) => {
  const row = e.target.closest('tr[data-svc]');
  if (!row) return;
  const s = svcAt(row.dataset.svc);
  if (!s) return;
  e.preventDefault();
  const m = $('rowMenu');
  const line = `${s.name}: ${t('state.' + s.state)}${s.port ? `, ${t('port')} ${s.port}` : ''}${s.url ? ` – ${s.url}` : ''}`;
  const acts = [['open', I.open, t('openIn', { name: s.name })], ['line', I.copy, t('copyLine')], ...(s.port ? [['port', I.copy, t('copyPort')]] : []), ...(s.url ? [['url', I.copy, t('copyUrl')]] : [])];
  Hostwerk.render(m, html`${acts.map(([id, ic, label]) => html`<button type="button" class="mi" role="menuitem" tabindex="-1" data-row="${id}">${ic}<span>${label}</span></button>`)}`);
  m.onclick = async (ev) => {
    const b = ev.target.closest('[data-row]'); if (!b) return;
    closeMenu();
    if (b.dataset.row === 'open') return openService(s);
    const text = b.dataset.row === 'port' ? String(s.port) : b.dataset.row === 'url' ? s.url : line;
    try { await Hostwerk.copy(text); Hostwerk.toast(t('copiedShort'), { kind: 'success' }); } catch { Hostwerk.toast(t('copyFailed'), { kind: 'error' }); }
  };
  const r = row.getBoundingClientRect();
  const at = e.clientX || e.clientY ? { x: e.pageX, y: e.pageY } : { x: r.left + window.scrollX + 16, y: r.bottom + window.scrollY };
  openMenu(m, row.querySelector('.open-btn'), at);
});

function statics() {
  Hostwerk.render('#refresh', I.refresh);
  $('refresh').setAttribute('aria-label', t('refresh')); $('refresh').title = t('refresh');
  renderShareMenu(); renderName();
}

// Nachladen alle 30 s – nur solange die Seite sichtbar ist
setInterval(() => { if (!document.hidden) load(); }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && card && Date.now() - card.at > 30000) load(); });
Hostwerk.ready().then(async () => {
  statics();
  deviceName = String((await Hostwerk.storage.get('name').catch(() => '')) || '');
  renderName();
  load(true);
  Hostwerk.on('service', () => load());
  Hostwerk.on('lang', () => { statics(); render(); });
});
