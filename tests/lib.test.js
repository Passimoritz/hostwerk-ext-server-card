const test = require('node:test');
const assert = require('node:assert');
const C = require('../page/lib.js');

const LABELS = {
  title: 'Steckbrief', system: 'System', ip: 'IP', ipPublic: 'öffentlich', 'kind.web': 'Webserver', 'kind.db': 'Datenbank', 'kind.game': 'Spiele-Server', 'state.running': 'läuft', 'state.stopped': 'aus',
  port: 'Port', cpu: 'Prozessor', cores: 'Kerne', ram: 'RAM', usedPct: '{n} % belegt', load: 'Ø {n} % Last', uptime: 'Läuft seit', certs: 'Zertifikate', daysLeft: 'noch {n} Tage', certMissing: 'fehlt',
  conflicts: 'Port-Konflikte', 'port.blocked': 'belegt', forwards: 'Von außen offen', services: 'Dienste', stamp: 'Stand: {time}', health: 'Zustand', disk: 'Speicherplatz', diskFree: '{free} frei von {total}',
  thWhat: 'Was', thValue: 'Wert', thName: 'Name', thKind: 'Art', thState: 'Zustand', thAddress: 'Adresse', thVersion: 'Programm', mdSupport: 'Geschwärzt', mdNoAddr: 'Ohne Adressen', deviceName: 'Name',
  security: 'Sicherheit', 'lvl.err': 'Wichtig', 'lvl.warn': 'Hinweis', router: 'Router', 'link.dslite': 'DS-Lite', active: 'aktiv',
};
const overview = () => ({
  app: { version: '2.12.0', platform: 'win32', service: true },
  web: [{ id: 'w', name: 'Shop', port: 8080, typeLabel: 'Apache', version: '2.4.62', phpResolved: '8.3', proc: { state: 'running' } }],
  db: [{ id: 'd', name: 'Daten', port: 3307, typeLabel: 'MariaDB', version: '11.4', proc: { state: 'error' } }],
  games: [{ id: 'v', name: 'Wikingerwelt', running: true, game: 'Valheim' }],
  mail: { config: { smtpPort: 1025 }, proc: { state: 'stopped' } },
  php: { installed: ['8.2', '8.3'], active: '8.3' },
  ai: { installed: true, provider: 'ollama', model: 'qwen3', state: 'running' },
  live: { remote: true, domain: 'shop.de', down: ['Shop'] },
});

test('Rechner: Speicher, Auslastung, Laufzeit', () => {
  const m = C.machine({ system: { cpuModel: 'AMD   Ryzen 7  ', cpus: 16, totalMem: 32 * 1073741824, freeMem: 8 * 1073741824, uptime: 3600, history: [{ cpu: 10 }, { cpu: 30 }] } });
  assert.deepStrictEqual(m, { cpu: 'AMD Ryzen 7', cores: 16, ramGB: 32, ramUsedGB: 24, ramUsedPct: 75, uptimeMs: 3600000, avgCpu: 20 });
  assert.strictEqual(C.machine({}).ramGB, null);
});

test('Dienste: nach Art, laufende zuerst, unbekannte Arten als „other“ – nie ein roher Schlüssel', () => {
  const g = C.services([{ kind: 'db', name: 'B', state: 'stopped' }, { kind: 'web', name: 'Z', state: 'stopped' }, { kind: 'web', name: 'A', state: 'running' }, { kind: 'neu', name: 'X', state: 'running' }, { kind: 'game', name: 'V', state: 'running' }]);
  assert.deepStrictEqual(g.map((x) => x.kind), ['web', 'db', 'game', 'other']);
  assert.deepStrictEqual(g[0].items.map((x) => x.name), ['A', 'Z']);
  assert.deepStrictEqual(C.flat(g).map((s) => s.name), ['A', 'Z', 'B', 'V', 'X']);
});

