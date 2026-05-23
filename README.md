# ignirsmaze.uk

A one-page site at https://ignirsmaze.uk.

## Stack

- Static HTML + CSS, no build step
- Nginx in a Docker container
- Deployed via [Dokploy](https://dokploy.cleverdeploy.com) on the Hetzner VM (`178.104.246.72`)
- DNS on Cloudflare (DNS-only / grey cloud)

## Local preview

```bash
cd website && python3 -m http.server 8400
# open http://localhost:8400/
```

## Deploy

Pushes to `main` auto-deploy via Dokploy (`ignirsmaze` project, `ignirsmaze-web` app).
