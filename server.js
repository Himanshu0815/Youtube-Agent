import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { YoutubeTranscript } from 'youtube-transcript';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Cloud Run sets PORT to 8080
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 1. Serve Static Files (The React App)
app.use(express.static(path.join(__dirname, 'dist')));

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const JSON_STRUCTURE_PROMPT = `
  RESPONSE FORMAT:
  You MUST return a VALID JSON object with the following structure. Do not return markdown text outside the JSON.
  Ensure all strings are properly escaped. Do not use trailing commas.
  {
    "videoId": "The YouTube Video ID (string) or 'NOT_FOUND'",
    "title": "Video Title (string)",
    "videoType": "Educational" | "Product Review" | "Entertainment" | "Vlog" | "News",
    "summary": "Executive summary (Max 300 words)",
    "timestamps": [{ "time": "HH:MM:SS", "description": "string" }],
    "themes": [{ "topic": "string", "details": "string", "emoji": "string" }],
    "studyNotes": [{ "title": "string", "points": ["string"] }],
    "reviewDetails": { "item": "string", "rating": "string", "pros": ["string"], "cons": ["string"], "verdict": "string" },
    "quotes": [{ "text": "string", "time": "string", "speaker": "string" }],
    "speakers": [{ "name": "string", "role": "string" }],
    "subTopics": [{ "title": "string", "time": "string", "summary": "string", "speaker": "string" }],
    "sentiment": { "positivePercent": number, "negativePercent": number, "neutralPercent": number, "summary": "string" }
  }
`;

const cleanJsonString = (text) => {
    let clean = text.trim();
    if (clean.includes("```")) {
        const matches = clean.match(/```(?:json)?([\s\S]*?)```/);
        if (matches && matches[1]) clean = matches[1].trim();
        else clean = clean.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    clean = clean.replace(/,\s*([\]}])/g, '$1');
    return clean;
};

app.post('/api/analyze', async (req, res) => {
  try {
    const { url, videoType } = req.body;
    const videoIdMatch = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    const videoId = (videoIdMatch && videoIdMatch[2].length === 11) ? videoIdMatch[2] : null;

    if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

    let videoTitle = "YouTube Video";
    let videoDesc = "";

    if (process.env.YOUTUBE_API_KEY) {
        try {
            const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`);
            const ytData = await ytRes.json();
            if (ytData.items && ytData.items.length > 0) {
                videoTitle = ytData.items[0].snippet.title;
                videoDesc = ytData.items[0].snippet.description;
            }
        } catch (err) { console.error(err); }
    } else {
        try {
            const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
            const data = await res.json();
            if (data.title) videoTitle = data.title;
        } catch (e) {}
    }

    let transcriptText = "";
    try {
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
      transcriptText = transcriptItems.map(t => t.text).join(' ');
    } catch (e) {}

    const userContext = videoType && videoType !== 'Auto' ? `IMPORTANT: The user has specified this is a "${videoType}" video.` : '';
    let prompt = "";
    let config = {};

    if (transcriptText) {
      prompt = `
        Analyze transcript. Title: "${videoTitle}" (ID: ${videoId}). ${userContext}
        TASKS: Classify, Analyze, Summarize.
        FATAL RULE: Do NOT include the 'transcript' field in the JSON.
        ${JSON_STRUCTURE_PROMPT}
        TRANSCRIPT: ${transcriptText.slice(0, 30000)}
      `;
      config = { responseMimeType: "application/json" };
    } else {
      prompt = `
        Deep analysis of video: "${videoTitle}" (ID: ${videoId}).
        Description: "${videoDesc.slice(0, 500)}..."
        ${userContext}
        Step 1: SEARCH for transcript, summaries, reviews.
        Step 2: ANALYZE.
        FATAL RULE: Do NOT include the 'transcript' field.
        ${JSON_STRUCTURE_PROMPT}
      `;
      config = { tools: [{ googleSearch: {} }] };
    }

    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config });
    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const jsonData = JSON.parse(cleanJsonString(text));
    if (transcriptText) jsonData.transcript = transcriptText;
    
    res.json(jsonData);

  } catch (error) {
    console.error("Analysis Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// 2. Catch-All Route for React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});