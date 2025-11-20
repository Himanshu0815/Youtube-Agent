
export interface Timestamp {
  time: string;
  description: string;
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
}

export interface ReviewDetails {
  item: string;
  rating?: string;
  pros: string[];
  cons: string[];
  verdict: string;
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
