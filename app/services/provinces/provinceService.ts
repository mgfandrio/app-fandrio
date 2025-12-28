import { ApiError, ApiResponse } from '../../types/api';
import {
  FiltresProvinces,
  Province,
  ProvinceDetaillee,
  ProvinceFormData,
  ProvincesListeResponse,
  ProvinceUpdateData,
  StatistiquesProvinces,
} from '../../types/province';
import apiClient, { handleApiError, handleApiResponse } from '../api/axiosConfig';

/**
 * Service pour la gestion des provinces
 */
class ProvinceService {
  private readonly BASE_PATH = '/api/admin/provinces';

  /**
   * Récupère la liste des provinces avec filtres et pagination
   */
  async listerProvinces(
    filtres?: FiltresProvinces
  ): Promise<ApiResponse<ProvincesListeResponse> | ApiError> {
    try {
      // Mapper les filtres frontend vers les paramètres backend
      const params: any = {};
      
      if (filtres?.recherche) {
        params.pro_nom = filtres.recherche;
      }
      
      if (filtres?.orientation) {
        params.pro_orientation = filtres.orientation;
      }
      
      if (filtres?.per_page) {
        params.per_page = filtres.per_page;
      }

      const response = await apiClient.get(`${this.BASE_PATH}/recuperListeProvince`, {
        params,
      });
      return handleApiResponse<ProvincesListeResponse>(response);
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

  /**
   * Récupère les orientations disponibles
   */
  async getOrientations(): Promise<ApiResponse<{ orientations: string[] }> | ApiError> {
    try {
      const response = await apiClient.get(`${this.BASE_PATH}/orientations`);
      return handleApiResponse<{ orientations: string[] }>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Récupère les détails d'une province
   */
  async getProvince(id: number): Promise<ApiResponse<ProvinceDetaillee> | ApiError> {
    try {
      const response = await apiClient.get(`${this.BASE_PATH}/recupererProvince/${id}`);
      return handleApiResponse<ProvinceDetaillee>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Crée une nouvelle province
   */
  async creerProvince(
    data: ProvinceFormData
  ): Promise<ApiResponse<Province> | ApiError> {
    try {
      const response = await apiClient.post(`${this.BASE_PATH}/ajoutProvince`, data);
      return handleApiResponse<Province>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Crée plusieurs provinces en une fois
   */
  async creerPlusieursProvinces(
    data: ProvinceFormData[]
  ): Promise<ApiResponse<Province[]> | ApiError> {
    try {
      const response = await apiClient.post(`${this.BASE_PATH}/AjoutPlusieursProvince`, {
        provinces: data,
      });
      return handleApiResponse<Province[]>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Met à jour une province
   */
  async mettreAJourProvince(
    id: number,
    data: ProvinceUpdateData
  ): Promise<ApiResponse<Province> | ApiError> {
    try {
      const response = await apiClient.put(`${this.BASE_PATH}/miseAjourProvince/${id}`, data);
      return handleApiResponse<Province>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Supprime une province
   */
  async supprimerProvince(id: number): Promise<ApiResponse<void> | ApiError> {
    try {
      const response = await apiClient.delete(`${this.BASE_PATH}/supprimerProvince/${id}`);
      return handleApiResponse<void>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Supprime plusieurs provinces
   */
  async supprimerPlusieursProvinces(
    ids: number[]
  ): Promise<ApiResponse<void> | ApiError> {
    try {
      const response = await apiClient.delete(`${this.BASE_PATH}/supprimerPlusieursProvince`, {
        data: { ids },
      });
      return handleApiResponse<void>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
}

// Exporter une instance unique du service
export const provinceService = new ProvinceService();
export default provinceService;

