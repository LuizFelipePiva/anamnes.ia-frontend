// src/types/index.ts
// Tipos compartilhados em toda a aplicação

// Re-exporta tipos do módulo teacher
export * from './teacher';

// ===================== AUTH =====================

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface JWTPayload {
  sub: string;  // user_id
  email: string;
  exp: number;  // timestamp de expiração
  iat?: number; // issued at
}

// ===================== CHAT =====================

export interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  thread_id: string;
  title?: string;
  created_at: string;
  updated_at?: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

// ===================== API RESPONSES =====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StartChatResponse {
  thread_id: string;
  conversation_id?: string;
}

export interface GPTResponse {
  reply: string;
  conversation_id?: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

// ===================== FORMS =====================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

// ===================== SOAP (Medical) =====================

export interface SOAPData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}
