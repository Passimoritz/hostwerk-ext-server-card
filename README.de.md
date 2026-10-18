# Server-Steckbrief

Alles Wichtige über diesen PC und seine Dienste auf einer Seite – Prozessor, Speicher, Laufzeit, Dienste mit Ports und Adressen. Zum Drucken oder als Text kopieren.

Eine offizielle Erweiterung für [Hostwerk](https://github.com/Passimoritz/hostwerk-public).

## Funktionen

- Prozessor, Kerne, Arbeitsspeicher, Laufzeit und Ø-Auslastung
- Alle Dienste nach Art, mit Zustand, Port und Adresse
- Als Text kopieren (Markdown) – z. B. für ein Ticket oder die Doku
- Druckansicht ohne Knöpfe

## Installieren

In Hostwerk: **Apps → Erweiterungen → Marktplatz** → „Server-Steckbrief“ → Installieren. Updates kommen von selbst.

## Rechte

- Systemzustand und Auslastung lesen
- Dienste und ihren Zustand sehen

Seiten laufen abgeschottet (eigener Ursprung, keine fremden Skripte); alles, was etwas ändert, fragt vorher nach.

## Entwicklung

```bash
node --test tests/*.test.js            # Tests der Logik
node pfad/zu/hostwerk-public/sdk/check.js . --strict   # dieselbe Prüfung wie der Katalog
```

Die Logik steckt in `page/lib.js` (ohne DOM, getestet), die Seite in `page/app.js`. Ein Tag `vX.Y.Z` passend zu `manifest.json` veröffentlicht ein Release; der Hostwerk-Katalog übernimmt es.

English: [README.md](README.md) · Lizenz: MIT
