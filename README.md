![Server profile](banner.svg)

# Server profile

Everything important about this PC and its services, right where you look after your system: a **Profile** tab under **System**. Health score, processor, memory, drive, network with open ports, software versions, all services in one table, certificates – and what changed since last time. Share it as text, Markdown, JSON or PDF – without addresses, or redacted for a support request.

An official [Hostwerk](https://github.com/Passimoritz/hostwerk-public) extension.

## Features

- **Lives under System → Profile** (no own sidebar entry); the dashboard tile opens it
- **Key figures with bars**: processor (long names wrap cleanly, full name as tooltip) with average load, memory in use, free space on Hostwerk's drive incl. how much the services take, uptime since when, local IP
- **Health score 0–100** with the reasons behind every deduction: services with errors, expiring or missing certificates, security warnings, full drive or memory, port conflicts, failed uptime checks
- **Services as one table**: name, kind, state with a dot, port, address, software and version (PHP per web server) – click a name to open it, right-click a row to copy the line, port or address
- **Network** (with the Router extension): local, public and IPv6 address, gateway, router model, connection type (DS-Lite, carrier NAT, double NAT …), DynDNS and the ports that are **open from outside** (forwards to this PC)
- **Software**: installed PHP versions (active one marked), web/database/Minecraft software with versions, AI model, port of the Hostwerk interface
- Certificates with days left, security warnings, port conflicts
- **Compare with before**: remembers a state (automatically on the first visit, “Save now” any time) and lists new or removed services, changed ports and versions, Hostwerk/PHP/hardware changes, new addresses and forwards
- **Optional device name**, shown at the top, in the printout and in every copy
- **Share menu**: copy as text, Markdown (with tables) or JSON, **for support** (Markdown without addresses, domains, device and service names), print / PDF, and the “Without addresses” switch
- Print view: always light, compact, without buttons – “Save as PDF” in the print dialog gives you a PDF
- Hostwerk design scale and colour tokens, light and dark, keyboard-friendly menus, German and English

## Install

In Hostwerk: **Apps → Extensions → Marketplace** → “Server profile” → Install. Updates arrive automatically.

## Permissions

- Read system load, resources, ports and storage per service (`read:system`)
- See services and their state (`read:services`)
- Read the router status and security status (`read:network`)
- Read certificates (`read:live`)
- Store the device name and the comparison state (`storage`)

Each extra part only appears when its permission and data are there – the profile never breaks because of one of them.

Pages run isolated (own origin, no external scripts); anything that changes something asks you first.

## Development

```bash
node --test tests/*.test.js            # logic tests
node path/to/hostwerk-public/sdk/check.js . --strict   # same check as the catalog
```

The logic lives in `page/lib.js` (no DOM, tested), the tab in `page/app.js`, the tile in `widget/index.html`. A tag `vX.Y.Z` matching `manifest.json` publishes a release; the Hostwerk catalog picks it up.

Deutsch: [README.de.md](README.de.md) · License: MIT
