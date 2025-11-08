import apiClient, { handleApiError, handleApiResponse } from '../api/axiosConfig';
import {
  FiltresUtilisateurs,
  StatistiquesUtilisateurs,
  Utilisateur,
  UtilisateurDetaille,
  UtilisateursListeResponse,
} from '../../types/utilisateur';
import { ApiError, ApiResponse } from '../../types/api';

/**
 * Service pour la gestion des utilisateurs
 */
class UtilisateurService {
  private readonly BASE_PATH = '/api/admin/utilisateurs';

  /**
   * Récupère la liste des utilisateurs avec filtres et pagination
   */
  async listerUtilisateurs(
    filtres?: FiltresUtilisateurs
  ): Promise<ApiResponse<UtilisateursListeResponse> | ApiError> {
    try {
      const response = await apiClient.get(`${this.BASE_PATH}/recupListeUtilisateur`, {
        params: filtres,
      });
      return handleApiResponse<UtilisateursListeResponse>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Récupère les statistiques des utilisateurs
   */
  async getStatistiques(): Promise<ApiResponse<StatistiquesUtilisateurs> | ApiError> {
    try {
      const response = await apiClient.get(`${this.BASE_PATH}/statistiques`);
      return handleApiResponse<StatistiquesUtilisateurs>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Récupère les détails d'un utilisateur
   */
  async getUtilisateur(id: number): Promise<ApiResponse<UtilisateurDetaille> | ApiError> {
    try {
      const response = await apiClient.get(`${this.BASE_PATH}/detailUtilisateur/${id}`);
      return handleApiResponse<UtilisateurDetaille>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Active un utilisateur
   */
  async activerUtilisateur(id: number): Promise<ApiResponse<Utilisateur> | ApiError> {
    try {
      const response = await apiClient.patch(`${this.BASE_PATH}/${id}/activer`);
      return handleApiResponse<Utilisateur>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Désactive un utilisateur
   */
  async desactiverUtilisateur(id: number): Promise<ApiResponse<Utilisateur> | ApiError> {
    try {
      const response = await apiClient.patch(`${this.BASE_PATH}/${id}/desactiver`);
      return handleApiResponse<Utilisateur>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Réactive un utilisateur supprimé
   */
  async reactiverUtilisateur(id: number): Promise<ApiResponse<Utilisateur> | ApiError> {
    try {
      const response = await apiClient.patch(`${this.BASE_PATH}/${id}/reactiver`);
      return handleApiResponse<Utilisateur>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Change le statut d'un utilisateur
   */
  async changerStatut(
    id: number,
    statut: number
  ): Promise<ApiResponse<Utilisateur> | ApiError> {
    try {
      const response = await apiClient.patch(`${this.BASE_PATH}/${id}/statut`, { statut });
      return handleApiResponse<Utilisateur>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Supprime un utilisateur
   */
  async supprimerUtilisateur(id: number): Promise<ApiResponse<void> | ApiError> {
    try {
      const response = await apiClient.delete(`${this.BASE_PATH}/delete/${id}`);
      return handleApiResponse<void>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
}

// Exporter une instance unique du service
export const utilisateurService = new UtilisateurService();
export default utilisateurService;

