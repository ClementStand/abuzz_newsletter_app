// Type definitions for the chat feature

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: NewsSource[];
}

export interface NewsSource {
  id: string;
  competitorName: string;
  title: string;
  date: string;
  url: string;
}

export interface ChatHistory {
  messages: Message[];
  timestamp: string;
}

export interface ChatRequest {
  message: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ChatResponse {
  response: string;
  sources: NewsSource[];
}

export interface ParsedQuery {
  competitors: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  regions: string[];
  eventTypes: string[];
  threatLevel?: number;
}