test('Übersicht: Spiele-Server und Mail-Fänger dabei, Programm und Version, System und Betriebsart', () => {
  const o = overview();
  const list = C.fromOverview(o);
  assert.deepStrictEqual(list.map((s) => [s.kind, s.state, s.port]), [['web', 'running', 8080], ['db', 'error', 3307], ['game', 'running', null], ['mail', 'stopped', 1025]]);
  assert.strictEqual(list[0].url, 'http://localhost:8080');
  assert.deepStrictEqual([list[0].type, list[0].version, list[0].php], ['Apache', '2.4.62', '8.3']);
  assert.deepStrictEqual(C.about(o), { version: '2.12.0', os: 'Windows', headless: false, service: true, remote: true, domain: 'shop.de' });
  assert.deepStrictEqual(C.fromOverview(null), []);
  assert.deepStrictEqual(C.tile(list, { avgCpu: 5, ramUsedPct: 40 }), { up: 2, all: 4, cpu: 5, ram: 40, score: null, grade: null });
});

test('Software: PHP mit aktiver Version, Programme ohne Doppelte, KI', () => {
  const o = overview();
  const s = C.software(o, [...C.fromOverview(o), { kind: 'web', type: 'Apache', version: '2.4.62' }]);
  assert.deepStrictEqual(s.php, [{ version: '8.2', active: false }, { version: '8.3', active: true }]);
  assert.deepStrictEqual(s.programs.map((p) => `${p.name} ${p.version}`), ['Apache 2.4.62', 'MariaDB 11.4']);
  assert.deepStrictEqual(s.ai, { provider: 'ollama', model: 'qwen3', state: 'running' });
  assert.deepStrictEqual(C.software(null, []), { php: [], programs: [], ai: null });
});

test('Zertifikate (knappste zuerst), Ports (nur Konflikte), Oberflächen-Port, Laufwerk', () => {
  const c = C.certs({ items: [{ domain: 'a.de', daysLeft: 60 }, { domain: 'b.de', daysLeft: 5 }], missing: [{ domain: 'c.de' }], local: { leaf: { names: ['localhost'], daysLeft: 300 } } });
  assert.deepStrictEqual(c.map((x) => x.name), ['b.de', 'a.de', 'localhost', 'c.de']);
  assert.deepStrictEqual(C.certs(null), []);
  const ports = [{ port: 80, name: 'Apache', status: 'ours' }, { port: 81, status: 'free' }, { port: 3306, name: 'DB', status: 'blocked', usedBy: { name: 'mysqld.exe' } }, { kind: 'hostwerk', id: 'ui', port: 8090, status: 'ours' }];
  assert.deepStrictEqual(C.ports(ports), [{ port: 3306, name: 'DB', status: 'blocked', by: 'mysqld.exe' }]);
  assert.strictEqual(C.uiPort(ports), 8090);
  assert.strictEqual(C.uiPort(null), null);
  assert.deepStrictEqual(C.disk({ disk: { free: 25, total: 100 }, services: [{ bytes: 5 }, { bytes: 7 }] }), { free: 25, total: 100, usedPct: 75, services: 12 });
  assert.strictEqual(C.disk({ computing: true, services: [], disk: null }), null);
});

test('Netzwerk aus dem Router: Anschlussart, IPv6, nur Freigaben auf diesen PC', () => {
  const n = C.network({
    gateway: '192.168.178.1', localIp: '192.168.178.20', externalIp: '100.64.1.2', dslite: true, router: { name: 'FRITZ!Box', manufacturer: 'AVM', model: '7590' },
    ipv6: { address: '2001:db8::5' }, dyndns: { domain: 'ich.dyndns.org' },
    mappings: [{ externalPort: 25565, protocol: 'TCP', description: 'Hostwerk mc', here: true }, { externalPort: 443, protocol: 'TCP', description: 'Hostwerk web', here: true }, { externalPort: 22, protocol: 'TCP', here: false }],
  });
  assert.strictEqual(n.link, 'dslite');
  assert.strictEqual(n.router, 'AVM 7590');
  assert.strictEqual(n.ipv6, '2001:db8::5');
  assert.deepStrictEqual(n.forwards.map((f) => f.port), [443, 25565]);
  assert.strictEqual(C.network(null), null);
  assert.strictEqual(C.network({ gateway: '10.0.0.1' }).link, 'normal');
});

test('Sicherheit: Zählung je Stufe, Art ohne Namen', () => {
  const s = C.security({ items: [{ id: 'db-pass:d', level: 'err', title: 'Daten: kein Passwort' }, { id: 'updates', level: 'info', title: 'Updates aus' }, { id: 'web-https:w:v', level: 'warn', title: 'shop.de: ohne HTTPS' }] });
  assert.deepStrictEqual([s.err, s.warn, s.info], [1, 1, 1]);
  assert.deepStrictEqual(s.items.map((x) => x.kind), ['db-pass', 'web-https']);
  assert.strictEqual(C.security(null), null);
});

