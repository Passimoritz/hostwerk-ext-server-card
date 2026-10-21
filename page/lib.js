/* ServerCard – pure logic without DOM, tested in tests/lib.test.js (node --test). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.ServerCard = api;
}(typeof self !== 'undefined' ? self : this, () => {
  const GB = 1073741824;
  /** Arten in fester Reihenfolge – jede hat einen Text in locales (kind.<art>); alles andere landet unter „kind.other“. */
  const KINDS = ['web', 'db', 'minecraft', 'game', 'app', 'mail'];
  /** Rechner aus /system/resources: Prozessor, Kerne, Arbeitsspeicher, Laufzeit, Auslastung (Ø der letzten Werte). */
  function machine(res) {
    const s = (res && res.system) || {};
    const hist = Array.isArray(s.history) ? s.history.slice(-30) : [];
    const avgCpu = hist.length ? Math.round(hist.reduce((n, h) => n + (h.cpu || 0), 0) / hist.length) : null;
    const total = s.totalMem || 0; const free = s.freeMem || 0;
    return {
      cpu: String(s.cpuModel || '').replace(/\s+/g, ' ').trim() || null, cores: s.cpus || null,
      ramGB: total ? Math.round((total / GB) * 10) / 10 : null, ramUsedPct: total ? Math.round(((total - free) / total) * 100) : null,
      uptimeMs: s.uptime ? Math.round(s.uptime * 1000) : null, avgCpu,
    };
  }

  /**
   * Alle Dienste aus GET /overview – auch Spiele-Server (nur „running“ bekannt, kein Port) und der Mail-Fänger
   * (Hostwerk.services() kennt diese beiden nicht).
   */
  function fromOverview(o) {
    const x = o || {};
    const state = (s) => (s.proc && s.proc.state) || 'stopped';
    const pick = (kind, xs, url) => (Array.isArray(xs) ? xs : []).filter(Boolean).map((s) => ({ kind, id: s.id, name: s.name || String(s.id), state: state(s), port: s.port || null, url: url ? url(s) : null }));
    return [
      ...pick('web', x.web, (s) => (s.port ? `http://localhost:${s.port}` : null)), ...pick('db', x.db), ...pick('minecraft', x.minecraft), ...pick('app', x.apps),
      ...(Array.isArray(x.games) ? x.games : []).map((g) => ({ kind: 'game', id: g.id, name: g.name || String(g.id), state: g.running ? 'running' : 'stopped', port: null, url: null, game: g.game || null })),
      ...(x.mail ? [{ kind: 'mail', id: 'mail', name: 'Mail', state: state(x.mail), port: (x.mail.config && x.mail.config.smtpPort) || null, url: null }] : []),
    ];
  }
  /** Allgemeines über Hostwerk und den Rechner aus /overview: Version, Betriebssystem. */
  function about(o) {
    const a = (o && o.app) || {};
    const OS = { win32: 'Windows', darwin: 'macOS', linux: 'Linux' };
    return { version: a.version || null, os: OS[a.platform] || a.platform || null, headless: !!a.headless };
  }

  /** Dienste nach Art gruppiert, laufende zuerst. Unbekannte Arten heißen „other“ – nie ein roher Schlüssel. */
  function services(list) {
    const out = {};
    for (const s of list || []) { const k = KINDS.includes(s.kind) ? s.kind : 'other'; (out[k] = out[k] || []).push(s); }
    for (const k of Object.keys(out)) out[k].sort((a, b) => (a.state === 'running' ? 0 : 1) - (b.state === 'running' ? 0 : 1) || String(a.name).localeCompare(String(b.name)));
    return [...KINDS, 'other'].filter((k) => out[k]).map((k) => ({ kind: k, items: out[k] }));
  }
  /** Zertifikate aus /live/certs: Domain und Resttage, die knappsten zuerst (lokale CA und Gerätezertifikat dazu). */
  function certs(c) {
    if (!c) return [];
    const out = (c.items || []).map((x) => ({ name: x.domain, daysLeft: x.daysLeft, kind: x.staging ? 'staging' : 'letsencrypt' }));
    for (const x of c.missing || []) out.push({ name: x.domain, daysLeft: null, kind: 'missing' });
    if (c.local && c.local.leaf) out.push({ name: (c.local.leaf.names || []).join(', ') || 'localhost', daysLeft: c.local.leaf.daysLeft, kind: 'local' });
    return out.sort((a, b) => (a.daysLeft == null ? 1e9 : a.daysLeft) - (b.daysLeft == null ? 1e9 : b.daysLeft));
  }
  /** Ports aus /system/ports: belegte und blockierte – freie Einträge sind nichts Besonderes. */
  function ports(list) {
    return (Array.isArray(list) ? list : []).filter((p) => p && p.status !== 'free').map((p) => ({ port: p.port, name: p.name || p.id || '', status: p.status }));
  }

  /**
   * Zum Teilen „ohne Adressen“: keine IPs, Webadressen und Domains. Ports bleiben (sie verraten allein nichts),
   * Zertifikate behalten nur ihre Resttage.
   */
  function redact(card) {
    return {
      ...card,
      network: card.network ? { ...card.network, localIp: null, externalIp: null } : null,
      groups: (card.groups || []).map((g) => ({ ...g, items: g.items.map((s) => ({ ...s, url: null })) })),
      certs: (card.certs || []).map((c, i) => ({ ...c, name: `#${i + 1}` })),
    };
  }

  /**
   * Steckbrief als Klartext (zum Kopieren, z. B. für ein Ticket oder die Doku).
   * labels: Übersetzungen; fmt: { stamp, duration(ms), number(n) } – Zeit und Zahlen in Hostwerks Sprache und Ortszeit.
   */
  function asText(card, labels, fmt = {}) {
    const L = (k, v) => { let s = labels[k] || k; for (const [a, b] of Object.entries(v || {})) s = s.split(`{${a}}`).join(String(b)); return s; };
    const m = card.machine || {};
    const lines = [`# ${L('title')}${fmt.stamp ? ` – ${fmt.stamp}` : ''}`, ''];
    if (card.about && card.about.os) lines.push(`${L('system')}: ${card.about.os}${card.about.version ? ` · Hostwerk ${card.about.version}` : ''}`);
    if (card.network && card.network.localIp) lines.push(`${L('ip')}: ${card.network.localIp}${card.network.externalIp ? ` · ${L('ipPublic')} ${card.network.externalIp}` : ''}`);
    if (m.cpu) lines.push(`${L('cpu')}: ${m.cpu}${m.cores ? ` (${m.cores} ${L('cores')})` : ''}`);
    if (m.ramGB) lines.push(`${L('ram')}: ${fmt.number ? fmt.number(m.ramGB) : m.ramGB} GB (${m.ramUsedPct} % ${L('used')})`);
    if (m.uptimeMs) lines.push(`${L('uptime')}: ${fmt.duration ? fmt.duration(m.uptimeMs) : `${Math.round(m.uptimeMs / 3600000)} h`}`);
    lines.push('');
    for (const g of card.groups || []) {
      lines.push(`## ${L('kind.' + g.kind)}`);
      for (const s of g.items) lines.push(`- ${s.name}: ${L('state.' + s.state)}${s.port ? `, ${L('port')} ${s.port}` : ''}${s.url ? ` – ${s.url}` : ''}`);
      lines.push('');
    }
    if ((card.certs || []).length) {
      lines.push(`## ${L('certs')}`);
      for (const c of card.certs) lines.push(`- ${c.name}: ${c.daysLeft == null ? L('certMissing') : L('daysLeft', { n: c.daysLeft })}`);
      lines.push('');
    }
    if ((card.ports || []).length) {
      lines.push(`## ${L('ports')}`);
      for (const p of card.ports) lines.push(`- ${p.port}: ${p.name}${p.status === 'blocked' || p.status === 'duplicate' ? ` (${L('port.' + p.status)})` : ''}`);
      lines.push('');
    }
    return lines.join('\n').trim() + '\n';
  }

  /** Steckbrief als JSON (Maschinen lesen das besser als Text) – mit Zeitpunkt in ISO, sonst dieselben Teile. */
  function asJson(card, when = Date.now()) {
    return JSON.stringify({ generatedAt: new Date(when).toISOString(), ...card }, null, 2);
  }

  /** Kachel: laufende von allen Diensten, Auslastung und Speicher. */
  function tile(list, m) {
    const all = (list || []).length;
    return { up: (list || []).filter((s) => s.state === 'running').length, all, cpu: m ? m.avgCpu : null, ram: m ? m.ramUsedPct : null };
  }

  return { KINDS, machine, fromOverview, about, services, certs, ports, redact, asText, asJson, tile };
}));
