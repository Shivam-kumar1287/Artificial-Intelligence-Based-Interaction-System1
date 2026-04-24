const mongoose = require('mongoose');

const InteractionSchema = new mongoose.Schema({
  userId: { type: String, default: 'anonymous' },
  messages: [
    {
      text: String,
      sender: { type: String, enum: ['user', 'ai'] },
      timestamp: { type: Date, default: Date.now },
      modality: { type: String, enum: ['text', 'voice', 'gesture'], default: 'text' }
    }
  ],
  context: {
    lastIntent: String,
    emotionalTone: String,
    preferences: Map
  }
}, { timestamps: true });

module.exports = mongoose.model('Interaction', InteractionSchema);
