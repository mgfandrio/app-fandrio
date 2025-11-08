// Types génériques pour les réponses API

export interface ApiResponse<T> {
  statut: boolean;
  data?: T;
  message?: string;
  erreurs?: Record<string, string[]>;
}

export interface ApiError {
  statut: boolean;
  message: string;
  erreurs?: Record<string, string[]>;
}

