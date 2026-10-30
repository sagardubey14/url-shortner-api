# URL Shortener API

A backend API for creating and managing short links. It is built for fast redirects and availability: writes are strongly consistent, while analytics and dashboards are eventually consistent.

**Stack:** Node.js 20+, Express 5, MongoDB (replica set), Redis, BullMQ, JWT + bcrypt, Zod, Pino, Helmet, express-rate-limit.

## Features

- JWT auth: register, log in, and manage your own links
- Short codes from an atomic Base62 counter, so there are no collisions across API instances and no ID service to run
- Optional custom aliases (they resolve at `/<alias>` like any short code)
- Redis-cached redirects (24h TTL); redirects never wait on analytics
- Click analytics by country, referrer and date, written in batches by a BullMQ worker
- OpenGraph title, description and image fetched in the background (with SSRF protection)
- Per-IP rate limiting backed by Redis (10 shortens per minute, 300 requests per minute on `/api`)
- Swagger UI at `/api-docs`
- `/health` reports the primary, secondary and Redis independently, for load balancer circuit breaking

## Quick start

You need Node.js 20+ (`nvm use` reads `.nvmrc`), a MongoDB replica set (an Atlas free M0 cluster works) and a Redis instance (for example Upstash). There is no local Docker setup.

```bash
npm install
cp .env.example .env     # fill in MONGO_URI, REDIS_URL, JWT_SECRET
npm run dev              # API on http://localhost:3000
npm run worker           # click analytics worker (second terminal)
npm run worker:metadata  # OpenGraph metadata worker (third terminal)
```

Without the workers the API still works: redirects succeed, but click counts, analytics and link metadata do not fill in.

| Variable         | Required | Notes                                  |
| ---------------- | -------- | -------------------------------------- |
| `MONGO_URI`      | yes      | Must include a database name           |
| `REDIS_URL`      | yes      | Use `rediss://` for TLS                |
| `JWT_SECRET`     | yes      | Replace the dev value before deploying |
| `JWT_EXPIRES_IN` | no       | Default `24h`                          |
| `PORT`           | no       | Default `3000`                         |

## Example requests

```bash
# Register and log in
curl -X POST localhost:3000/api/auth/register -H 'content-type: application/json' \
  -d '{"email":"ada@example.com","password":"correct-horse-battery"}'
TOKEN=$(curl -s -X POST localhost:3000/api/auth/login -H 'content-type: application/json' \
  -d '{"email":"ada@example.com","password":"correct-horse-battery"}' | jq -r .token)

# Shorten a URL
curl -X POST localhost:3000/api/shorten -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"longUrl":"https://example.com/some/long/path","customAlias":"my-link"}'

# Follow it, then list your links and read analytics
curl -i localhost:3000/my-link
curl -H "authorization: Bearer $TOKEN" localhost:3000/api/links
curl -H "authorization: Bearer $TOKEN" 'localhost:3000/api/analytics/<shortCode>?days=7'
```

## API

| Method | Route                  | Auth | Purpose                                             |
| ------ | ---------------------- | ---- | --------------------------------------------------- |
| GET    | `/`                    | none | About page                                          |
| GET    | `/api-docs`            | none | Swagger UI (`/api-docs.json` for the spec)          |
| GET    | `/health`              | none | `{ write, read, redis }`; 503 if any down           |
| POST   | `/api/auth/register`   | none | Create a user                                       |
| POST   | `/api/auth/login`      | none | Issue a JWT                                         |
| POST   | `/api/shorten`         | JWT  | Create a short URL (rate limited)                   |
| GET    | `/:code`               | none | Redirect (301); 404 unknown, 410 deleted or expired |
| GET    | `/api/links`           | JWT  | Your links, paginated                               |
| DELETE | `/api/links/:code`     | JWT  | Soft delete                                         |
| GET    | `/api/analytics/:code` | JWT  | Clicks by country, referrer and date                |

## Architecture

- **Layers:** `routes` → `controllers` → `services` / `models`, with infra clients in `config/`.
- **Writes** go to the Mongo primary. **Dashboard reads** (`/api/links`, `/api/analytics`) use a secondary, so they can lag by about 50–100ms. Redirects read the primary on a cache miss.
- **Short codes:** one counter document, incremented atomically and Base62-encoded. It starts at 62^5, so every code is at least 6 characters.
- **Redirect path:** Redis hit, redirect. On a miss, look up the link, fill the cache, redirect. Either way a low-priority BullMQ job records the click.
- **Click analytics:** the worker buffers jobs and flushes every 5 seconds or 1000 clicks with one bulk insert and one `clickCount` update per code. A job only completes once its batch is stored, so a failed flush retries it. Click records expire after 30 days.
- **Metadata worker:** fetches the page with a 5s timeout, a 1 MB cap and at most 3 redirects. Private, loopback and link-local addresses are refused, including on redirects and DNS rebinding.
- **Soft deletes:** links are never hard-deleted; deleted links answer 410.

## Scripts

| Command                           | What it does                  |
| --------------------------------- | ----------------------------- |
| `npm run dev` / `npm start`       | API with nodemon / plain node |
| `npm run worker`                  | Click analytics worker        |
| `npm run worker:metadata`         | OpenGraph metadata worker     |
| `npm test`                        | Jest (mocks Mongo and Redis)  |
| `npm run lint`                    | ESLint                        |
| `npm run format` / `format:check` | Prettier                      |

## Known limitations

- Behind a load balancer, set Express `trust proxy`, or all clients share one rate-limit bucket.
- The test suite mocks Mongo and Redis. Replica-set behaviour (secondary reads, failover) and the analytics aggregation need a real cluster to verify.
- `clickCount` and analytics lag by a few seconds while clicks are batched.
- A custom alias is checked against existing aliases and short codes, but a short code generated later could equal an existing 6+ character alias.
