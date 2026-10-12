export type ErrorCategory = 'network' | 'server' | 'runtime' | 'unknown';

export interface AppError {
  category: ErrorCategory;
  title: string;
  message: string;
  details?: string;
  endpoint?: string;
  statusCode?: number;
  timestamp: string;
  retryAction?: () => void | Promise<void>;
  recoverAction?: () => void;
  recoverLabel?: string;
}
