const Interaction = require('../models/Interaction');
const UserPreference = require('../models/UserPreference');
const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

class AIService {
  async processInteraction(userId, text, modality = 'text') {
    // 1. Fetch or create session history
    let interaction = await Interaction.findOne({ userId }).sort({ updatedAt: -1 });
    if (!interaction) {
      interaction = new Interaction({ userId, messages: [] });
    }

    // 2. Fetch User Preferences
    let preferences = await UserPreference.findOne({ userId });
    if (!preferences) {
      preferences = new UserPreference({ userId });
      await preferences.save();
    }

    // 3. Prepare Messages for Groq
    const history = interaction.messages.slice(-10).map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text
    }));

    const systemPrompt = `You are an advanced AI Interaction System. 
    Current User Preferences:
    - Preferred Tone: ${preferences.preferredTone}
    - Interaction Style: ${preferences.interactionStyle}
    - Interests: ${preferences.interests.join(', ') || 'General'}
    
    Always maintain the context of the conversation and be responsive to the user's modality (${modality}).
    If the user uses voice, keep responses concise and natural for speech.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: text }
    ];

    try {
      // 4. Call Groq Cloud
      const completion = await groq.chat.completions.create({
        messages: messages,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 1024,
      });

      const responseText = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
      console.log('Groq Response:', responseText);

      // 5. Save Interaction
      interaction.messages.push({ text, sender: 'user', modality });
      interaction.messages.push({ text: responseText, sender: 'ai', modality: 'text' });
      await interaction.save();

      return responseText;
    } catch (error) {
      console.error('Groq API Error:', error);
      throw new Error('Failed to communicate with AI service');
    }
  }
}

module.exports = new AIService();
