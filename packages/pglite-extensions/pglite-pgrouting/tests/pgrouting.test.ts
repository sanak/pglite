import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { postgis } from '@electric-sql/pglite-postgis'
import { pgrouting } from '../src/index.js'

// 1-2-3-4 costs 3, beating 1-2-4 (5) and 1-3-4 (6), so the expected path is unique
const EDGES = `
  CREATE TABLE edges (
    id BIGINT PRIMARY KEY,
    source BIGINT NOT NULL,
    target BIGINT NOT NULL,
    cost FLOAT8 NOT NULL,
    reverse_cost FLOAT8 NOT NULL
  );
  INSERT INTO edges VALUES
    (1, 1, 2, 1, 1),
    (2, 2, 3, 1, 1),
    (3, 1, 3, 5, 5),
    (4, 3, 4, 1, 1),
    (5, 2, 4, 4, 4);
`

const DIJKSTRA = `
  SELECT node::int AS node, edge::int AS edge, agg_cost
  FROM pgr_dijkstra(
    'SELECT id, source, target, cost, reverse_cost FROM edges',
    1, 4
  )
  ORDER BY path_seq
`

const EXPECTED_PATH = [
  { node: 1, edge: 1, agg_cost: 0 },
  { node: 2, edge: 2, agg_cost: 1 },
  { node: 3, edge: 4, agg_cost: 2 },
  { node: 4, edge: -1, agg_cost: 3 },
]

describe('pgrouting', () => {
  let pg: PGlite
  let dataDirArchive: File | Blob

  beforeEach(async () => {
    if (!dataDirArchive) {
      pg = await PGlite.create({ extensions: { postgis, pgrouting } })
      dataDirArchive = await pg.dumpDataDir('gzip')
    } else {
      pg = await PGlite.create({
        extensions: { postgis, pgrouting },
        loadDataDir: dataDirArchive,
      })
    }
    await pg.exec('CREATE EXTENSION IF NOT EXISTS pgrouting CASCADE;')
  })

  afterEach(async () => {
    if (!pg.closed) {
      await pg.close()
    }
  })

  it('reports its version', async () => {
    const res = await pg.query<{ version: string }>(
      'SELECT pgr_version() AS version',
    )
    expect(res.rows[0].version).toBe('4.0.2')
  })

  it('finds the shortest path with pgr_dijkstra', async () => {
    await pg.exec(EDGES)
    const res = await pg.query(DIJKSTRA)
    expect(res.rows).toEqual(EXPECTED_PATH)
  })

  it('recovers from an SPI error inside pgRouting', async () => {
    await expect(
      pg.query(
        `SELECT * FROM pgr_dijkstra('SELECT id, source, target, cost FROM no_such_table', 1, 4)`,
      ),
    ).rejects.toThrow(/no_such_table/)
    const res = await pg.query<{ ok: number }>('SELECT 1 AS ok')
    expect(res.rows).toEqual([{ ok: 1 }])
  })

  it('recovers from a C++ exception', async () => {
    await pg.exec(EDGES)
    // the mandatory "cost" column is missing
    await expect(
      pg.query(
        `SELECT * FROM pgr_dijkstra('SELECT id, source, target FROM edges', 1, 4)`,
      ),
    ).rejects.toThrow()
    const res = await pg.query(DIJKSTRA)
    expect(res.rows).toEqual(EXPECTED_PATH)
  })

  it('still works after reopening a persisted data dir', async () => {
    await pg.exec(EDGES)
    const archive = await pg.dumpDataDir('gzip')
    await pg.close()
    pg = await PGlite.create({
      extensions: { postgis, pgrouting },
      loadDataDir: archive,
    })
    const res = await pg.query(DIJKSTRA)
    expect(res.rows).toEqual(EXPECTED_PATH)
  })

  it('fails clearly without postgis', async () => {
    const lonely = await PGlite.create({ extensions: { pgrouting } })
    try {
      await expect(
        lonely.exec('CREATE EXTENSION pgrouting CASCADE;'),
      ).rejects.toThrow(/postgis/)
      const res = await lonely.query<{ ok: number }>('SELECT 1 AS ok')
      expect(res.rows).toEqual([{ ok: 1 }])
    } finally {
      await lonely.close()
    }
  })
})