test('Zustand: Abzüge mit Grenzen, größter Grund zuerst, Stufen', () => {
  const perfect = C.health({ groups: C.services([{ kind: 'web', name: 'A', state: 'running' }]), certs: [{ daysLeft: 80 }], machine: { ramUsedPct: 50 }, disk: { usedPct: 40 } });
  assert.deepStrictEqual(perfect, { score: 100, grade: 'good', why: [] });
  const h = C.health({
    groups: C.services([{ kind: 'db', name: 'D', state: 'error' }]), certs: [{ daysLeft: 3 }, { daysLeft: 20 }, { daysLeft: null }],
    security: { err: 5, warn: 1 }, disk: { usedPct: 92 }, machine: { ramUsedPct: 96 }, ports: [{}], down: ['Shop'],
  });
  // 15 Dienst + 15 + 5 + 10 Zertifikate + 30 (gedeckelt) + 4 Sicherheit + 10 Laufwerk + 10 RAM + 5 Ports + 10 Prüfung = 114 → 0
  assert.strictEqual(h.score, 0);
  assert.strictEqual(h.grade, 'poor');
  assert.strictEqual(h.why[0].key, 'secErr');
  assert.strictEqual(h.why.find((w) => w.key === 'secErr').weight, 30);
  assert.strictEqual(C.health({ disk: { usedPct: 85 } }).score, 97);
  assert.strictEqual(C.health({ groups: C.services([{ kind: 'web', state: 'error' }, { kind: 'web', state: 'error' }]) }).grade, 'fair');
});

const sample = () => {
  const o = overview();
  const list = C.fromOverview(o);
  const card = {
    at: 1, name: 'Büro-PC', about: C.about(o), machine: C.machine({ system: { cpuModel: 'CPU', cpus: 4, totalMem: 1073741824, freeMem: 0, uptime: 7200 } }),
    network: C.network({ gateway: '192.168.1.1', localIp: '192.168.1.5', externalIp: '1.2.3.4', ipv6: { address: '2001:db8::1' }, dyndns: { domain: 'ich.dyndns.org' }, mappings: [{ externalPort: 443, protocol: 'TCP', description: 'Hostwerk web', here: true }] }),
    groups: C.services(list), certs: [{ name: 'shop.de', daysLeft: 9 }], ports: [{ port: 25, name: 'Mail', status: 'blocked', by: 'smtp.exe' }],
    software: C.software(o, list), security: C.security({ items: [{ id: 'db-pass:d', level: 'err', title: 'Daten: kein Passwort' }] }), down: ['Shop'],
  };
  card.health = C.health(card);
  return card;
};

test('Ohne Adressen: keine IPs, Webadressen oder Domains – Ports bleiben, Original unverändert', () => {
  const card = sample();
  const r = C.redact(card);
  const json = JSON.stringify(r);
  for (const secret of ['192.168', '1.2.3.4', '2001:db8', 'localhost:8080', 'shop.de', 'ich.dyndns.org']) assert.ok(!json.includes(secret), secret);
  assert.strictEqual(r.groups[0].items[0].port, 8080);
  assert.strictEqual(r.name, 'Büro-PC', 'Gerätename bleibt beim normalen Teilen');
  assert.strictEqual(card.network.localIp, '192.168.1.5', 'Original bleibt');
});

test('Für den Support: zusätzlich ohne Geräte- und Dienstnamen, Sicherheitshinweise nur als Art', () => {
  const r = C.redact(sample(), { support: true });
  const json = JSON.stringify(r);
  for (const secret of ['Büro-PC', 'Shop', 'Daten', 'Wikingerwelt', 'smtp.exe', 'Hostwerk web', '192.168', 'shop.de']) assert.ok(!json.includes(secret), secret);
  assert.deepStrictEqual(C.flat(r.groups).map((s) => s.name), ['web-1', 'db-1', 'game-1', 'mail-1']);
  assert.strictEqual(r.security.items[0].title, 'db-pass');
  assert.strictEqual(r.redacted, 'support');
  assert.strictEqual(C.asMarkdown(r, LABELS).includes('> Geschwärzt'), true);
});

