# Third-party notices

Hexis is licensed under the MIT License ([LICENSE](LICENSE)). The following third-party components are used by this repository. Versions are the exact resolved versions in `package-lock.json` as of the commit that introduced this file; the lockfile is the authoritative record of the complete dependency graph.

## Runtime dependencies

| Package | Version | Licence |
| --- | --- | --- |
| `@supabase/supabase-js` | 2.119.2 | MIT |
| `date-fns` | 4.4.0 | MIT |
| `lucide-react` | 1.75.0 | ISC |
| `react` | 19.3.1 | MIT |
| `react-dom` | 19.3.1 | MIT |

## Development and build dependencies

| Package | Version | Licence |
| --- | --- | --- |
| `@electric-sql/pglite` | 0.5.17 | Apache-2.0 |
| `@types/node` | 24.19.2 | MIT |
| `@types/react` | 19.3.0 | MIT |
| `@types/react-dom` | 19.3.0 | MIT |
| `@vitejs/plugin-react` | 6.3.0 | MIT |
| `oxlint` | 1.94.0 | MIT |
| `playwright` | 1.65.1 | Apache-2.0 |
| `typescript` | 7.0.2 | Apache-2.0 |
| `vite` | 8.3.8 | MIT |

Licence records were read from `package-lock.json` with:

```sh
node -e "const l=require('./package-lock.json'); for(const n of Object.keys(require('./package.json').dependencies).concat(Object.keys(require('./package.json').devDependencies))) { const p=l.packages['node_modules/'+n]; console.log(n+' | '+p.version+' | '+(p.license||'see package')); }"
```

## External services and assets

- Supabase (auth, Postgres) is a hosted service used through `@supabase/supabase-js`; the service itself is not bundled.
- Google Fonts serves `Geist` and `Space Grotesk` to the browser from `fonts.googleapis.com` / `fonts.gstatic.com` (`index.html:22-27`). Their licences are governed by the upstream font projects; the font binaries are not stored in this repository.
- Vercel and GitHub Pages are deployment targets, not bundled code.

## Transitive dependencies

Full resolved versions, sources, and integrity hashes for every direct and transitive package are recorded in `package-lock.json`. This notice lists direct dependencies only; no licence file is removed or modified from any installed package.
