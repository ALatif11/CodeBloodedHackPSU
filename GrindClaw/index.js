process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client, GatewayIntentBits } = require('discord.js');
const twilio = require('twilio');
require('dotenv').config({ path: 'apikeys.env' });

const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.DirectMessageReactions,
  ]
});

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

discord.on('ready', () => {
  console.log(`GrindClaw is online as ${discord.user.tag}`);
});

discord.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase() === 'call me') {
    await message.reply('Calling you now! 📞');
    
    await twilioClient.calls.create({
      twiml: '<Response><Say>Hey! This is GrindClaw. Time to get up and crush your goals today!</Say></Response>',
      to: '',
      from: process.env.TWILIO_PHONE_NUMBER,
    });
  }
});

discord.login(process.env.DISCORD_BOT_TOKEN);