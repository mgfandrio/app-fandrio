import { ApiError, ApiResponse } from '../../types/api';
import apiClient from '../api/axiosConfig';

interface UtilisateurMoi {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  role: number;
  compagnie_id: number | null;
  statut: number;
}

interface MoiResponse {
  statut: boolean;
  utilisateur: UtilisateurMoi;
  message?: string;
}

class AuthService {
  /**
   * Récupère les informations de l'utilisateur connecté
   */
  async getMoi(): Promise<{ statut: boolean; data?: UtilisateurMoi; message?: string }> {
    try {
      const response = await apiClient.get<MoiResponse>('/moi');
      
      if (response.data.statut && response.data.utilisateur) {
        return {
          statut: true,
          data: response.data.utilisateur
        };
      }
      
      return {
        statut: false,
        message: 'Données invalides'
      };
    } catch (error: any) {
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors de la récupération du profil',
      };
    }
  }

  /**
   * Déconnexion de l'utilisateur
   */
  async deconnexion(): Promise<ApiResponse<null> | ApiError> {
    try {
      const response = await apiClient.post<ApiResponse<null>>('/deconnexion');
      return response.data;
    } catch (error: any) {
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors de la déconnexion',
      };
    }
  }

  /**
   * Rafraîchir le token JWT
   */
  async rafraichirToken(): Promise<ApiResponse<{ token: string }> | ApiError> {
    try {
      const response = await apiClient.post<ApiResponse<{ token: string }>>('/rafraichir-token');
      return response.data;
    } catch (error: any) {
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors du rafraîchissement du token',
      };
    }
  }
}

export default new AuthService();
export type { UtilisateurMoi };

