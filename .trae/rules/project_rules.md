# Project Rules — NEXORA

## Meta
- Repo: <NOMBRE_REPO>
- Owner PR por defecto: @Neil
- Gestor: pnpm>yarn>npm. Node LTS>=18 (definir en `.nvmrc`).
- Stack: <Next|Vite|Node|Static|Monorepo>.

## Gobernanza Git
- Ramas: auto/<slug>, fix/*, feat/*, chore/*.
- Commits: convencionales.
- PR obligatorio si >50 líneas o >5 archivos.
- CI: `.github/workflows/ci.yml` debe correr `verify` y `build`.

## Scripts estándar (si falta, crearlos)
- `install:ci`: auto-install por lockfile.
- `verify`: install:ci + lint + typecheck (NO-OP si no hay config).
- `predeploy`: `vercel build` (o build framework).
- `deploy`: `vercel deploy --prod --yes`
- `deploy:preview`: `vercel deploy --yes`
- `export`: `next build && next export -o out` (si SSG)
- `deploy:cf`: wrangler pages deploy (usa CF_PAGES_PROJECT/BRANCH)

## Despliegue
### Vercel
- Org/Team: <VERCEL_ORG_ID>
- Project: <VERCEL_PROJECT_ID|slug>
- Pasos: `vercel pull --yes --environment=production --token $env:VERCEL_TOKEN` → `vercel build` → `vercel deploy --prod --yes`
- Respetar `vercel.json` si existe.

### Cloudflare
- Pages (SSG): CF_PAGES_PROJECT=<nombre>, CF_PAGES_BRANCH=production.
- Workers (SSR/Edge): si hay `wrangler.toml`, usar `wrangler deploy`.
- No tocar DNS; solo sugerir registros.

## Integraciones & Variables
- Definir en host/CI (no en código).
- Requeridas (según use-case):  
  - GitHub: `GITHUB_PERSONAL_ACCESS_TOKEN` o `GH_TOKEN`  
  - Vercel: `VERCEL_TOKEN`,`VERCEL_ORG_ID`,`VERCEL_PROJECT_ID`  
  - Cloudflare: `CLOUDFLARE_API_TOKEN`,`CLOUDFLARE_ACCOUNT_ID`,`CF_PAGES_PROJECT`,`CF_PAGES_BRANCH`  
  - Supabase/Stripe/PayPal/etc.: nombres exactos en `.env.template` con placeholders
- Prohibido imprimir valores.

## Monorepo
- Si existe `pnpm-workspace.yaml` o `turbo.json`:
  - Ejecutar `turbo run verify --parallel` y `turbo run build --parallel`.
  - PR debe listar apps afectadas y resultados por app.

## Calidad
- Lint/Typecheck deben pasar (`npm run verify`).
- Tests de humo mínimos:
  - Web: render por página/comp crítico.
  - API: 200/JSON.
- Assets pesados: lazy-load; fallback en móviles/low GPU.

## Aceptación
- ✅ `verify` y `predeploy` OK local.
- ✅ PR abierto con checklist/logs.
- ✅ Deploy preview/prod funcionando (URL).
- ✅ README actualizado + `.env.template` completo.
- ✅ Sin secretos en commits/logs.

