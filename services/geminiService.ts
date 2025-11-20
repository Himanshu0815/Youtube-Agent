
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisData, ChatMessage } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is not defined in the environment.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to clean raw JSON strings if they contain markdown code blocks
const cleanJsonString = (text: string): string => {
  let clean = text.trim();
  // Remove markdown code blocks if present
  if (clean.includes("```")) {
    // Try to extract content between the first ```json (or ```) and the last ```
    const matches = clean.match(/```(?:json)?([\s\S]*?)```/);
    if (matches && matches[1]) {
      clean = matches[1].trim();
    } else {
        // Fallback cleanup if regex fails but backticks exist
        clean = clean.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
  }
  return clean;
};

// Robust JSON parser that looks for the first { and last }
const parseGenerativeJson = (text: string): any => {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      const jsonStr = text.substring(start, end + 1);
      return JSON.parse(cleanJsonString(jsonStr));
    }
    // Fallback: try parsing the whole text cleaned
    return JSON.parse(cleanJsonString(text));
  } catch (e) {
    console.error("JSON Parse Error:", e);
    throw new Error("Failed to parse AI response as JSON.");
  }
};

// Helper to ensure data integrity (arrays are never undefined)
const sanitizeData = (data: any): AnalysisData => {
  return {
    ...data,
    videoType: data.videoType || "General",
    timestamps: data.timestamps || [],
    themes: data.themes || [],
    studyNotes: (data.studyNotes || []).map((s: any) => ({
      ...s,
      points: s.points || []
    })),
    quotes: data.quotes || [],
    speakers: data.speakers || [],
    subTopics: data.subTopics || [],
    reviewDetails: data.reviewDetails ? {
      item: data.reviewDetails.item || "Unknown Item",
      rating: data.reviewDetails.rating,
      pros: data.reviewDetails.pros || [],
      cons: data.reviewDetails.cons || [],
      verdict: data.reviewDetails.verdict || "No verdict provided."
    } : undefined,
  };
};

const getYouTubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Helper to fetch metadata (Title/Author) to improve search grounding
const fetchVideoMetadata = async (videoId: string): Promise<{ title: string; author: string } | null> => {
  try {
    // Use noembed (OEmbed proxy) to get title without API key to help the AI search better
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const data = await res.json();
    if (data.title) {
      return { title: data.title, author: data.author_name };
    }
    return null;
  } catch (e) {
    console.warn("Failed to fetch oembed metadata", e);
    return null;
  }
};

