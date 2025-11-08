import apiClient, { handleApiError, handleApiResponse } from '../api/axiosConfig';
import {
  Compagnie,
  CompagnieDetaillee,
  CompagnieFormData,
  CompagniesListeResponse,
  CompagnieUpdateData,
  FiltresCompagnies,
  StatistiquesCompagnies,
} from '../../types/compagnie';
import { ApiError, ApiResponse } from '../../types/api';

/**
 * Service pour la gestion des compagnies
 */
class CompagnieService {
  private readonly BASE_PATH = '/api/admin/compagnies';

  /**
   * Récupère la liste des compagnies avec filtres et pagination
   */
  async listerCompagnies(
    filtres?: FiltresCompagnies
  ): Promise<ApiResponse<CompagniesListeResponse> | ApiError> {
    try {
      const response = await apiClient.get(`${this.BASE_PATH}/recupListecompagnie`, {
        params: filtres,
      });
      return handleApiResponse<CompagniesListeResponse>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Récupère les statistiques des compagnies
   */
  async getStatistiques(): Promise<ApiResponse<StatistiquesCompagnies> | ApiError> {
    try {
      const response = await apiClient.get(`${this.BASE_PATH}/statistiques`);
      return handleApiResponse<StatistiquesCompagnies>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Récupère les détails d'une compagnie
   */
  async getCompagnie(id: number): Promise<ApiResponse<CompagnieDetaillee> | ApiError> {
    try {
      const response = await apiClient.get(`${this.BASE_PATH}/detailCompagnie/${id}`);
      return handleApiResponse<CompagnieDetaillee>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Crée une nouvelle compagnie
   */
  async creerCompagnie(
    data: CompagnieFormData
  ): Promise<ApiResponse<{ compagnie: Compagnie; admin: any }> | ApiError> {
    try {
      const response = await apiClient.post(`${this.BASE_PATH}/creerCompagnie`, data);
      return handleApiResponse<{ compagnie: Compagnie; admin: any }>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Met à jour une compagnie
   */
  async mettreAJourCompagnie(
    id: number,
    data: CompagnieUpdateData
  ): Promise<ApiResponse<Compagnie> | ApiError> {
    try {
      const response = await apiClient.put(`${this.BASE_PATH}/updateCompagnie/${id}`, data);
      return handleApiResponse<Compagnie>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Change le statut d'une compagnie
   */
  async changerStatut(id: number, statut: number): Promise<ApiResponse<Compagnie> | ApiError> {
    try {
      const response = await apiClient.patch(`${this.BASE_PATH}/${id}/statut`, { statut });
      return handleApiResponse<Compagnie>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Supprime une compagnie
   */
  async supprimerCompagnie(id: number): Promise<ApiResponse<void> | ApiError> {
    try {
      const response = await apiClient.delete(`${this.BASE_PATH}/${id}`);
      return handleApiResponse<void>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
}

// Exporter une instance unique du service
export const compagnieService = new CompagnieService();
export default compagnieService;

