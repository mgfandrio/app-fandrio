import { ApiError, ApiResponse } from '../../types/api';
import {
  FiltresProvinces,
  ProvinceDetaillee,
  ProvincesListeResponse,
} from '../../types/province';
import apiClient, { handleApiError, handleApiResponse } from '../api/axiosConfig';

/**
 * Service pour la gestion des provinces
 */
class ProvinceService {
  private readonly BASE_PATH = '/api/provinces';

  /**
   * Récupère la liste des provinces (Public)
   */
  async listerProvinces(
    filtres?: FiltresProvinces
  ): Promise<ApiResponse<ProvincesListeResponse> | ApiError> {
    try {
      const response = await apiClient.get(this.BASE_PATH, {
        params: filtres,
      });
      return handleApiResponse<ProvincesListeResponse>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Récupère une province spécifique
   */
  async getProvince(id: number): Promise<ApiResponse<ProvinceDetaillee> | ApiError> {
    try {
      const response = await apiClient.get(`${this.BASE_PATH}/${id}`);
      return handleApiResponse<ProvinceDetaillee>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Récupère les statistiques des provinces
   */
  async getStatistiques(): Promise<ApiResponse<StatistiquesProvinces> | ApiError> {
    try {
      const response = await apiClient.get(`${this.BASE_PATH}/statistiques`);
      return handleApiResponse<StatistiquesProvinces>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
}

// Exporter une instance unique du service
export const provinceService = new ProvinceService();
export default provinceService;
