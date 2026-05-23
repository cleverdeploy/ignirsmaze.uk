# ignirsmaze.uk

The labyrinth at https://ignirsmaze.uk — a deliberately mysterious one-page surface that hides 7 small interactive apps. Each is instrumented; engagement data drives A/B testing and replacement decisions.

## Live

- **Public**: https://ignirsmaze.uk
- **Admin** (basic auth): https://admin.ignirsmaze.uk

## Stack

- Node 20 + TypeScript (ESM) + Hono
- Shared Postgres at `postgres.cleverdeploy.com` (DB `ignirsmaze_prod`)
- Single Docker container, deployed via Dokploy on Hetzner VM `178.104.246.72`
- DNS on Cloudflare (apex, www, admin — all DNS-only)
- Anthropic Haiku for the Whisper Gallery (rate-limited; daily $ cap)

## Layout

```
src/
  server.ts                  # boot: migrate(), serve(hostRouter)
  db.ts                      # pg pool, query helper, migrate()
  env.ts                     # env-var validation
  host-router.ts             # apex → publicApp, admin → adminApp
  session.ts                 # anonymous cookie sessions
  render.ts                  # html`...` tagged template + layout
  experiments.ts             # assignVariant(session, app) — deterministic + sticky
  public/                    # public site
    index.ts                 # mounts /, /m/:slug, /api/*
    home.ts                  # server-rendered home page
    app-shell.ts             # /m/:slug dispatcher
    events.ts                # /api/events, /api/view/start, /api/view/end, /api/discovery
    llm.ts                   # /api/llm/:slug — Anthropic proxy with per-session + daily caps
    apps/
      whisper.ts             # The Whisper Gallery (LLM-backed)
      cartographer.ts        # The Cartographer's Hand (canvas + shape-hash)
      lantern.ts             # The Lantern (ember light over hidden glyphs)
      names.ts / names-api.ts# The Lock of Many Names (server-side correctness + hints)
      oracle.ts              # The Ash Oracle (3-choice branching narrative)
      mirror.ts              # The Mirror Door (same-device BroadcastChannel coop)
      stone.ts               # The Patient Stone (wait + rare events)
  admin/
    auth.ts                  # HTTP Basic
    dashboard.ts             # overview: sparkline, totals, top apps, recent events
    app-detail.ts            # /apps and /apps/:slug — per-app deep dive + variant A/B
    experiments.ts           # /experiments — CRUD UI
    api-summary.ts           # /api/summary.json — Claude-readable JSON contract
    charts.ts                # tiny inline-SVG sparkline + bars
    common.ts                # shared admin nav + CSS

public/                      # static assets, copied into image
  styles.css, favicon.svg
  client-base.js             # session helpers + 7 discovery-trigger helpers
  home.js                    # registers triggers on home page
  apps/{whisper,cartographer,lantern,names,oracle,mirror,stone}.js
```

## Local

```bash
npm install
DATABASE_URL=postgres://... ADMIN_PASSWORD=foo npm run build && npm start
```

## Claude-readable JSON

`GET /api/summary.json` on the admin host (basic auth) — designed so future Claude sessions can:

```bash
curl -u admin:$ADMIN_PASSWORD https://admin.ignirsmaze.uk/api/summary.json | jq .
```

and use it to decide which apps to replace and which A/B variants to promote.

Shape:

```jsonc
{
  "generated_at": "2026-05-23T11:30:00.000Z",
  "window_days": 7,
  "totals": { "sessions": ..., "app_views": ..., "discoveries": ..., "events": ... },
  "apps": [
    {
      "slug": "whisper",
      "visits": ..., "uniques": ..., "avg_ms": ..., "avg_interactions": ...,
      "discovery_methods": [{"method":"sigil-triple-click","finds":..,"unique_finders":..}, ...],
      "variants": [
        {"name":"A","visits":..,"uniques":..,"avg_ms":..,"avg_interactions":..,"engaged":..},
        {"name":"B", ...}
      ]
    },
    // … one entry per slug ∈ {whisper, cartographer, lantern, names, oracle, mirror, stone}
  ],
  "experiments": [
    {
      "slug": "stone-tick-rate", "app": "stone", "active": true,
      "created_at": "...", "notes": "...",
      "variants_config": [{"name":"A","weight":50},{"name":"B","weight":50}],
      "best_variant": "A",                  // best by avg_ms (largest)
      "best_metric": "avg_ms",
      "confidence_hint": "low"              // "high", "moderate", "low", "insufficient", "no_variance"
    }
  ],
  "llm": {
    "spend_24h_usd": 0.012,
    "daily_breakdown": [{"date":"YYYY-MM-DD","calls":..,"cost_usd":..}]
  }
}
```

`?days=N` (1–90) changes the window. `confidence_hint` is a rough two-proportion z-test on "fraction of sessions with ≥3 interactions" — not a real stats engine; final calls are human/Claude judgement.

## Deploy

Pushes to `main` auto-deploy via Dokploy (`ignirsmaze` project, `ignirsmaze-web` app, Dockerfile build).
