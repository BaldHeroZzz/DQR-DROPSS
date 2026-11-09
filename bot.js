const { Client, GatewayIntentBits } = require('discord.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || '1556615758631403560';
const DROP_API_URL = process.env.DROP_API_URL || 'https://dqr-drops.onrender.com/api/drops';
const DROP_TOKEN = process.env.DROP_TOKEN;

if (!DISCORD_TOKEN || !DROP_TOKEN) {
  console.error('Missing DISCORD_TOKEN or DROP_TOKEN environment variable.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Convert Discord message content and embed text into readable lines.
function getMessageText(message) {
  const parts = [message.content || ''];
  for (const embed of message.embeds) {
    parts.push(embed.title || '', embed.description || '');
    for (const field of embed.fields || []) parts.push(`${field.name || ''}: ${field.value || ''}`);
    if (embed.footer?.text) parts.push(embed.footer.text);
  }
  return parts.join('\n').replace(/\r/g, '');
}

function detectDrops(message) {
  const text = getMessageText(message);
  const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
  const player = message.member?.displayName || message.author?.globalName || message.author?.username || 'Unknown player';
  const detail = lines.find(line => /session/i.test(line))?.replace(/^session\s*:?\s*/i, '') || 'Discord drop report';
  const results = [];

  for (const line of lines) {
    // Typical report line: "Item Name, Legendary ×1" (also supports x1 and **bold** markers).
    const clean = line.replace(/[*_`]/g, '').replace(/<[^>]+>/g, '').trim();
    const match = clean.match(/^(.+?),\s*(Ultimate|Legendary|Epic)\b/i);
    if (!match) continue;

    const item = match[1].replace(/^[-•●\s]+/, '').trim();
    const rarityWord = match[2].toLowerCase();
    let rarity = null;
    if (rarityWord === 'ultimate') rarity = 'ultimate';
    if (rarityWord === 'legendary') rarity = 'legendary';
    if (rarityWord === 'epic' && /\b(?:tier\s*3|t3|armor|armour|chestplate|helmet|leggings|boots)\b/i.test(item)) rarity = 'epic_t3';
    if (!rarity || !item) continue;
    results.push({ rarity, item, player, detail });
  }
  return results;
}

async function forwardDrop(drop) {
  const response = await fetch(DROP_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-DROP-TOKEN': DROP_TOKEN },
    body: JSON.stringify(drop)
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Website returned ${response.status}: ${body}`);
  console.log(`Forwarded ${drop.rarity}: ${drop.item} (${drop.player})`);
}

client.once('ready', () => {
  console.log(`Drop monitor online as ${client.user.tag}`);
  console.log(`Watching channel ${CHANNEL_ID}`);
  console.log(`Forwarding to ${DROP_API_URL}`);
});

client.on('messageCreate', async message => {
  if (message.channelId !== CHANNEL_ID || message.author?.id === client.user.id) return;
  const drops = detectDrops(message);
  if (!drops.length) {
    console.log(`No tracked drops detected in message ${message.id}`);
    return;
  }
  for (const drop of drops) {
    try { await forwardDrop(drop); }
    catch (error) { console.error(`Failed to forward ${drop.item}:`, error.message); }
  }
});

client.on('error', error => console.error('Discord client error:', error));
process.on('unhandledRejection', error => console.error('Unhandled rejection:', error));

client.login(DISCORD_TOKEN);