// Define the structure string for Prompts (when we can't use responseSchema with Tools)
const JSON_STRUCTURE_PROMPT = `
  RESPONSE FORMAT:
  You MUST return a VALID JSON object with the following structure. Do not return markdown text outside the JSON.
  {
    "videoId": "The YouTube Video ID (string) or 'NOT_FOUND'",
    "title": "Video Title (string)",
    "videoType": "Educational" | "Product Review" | "Entertainment" | "Vlog" | "News",
    "summary": "Executive summary (string)",
    "transcript": "Full transcript text (string, optional)",
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

// Schema Object for Non-Tool requests
const responseSchemaObject = {
  type: Type.OBJECT,
  properties: {
    videoId: { type: Type.STRING, description: "The YouTube Video ID" },
    title: { type: Type.STRING, description: "Video Title" },
    videoType: { type: Type.STRING, description: "Type of video" },
    summary: { type: Type.STRING, description: "Executive summary" },
    transcript: { type: Type.STRING, description: "Full transcript text" },
    timestamps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          time: { type: Type.STRING },
          description: { type: Type.STRING },
        },
      },
    },
    themes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          details: { type: Type.STRING },
          emoji: { type: Type.STRING },
        },
      },
    },
    studyNotes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          points: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
      },
    },
    reviewDetails: {
      type: Type.OBJECT,
      properties: {
        item: { type: Type.STRING },
        rating: { type: Type.STRING },
        pros: { type: Type.ARRAY, items: { type: Type.STRING } },
        cons: { type: Type.ARRAY, items: { type: Type.STRING } },
        verdict: { type: Type.STRING }
      }
    },
    quotes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          time: { type: Type.STRING },
          speaker: { type: Type.STRING }
        }
      }
    },
    speakers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          role: { type: Type.STRING }
        }
      }
    },
    subTopics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          time: { type: Type.STRING },
          summary: { type: Type.STRING },
          speaker: { type: Type.STRING, nullable: true }
        }
      }
    },
    sentiment: {
      type: Type.OBJECT,
      properties: {
        positivePercent: { type: Type.NUMBER },
        negativePercent: { type: Type.NUMBER },
        neutralPercent: { type: Type.NUMBER },
        summary: { type: Type.STRING }
      }
    }
  },
  required: ["title", "summary", "videoType", "timestamps", "themes", "quotes", "speakers", "subTopics", "sentiment"],
};

export const analyzeTranscript = async (
  transcript: string,
  videoUrlOrTitle?: string,
  userVideoType?: string
): Promise<AnalysisData> => {
  const ai = getAiClient();
  const isUrl = videoUrlOrTitle?.startsWith('http');
  const videoId = isUrl && videoUrlOrTitle ? getYouTubeId(videoUrlOrTitle) : null;
  const useSearch = !!(isUrl && videoId);
  
  const userContext = userVideoType && userVideoType !== 'Auto' 
    ? `IMPORTANT: The user has specified this is a "${userVideoType}" video. Prioritize analysis for this type.`
    : '';

  const prompt = `
    Analyze the following YouTube video transcript.
    Context: ${videoUrlOrTitle || "No URL provided"}
    ${videoId ? `Target Video ID: ${videoId}` : ''}
    ${userContext}
    
    TASKS:
    1. **Classification**: Determine the 'videoType'. ${userContext}
    2. **Adaptive Analysis**:
       - **Educational/Tutorial**: Generate detailed 'studyNotes'.
       - **Product/Movie/Service Review**: Generate 'reviewDetails' (Item name, Pros, Cons, Rating, Verdict). Omit 'studyNotes'.
       - **Entertainment/Vlog**: Omit 'studyNotes' and 'reviewDetails'. Focus on Themes/Entertainment value.
    3. **Summary**: Concise executive summary (150 words).
    4. **Timestamps**: Key moments.
    5. **Themes**: Main topics.
    6. **Quotes**: Impactful quotes.
    7. **Speakers**: Identify speakers/roles.
    8. **Sub-topics**: Detailed breakdown.
    9. **Sentiment Analysis**: 
       ${useSearch ? `Use Google Search to find **real comments** and audience reactions specifically for video ID "${videoId}". 
       CRITICAL: You must VERIFY that the comments belong to video ID "${videoId}". 
       If search results are for a different video, ignore them and return a neutral summary.` : `Analyze the **tone** of the transcript.`}

    ${useSearch ? JSON_STRUCTURE_PROMPT : ''}

    TRANSCRIPT:
    ${transcript.slice(0, 40000)} 
    (Transcript truncated if too long)
  `;

  // Configure request: If using Tools (Search), we CANNOT use strict responseSchema/MimeType
  const config: any = {};
  if (useSearch) {
    config.tools = [{ googleSearch: {} }];
    // Explicitly NO responseMimeType or responseSchema when tools are active
  } else {
    config.responseMimeType = "application/json";
    config.responseSchema = responseSchemaObject;
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: config,
  });

  if (!response.text) {
    throw new Error("No response from Gemini.");
  }

  return sanitizeData(parseGenerativeJson(response.text));
};

export const analyzeAudioContent = async (
  base64Audio: string,
  mimeType: string,
  userVideoType?: string
): Promise<AnalysisData> => {
  const ai = getAiClient();
  
  const userContext = userVideoType && userVideoType !== 'Auto' 
    ? `IMPORTANT: The user has specified this is a "${userVideoType}" video. Prioritize analysis for this type.`
    : '';

  const prompt = `
    Listen to the attached audio content carefully.
    ${userContext}
    
    TASKS:
    1. **Transcription**: Transcribe the audio verbatim.
    2. **Classification**: Determine the 'videoType'. ${userContext}
    3. **Analysis**: 
       - If Educational/Tutorial: Create 'studyNotes'. 
       - If Review: Create 'reviewDetails' (Item, Rating, Pros, Cons).
       - Else: Return empty 'studyNotes' and 'reviewDetails'.
    4. **Summary**: Concise executive summary (150 words).
    5. **Timestamps**: Key moments with timestamps (infer time from audio progress).
    6. **Themes**: Main topics.
    7. **Quotes**: Impactful quotes.
    8. **Speakers**: Identify speakers/roles.
    9. **Sub-topics**: Detailed breakdown.
    10. **Sentiment**: Analyze the tone of the audio.

    ${JSON_STRUCTURE_PROMPT}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Audio
        }
      },
      { text: prompt }
    ],
    config: {
        responseMimeType: "application/json",
        responseSchema: responseSchemaObject
    }
  });

  if (!response.text) {
    throw new Error("No response from Gemini for audio analysis.");
  }

  return sanitizeData(parseGenerativeJson(response.text));
};

