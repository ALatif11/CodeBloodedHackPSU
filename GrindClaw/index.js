process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client, GatewayIntentBits } = require('discord.js');
const twilio = require('twilio');
const express = require('express');
const fs = require('fs');
const app = express();
const path = require('path');
const os = require('os');
require('dotenv').config({ path: 'apikeys.env' });

app.use(express.urlencoded({ extended: false }));

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const NGROK_URL = process.env.NGROK_URL;

// Initial call handler
app.post('/call', (req, res) => {
  res.type('text/xml');
  res.send(`
    <Response>
      <Say>Hey! This is GrindClaw. What tasks do you want to get done today? List them out, and say done when you're finished.</Say>
      <Gather input="speech" action="/save-tasks" timeout="10" speechTimeout="auto">
      </Gather>
    </Response>
  `);
});

app.post('/save-tasks', async (req, res) => {
  const userSpeech = req.body.SpeechResult;
  console.log('Tasks heard:', userSpeech);

  // Check if user is done
  if (userSpeech.toLowerCase().includes('done') || 
      userSpeech.toLowerCase().includes("that's all") ||
      userSpeech.toLowerCase().includes('thats all')) {
    
    // Read current todos to count them
    const todosPath = path.join(os.homedir(), '.openclaw', 'workspace', 'todos.json');
    let data = { todos: [] };
    if (fs.existsSync(todosPath)) {
      try {
        const raw = fs.readFileSync(todosPath, 'utf8');
        if (raw.trim()) data = JSON.parse(raw);
      } catch (e) {
        console.log('todos.json was corrupted, resetting...');
        data = { todos: [] };
  }
}
    const pendingCount = data.todos.filter(t => t.status === 'pending').length;

    // ElevenLabs goodbye
    const elevenResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: `Let's get it! You've got ${pendingCount} tasks on your list today.`,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    });

    const audioBuffer = await elevenResponse.arrayBuffer();
    fs.writeFileSync('response.mp3', Buffer.from(audioBuffer));

    res.type('text/xml');
    res.send(`
      <Response>
        <Play>${NGROK_URL}/audio</Play>
        <Gather input="speech" action="/respond" timeout="10" speechTimeout="auto">
        </Gather>
      </Response>
`   );
    return;
  }

  // Otherwise save the tasks and keep gathering
  const parseResponse = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `Extract a list of tasks from this speech. Return ONLY a JSON array of objects, nothing else. No explanation, no markdown, just the array. Each object should have "task" (the thing to do) and "time" (the time if mentioned, otherwise null). Example: [{"task": "go to the gym", "time": "8am"}, {"task": "finish homework", "time": null}]. Speech: "${userSpeech}"`
      }
    ]
  })
  });

  const parseData = await parseResponse.json();
  const taskList = JSON.parse(parseData.choices[0].message.content);
  console.log('Parsed tasks:', taskList);

  const todosPath = path.join(os.homedir(), '.openclaw', 'workspace', 'todos.json');
  let data = { todos: [] };
  if (fs.existsSync(todosPath)) {
    try {
      const raw = fs.readFileSync(todosPath, 'utf8');
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        data = { todos: Array.isArray(parsed.todos) ? parsed.todos : [] };
      }
    } catch (e) {
      console.log('todos.json was corrupted, resetting...');
      data = { todos: [] };
    }
  }

  taskList.forEach((item, i) => {
  data.todos.push({
    id: `todo_${Date.now()}_${i}`,
    task: item.time ? `${item.task} at ${item.time}` : item.task,
    priority: 'medium',
    added: new Date().toISOString(),
    due: null,
    status: 'pending',
    check_ins: 0,
    last_check_in: null,
    completed_at: null
  });
  });

  fs.writeFileSync(todosPath, JSON.stringify(data, null, 2));
  console.log('Tasks saved:', taskList);

  // Acknowledge and keep listening
  const elevenResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text: `Got it, added ${taskList.length} task${taskList.length > 1 ? 's' : ''}. What else? Say done when you're finished.`,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  });

  const audioBuffer = await elevenResponse.arrayBuffer();
  fs.writeFileSync('response.mp3', Buffer.from(audioBuffer));

  res.type('text/xml');
  res.send(`
    <Response>
      <Play>${NGROK_URL}/audio</Play>
      <Gather input="speech" action="/save-tasks" timeout="10" speechTimeout="auto">
      </Gather>
    </Response>
  `);
});

// Handle user's voice input
app.post('/respond', async (req, res) => {
  const userSpeech = req.body.SpeechResult;
  console.log('User said:', userSpeech);

  let reply;

  // Check if user is asking for their todo list
  if (userSpeech.toLowerCase().includes('todo') ||
      userSpeech.toLowerCase().includes('to do') ||
      userSpeech.toLowerCase().includes('my list') ||
      userSpeech.toLowerCase().includes('what do i need') ||
      userSpeech.toLowerCase().includes('what are my tasks') ||
      userSpeech.toLowerCase().includes('what do i need to do today')) {

    const todosPath = path.join(os.homedir(), '.openclaw', 'workspace', 'todos.json');
    let data = { todos: [] };
    if (fs.existsSync(todosPath)) {
    try {
      const raw = fs.readFileSync(todosPath, 'utf8');
      if (raw.trim()) data = JSON.parse(raw);
    } catch (e) {
      console.log('todos.json was corrupted, resetting...');
      data = { todos: [] };
    }
}

    const pending = data.todos.filter(t => t.status === 'pending');

    if (pending.length === 0) {
      reply = "You have nothing on your list right now. Want to add some tasks?";
    } else {
      const taskNames = pending.map((t, i) => `${i + 1}. ${t.task}`).join(', ');
      reply = `You've got ${pending.length} tasks. Here they are: ${taskNames}. Let's get after it!`;
    }

  } else {
    // Normal AI conversation
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: `You are GrindClaw, a personal assistant that helps people stay on track with their goals. Keep responses short and spoken naturally since this is a phone call. User said: ${userSpeech}`
          }
        ]
      })
    });

    const aiData = await aiResponse.json();
    reply = aiData.choices[0].message.content;
  }

  console.log('GrindClaw replied:', reply);

  // Generate ElevenLabs audio
  const elevenResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text: reply,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  });

  const audioBuffer = await elevenResponse.arrayBuffer();
  fs.writeFileSync('response.mp3', Buffer.from(audioBuffer));

  res.type('text/xml');
  res.send(`
    <Response>
      <Play>${NGROK_URL}/audio</Play>
      <Gather input="speech" action="/respond" timeout="10" speechTimeout="auto">
      </Gather>
    </Response>
  `);
});

// Serve the audio file
app.get('/audio', (req, res) => {
  res.setHeader('Content-Type', 'audio/mpeg');
  res.sendFile(__dirname + '/response.mp3');
});

// Discord bot
const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.DirectMessageReactions,
  ],
  partials: ['CHANNEL', 'MESSAGE']
});

discord.on('clientReady', () => {
  console.log(`GrindClaw is online as ${discord.user.tag}`);
});

discord.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase() === 'call me') {
    await message.reply('Calling you now! 📞');

    await twilioClient.calls.create({
      url: `${NGROK_URL}/call`,
      to: '+15705021915',
      from: process.env.TWILIO_PHONE_NUMBER,
    });
  }
});

// Start server
app.listen(3000, () => {
  console.log('Server running on port 3000');
});

discord.login(process.env.DISCORD_BOT_TOKEN);