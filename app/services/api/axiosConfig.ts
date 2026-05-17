import config from '@/app/config/env';
import { checkOnlineNow } from '@/app/hooks/useNetwork';
import { ApiError, ApiResponse } from '@/app/types/api';
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

// Créer l'instance axios
const apiClient: AxiosInstance = axios.create({
  baseURL: config.API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-API-KEY': config.X_API_KEY,
  },
});

// Intercepteur de requête pour ajouter le token + pré-check réseau
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Court-circuit si on sait déjà qu'on est hors-ligne (évite un timeout 30s)
    const online = await checkOnlineNow();
    if (!online) {
      const err: any = new Error('Hors-ligne. Vérifiez votre connexion internet.');
      err.offline = true;
      err.isNetworkError = true;
      throw err;
    }
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
  async (error: any) => {
    // Erreur lévée par notre pré-check hors-ligne
    if (error?.offline) {
      return Promise.reject({
        message: error.message || 'Hors-ligne. Vérifiez votre connexion internet.',
        erreurs: {},
        offline: true,
        isNetworkError: true,
      });
    }
    if (error.response) {
      // Erreur de réponse du serveur
      const { status, data } = error.response;

      // Token expiré ou non valide
      // On ne purge PAS la session si l'erreur vient de l'endpoint de
      // rafraîchissement du token : c'est le splash (verifierSession)
      // qui décidera quoi faire, pour ne pas casser le "Se souvenir de moi".
      const requestUrl: string = error.config?.url || '';
      const isRefreshEndpoint = requestUrl.includes('/api/rafraichir-token');

      if (status === 401 && !isRefreshEndpoint) {
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
      // Pas de réponse du serveur (timeout / coupure pendant la requête)
      // Vérifier si c'est un problème réseau
      const stillOnline = await checkOnlineNow();
      return Promise.reject({
        message: stillOnline
          ? 'Le serveur ne répond pas. Réessayez dans un instant.'
          : 'Connexion perdue pendant l\'envoi. Réessayez dès que vous êtes en ligne.',
        erreurs: {},
        offline: !stillOnline,
        isNetworkError: true,
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

