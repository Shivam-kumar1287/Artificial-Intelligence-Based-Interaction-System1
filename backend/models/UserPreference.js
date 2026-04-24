const mongoose = require('mongoose');

const UserPreferenceSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  preferredTone: { type: String, default: 'friendly' },
  interests: [String],
  interactionStyle: { type: String, enum: ['concise', 'detailed', 'adaptive'], default: 'adaptive' },
  voiceSettings: {
    enabled: { type: Boolean, default: true },
    pitch: { type: Number, default: 1.0 },
    rate: { type: Number, default: 1.0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('UserPreference', UserPreferenceSchema);
