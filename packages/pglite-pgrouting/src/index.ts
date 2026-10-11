import type {
  Extension,
  ExtensionSetupResult,
  PGliteInterface,
} from '@electric-sql/pglite'

// pgRouting requires postgis (see pgrouting.control), so load the postgis extension alongside this one
const setup = async (_pg: PGliteInterface, emscriptenOpts: any) => {
  return {
    emscriptenOpts,
    bundlePath: new URL('../release/pgrouting.tar.gz', import.meta.url),
  } satisfies ExtensionSetupResult
}

export const pgrouting = {
  name: 'pgrouting',
  setup,
} satisfies Extension
