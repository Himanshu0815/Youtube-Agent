
export interface Timestamp {
  time: string;
  description: string;
  seconds?: number; // Added for seeking
}

export interface Theme {
  topic: string;
  details: string;
  emoji: string;
}

export interface StudySection {
  title: string;
  points: string[];
}

export interface Quote {
  text: string;
  time: string;
  speaker?: string;
  seconds?: number; // Added for seeking
}

export interface SentimentAnalysis {
  positivePercent: number;
  negativePercent: number;
  neutralPercent: number;
  summary: string;
}

export interface Speaker {
  name: string;
  role?: string;
}

export interface SubTopic {
  title: string;
  time: string;
  summary: string;
  speaker?: string;
  seconds?: number; // Added for seeking
}

export interface ReviewDetails {
  item: string;
  rating?: string;
  pros: string[];
  cons: string[];
  verdict: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index 0-3
  explanation: string;
}

export interface QuizData {
  questions: QuizQuestion[];
}

export interface ResearchResult {
  topic: string;
  definition: string;
  history: string;
  keyConcepts: string[];
  relevance: string;
  sources: string[];
}

export interface AnalysisData {
  videoId?: string;
  title: string;
  summary: string;
  videoType: string; // e.g., "Educational", "Product Review", "Entertainment"
  transcript?: string;
  timestamps: Timestamp[];
  themes: Theme[];
  studyNotes: StudySection[];
  quotes: Quote[];
  sentiment?: SentimentAnalysis;
  speakers: Speaker[];
  subTopics: SubTopic[];
  reviewDetails?: ReviewDetails;
}

export interface VideoMetadata {
  url: string;
  videoId: string | null;
}

export enum AnalysisMode {
  TRANSCRIPT = 'TRANSCRIPT',
  URL_ONLY = 'URL_ONLY',
  AUDIO = 'AUDIO'
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface HistoryItem {
  id: string; // videoId or timestamp
  title: string;
  date: number;
  thumbnail?: string;
  type: string;
  data: AnalysisData;
}
