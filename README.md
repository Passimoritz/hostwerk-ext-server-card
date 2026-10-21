![Server profile](banner.svg)

# Server profile

Everything important about this PC and its services on one page – system, processor, memory, uptime, IP, services with ports and addresses, certificates and ports. Print it (also as PDF), copy it as text or JSON – without addresses if you want to share it.

An official [Hostwerk](https://github.com/Passimoritz/hostwerk-public) extension.

## Features

- System (operating system, Hostwerk version), processor, cores, memory, uptime and average load, IP in the home network (with the Router extension also the public one)
- All services grouped by kind, with state, port and address – game servers and the mail catcher included
- Certificates with days left, ports in use (and ports blocked by other programs)
- Copy as text (Markdown, local time in Hostwerk's language) or as JSON – e.g. for a ticket or your documentation
- **Without addresses**: one switch hides IPs, web addresses and domains for sharing (page, print, text and JSON)
- Print view without buttons – “Save as PDF” in the print dialog gives you a PDF
- Dashboard tile: running services, load and memory
- Clear error state with “Try again”; refreshes every 30 s only while the page is visible

## Install

In Hostwerk: **Apps → Extensions → Marketplace** → “Server profile” → Install. Updates arrive automatically.

## Permissions

- Read system load, resources and ports (`read:system`)
- See services and their state (`read:services`)
- Read the router status for the IP addresses (`read:network`)
- Read certificates (`read:live`)

Each extra part only appears when its permission and data are there – the profile never breaks because of one of them.

Pages run isolated (own origin, no external scripts); anything that changes something asks you first.

## Development

```bash
node --test tests/*.test.js            # logic tests
node path/to/hostwerk-public/sdk/check.js . --strict   # same check as the catalog
```

The logic lives in `page/lib.js` (no DOM, tested), the page in `page/app.js`. A tag `vX.Y.Z` matching `manifest.json` publishes a release; the Hostwerk catalog picks it up.

Deutsch: [README.de.md](README.de.md) · License: MIT
