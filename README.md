# Ultimate Drop Tracker + Discord Monitor

This project runs the dashboard and Discord bot together inside your existing Render **Web Service**. You do not need to create a separate Background Worker.

## Existing Render Web Service
Keep your current build command as `npm install` and start command as `npm start`.

Add these environment variables in the existing service's **Environment** page:
- `DROP_TOKEN` = your existing website API secret (keep the same value already configured on the website)
- `DISCORD_TOKEN` = your Discord bot token (secret; never put it in GitHub)
- `DISCORD_CHANNEL_ID` = `1556615758631403560`
- `DROP_API_URL` = `https://dqr-drops.onrender.com/api/drops`

The updated `npm start` launches both `server.js` (website) and `bot.js` (Discord monitor).

## Discord permissions
- Enable **Message Content Intent** in Discord Developer Portal → your app → Bot → Privileged Gateway Intents.
- Give the bot **View Channel** and **Read Message History** in the monitored channel.

## What it detects
The bot reads message text and embed titles, descriptions, fields, and footer text in the configured channel. It forwards lines formatted like `Item Name, Legendary ×1` or `Item Name, Ultimate ×1`. Epic lines are forwarded as `epic_t3` only when the item name includes an armor/armour or Tier 3/T3 indicator. The player name currently defaults to the Discord message author's display name.

If the report uses a different layout, check the Render logs and share a screenshot or copied example with secrets hidden so the parser can be adjusted.

## Security
Never commit `.env`, Discord bot tokens, or `DROP_TOKEN` to GitHub. Enter secrets only in Render's Environment settings. An incoming Discord webhook URL cannot read channel messages; the bot uses the Discord Gateway instead.
