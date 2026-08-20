/**
 * Constantes da aplicação centralizadas
 */

// Timeouts e Limites
export const TIMEOUTS = {
  API_REQUEST: 30000, // 30 segundos
  JWT_REFRESH_BUFFER: 60000, // 1 minuto antes de expirar
  DEBOUNCE_SEARCH: 300, // 300ms para debounce de busca
} as const;

export const LIMITS = {
  MAX_MESSAGE_LENGTH: 2000,
  MAX_FILE_SIZE_MB: 10,
  MAX_RETRY_ATTEMPTS: 3,
} as const;

// Mensagens de erro padrão
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
  SESSION_EXPIRED: 'Sua sessão expirou. Faça login novamente.',
  UNAUTHORIZED: 'Você não tem permissão para acessar este recurso.',
  SERVER_ERROR: 'Erro no servidor. Tente novamente mais tarde.',
  VALIDATION_ERROR: 'Dados inválidos. Verifique e tente novamente.',
  UNKNOWN_ERROR: 'Ocorreu um erro inesperado.',
} as const;

// Status HTTP
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// Chaves do LocalStorage
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_PREFERENCES: 'userPreferences',
  THEME: 'theme',
} as const;

// Endpoints da API (sem /api prefix, pois já está no router do backend)
export const API_ENDPOINTS = {
  LOGIN: '/login',
  REGISTER: '/register',
  ME: '/me',
  START_CHAT: '/start_chat',
  GPT: '/gpt',
  // Classes (Turmas)
  CLASSES: '/classes',
  // Cases (Casos Clínicos)
  CASES: '/cases',
  CASES_FREE: '/cases/free',
  CASES_QUOTA: '/cases/quota',
  CASES_AI_START: '/cases/ai/start',
  CASES_EVALUATE_SOAP: '/cases/evaluate-soap',
  CASES_ATTEMPT_ABANDON: '/cases/attempts',  // PATCH /{id}/abandon
  CASES_STUDENT_AVAILABLE: '/cases/student/available',
  // Dashboard
  DASHBOARD_STATS: '/dashboard/stats',
  DASHBOARD_CASES: '/dashboard/cases',
  DASHBOARD_STUDENTS: '/dashboard/students',
  DASHBOARD_WEEKLY: '/dashboard/weekly',
} as const;
