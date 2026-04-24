# Installation Guide

Follow these steps to get the AI-Based Interaction System running on your local machine.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) installed and running locally (or a MongoDB Atlas URI)

## 1. Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Environment Variables:
   - Create a `.env` file in the `backend` folder (if not already present).
   - Add your configuration:
     ```env
     PORT=5000
     MONGO_URI=mongodb://localhost:27017/ai-interaction
     OPENAI_API_KEY=your_openai_api_key_here
     ```
4. Start the backend server:
   ```bash
   npm start
   ```
   *The server will start on http://localhost:5000*

## 2. Frontend Setup

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *The frontend will be available at http://localhost:5173*

## 3. Using the System

- **Text Chat**: Simply type in the input field and press Enter.
- **Voice Input**: Click the microphone icon to start speaking. The system will convert your speech to text and send it.
- **AI Voice**: Click the speaker icon to toggle AI voice output. When enabled, the AI will "speak" its responses.
