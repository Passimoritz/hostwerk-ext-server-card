const test = require('node:test');
const assert = require('node:assert');
const C = require('../page/lib.js');

const LABELS = { title: 'Steckbrief', system: 'System', ip: 'IP', ipPublic: 'öffentlich', 'kind.web': 'Webserver', 'kind.game': 'Spiele-Server', 'state.running': 'läuft', 'state.stopped': 'aus', port: 'Port', cpu: 'Prozessor', cores: 'Kerne', ram: 'RAM', used: 'belegt', uptime: 'Läuft seit', certs: 'Zertifikate', daysLeft: 'noch {n} Tage', certMissing: 'fehlt', ports: 'Ports', 'port.blocked': 'belegt' };

test('Rechner: Speicher, Auslastung, Laufzeit', () => {
  const m = C.machine({ system: { cpuModel: 'AMD   Ryzen 7  ', cpus: 16, totalMem: 32 * 1073741824, freeMem: 8 * 1073741824, uptime: 3600, history: [{ cpu: 10 }, { cpu: 30 }] } });
  assert.deepStrictEqual(m, { cpu: 'AMD Ryzen 7', cores: 16, ramGB: 32, ramUsedPct: 75, uptimeMs: 3600000, avgCpu: 20 });
  assert.strictEqual(C.machine({}).ramGB, null);
});

test('Dienste: nach Art, laufende zuerst, unbekannte Arten als „other“ – nie ein roher Schlüssel', () => {
  const g = C.services([{ kind: 'db', name: 'B', state: 'stopped' }, { kind: 'web', name: 'Z', state: 'stopped' }, { kind: 'web', name: 'A', state: 'running' }, { kind: 'neu', name: 'X', state: 'running' }, { kind: 'game', name: 'V', state: 'running' }]);
  assert.deepStrictEqual(g.map((x) => x.kind), ['web', 'db', 'game', 'other']);
  assert.deepStrictEqual(g[0].items.map((x) => x.name), ['A', 'Z']);
});

test('Übersicht: Spiele-Server und Mail-Fänger sind dabei, System und Version', () => {
  const o = { app: { version: '2.12.0', platform: 'win32' }, web: [{ id: 'w', name: 'Shop', port: 8080, proc: { state: 'running' } }], games: [{ id: 'v', name: 'Valheim', running: true }], mail: { config: { smtpPort: 1025 }, proc: { state: 'stopped' } } };
  const list = C.fromOverview(o);
  assert.deepStrictEqual(list.map((s) => [s.kind, s.state, s.port]), [['web', 'running', 8080], ['game', 'running', null], ['mail', 'stopped', 1025]]);
  assert.strictEqual(list[0].url, 'http://localhost:8080');
  assert.deepStrictEqual(C.about(o), { version: '2.12.0', os: 'Windows', headless: false });
  assert.deepStrictEqual(C.fromOverview(null), []);
  assert.deepStrictEqual(C.tile(list, { avgCpu: 5, ramUsedPct: 40 }), { up: 2, all: 3, cpu: 5, ram: 40 });
});

test('Zertifikate (knappste zuerst) und Ports (nur belegte)', () => {
  const c = C.certs({ items: [{ domain: 'a.de', daysLeft: 60 }, { domain: 'b.de', daysLeft: 5 }], missing: [{ domain: 'c.de' }], local: { leaf: { names: ['localhost'], daysLeft: 300 } } });
  assert.deepStrictEqual(c.map((x) => x.name), ['b.de', 'a.de', 'localhost', 'c.de']);
  assert.deepStrictEqual(C.certs(null), []);
  assert.deepStrictEqual(C.ports([{ port: 80, name: 'Apache', status: 'ours' }, { port: 81, status: 'free' }, { port: 3306, name: 'DB', status: 'blocked' }]).map((p) => p.port), [80, 3306]);
});

test('Ohne Adressen: keine IPs, Webadressen oder Domains – Ports bleiben', () => {
  const card = { network: { localIp: '192.168.1.5', externalIp: '1.2.3.4' }, groups: C.services([{ kind: 'web', name: 'Shop', state: 'running', port: 8080, url: 'http://localhost:8080' }]), certs: [{ name: 'shop.de', daysLeft: 9 }], ports: [] };
  const r = C.redact(card);
  const json = JSON.stringify(r);
  for (const secret of ['192.168', '1.2.3.4', 'localhost:8080', 'shop.de']) assert.ok(!json.includes(secret), secret);
  assert.strictEqual(r.groups[0].items[0].port, 8080);
  assert.strictEqual(card.network.localIp, '192.168.1.5', 'Original bleibt');
});

test('Klartext: Ortszeit von der Seite, Laufzeit, Dienste, Zertifikate, Ports', () => {
  const m = C.machine({ system: { cpuModel: 'CPU', cpus: 4, totalMem: 1073741824, freeMem: 0, uptime: 7200 } });
  const card = { machine: m, about: { os: 'Linux', version: '2.12.0' }, network: { localIp: '10.0.0.2' }, groups: C.services([{ kind: 'web', name: 'Shop', state: 'running', port: 8080, url: 'http://localhost:8080' }]), certs: [{ name: 'a.de', daysLeft: 12 }], ports: [{ port: 25, name: 'Mail', status: 'blocked' }] };
  const txt = C.asText(card, LABELS, { stamp: '21.10.2026, 14:30', duration: () => '2 Std 0 Min', number: (n) => String(n).replace('.', ',') });
  assert.ok(txt.startsWith('# Steckbrief – 21.10.2026, 14:30'));
  assert.ok(txt.includes('System: Linux · Hostwerk 2.12.0'));
  assert.ok(txt.includes('IP: 10.0.0.2'));
  assert.ok(txt.includes('Prozessor: CPU (4 Kerne)'));
  assert.ok(txt.includes('Läuft seit: 2 Std 0 Min'));
  assert.ok(txt.includes('- Shop: läuft, Port 8080 – http://localhost:8080'));
  assert.ok(txt.includes('- a.de: noch 12 Tage'));
  assert.ok(txt.includes('- 25: Mail (belegt)'));
  assert.ok(!/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(txt), 'keine UTC-Zeit mehr');
});

test('JSON: lesbar, mit ISO-Zeitpunkt', () => {
  const j = JSON.parse(C.asJson({ groups: [] }, Date.UTC(2026, 9, 21)));
  assert.strictEqual(j.generatedAt, '2026-10-21T00:00:00.000Z');
  assert.deepStrictEqual(j.groups, []);
});
