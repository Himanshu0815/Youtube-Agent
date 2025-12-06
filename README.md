# YouTube Agent — AI Media & Content Analysis

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Gemini](https://img.shields.io/badge/AI-Gemini%202.5-8E75B2?logo=google)
![Google Cloud Run](https://img.shields.io/badge/Deployment-Cloud%20Run-4285F4?logo=google-cloud)

**YouTube Agent** is a sophisticated, multimodal AI application designed to transform raw video, audio, and text content into structured, actionable insights. Built with React, Node.js, and Google's Gemini 2.5 Flash model, it goes beyond simple summarization by acting as an intelligent study companion and research assistant.

## 🚀 Key Features

### 🧠 Intelligent Analysis
- **Multi-Modal Inputs**: Accepts YouTube URLs, raw text transcripts, **Audio/Video file uploads** (.mp3, .mp4), and **PDF documents**.
- **Context-Aware Insights**: Automatically detects content type to generate tailored outputs:
  - **Educational**: Generates study notes, bullet points, and quizzes.
  - **Product Reviews**: Extracts pros, cons, ratings, and final verdicts.
  - **General**: Provides executive summaries, key themes, and sentiment analysis.
- **Visual Analysis**: Extracts frames from uploaded video files to analyze on-screen charts, code snippets, or visuals.

### 💬 Interactive RAG (Retrieval-Augmented Generation)
- **Chat with Video**: Context-aware chat interface allows users to ask specific questions about the analyzed content (e.g., "What did the speaker say about battery life?").
- **Deep Research Agent**: Select any theme from the video to trigger a separate agent that researches the topic using **Google Search Grounding**, providing definitions, history, and citations.

### 🛠️ Utilities
- **Interactive Quizzes**: Auto-generates 5-question multiple-choice quizzes to test comprehension.
- **Sentiment Analysis**: Visualizes audience reaction (Positive/Neutral/Negative) using a dynamic donut chart.
- **Export**: Download study notes and summaries as Markdown.
- **History**: Local storage persistence to revisit previous analyses.

---

## 🏗️ Architecture

The application utilizes a **Hybrid Architecture** to ensure security and performance:

1.  **Frontend (Client)**: Built with **React 19** and **Vite**. It handles UI, audio recording (`MediaRecorder`), and file processing.
2.  **Backend (Server)**: An **Express.js** proxy server.
    - **Security**: Hides the Gemini and YouTube API keys from the client.
    - **Reliability**: Uses `youtube-transcript` to reliably fetch captions server-side.
    - **Serving**: Serves the static React build files in production.
3.  **AI Engine**: **Google Gemini 2.5 Flash**.
    - Uses **Grounding (Google Search)** for checking facts and researching topics.
    - Uses **Multimodal Vision & Audio** capabilities for file uploads.

---

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Lucide React (Icons).
- **Build Tool**: Vite.
- **Backend**: Node.js, Express.
- **AI/ML**: Google GenAI SDK (`@google/genai`).
- **Data Parsing**: `youtube-transcript` (Captions), `pdfjs-dist` (PDFs).
- **Deployment**: Docker, Google Cloud Run.

---

## ⚡ Getting Started

### Prerequisites
- Node.js v18+
- A Google Cloud Project with **Vertex AI API** enabled.
- A **Gemini API Key** (from Google AI Studio).
- (Optional) **YouTube Data API v3 Key** for richer metadata.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/youtube-agent.git
    cd youtube-agent
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory:
    ```env
    # Required for AI Analysis
    API_KEY=your_gemini_api_key_here

    # Optional: For accurate video titles, views, and thumbnails
    YOUTUBE_API_KEY=your_youtube_data_api_key_here
    
    # Optional: Port (Defaults to 8080 for Cloud Run)
    PORT=3000
    ```

4.  **Run Locally (Development)**
    This runs Vite for the frontend and the Express server concurrently.
    ```bash
    # Terminal 1: Frontend
    npm run dev

    # Terminal 2: Backend (Required for URL analysis)
    npm start
    ```

5.  **Build for Production**
    ```bash
    npm run build
    npm start
    ```

---

## 🐳 Docker & Deployment

This application is optimized for **Google Cloud Run**.

### Local Docker Build
```bash
docker build -t youtube-agent .
docker run -p 8080:8080 --env-file .env youtube-agent
```

### Deploy to Google Cloud Run
The repository includes a `.gcloudignore` to speed up builds.

```bash
# 1. Authenticate
gcloud auth login

# 2. Deploy
gcloud run deploy youtube-agent \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars API_KEY=YOUR_KEY,YOUTUBE_API_KEY=YOUR_KEY
```

---

## 📂 Project Structure

```text
├── public/              # Static assets
├── src/
│   ├── components/      # React UI Components (AnalysisResult, ChatInterface, QuizInterface)
│   ├── services/        # Logic Layer (geminiService, pdfService)
│   ├── App.tsx          # Main Application Controller
│   └── types.ts         # TypeScript Interfaces
├── server.js            # Express Backend & API Proxy
├── Dockerfile           # Production container config
└── vite.config.ts       # Frontend build config
```

## 🛡️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ using Google Gemini API
</p>
