![Server-Steckbrief](banner.svg)

# Server-Steckbrief

Alles Wichtige über diesen PC und seine Dienste auf einer Seite – System, Prozessor, Speicher, Laufzeit, IP, Dienste mit Ports und Adressen, Zertifikate und Ports. Zum Drucken (auch als PDF), als Text oder JSON – zum Teilen auch ohne Adressen.

Eine offizielle Erweiterung für [Hostwerk](https://github.com/Passimoritz/hostwerk-public).

## Funktionen

- System (Betriebssystem, Hostwerk-Version), Prozessor, Kerne, Arbeitsspeicher, Laufzeit und Ø-Auslastung, IP im Heimnetz (mit der Router-Erweiterung auch die öffentliche)
- Alle Dienste nach Art, mit Zustand, Port und Adresse – auch Spiele-Server und der Mail-Fänger
- Zertifikate mit Resttagen, belegte Ports (und Ports, die andere Programme blockieren)
- Als Text (Markdown, Ortszeit in Hostwerks Sprache) oder als JSON kopieren – z. B. für ein Ticket oder die Doku
- **Ohne Adressen**: ein Schalter blendet IPs, Webadressen und Domains zum Teilen aus (Seite, Druck, Text und JSON)
- Druckansicht ohne Knöpfe – „Als PDF speichern“ im Druckdialog ergibt eine PDF-Datei
- Kachel für die Übersicht: laufende Dienste, Auslastung und Speicher
- Deutlicher Fehlerzustand mit „Erneut versuchen“; lädt alle 30 s nach, aber nur solange die Seite sichtbar ist

## Installieren

In Hostwerk: **Apps → Erweiterungen → Marktplatz** → „Server-Steckbrief“ → Installieren. Updates kommen von selbst.

## Rechte

- Systemzustand, Auslastung und Ports lesen (`read:system`)
- Dienste und ihren Zustand sehen (`read:services`)
- Router-Zustand für die IP-Adressen lesen (`read:network`)
- Zertifikate lesen (`read:live`)

Jeder Zusatz erscheint nur, wenn Recht und Daten da sind – der Steckbrief bricht nie an einem davon.

Seiten laufen abgeschottet (eigener Ursprung, keine fremden Skripte); alles, was etwas ändert, fragt vorher nach.

## Entwicklung

```bash
node --test tests/*.test.js            # Tests der Logik
node pfad/zu/hostwerk-public/sdk/check.js . --strict   # dieselbe Prüfung wie der Katalog
```

Die Logik steckt in `page/lib.js` (ohne DOM, getestet), die Seite in `page/app.js`. Ein Tag `vX.Y.Z` passend zu `manifest.json` veröffentlicht ein Release; der Hostwerk-Katalog übernimmt es.

English: [README.md](README.md) · Lizenz: MIT
