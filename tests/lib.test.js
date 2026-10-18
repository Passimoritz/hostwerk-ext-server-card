const test = require('node:test');
const assert = require('node:assert');
const C = require('../page/lib.js');

test('Rechner: Speicher, Auslastung, Laufzeit', () => {
  const m = C.machine({ system: { cpuModel: 'AMD   Ryzen 7  ', cpus: 16, totalMem: 32 * 1073741824, freeMem: 8 * 1073741824, uptime: 3600, history: [{ cpu: 10 }, { cpu: 30 }] } });
  assert.deepStrictEqual(m, { cpu: 'AMD Ryzen 7', cores: 16, ramGB: 32, ramUsedPct: 75, uptimeMs: 3600000, avgCpu: 20 });
  assert.strictEqual(C.machine({}).ramGB, null);
});

test('Dienste: nach Art, laufende zuerst, unbekannte Arten am Ende', () => {
  const g = C.services([{ kind: 'db', name: 'B', state: 'stopped' }, { kind: 'web', name: 'Z', state: 'stopped' }, { kind: 'web', name: 'A', state: 'running' }, { kind: 'neu', name: 'X', state: 'running' }]);
  assert.deepStrictEqual(g.map((x) => x.kind), ['web', 'db', 'neu']);
  assert.deepStrictEqual(g[0].items.map((x) => x.name), ['A', 'Z']);
});

test('Klartext enthält Rechner und alle Dienste mit Port und Adresse', () => {
  const m = C.machine({ system: { cpuModel: 'CPU', cpus: 4, totalMem: 1073741824, freeMem: 0 } });
  const txt = C.asText(m, C.services([{ kind: 'web', name: 'Shop', state: 'running', port: 8080, url: 'http://localhost:8080' }]), { title: 'Steckbrief', 'kind.web': 'Webserver', 'state.running': 'läuft', port: 'Port', cpu: 'Prozessor', cores: 'Kerne', ram: 'RAM', used: 'belegt' }, Date.UTC(2026, 9, 18, 10, 0));
  assert.ok(txt.startsWith('# Steckbrief – 2026-10-18 10:00'));
  assert.ok(txt.includes('Prozessor: CPU (4 Kerne)'));
  assert.ok(txt.includes('- Shop: läuft, Port 8080 – http://localhost:8080'));
});
