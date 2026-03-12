# Railway Deployment

## Environment Variables

Add these in your Railway project **Variables** tab. Your local `.env` is not deployed.

### Required
- `DATABASE_URL` - Railway provides this if you add a SQLite/PostgreSQL plugin, or use: `file:/data/dev.db` with a volume
- `SESSION_SECRET` - A long random string for session encryption

### Optional
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` - Creates/updates admin on startup
- `PORT` - Railway sets this automatically
