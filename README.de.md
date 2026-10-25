![Server-Steckbrief](banner.svg)

# Server-Steckbrief

Alles Wichtige über diesen PC und seine Dienste – dort, wo du dich um dein System kümmerst: als Reiter **Steckbrief** unter **System**. Zustand als Punktzahl, Prozessor, Speicher, Laufwerk, Netzwerk mit offenen Ports, Software-Versionen, alle Dienste in einer Tabelle, Zertifikate – und was sich seit dem letzten Mal geändert hat. Teilen als Text, Markdown, JSON oder PDF – ohne Adressen oder geschwärzt für eine Support-Anfrage.

[English](README.md) · Offizielle [Hostwerk](https://github.com/Passimoritz/hostwerk-public)-Erweiterung (läuft abgeschottet, ab Hostwerk 2.9)

## Was sie kann

- **Steht unter System → Steckbrief** (kein eigener Eintrag in der Seitenleiste); die Kachel in der Übersicht öffnet ihn
- **Kennzahlen mit Balken**: Prozessor (lange Namen brechen sauber um, ganzer Name als Tooltip) mit Ø-Last, belegter Arbeitsspeicher, freier Platz auf Hostwerks Laufwerk samt Anteil der Dienste, Laufzeit mit Startzeit, IP im Heimnetz
- **Zustand von 0 bis 100** mit dem Grund für jeden Abzug: Dienste mit Fehler, ablaufende oder fehlende Zertifikate, Sicherheitshinweise, volles Laufwerk oder voller Arbeitsspeicher, Port-Konflikte, ausgefallene Erreichbarkeits-Prüfungen
- **Dienste als eine Tabelle**: Name, Art, Zustand mit Punkt, Port, Adresse, Programm und Version (PHP je Webserver) – Klick auf den Namen öffnet den Dienst, Rechtsklick kopiert Zeile, Port oder Adresse
- **Netzwerk** (mit der Erweiterung „Router“): IP im Heimnetz, öffentliche IP, IPv6, Gateway, Router-Modell, Anschlussart (DS-Lite, Carrier-NAT, Doppel-NAT …), DynDNS und die Ports, die **von außen offen** sind (Freigaben auf diesen PC)
- **Software**: installierte PHP-Versionen (aktive markiert), Webserver-, Datenbank- und Minecraft-Programme mit Version, KI-Modell, Port der Hostwerk-Oberfläche
- Zertifikate mit Resttagen, Sicherheitshinweise, Port-Konflikte
- **Vergleich zu vorher**: merkt sich einen Stand (beim ersten Besuch von selbst, „Jetzt merken“ jederzeit) und zeigt neue oder entfernte Dienste, geänderte Ports und Versionen, Änderungen an Hostwerk, PHP und Hardware, neue Adressen und Freigaben
- **Optionaler Gerätename** – steht oben, im Ausdruck und in jeder Kopie
- **Menü „Teilen“**: als Text, Markdown (mit Tabellen) oder JSON kopieren, **für den Support** (Markdown ohne Adressen, Domains, Geräte- und Dienstnamen), Drucken / PDF und der Schalter „Ohne Adressen“
- Druckansicht: immer hell, kompakt, ohne Knöpfe – „Als PDF speichern“ im Druckdialog ergibt eine PDF-Datei
- Hostwerks Design-Skala und Farb-Tokens, Hell und Dunkel, Menüs mit der Tastatur bedienbar, Deutsch und Englisch

## Installieren

In Hostwerk: **Apps → Erweiterungen → Marktplatz** → „Server-Steckbrief“ → Installieren. Updates kommen von selbst.

## Rechte

- Systemzustand, Auslastung, Ports und Speicher je Dienst lesen (`read:system`)
- Dienste und ihren Zustand sehen (`read:services`)
- Router-Zustand und Sicherheitslage lesen (`read:network`)
- Zertifikate lesen (`read:live`)
- Gerätenamen und Vergleichsstand speichern (`storage`)

Jeder Zusatz erscheint nur, wenn Recht und Daten da sind – der Steckbrief bricht nie an einem davon.

Seiten laufen abgeschottet (eigener Ursprung, keine fremden Skripte); alles, was etwas ändert, fragt vorher nach.

## Entwickeln

```bash
node --test tests/*.test.js            # Tests der Logik
node pfad/zu/hostwerk-public/sdk/check.js . --strict   # dieselbe Prüfung wie der Katalog
```

Die Logik steckt in `page/lib.js` (ohne DOM, getestet), der Reiter in `page/app.js`, die Kachel in `widget/index.html`. Ein Tag `vX.Y.Z` passend zu `manifest.json` veröffentlicht ein Release; der Hostwerk-Katalog übernimmt es.

English: [README.md](README.md) · Lizenz: MIT

## Lizenz

MIT
