/* ServerCard – pure logic without DOM, tested in tests/lib.test.js (node --test). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.ServerCard = api;
}(typeof self !== 'undefined' ? self : this, () => {
  const GB = 1073741824;
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
  /** Dienste nach Art gruppiert, laufende zuerst, mit Adresse und Port. */
  function services(list) {
    const order = ['web', 'db', 'minecraft', 'app', 'mail'];
    const out = {};
    for (const s of list || []) (out[s.kind] = out[s.kind] || []).push(s);
    for (const k of Object.keys(out)) out[k].sort((a, b) => (a.state === 'running' ? 0 : 1) - (b.state === 'running' ? 0 : 1) || a.name.localeCompare(b.name));
    return order.filter((k) => out[k]).map((k) => ({ kind: k, items: out[k] })).concat(Object.keys(out).filter((k) => !order.includes(k)).map((k) => ({ kind: k, items: out[k] })));
  }
  /** Steckbrief als Klartext (zum Kopieren, z. B. für ein Ticket oder die Doku). labels: Übersetzungen. */
  function asText(m, groups, labels, when = Date.now()) {
    const L = (k) => labels[k] || k;
    const lines = [`# ${L('title')} – ${new Date(when).toISOString().slice(0, 16).replace('T', ' ')}`, ''];
    if (m.cpu) lines.push(`${L('cpu')}: ${m.cpu}${m.cores ? ` (${m.cores} ${L('cores')})` : ''}`);
    if (m.ramGB) lines.push(`${L('ram')}: ${m.ramGB} GB (${m.ramUsedPct} % ${L('used')})`);
    lines.push('');
    for (const g of groups) {
      lines.push(`## ${L('kind.' + g.kind)}`);
      for (const s of g.items) lines.push(`- ${s.name}: ${L('state.' + s.state)}${s.port ? `, ${L('port')} ${s.port}` : ''}${s.url ? ` – ${s.url}` : ''}`);
      lines.push('');
    }
    return lines.join('\n').trim() + '\n';
  }
  return { machine, services, asText };
}));
