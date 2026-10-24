# @electric-sql/pglite-pgrouting

*** EXPERIMENTAL ***

[pgRouting](https://pgrouting.org) 4.0.2 for [PGlite](https://pglite.dev). pgRouting depends on PostGIS, so load both extensions.

## Installation

```bash
npm install @electric-sql/pglite-postgis @electric-sql/pglite-pgrouting
```

## Usage

```typescript
import { PGlite } from '@electric-sql/pglite'
import { postgis } from '@electric-sql/pglite-postgis'
import { pgrouting } from '@electric-sql/pglite-pgrouting'

const pg = await PGlite.create({ extensions: { postgis, pgrouting } })
await pg.exec('CREATE EXTENSION IF NOT EXISTS pgrouting CASCADE;')

const { rows } = await pg.query(`
  SELECT * FROM pgr_dijkstra(
    'SELECT id, source, target, cost, reverse_cost FROM edges', 1, 4)
`)
```

## License

The TypeScript wrapper is Apache-2.0. The bundled pgRouting binary is GPL-2.0-or-later; see [LICENSE](./LICENSE).
