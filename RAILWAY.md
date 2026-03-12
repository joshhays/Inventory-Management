# Railway Deployment

## Environment Variables

Add these in your Railway project **Variables** tab. Your local `.env` is not deployed.

### Required
- `DATABASE_URL` - Railway provides this if you add a SQLite/PostgreSQL plugin, or use: `file:/data/dev.db` with a volume
- `SESSION_SECRET` - A long random string for session encryption

### Email (order ready notification)
To send "order ready" emails when status becomes "ready", add:

- `SMTP_HOST` - e.g. `smtp.gmail.com`
- `SMTP_PORT` - `587`
- `SMTP_USER` - Your email (e.g. `joshua@yorkeprinte.com`)
- `SMTP_PASS` - App password (not your regular password)
- `EMAIL_FROM` - Sender (same as SMTP_USER)
- `EMAIL_READY_TO` - Recipient for pickup notifications

### Optional
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` - Creates/updates admin on startup
- `PORT` - Railway sets this automatically
