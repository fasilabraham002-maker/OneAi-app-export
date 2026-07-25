export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role?: string;
  createdAt: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    autoTextToSpeech: boolean;
    voiceGender: 'female' | 'male';
    reminderNotifications: boolean;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: {
    documentId: string;
    documentTitle: string;
    snippet: string;
  }[];
  audioUrl?: string;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  systemInstruction?: string;
}

export interface DocumentChunk {
  id: string;
  content: string;
  pageNumber?: number;
  score?: number;
}

export interface UploadedDocument {
  id: string;
  userId: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  summary?: string;
  tags: string[];
  content: string;
  chunks: DocumentChunk[];
}

export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';
export type ReminderCategory = 'work' | 'personal' | 'health' | 'finance' | 'learning' | 'other';

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate: string; // ISO date string
  priority: PriorityLevel;
  category: ReminderCategory;
  isCompleted: boolean;
  createdAt: string;
  subtasks: { id: string; text: string; completed: boolean }[];
  aiSuggestedSteps?: string[];
  tags?: string[];
}

export interface SearchQueryRequest {
  query: string;
  documentIds?: string[];
}

export interface SearchQueryResponse {
  answer: string;
  sources: {
    documentId: string;
    documentTitle: string;
    snippet: string;
    relevanceScore: number;
  }[];
  suggestedFollowUps: string[];
}
