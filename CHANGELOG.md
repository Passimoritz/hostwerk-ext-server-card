## 1.4.0

- Moved into Hostwerk: the profile is now a **Profile tab under System** instead of an own page in the sidebar; the dashboard tile opens it there. / Eingebaut: jetzt Reiter **Steckbrief unter System** statt eigener Seite in der Seitenleiste; die Kachel öffnet ihn dort.
- New layout that uses the full width: key figures with bars (processor load, memory, drive), long values wrap or shorten with a tooltip instead of overflowing, services as one table (name, kind, state, port, address, software/version), explanations as ⓘ. / Neues Raster über die ganze Breite: Kennzahlen mit Balken, lange Werte brechen um bzw. kürzen mit Tooltip, Dienste als eine Tabelle, Erklärungen als ⓘ.
- New content: health score 0–100 with reasons, drive space, uptime start, network details from the Router extension (IPv6, gateway, router, connection type, DynDNS, ports open from outside), software versions (PHP, web/database/Minecraft software, AI model), security warnings, port conflicts. / Neu: Zustand als Punktzahl mit Gründen, Speicherplatz, Netzwerk-Details samt von außen offenen Ports, Software-Versionen, Sicherheitshinweise, Port-Konflikte.
- Compare with before: lists what changed since the saved state (services, ports, versions, Hostwerk, PHP, hardware, addresses, forwards). / Vergleich zum gemerkten Stand.
- Optional device name. / Optionaler Gerätename.
- One “Share” menu: text, Markdown, JSON, redacted copy for support, print / PDF and the “Without addresses” switch; the print view is always light and compact. / Ein Menü „Teilen“ mit Text, Markdown, JSON, geschwärzter Support-Kopie, Drucken/PDF und „Ohne Adressen“; Druckansicht immer hell und kompakt.
- Right-click a service to open it or copy its line, port or address. / Rechtsklick auf einen Dienst: öffnen oder kopieren.
- Tile with health score and bars for CPU and memory. / Kachel mit Punktzahl und Balken.
- New permission `storage` (device name, comparison state). / Neues Recht `storage`.

## 1.3.1

- Buttons have a name for screen readers right away, before the language has loaded. / Knöpfe haben sofort einen Namen für Bildschirmleser, schon bevor die Sprache geladen ist.

## 1.3.0

- Copied text shows the local time in Hostwerk's language instead of UTC (it was off by one or two hours) and includes the uptime. / Kopiertext in Ortszeit statt UTC, mit Laufzeit.
- Game servers and the mail catcher are listed; unknown kinds appear as "Other" instead of a raw key. / Spiele-Server und Mail-Fänger dabei, keine rohen Schlüssel.
- Error state with "Try again" instead of an endless skeleton; refresh pauses while the page is hidden. / Fehlerzustand, Nachladen pausiert bei verstecktem Reiter.
- More content: system and Hostwerk version, IP addresses, certificates, ports in use. / Mehr Inhalt: System, Version, IP, Zertifikate, Ports.
- Copy as JSON, PDF via the print dialog, "Without addresses" for sharing. / Export als JSON und PDF, „Ohne Adressen“.
- Dashboard tile. / Kachel für die Übersicht.
- Own place in the sidebar (area "Monitoring", next to Status Wall and Uptime Wall), other extensions may add tabs, sizes from the design scale. / Platz in der Seitenleiste (Bereich „Überwachung“), Reiter für Zusätze, Design-Skala.
- New permissions `read:network` (IP) and `read:live` (certificates). / Neue Rechte read:network und read:live.

## 1.2.0

- New animated icon and a banner for Hostwerk's new extension page, category “monitoring”. / Neues bewegtes Symbol und ein Banner für die neue Erweiterungsseite, Kategorie „monitoring“.

## 1.1.0

- Looks exactly like Hostwerk's own pages: uses Hostwerk's design classes (card, btn, badge …) from the SDK 2.2 design kit; Hostwerk draws the page header. / Sieht aus wie Hostwerks eigene Seiten: Hostwerks Design-Klassen aus dem Baukasten (SDK 2.2), Kopf zeichnet Hostwerk.

## 1.0.0

- First release / Erste Fassung.