test('Vergleich: Dienste neu/weg, Port und Version, Hostwerk, PHP, Freigaben – Zustand zählt nicht', () => {
  const card = sample();
  const before = C.snapshot(card);
  assert.deepStrictEqual(C.diff(before, C.snapshot(card)), []);
  const after = sample();
  after.about.version = '2.13.0';
  after.groups[0].items[0].port = 8081; after.groups[0].items[0].version = '2.4.63'; after.groups[0].items[0].state = 'stopped';
  after.groups = after.groups.filter((g) => g.kind !== 'game');
  after.groups.push({ kind: 'minecraft', items: [{ kind: 'minecraft', id: 'm', name: 'Survival', state: 'running', port: 25565 }] });
  after.software.php = [{ version: '8.4', active: true }];
  after.network.forwards = [];
  const types = C.diff(before, C.snapshot(after)).map((x) => `${x.type}:${x.name || x.to || x.from}`);
  assert.deepStrictEqual(types.sort(), ['added:Survival', 'forwardRemoved:443/TCP', 'hostwerk:2.13.0', 'phpAdded:8.4', 'phpRemoved:8.2', 'phpRemoved:8.3', 'port:Shop', 'removed:Wikingerwelt', 'version:Shop'].sort());
  assert.deepStrictEqual(C.diff(null, before), []);
  assert.ok(JSON.stringify(before).length < 20000, 'passt locker in Hostwerk.storage');
});

test('Klartext: Ortszeit von der Seite, Name, Laufzeit, Dienste mit Programm, Zertifikate, Freigaben, Konflikte', () => {
  const txt = C.asText(sample(), LABELS, { stamp: '21.10.2026, 14:30', duration: () => '2 Std 0 Min', number: (n) => String(n).replace('.', ',') });
  assert.ok(txt.startsWith('Steckbrief – Büro-PC (21.10.2026, 14:30)'));
  assert.ok(txt.includes('System: Windows · Hostwerk 2.12.0'));
  assert.ok(txt.includes('IP: 192.168.1.5 · öffentlich 1.2.3.4'));
  assert.ok(txt.includes('Prozessor: CPU (4 Kerne)'));
  assert.ok(txt.includes('Läuft seit: 2 Std 0 Min'));
  assert.ok(txt.includes('- Shop: läuft, Port 8080, Apache 2.4.62 – http://localhost:8080'));
  assert.ok(txt.includes('- shop.de: noch 9 Tage'));
  assert.ok(txt.includes('Von außen offen: 443/TCP'));
  assert.ok(txt.includes('- 25: Mail (belegt)'));
  assert.ok(!/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(txt), 'keine UTC-Zeit');
  // Hostwerk.t als Funktion geht genauso
  assert.ok(C.asText(sample(), (k) => k.toUpperCase()).startsWith('TITLE – Büro-PC'));
});

test('Markdown: Tabellen, Striche in Werten zerreißen nichts, Sicherheitshinweise', () => {
  const card = sample();
  card.groups[0].items[0].name = 'Shop | Test';
  const md = C.asMarkdown(card, LABELS, { stamp: '21.10.2026, 14:30' });
  assert.ok(md.startsWith('# Steckbrief – Büro-PC'));
  assert.ok(md.includes('_Stand: 21.10.2026, 14:30_'));
  assert.ok(md.includes('| Was | Wert |'));
  assert.ok(md.includes('| Shop \\| Test | Webserver | läuft | 8080 | http://localhost:8080 | Apache 2.4.62 |'));
  assert.ok(md.includes('| Zustand | '));
  assert.ok(md.includes('- **Wichtig:** Daten: kein Passwort'));
  assert.ok(md.includes('`443/TCP`'));
});

test('JSON: lesbar, mit ISO-Zeitpunkt', () => {
  const j = JSON.parse(C.asJson({ groups: [] }, Date.UTC(2026, 9, 21)));
  assert.strictEqual(j.generatedAt, '2026-10-21T00:00:00.000Z');
  assert.deepStrictEqual(j.groups, []);
});

test('Wege zu den Diensten in Hostwerk', () => {
  assert.strictEqual(C.ROUTES.web('w'), '/web/w');
  assert.strictEqual(C.ROUTES.db('d'), '/dbs/d');
  assert.strictEqual(C.ROUTES.minecraft('m'), '/mc/m');
  assert.strictEqual(C.ROUTES.mail(), '/mail');
});