export const analyzeUrlWithGrounding = async (
  url: string, 
  userVideoType?: string
): Promise<AnalysisData> => {
  const ai = getAiClient();
  const videoId = getYouTubeId(url);
  const metadata = videoId ? await fetchVideoMetadata(videoId) : null;
  const videoTitle = metadata?.title || "YouTube Video";

  const userContext = userVideoType && userVideoType !== 'Auto' 
  ? `IMPORTANT: The user has specified this is a "${userVideoType}" video. Prioritize analysis for this type.`
  : '';

  const prompt = `
    Perform a deep analysis of the YouTube video: "${videoTitle}" (ID: ${videoId}).
    ${userContext}
    
    Step 1: SEARCH
    Use Google Search to find:
    - The official transcript, closed captions, or subtitles for video ID "${videoId}".
    - Comprehensive text summaries, reviews, or articles discussing "${videoTitle}".
    - User comments and sentiment for this specific video.
    
    Step 2: ANALYZE & VERIFY
    - **Primary Source**: If a transcript/caption is found, analyze it directly.
    - **Secondary Source**: If NO transcript is found, synthesize an analysis based on the detailed reviews/articles found. 
      *CRITICAL*: If relying on secondary sources, ensure they are about THIS specific video/product launch/event.
    - **Verification**: Check if the content matches the title "${videoTitle}".
    
    Step 3: EXTRACTION TASKS
    1. **Classification**: Video Type (Educational, Review, Vlog, etc.). ${userContext}
    2. **Structure**:
       - Summary (150 words).
       - Timestamps (infer from text context or description).
       - Themes & Topics.
       - Quotes (if available in text).
       - Speakers.
    3. **Specifics**:
       - **Study Notes**: Only if Educational.
       - **Review Details**: If Product/Media Review (Item, Rating, Pros, Cons, Verdict).
    4. **Sentiment**: Summarize audience reaction from comments/reviews found.

    FAILURE CONDITION:
    If you cannot find ANY specific information (transcript, summary, or reviews) about this video, set "videoId" to "NOT_FOUND".

    ${JSON_STRUCTURE_PROMPT}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      // No responseMimeType/Schema when using tools
    },
  });

  if (!response.text) {
    throw new Error("No response from Gemini.");
  }

  const rawData = parseGenerativeJson(response.text);
  const data = sanitizeData(rawData);

  if (data.videoId === "NOT_FOUND") {
    throw new Error(
        `Video Not Found: The AI could not locate a transcript, description, or detailed summary for "${videoTitle}". \n\nTip: Try 'Audio / Upload' mode to analyze it directly.`
    );
  }

  return data;
};

export const askVideoQuestion = async (
  question: string,
  analysisData: AnalysisData,
  history: ChatMessage[]
): Promise<string> => {
  const ai = getAiClient();
  
  // We construct a RAG prompt by injecting the analyzed data as context
  // This acts as the "Retrieval" part, using the LLM's context window as the vector store equivalent
  const context = `
    VIDEO CONTEXT:
    Title: ${analysisData.title}
    Type: ${analysisData.videoType}
    Summary: ${analysisData.summary}
    Themes: ${analysisData.themes.map(t => t.topic).join(', ')}
    
    TRANSCRIPT/CONTENT START:
    ${analysisData.transcript || "Transcript not available. Answer based on the summary and themes provided."}
    TRANSCRIPT/CONTENT END.
  `;

  const historyText = history
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const prompt = `
    You are a helpful assistant answering questions specifically about the YouTube video titled "${analysisData.title}".
    
    ${context}

    PREVIOUS CHAT HISTORY:
    ${historyText}

    USER QUESTION: ${question}

    INSTRUCTIONS:
    1. Answer ONLY based on the video content provided above.
    2. If the answer is not in the video, say "I couldn't find that information in the video."
    3. Be concise and direct.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text || "I couldn't generate an answer.";
};
