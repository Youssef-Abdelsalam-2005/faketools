# faketools

Mock HTTP endpoints for voice-agent testing.

## What it does

- Create projects, and inside them create mock endpoints with any HTTP method.
- Define the expected input as a JSON sample or a list of typed fields (toggleable).
- Define the output as a JSON template with helpers: `{{input.x}}`, `{{now}}`, `{{uuid}}`, `{{random.int(1,10)}}`, `{{random.float(0,1)}}`, `{{random.pick("a","b")}}`, `{{random.bool}}`, `{{random.string(8)}}`, `{{upper(input.x)}}`, `{{lower(input.x)}}`, `{{base64(input.x)}}`, `{{json(input.nested)}}`.
- Add ordered conditional rules (`when path op value` -> override status + body).
- Simulate latency: fixed ms or a random range.
- Per-endpoint API key, configurable header name (e.g. `Authorization` with the `bearer` scheme).
- Request log per endpoint, retained for 24h.
- Single-password admin login.

## URL shape

- Admin UI: `/projects`, `/projects/<slug>`, `/projects/<slug>/<endpoint>`, `/logs`
- Mock endpoint: `/mock/<project-slug>/<endpoint-slug>` — any method

## Local dev

```
cp .env.example .env
# fill DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET (32+ chars)
bun install
bun run db:push
bun run dev
```

## Deploy (Railway)

1. New project → add Postgres plugin.
2. Add the repo as a service. Railway will use `railway.toml` / `nixpacks.toml`.
3. Set env vars on the service:
   - `DATABASE_URL` (linked from the Postgres plugin)
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET` (32+ random chars)
   - `APP_URL` = `https://faketools.kejue.co`
   - `CRON_SECRET` (any random string, shared with the cron job below)
4. Point a custom domain to the service: `faketools.kejue.co`.
5. Add a scheduled job (Railway Cron): hit `https://faketools.kejue.co/api/cron/purge-logs?key=$CRON_SECRET` every hour to purge logs older than 24h.

The `build` step runs `drizzle-kit push` against `DATABASE_URL`, so migrations apply automatically on each deploy.
