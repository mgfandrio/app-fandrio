import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ApiError, ApiResponse } from '../../types/api';

const API_URL = 'http://10.175.222.84:8000';
const X_API_KEY = 'fandrio_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';

// Créer l'instance axios
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-API-KEY': X_API_KEY,
  },
});

// Intercepteur de requête pour ajouter le token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync('fandrioToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Erreur lors de la récupération du token:', error);
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Intercepteur de réponse pour gérer les erreurs
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    if (error.response) {
      // Erreur de réponse du serveur
      const { status, data } = error.response;
      
      // Token expiré ou non valide
      if (status === 401) {
        try {
          await SecureStore.deleteItemAsync('fandrioToken');
          await SecureStore.deleteItemAsync('fandrioUser');
          // Rediriger vers la page de connexion si nécessaire
          console.warn('Session expirée');
        } catch (e) {
          console.warn('Erreur lors de la suppression du token:', e);
        }
      }
      
      return Promise.reject({
        message: data?.message || 'Une erreur est survenue',
        erreurs: data?.erreurs || {},
        status,
      });
    } else if (error.request) {
      // Pas de réponse du serveur
      return Promise.reject({
        message: 'Impossible de contacter le serveur. Vérifiez votre connexion.',
        erreurs: {},
      });
    } else {
      // Erreur de configuration
      return Promise.reject({
        message: 'Une erreur inattendue est survenue.',
        erreurs: {},
      });
    }
  }
);

export default apiClient;

// Fonction helper pour gérer les réponses
export const handleApiResponse = <T>(response: any): ApiResponse<T> => {
  return {
    statut: response.data.statut || true,
    data: response.data.data,
    message: response.data.message,
  };
};

// Fonction helper pour gérer les erreurs
export const handleApiError = (error: any): ApiError => {
  return {
    statut: false,
    message: error.message || 'Une erreur est survenue',
    erreurs: error.erreurs || {},
  };
};

