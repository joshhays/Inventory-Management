# Railway Deployment

## Why won’t it deploy?

### 1. **DATABASE_URL missing or wrong** (most common)

The app runs `prisma migrate deploy` on start. If `DATABASE_URL` is not set, the deploy can build but the **service will crash** right after start.

- **PostgreSQL (recommended):** In Railway, add the **PostgreSQL** plugin to your project. Then in your app service → **Variables** → **Add variable** → **Add reference** and pick the `DATABASE_URL` from the Postgres service.  
  This app’s schema is currently **SQLite**. To use Postgres you must change `prisma/schema.prisma` to `provider = "postgresql"`, run `npx prisma migrate dev --name postgres` (or create a new migration), commit, and redeploy.
- **SQLite:** Railway does not provide a database by default. You must:
  1. Create a **Volume** and mount it (e.g. at `/data`).
  2. Set `DATABASE_URL=file:/data/dev.db` in your app’s Variables (path must be inside the mounted volume).

### 2. **SESSION_SECRET not set**

Set `SESSION_SECRET` in Variables to a long random string. Without it the app may run but sessions are insecure.

### 3. **Build passes, service crashes**

Open the **Deployments** tab → latest deployment → **View logs**. Look for:

- `Environment variable not found: DATABASE_URL` → set `DATABASE_URL` (see above).
- `Can't reach database server` → DB not ready or wrong URL; use the DB’s **private** URL if you use Postgres.
- `prisma migrate deploy` errors → fix the migration or DB connection.

### 4. **Using SQLite and no volume**

SQLite needs a writable, **persistent** path. If you use `file:./dev.db` or a path that isn’t on a Railway volume, the file is lost on restart and migrations can fail. Use a **Volume** and something like `file:/data/dev.db`.

---

## Environment Variables

Add these in your Railway **app service** → **Variables** tab. Your local `.env` is not deployed.

### Required

- **`DATABASE_URL`**  
  - Postgres: add PostgreSQL plugin, then add a variable **reference** to that service’s `DATABASE_URL`.  
  - SQLite: add a Volume, mount it (e.g. `/data`), then set `DATABASE_URL=file:/data/dev.db`.
- **`SESSION_SECRET`** – Long random string for session encryption (e.g. `openssl rand -hex 32`).

### Optional

- `ADMIN_EMAIL` / `ADMIN_PASSWORD` – Creates/updates admin on startup.
- `PORT` – Railway sets this automatically; don’t override unless you need to.
- `OPENAI_API_KEY` – Enables AI Reports. Get from [OpenAI](https://platform.openai.com/api-keys).
- `OPENAI_MODEL` – Model for reports (default: `gpt-4o-mini`).
