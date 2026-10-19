![Server profile](banner.svg)

# Server profile

Everything important about this PC and its services on one page – processor, memory, uptime, services with ports and addresses. Print it or copy it as text.

An official [Hostwerk](https://github.com/Passimoritz/hostwerk-public) extension.

## Features

- Processor, cores, memory, uptime and average load
- All services grouped by kind, with state, port and address
- Copy as text (Markdown) – e.g. for a ticket or your documentation
- Print view without buttons

## Install

In Hostwerk: **Apps → Extensions → Marketplace** → “Server profile” → Install. Updates arrive automatically.

## Permissions

- Read system load and resources
- See services and their state

Pages run isolated (own origin, no external scripts); anything that changes something asks you first.

## Development

```bash
node --test tests/*.test.js            # logic tests
node path/to/hostwerk-public/sdk/check.js . --strict   # same check as the catalog
```

The logic lives in `page/lib.js` (no DOM, tested), the page in `page/app.js`. A tag `vX.Y.Z` matching `manifest.json` publishes a release; the Hostwerk catalog picks it up.

Deutsch: [README.de.md](README.de.md) · License: MIT
