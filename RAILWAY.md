# Railway Deployment

## Environment Variables

Add these in your Railway project **Variables** tab. Your local `.env` is not deployed.

### Required
- `DATABASE_URL` - Railway provides this if you add a SQLite/PostgreSQL plugin, or use: `file:/data/dev.db` with a volume
- `SESSION_SECRET` - A long random string for session encryption

### Email (order ready notification)
To send "order ready" emails when status becomes "ready", add:

- `SMTP_HOST` - **Use the correct host for your provider:**
  - Gmail / Google Workspace: `smtp.gmail.com`
  - Microsoft 365 / Outlook: `smtp.office365.com`
  - Yahoo: `smtp.mail.yahoo.com`
  - Custom domain (e.g. yorkeprinte.com): usually `smtp.office365.com` if on Microsoft 365, or your host’s SMTP
- `SMTP_PORT` - `587` (TLS) or `465` (SSL)
- `SMTP_USER` - Your full email (e.g. `joshua@yorkeprinte.com`)
- `SMTP_PASS` - App password (not your regular password; Gmail/Google require an app password)
- `EMAIL_FROM` - Sender (same as SMTP_USER)
- `EMAIL_READY_TO` - Recipient for pickup notifications

### Optional
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` - Creates/updates admin on startup
- `PORT` - Railway sets this automatically

---

## Email Debug Endpoint

After deploying, log in as admin and visit:

```
https://your-app.railway.app/api/email/debug
```

This returns whether email is configured. Add `?send=1` to send a test email:

```
https://your-app.railway.app/api/email/debug?send=1
```

If you see "SMTP error" or connection refused, check:
1. **SMTP_HOST** – For `@yorkeprinte.com`, if you use Microsoft 365, use `smtp.office365.com`
2. **SMTP_PASS** – Must be an app password, not your normal login password
3. Railway **Deploy logs** – Look for `[email]` messages when you change an order to Ready
