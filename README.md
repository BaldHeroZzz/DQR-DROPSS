# Ultimate Drop Tracker

A dark, rarity-themed live drop dashboard with a small Node.js server.

## Rarity mapping
- `ultimate` → crimson red
- `legendary` → gold/yellow
- `epic_t3` → purple (Epic Tier 3 Armor)

## Run locally
Requires Node.js 18 or newer.

1. Copy `.env.example` to `.env` and set a long random `DROP_TOKEN`.
2. Install and run:
   ```bash
   npm start
   ```
3. Open `http://localhost:3000`.

This starter intentionally has no third-party dependencies.

## Send a drop to the site
The server exposes `POST /api/drops`. Send JSON with the `X-DROP-TOKEN` header:

```bash
curl -X POST https://YOUR-SITE.example/api/drops \
  -H "Content-Type: application/json" \
  -H "X-DROP-TOKEN: YOUR_DROP_TOKEN" \
  -d '{"rarity":"legendary","item":"Gungnir","player":"ExamplePlayer"}'
```

Accepted rarity values: `ultimate`, `legendary`, `epic_t3`.

Optional `detail` can contain a short note. Example:
```json
{
  "rarity": "epic_t3",
  "item": "Tier 3 Chestplate",
  "player": "ExamplePlayer",
  "detail": "Volcanic Chambers"
}
```

## Important Discord integration note
A Discord **incoming webhook** sends messages *into Discord*; it does not let a website read channel messages. This app receives drops from a trusted sender at `/api/drops`.

If your drops are currently posted by a Discord bot in a channel, you need a Discord bot (with the appropriate server permissions/intents) to read those messages and forward parsed drops to this endpoint. Do not put your Discord bot token or `DROP_TOKEN` in browser-side code. Keep both on a server.

## Deploy
Deploy this Node.js project to a host that supports persistent storage. Set `PORT` (usually supplied by the host) and `DROP_TOKEN` as environment variables. The `data/drops.json` file stores the latest 1,000 drops; use persistent disk or a database if your host has ephemeral filesystems.

For production, put the app behind HTTPS and add rate limiting / request logging appropriate to your hosting environment.
