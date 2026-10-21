/* ServerCard – pure logic without DOM, tested in tests/lib.test.js (node --test). Used by the page and the tile. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.ServerCard = api;
}(typeof self !== 'undefined' ? self : this, () => {
  const GB = 1073741824;
  /** Arten in fester Reihenfolge – jede hat einen Text in locales (kind.<art>); alles andere landet unter „kind.other“. */
  const KINDS = ['web', 'db', 'minecraft', 'game', 'app', 'mail'];
  /** Hostwerk-Bereich je Art (für „Öffnen“ im Rechtsklick-Menü); Spiele-Server leben in ihrer Erweiterung. */
  const ROUTES = { web: (id) => `/web/${id}`, db: (id) => `/dbs/${id}`, minecraft: (id) => `/mc/${id}`, app: (id) => `/apps/${id}`, game: () => '/ext/game-servers', mail: () => '/mail' };
  const pct = (a, b) => (b ? Math.max(0, Math.min(100, Math.round((a / b) * 100))) : null);

  /** Rechner aus /system/resources: Prozessor, Kerne, Arbeitsspeicher, Laufzeit, Auslastung (Ø der letzten Werte). */
  function machine(res) {
    const s = (res && res.system) || {};
    const hist = Array.isArray(s.history) ? s.history.slice(-30) : [];
    const avgCpu = hist.length ? Math.round(hist.reduce((n, h) => n + (h.cpu || 0), 0) / hist.length) : null;
    const total = s.totalMem || 0; const free = s.freeMem || 0;
    return {
      cpu: String(s.cpuModel || '').replace(/\s+/g, ' ').trim() || null, cores: s.cpus || null,
      ramGB: total ? Math.round((total / GB) * 10) / 10 : null, ramUsedGB: total ? Math.round(((total - free) / GB) * 10) / 10 : null,
      ramUsedPct: total ? pct(total - free, total) : null, uptimeMs: s.uptime ? Math.round(s.uptime * 1000) : null, avgCpu,
    };
  }

  /**
   * Alle Dienste aus GET /overview – auch Spiele-Server (nur „running“ bekannt, kein Port) und der Mail-Fänger
   * (Hostwerk.services() kennt diese beiden nicht). type = Programm (Apache, MariaDB, Paper …), version wie gemeldet.
   */
  function fromOverview(o) {
    const x = o || {};
    const state = (s) => (s.proc && s.proc.state) || 'stopped';
    const pick = (kind, xs, url) => (Array.isArray(xs) ? xs : []).filter(Boolean).map((s) => ({
      kind, id: s.id, name: s.name || String(s.id), state: state(s), port: s.port || null, url: url ? url(s) : null,
      type: s.typeLabel || s.kindLabel || null, version: s.version ? String(s.version) : null, php: s.phpResolved || null,
    }));
    return [
      ...pick('web', x.web, (s) => (s.port ? `http://localhost:${s.port}` : null)), ...pick('db', x.db), ...pick('minecraft', x.minecraft), ...pick('app', x.apps, (s) => s.url || null),
      ...(Array.isArray(x.games) ? x.games : []).filter(Boolean).map((g) => ({ kind: 'game', id: g.id, name: g.name || String(g.id), state: g.running ? 'running' : 'stopped', port: null, url: null, type: g.game || null, version: null, php: null })),
      ...(x.mail ? [{ kind: 'mail', id: 'mail', name: 'Mail', state: state(x.mail), port: (x.mail.config && x.mail.config.smtpPort) || null, url: null, type: null, version: null, php: null }] : []),
    ];
  }
  /** Allgemeines über Hostwerk und den Rechner aus /overview: Version, Betriebssystem, Betriebsart, Livebetrieb. */
  function about(o) {
    const a = (o && o.app) || {};
    const live = (o && o.live) || {};
    const OS = { win32: 'Windows', darwin: 'macOS', linux: 'Linux' };
    return { version: a.version || null, os: OS[a.platform] || a.platform || null, headless: !!a.headless, service: !!a.service, remote: !!live.remote, domain: live.domain || null };
  }

  /** Dienste nach Art gruppiert, laufende zuerst. Unbekannte Arten heißen „other“ – nie ein roher Schlüssel. */
  function services(list) {
    const out = {};
    for (const s of list || []) { const k = KINDS.includes(s.kind) ? s.kind : 'other'; (out[k] = out[k] || []).push(s); }
    for (const k of Object.keys(out)) out[k].sort((a, b) => (a.state === 'running' ? 0 : 1) - (b.state === 'running' ? 0 : 1) || String(a.name).localeCompare(String(b.name)));
    return [...KINDS, 'other'].filter((k) => out[k]).map((k) => ({ kind: k, items: out[k] }));
  }
  /** Flache Liste in Tabellen-Reihenfolge (Art, dann laufende zuerst, dann Name). */
  const flat = (groups) => (groups || []).flatMap((g) => g.items.map((s) => ({ ...s, kind: g.kind === 'other' ? s.kind : g.kind })));

  /** Zertifikate aus /live/certs: Domain und Resttage, die knappsten zuerst (lokale CA und Gerätezertifikat dazu). */
  function certs(c) {
    if (!c) return [];
    const out = (c.items || []).map((x) => ({ name: x.domain, daysLeft: x.daysLeft, kind: x.staging ? 'staging' : 'letsencrypt' }));
    for (const x of c.missing || []) out.push({ name: x.domain, daysLeft: null, kind: 'missing' });
    if (c.local && c.local.leaf) out.push({ name: (c.local.leaf.names || []).join(', ') || 'localhost', daysLeft: c.local.leaf.daysLeft, kind: 'local' });
    return out.sort((a, b) => (a.daysLeft == null ? 1e9 : a.daysLeft) - (b.daysLeft == null ? 1e9 : b.daysLeft));
  }
  /** Ports aus /system/ports: nur Konflikte (blockiert, doppelt) – belegte Ports stehen schon bei den Diensten. */
  function ports(list) {
    return (Array.isArray(list) ? list : []).filter((p) => p && (p.status === 'blocked' || p.status === 'duplicate')).map((p) => ({ port: p.port, name: p.name || p.id || '', status: p.status, by: (p.usedBy && p.usedBy.name) || null }));
  }
  /** Port der Hostwerk-Oberfläche aus /system/ports (null, wenn unbekannt). */
  function uiPort(list) {
    const p = (Array.isArray(list) ? list : []).find((x) => x && x.kind === 'hostwerk' && x.id === 'ui');
    return p ? p.port : null;
  }
  /** Laufwerk mit Hostwerks Daten aus /system/disk-usage (wird im Hintergrund berechnet – bis dahin null). */
  function disk(du) {
    const d = du && du.disk;
    const svc = du && Array.isArray(du.services) && du.services.length ? du.services.reduce((n, s) => n + (s.bytes || 0), 0) : null;
    if (!d || !d.total) return svc != null ? { free: null, total: null, usedPct: null, services: svc } : null;
    return { free: d.free, total: d.total, usedPct: pct(d.total - d.free, d.total), services: svc };
  }
  /**
   * Netzwerk aus GET /router (Erweiterung „Router“): IPs, IPv6, Router, Anschlussart und die Freigaben, die auf
   * diesen PC zeigen – also die Ports, die von außen offen sind. Ohne Router-Erweiterung: null.
   */
  function network(r) {
    if (!r) return null;
    const link = r.dslite ? 'dslite' : r.cgnat ? 'cgnat' : r.doubleNat ? 'doubleNat' : r.direct ? 'direct' : r.gateway ? 'normal' : null;
    const rt = r.router ? [r.router.manufacturer, r.router.model].filter(Boolean).join(' ') || r.router.name || null : null;
    const forwards = (Array.isArray(r.mappings) ? r.mappings : []).filter((m) => m && m.here).map((m) => ({ port: m.externalPort, protocol: m.protocol || 'TCP', label: m.description || '' }))
      .sort((a, b) => a.port - b.port || String(a.protocol).localeCompare(String(b.protocol)));
    return {
      localIp: r.localIp || null, externalIp: r.externalIp || null, ipv6: (r.ipv6 && r.ipv6.address) || null, gateway: r.gateway || null,
      router: rt, link, forwards, dyndns: (r.dyndns && r.dyndns.domain) || null,
    };
  }
  /** Sicherheitslage aus /live/security: Anzahl je Stufe und die Hinweise (kind = Art ohne Namen, für die Schwärzung). */
  function security(s) {
    if (!s || !Array.isArray(s.items)) return null;
    const n = (lv) => s.items.filter((x) => x.level === lv).length;
    return { err: n('err'), warn: n('warn'), info: n('info'), items: s.items.filter((x) => x.level !== 'info').map((x) => ({ level: x.level, title: x.title || '', kind: String(x.id || '').split(':')[0] })) };
  }
  /** Installierte Software: PHP-Versionen (aktive markiert), Programme der Dienste mit Version, KI. */
  function software(o, list) {
    const p = (o && o.php) || {};
    const php = (Array.isArray(p.installed) ? p.installed : []).map((v) => ({ version: String(v), active: v === p.active }));
    const seen = new Map();
    for (const s of list || []) {
      if (!s.type || s.kind === 'app' || s.kind === 'game') continue;
      const key = `${s.type} ${s.version || ''}`.trim();
      if (!seen.has(key)) seen.set(key, { name: s.type, version: s.version || null, kind: s.kind });
    }
    const ai = o && o.ai && (o.ai.installed || o.ai.online) ? { provider: o.ai.provider || null, model: o.ai.model || null, state: o.ai.state || null } : null;
    return { php, programs: [...seen.values()].sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || a.name.localeCompare(b.name)), ai };
  }

  /**
   * Zustand als Punktzahl 0–100 aus dem, was der Steckbrief sieht: Dienste mit Fehler, Zertifikate, Sicherheitslage,
   * Speicherplatz, Arbeitsspeicher, Port-Konflikte, ausgefallene Erreichbarkeits-Prüfungen. Gründe mit Abzug, größter zuerst.
   */
  function health(card) {
    const c = card || {};
    const why = [];
    const add = (key, n, each, cap) => { if (n > 0) why.push({ key, n, weight: Math.min(n * each, cap) }); };
    const list = flat(c.groups);
    add('svcError', list.filter((s) => s.state === 'error').length, 15, 45);
    const cs = c.certs || [];
    add('certExpiring', cs.filter((x) => x.daysLeft != null && x.daysLeft < 14).length, 15, 30);
    add('certSoon', cs.filter((x) => x.daysLeft != null && x.daysLeft >= 14 && x.daysLeft < 30).length, 5, 10);
    add('certMissing', cs.filter((x) => x.daysLeft == null).length, 10, 20);
    if (c.security) { add('secErr', c.security.err, 10, 30); add('secWarn', c.security.warn, 4, 16); }
    const dp = c.disk && c.disk.usedPct;
    if (dp != null && dp >= 80) why.push({ key: 'disk', n: dp, weight: dp >= 95 ? 20 : dp >= 90 ? 10 : 3 });
    const rp = c.machine && c.machine.ramUsedPct;
    if (rp != null && rp >= 90) why.push({ key: 'ram', n: rp, weight: rp >= 95 ? 10 : 5 });
    add('ports', (c.ports || []).length, 5, 15);
    add('down', (c.down || []).length, 10, 30);
    why.sort((a, b) => b.weight - a.weight);
    const score = Math.max(0, 100 - why.reduce((n, w) => n + w.weight, 0));
    return { score, grade: score >= 85 ? 'good' : score >= 60 ? 'fair' : 'poor', why };
  }

  /**
   * Zum Teilen „ohne Adressen“: keine IPs, Webadressen und Domains. Ports bleiben (sie verraten allein nichts),
   * Zertifikate behalten nur ihre Resttage. support: zusätzlich ohne Gerätenamen und Dienstnamen (für Support-Anfragen).
   */
  function redact(card, opts = {}) {
    const n = {};
    const anon = (s) => { n[s.kind] = (n[s.kind] || 0) + 1; return `${s.kind}-${n[s.kind]}`; };
    const net = card.network;
    return {
      ...card,
      name: opts.support ? null : card.name || null,
      about: card.about ? { ...card.about, domain: null } : card.about,
      network: net ? { ...net, localIp: null, externalIp: null, ipv6: null, gateway: null, dyndns: null, forwards: (net.forwards || []).map((f) => ({ ...f, label: opts.support ? '' : f.label })) } : null,
      groups: (card.groups || []).map((g) => ({ ...g, items: g.items.map((s) => ({ ...s, url: null, ...(opts.support ? { name: anon(s), id: null } : {}) })) })),
      certs: (card.certs || []).map((c, i) => ({ ...c, name: `#${i + 1}` })),
      ports: (card.ports || []).map((p) => (opts.support ? { ...p, name: '', by: null } : p)),
      security: card.security && opts.support ? { ...card.security, items: card.security.items.map((x) => ({ ...x, title: x.kind })) } : card.security,
      down: opts.support ? (card.down || []).map((_, i) => `#${i + 1}`) : card.down,
      redacted: opts.support ? 'support' : 'addresses',
    };
  }

  /** Kleiner Stand für „Vergleich zu vorher“ (in Hostwerk.storage, weit unter 256 KB). */
  function snapshot(card) {
    const m = card.machine || {};
    return {
      at: card.at || Date.now(), hostwerk: (card.about && card.about.version) || null, os: (card.about && card.about.os) || null,
      cpu: m.cpu || null, cores: m.cores || null, ramGB: m.ramGB || null,
      ip: (card.network && card.network.localIp) || null, publicIp: (card.network && card.network.externalIp) || null,
      php: ((card.software && card.software.php) || []).map((p) => p.version),
      services: flat(card.groups).map((s) => ({ key: `${s.kind}:${s.id}`, name: s.name, kind: s.kind, port: s.port || null, version: s.version || null, type: s.type || null })),
      forwards: ((card.network && card.network.forwards) || []).map((f) => `${f.port}/${f.protocol}`),
    };
  }
  /**
   * Was sich seit dem gemerkten Stand geändert hat: Dienste neu/weg, Port, Version, Programm; Hostwerk, System,
   * Prozessor, Speicher, PHP, IPs (nur „geändert“ – die Werte zeigt die Seite je nach Schalter), Freigaben.
   * Der Zustand (läuft/aus) zählt nicht – der wechselt ständig und gehört nicht zum Steckbrief.
   */
  function diff(prev, cur) {
    if (!prev || !cur) return [];
    const out = [];
    const ch = (type, from, to, extra) => { if ((from || null) !== (to || null)) out.push({ type, from: from == null ? null : from, to: to == null ? null : to, ...extra }); };
    ch('hostwerk', prev.hostwerk, cur.hostwerk); ch('os', prev.os, cur.os); ch('cpu', prev.cpu, cur.cpu); ch('cores', prev.cores, cur.cores); ch('ram', prev.ramGB, cur.ramGB);
    ch('ip', prev.ip, cur.ip); ch('publicIp', prev.publicIp, cur.publicIp);
    const pp = new Set(prev.php || []); const cp = new Set(cur.php || []);
    for (const v of cp) if (!pp.has(v)) out.push({ type: 'phpAdded', to: v });
    for (const v of pp) if (!cp.has(v)) out.push({ type: 'phpRemoved', from: v });
    const before = new Map((prev.services || []).map((s) => [s.key, s]));
    const now = new Map((cur.services || []).map((s) => [s.key, s]));
    for (const [k, s] of now) {
      const o = before.get(k);
      if (!o) { out.push({ type: 'added', name: s.name, kind: s.kind }); continue; }
      ch('port', o.port, s.port, { name: s.name }); ch('version', o.version, s.version, { name: s.name }); ch('type', o.type, s.type, { name: s.name });
      if (o.name !== s.name) out.push({ type: 'renamed', from: o.name, to: s.name });
    }
    for (const [k, s] of before) if (!now.has(k)) out.push({ type: 'removed', name: s.name, kind: s.kind });
    const pf = new Set(prev.forwards || []); const cf = new Set(cur.forwards || []);
    for (const f of cf) if (!pf.has(f)) out.push({ type: 'forwardAdded', to: f });
    for (const f of pf) if (!cf.has(f)) out.push({ type: 'forwardRemoved', from: f });
    return out;
  }

  /** Text für einen Schlüssel: labels ist eine Funktion (Hostwerk.t) oder ein Objekt mit {platzhaltern}. */
  const label = (labels) => (k, v) => {
    if (typeof labels === 'function') return labels(k, v);
    let s = (labels || {})[k] || k;
    for (const [a, b] of Object.entries(v || {})) s = s.split(`{${a}}`).join(String(b));
    return s;
  };
  /** Zeilen „Bezeichnung: Wert“ über den Rechner – gemeinsam für Text und Markdown. */
  function facts(card, L, fmt) {
    const m = card.machine || {};
    const a = card.about || {};
    const num = fmt.number || String;
    const rows = [];
    if (card.name) rows.push([L('deviceName'), card.name]);
    if (a.os || a.version) rows.push([L('system'), [a.os, a.version ? `Hostwerk ${a.version}` : null, a.service ? L('asService') : null, a.headless ? L('headless') : null].filter(Boolean).join(' · ')]);
    if (m.cpu) rows.push([L('cpu'), `${m.cpu}${m.cores ? ` (${m.cores} ${L('cores')})` : ''}${m.avgCpu != null ? ` · ${L('load', { n: m.avgCpu })}` : ''}`]);
    if (m.ramGB) rows.push([L('ram'), `${num(m.ramGB)} GB${m.ramUsedPct != null ? ` (${L('usedPct', { n: m.ramUsedPct })})` : ''}`]);
    if (card.disk && card.disk.total) rows.push([L('disk'), L('diskFree', { free: fmt.bytes ? fmt.bytes(card.disk.free) : card.disk.free, total: fmt.bytes ? fmt.bytes(card.disk.total) : card.disk.total })]);
    if (m.uptimeMs) rows.push([L('uptime'), fmt.duration ? fmt.duration(m.uptimeMs) : `${Math.round(m.uptimeMs / 3600000)} h`]);
    const n = card.network;
    if (n && n.localIp) rows.push([L('ip'), `${n.localIp}${n.externalIp ? ` · ${L('ipPublic')} ${n.externalIp}` : ''}`]);
    if (n && n.ipv6) rows.push(['IPv6', n.ipv6]);
    if (n && n.router) rows.push([L('router'), `${n.router}${n.link ? ` · ${L('link.' + n.link)}` : ''}`]);
    const sw = card.software || {};
    if ((sw.php || []).length) rows.push(['PHP', sw.php.map((p) => (p.active ? `${p.version} (${L('active')})` : p.version)).join(', ')]);
    if (sw.ai) rows.push([L('ai'), [sw.ai.provider, sw.ai.model].filter(Boolean).join(' · ')]);
    if (card.health) rows.push([L('health'), `${card.health.score}/100`]);
    return rows;
  }

  /**
   * Steckbrief als Klartext (zum Kopieren, z. B. für ein Ticket oder die Doku).
   * labels: Hostwerk.t oder Übersetzungen; fmt: { stamp, duration(ms), number(n), bytes(n) } in Hostwerks Sprache und Ortszeit.
   */
  function asText(card, labels, fmt = {}) {
    const L = label(labels);
    const lines = [`${L('title')}${card.name ? ` – ${card.name}` : ''}${fmt.stamp ? ` (${fmt.stamp})` : ''}`, ''];
    for (const [k, v] of facts(card, L, fmt)) lines.push(`${k}: ${v}`);
    lines.push('');
    for (const g of card.groups || []) {
      lines.push(`${L('kind.' + g.kind)}:`);
      for (const s of g.items) lines.push(`- ${s.name}: ${L('state.' + s.state)}${s.port ? `, ${L('port')} ${s.port}` : ''}${s.type ? `, ${s.type}${s.version ? ` ${s.version}` : ''}` : ''}${s.url ? ` – ${s.url}` : ''}`);
      lines.push('');
    }
    if ((card.certs || []).length) {
      lines.push(`${L('certs')}:`);
      for (const c of card.certs) lines.push(`- ${c.name}: ${c.daysLeft == null ? L('certMissing') : L('daysLeft', { n: c.daysLeft })}`);
      lines.push('');
    }
    const fw = (card.network && card.network.forwards) || [];
    if (fw.length) { lines.push(`${L('forwards')}: ${fw.map((f) => `${f.port}/${f.protocol}`).join(', ')}`, ''); }
    if ((card.ports || []).length) {
      lines.push(`${L('conflicts')}:`);
      for (const p of card.ports) lines.push(`- ${p.port}: ${p.name}${p.status ? ` (${L('port.' + p.status)})` : ''}`);
      lines.push('');
    }
    return lines.join('\n').trim() + '\n';
  }

  /** Markdown-Zelle: senkrechte Striche und Zeilenumbrüche würden die Tabelle zerreißen. */
  const cell = (v) => String(v == null || v === '' ? '–' : v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  /** Steckbrief als Markdown mit Tabellen (für Doku, Wiki, Ticket). */
  function asMarkdown(card, labels, fmt = {}) {
    const L = label(labels);
    const out = [`# ${L('title')}${card.name ? ` – ${cell(card.name)}` : ''}`, ''];
    if (fmt.stamp) out.push(`_${L('stamp', { time: fmt.stamp })}_`, '');
    if (card.redacted) out.push(`> ${L(card.redacted === 'support' ? 'mdSupport' : 'mdNoAddr')}`, '');
    out.push(`| ${L('thWhat')} | ${L('thValue')} |`, '|---|---|');
    for (const [k, v] of facts(card, L, fmt)) out.push(`| ${cell(k)} | ${cell(v)} |`);
    out.push('');
    const list = flat(card.groups);
    if (list.length) {
      out.push(`## ${L('services')}`, '', `| ${L('thName')} | ${L('thKind')} | ${L('thState')} | ${L('port')} | ${L('thAddress')} | ${L('thVersion')} |`, '|---|---|---|---|---|---|');
      for (const s of list) out.push(`| ${cell(s.name)} | ${cell(L('kind.' + (KINDS.includes(s.kind) ? s.kind : 'other')))} | ${cell(L('state.' + s.state))} | ${cell(s.port)} | ${cell(s.url)} | ${cell([s.type, s.version].filter(Boolean).join(' '))} |`);
      out.push('');
    }
    if ((card.certs || []).length) {
      out.push(`## ${L('certs')}`, '');
      for (const c of card.certs) out.push(`- ${cell(c.name)}: ${c.daysLeft == null ? L('certMissing') : L('daysLeft', { n: c.daysLeft })}`);
      out.push('');
    }
    const fw = (card.network && card.network.forwards) || [];
    if (fw.length) out.push(`## ${L('forwards')}`, '', fw.map((f) => `\`${f.port}/${f.protocol}\``).join(' · '), '');
    if (card.security && (card.security.err || card.security.warn)) {
      out.push(`## ${L('security')}`, '');
      for (const x of card.security.items) out.push(`- **${L('lvl.' + x.level)}:** ${cell(x.title)}`);
      out.push('');
    }
    if ((card.ports || []).length) {
      out.push(`## ${L('conflicts')}`, '');
      for (const p of card.ports) out.push(`- ${p.port}: ${cell(p.name)} (${L('port.' + p.status)})`);
      out.push('');
    }
    return out.join('\n').trim() + '\n';
  }

  /** Steckbrief als JSON (Maschinen lesen das besser als Text) – mit Zeitpunkt in ISO, sonst dieselben Teile. */
  function asJson(card, when = Date.now()) {
    return JSON.stringify({ generatedAt: new Date(when).toISOString(), ...card }, null, 2);
  }

  /** Kachel: laufende von allen Diensten, Auslastung, Speicher und (falls bekannt) die Punktzahl. */
  function tile(list, m, h) {
    const all = (list || []).length;
    return { up: (list || []).filter((s) => s.state === 'running').length, all, cpu: m ? m.avgCpu : null, ram: m ? m.ramUsedPct : null, score: h ? h.score : null, grade: h ? h.grade : null };
  }

  return { KINDS, ROUTES, machine, fromOverview, about, services, flat, certs, ports, uiPort, disk, network, security, software, health, redact, snapshot, diff, asText, asMarkdown, asJson, tile };
}));
