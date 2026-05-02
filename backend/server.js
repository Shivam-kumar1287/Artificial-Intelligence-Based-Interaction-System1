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

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai-interaction')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

const aiService = require('./services/aiService');

// REST API for Vercel Compatibility (Socket.io doesn't work on Vercel Serverless)
app.post('/api/chat', async (req, res) => {
  const { text, modality, userId = 'anonymous' } = req.body;
  try {
    const aiResponse = await aiService.processInteraction(userId, text, modality);
    res.json({
      text: aiResponse,
      sender: 'ai',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Failed to process interaction' });
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
