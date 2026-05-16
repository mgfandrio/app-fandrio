import { ApiError, ApiResponse } from '../../types/api';
import {
  FiltresProvinces,
  ProvinceDetaillee,
  ProvinceFormData,
  ProvinceUpdateData,
  ProvincesListeResponse,
  StatistiquesProvinces,
} from '../../types/province';
import apiClient, { handleApiError, handleApiResponse } from '../api/axiosConfig';

/**
 * Service pour la gestion des provinces
 */
class ProvinceService {
  private readonly PUBLIC_PATH = '/api/provinces';
  private readonly ADMIN_PATH = '/api/admin/provinces';

  /**
   * Récupère la liste des provinces (Public)
   */
  async listerProvinces(
    filtres?: FiltresProvinces
  ): Promise<ApiResponse<ProvincesListeResponse> | ApiError> {
    try {
      const response = await apiClient.get(this.PUBLIC_PATH, {
        params: filtres,
      });
      return handleApiResponse<ProvincesListeResponse>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Récupère une province spécifique (Admin systeme)
   */
  async getProvince(id: number): Promise<ApiResponse<ProvinceDetaillee> | ApiError> {
    try {
      const response = await apiClient.get(`${this.ADMIN_PATH}/recupererProvince/${id}`);
      return handleApiResponse<ProvinceDetaillee>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Récupère les statistiques des provinces (Admin systeme)
   */
  async getStatistiques(): Promise<ApiResponse<StatistiquesProvinces> | ApiError> {
    try {
      const response = await apiClient.get(`${this.ADMIN_PATH}/statistiques`);
      return handleApiResponse<StatistiquesProvinces>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Crée une nouvelle province (Admin systeme)
   */
  async creerProvince(
    data: ProvinceFormData
  ): Promise<ApiResponse<ProvinceDetaillee> | ApiError> {
    try {
      const response = await apiClient.post(`${this.ADMIN_PATH}/ajoutProvince`, data);
      return handleApiResponse<ProvinceDetaillee>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Met à jour une province existante (Admin systeme)
   */
  async mettreAJourProvince(
    id: number,
    data: ProvinceUpdateData
  ): Promise<ApiResponse<ProvinceDetaillee> | ApiError> {
    try {
      const response = await apiClient.put(`${this.ADMIN_PATH}/miseAjourProvince/${id}`, data);
      return handleApiResponse<ProvinceDetaillee>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Supprime une province (Admin systeme)
   */
  async supprimerProvince(id: number): Promise<ApiResponse<null> | ApiError> {
    try {
      const response = await apiClient.delete(`${this.ADMIN_PATH}/supprimerProvince/${id}`);
      return handleApiResponse<null>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
}

// Exporter une instance unique du service
export const provinceService = new ProvinceService();
export default provinceService;
