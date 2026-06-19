// --- Children & Facilities ---

export interface Child {
  id: number;
  name: string;
  gender: 'male' | 'female';
  birthdate: string; // YYYY-MM-DD
  className: string; // e.g. ぱんだ組
  facilityId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Facility {
  id: number;
  name: string;
  type: 'nursery' | 'school' | 'lesson'; // 保育園/学校/習い事
  address: string;
  notes: string; // e.g. レッスン日時など
  createdAt: string;
  updatedAt: string;
}

// --- Document Processing ---

export interface DocumentRecord {
  id: number;
  fileName: string;
  originalFileName: string;
  filePath: string;
  driveFileId: string | null;
  status: 'pending' | 'processing' | 'completed' | 'error';
  category: 'notice' | 'action_required' | 'unknown';
  source: string; // 発行元
  title: string;
  summary: string;
  rawJson: string; // Gemini/Claude response
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedEvent {
  id: number;
  documentId: number;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string | null; // HH:MM
  endTime: string | null;
  location: string | null;
  targetPerson: string;
  description: string;
  calendarEventId: string | null;
  createdAt: string;
}

export interface ExtractedTodo {
  id: number;
  documentId: number;
  title: string;
  dueDate: string | null;
  targetPerson: string;
  description: string;
  isCompleted: boolean;
  taskId: string | null;
  createdAt: string;
}

export interface ExtractedItem {
  id: number;
  documentId: number;
  name: string;
  dueDate: string | null;
  targetPerson: string;
  description: string;
  isCompleted: boolean;
  createdAt: string;
}

// --- LLM ---

export type LLMProvider = 'claude' | 'gemini' | 'openai';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
}

export interface AnalysisResult {
  title: string;
  source: string;
  category: 'notice' | 'action_required';
  summary: string;
  suggestedFileName: string;
  events: {
    title: string;
    date: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    targetPerson: string;
    description: string;
  }[];
  todos: {
    title: string;
    dueDate?: string;
    targetPerson: string;
    description: string;
  }[];
  items: {
    name: string;
    dueDate?: string;
    targetPerson: string;
    description: string;
  }[];
}

// --- Settings ---

export interface AppSettings {
  llmProvider: LLMProvider;
  claudeApiKey: string;
  geminiApiKey: string;
  openaiApiKey: string;
  claudeModel: string;
  geminiModel: string;
  openaiModel: string;
  googleAccessToken: string | null;
  driveFolderId: string | null;
  calendarId: string | null;
  lineChannelAccessToken: string | null;
  lineUserId: string | null;
}
