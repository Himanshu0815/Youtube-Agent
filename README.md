# YouTube Agent — Intelligent Media Analysis Platform

YouTube Agent is a sophisticated React application powered by **Google's Gemini 2.5 Flash** model. It analyzes YouTube videos, transcripts, and audio files to generate professional summaries, study notes, product review verdicts, and interactive RAG-based (Retrieval Augmented Generation) chat sessions.

## 🚀 Features

### 1. Multi-Modal Input
- **URL Mode**: Analyzes YouTube videos via link. Includes strict validation and thumbnail previews.
- **Transcript Mode**: Analyzes raw text/scripts provided by the user.
- **Audio / Upload Mode**: 
  - Records system audio via microphone (for analyzing videos playing in another tab).
  - Supports direct file upload (`.mp3`, `.wav`, `.mp4`, etc.).
  - Uses Gemini's native multimodal audio processing (no intermediate STT step required).

### 2. Context-Aware Analysis
The agent classifies content and adapts its output:
- **Educational Content**: Generates structured "Study Notes" with bullet points and revision topics.
- **Product Reviews**: Extracts "Pros," "Cons," "Star Rating," and a final "Verdict."
- **General/Entertainment**: Focuses on themes, sentiment, and key timestamps.

### 3. Grounded Accuracy (Anti-Hallucination)
- **Google Search Grounding**: Uses the Gemini `googleSearch` tool to cross-reference video content with official transcripts, subtitles, and external reviews to ensure accuracy.
- **Strict ID Verification**: Implements logic to ensure the analyzed data matches the specific YouTube Video ID requested, preventing the AI from analyzing "related" videos by mistake.

### 4. Interactive RAG Chat
- **"Ask AI" Interface**: A chat window allows users to ask specific questions about the video.
- **In-Context Learning**: The analyzed summary, themes, and transcript are injected into the LLM context.
- **Citations**: The AI cites specific timestamps (e.g., `[04:20]`), which are rendered as clickable links that open the video at that exact moment.

### 5. Visualizations
- **Interactive Timeline**: Visual journey through the video's sub-topics.
- **Sentiment Analysis**: Bar charts showing the ratio of Positive, Neutral, and Negative audience sentiment.
- **Dynamic UI**: Color-coded themes based on video type (Blue for Education, Green for Reviews, etc.).

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS (Custom "YouTube Dark Mode" theme)
- **AI Model**: Google Gemini 2.5 Flash (`gemini-2.5-flash`)
- **SDK**: `@google/genai`
- **Icons**: Custom SVG Icon set
- **Metadata Fetching**: `noembed` (OEmbed proxy)

---

## 🏗 Architecture & Workflow

### 1. The Analysis Pipeline (`geminiService.ts`)

The application uses three distinct strategies based on input:

1.  **`analyzeUrlWithGrounding`**: 
    *   Fetches video metadata.
    *   Prompts Gemini with the `googleSearch` tool enabled.
    *   Instructions: "Find the transcript. If missing, find reviews. Verify Video ID matches."
    *   Returns a structured JSON object.
2.  **`analyzeAudioContent`**: 
    *   Converts audio Blob to Base64.
    *   Sends directly to Gemini 2.5 Flash (Multimodal).
    *   Prompts: "Transcribe verbatim AND analyze structure simultaneously."
3.  **`analyzeTranscript`**:
    *   Analyzes raw text.
    *   Still performs a Google Search to fetch *audience sentiment* (comments/reactions) which isn't present in the text itself.

### 2. Data Sanitization
LLMs can sometimes return malformed JSON or missing fields. The app implements:
- **`cleanJsonString`**: Strips Markdown code blocks (` ```json `).
- **`sanitizeData`**: Ensures strict type safety (e.g., forcing `quotes` to be `[]` if undefined) to prevent UI crashes.

### 3. RAG Implementation
The Chat feature uses **In-Context RAG**:
1.  User asks a question.
2.  App constructs a prompt containing:
    *   The User's Question.
    *   The Chat History.
    *   **The Context Block**: Title, Summary, Themes, Key Moments, and Full Transcript (if available).
3.  Gemini answers strictly based on the Context Block.

---

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18+)
- A Google Cloud Project with the **Gemini API** enabled.
- An API Key.

### 1. Clone and Install
```bash
npm install
```

### 2. Environment Configuration
The application expects the API key to be available in the process environment.
*Note: In the current setup, this is handled via `process.env.API_KEY`.*

### 3. Run Development Server
```bash
npm start
# or
npm run dev
```

---

## 📂 Project Structure

```
/
├── index.html              # Entry HTML
├── index.tsx               # React Root
├── App.tsx                 # Main Application Controller
├── types.ts                # TypeScript Interfaces (AnalysisData, VideoMetadata)
├── metadata.json           # Permission requests (Microphone)
├── components/
│   ├── AnalysisResult.tsx  # Main Dashboard (Tabs, Charts, Timelines)
│   ├── ChatInterface.tsx   # RAG Chat UI with Citation logic
│   ├── LoadingSkeleton.tsx # Loading states
│   └── Icons.tsx           # SVG Icon Library
└── services/
    └── geminiService.ts    # Core AI Logic, Prompt Engineering, API Calls
```

---

## ⚠️ Important Considerations

*   **Token Usage**: Audio analysis and long transcripts consume more tokens. Gemini 2.5 Flash is optimized for high-volume, low-latency tasks.
*   **Browser Permissions**: The `Audio` mode requires Microphone permissions.
*   **Search Grounding**: The accuracy of the "URL Mode" depends on Google Search indexing. New videos (<1 hour old) may require the user to use "Audio Mode" or "Transcript Mode" if search results are not yet populated.
