require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// MongoDB Connection Utility for Serverless
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected successfully');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    // On Vercel, we want to know if it's an IP whitelist issue
    if (err.message.includes('ETIMEOUT') || err.message.includes('ECONNREFUSED')) {
      throw new Error('Database connection timeout. Please check your MongoDB Atlas IP Whitelist (allow 0.0.0.0/0).');
    }
    throw err;
  }
};

const aiService = require('./services/aiService');

// Health Check for Vercel Debugging
app.get('/api/health', async (req, res) => {
  await connectDB().catch(() => {});
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    env: {
      has_mongo: !!process.env.MONGO_URI,
      has_groq: !!process.env.GROQ_API_KEY
    }
  });
});

// REST API for Vercel Compatibility (Socket.io doesn't work on Vercel Serverless)
app.post('/api/chat', async (req, res) => {
  try {
    await connectDB();
    const { text, modality, userId = 'anonymous' } = req.body;
    console.log('Chat request received:', text);
    
    if (!process.env.GROQ_API_KEY) {
      console.error('CRITICAL: GROQ_API_KEY is missing!');
      return res.status(500).json({ message: 'AI configuration error' });
    }

    const aiResponse = await aiService.processInteraction(userId, text, modality);
    res.json({
      text: aiResponse,
      sender: 'ai',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: error.message || 'Failed to process interaction' });
  }
});


// Socket.io for Real-time Interaction
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('send_message', async (data) => {
    const { text, modality, userId = 'anonymous' } = data;

    try {
      const aiResponse = await aiService.processInteraction(userId, text, modality);

      socket.emit('receive_message', {
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('error', { message: 'Failed to process interaction' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
