import { ApiError, ApiResponse } from '../../types/api';
import {
  Compagnie,
  CompagnieDetaillee,
  CompagnieFormData,
  CompagniesListeResponse,
  CompagnieUpdateData,
  FiltresCompagnies,
  ModePaiementDetail,
  StatistiquesCompagnies,
} from '../../types/compagnie';
import apiClient, { handleApiError, handleApiResponse } from '../api/axiosConfig';

/**
 * Service pour la gestion des compagnies
 */
class CompagnieService {
  private readonly BASE_PATH = '/api/admin/compagnies';

  /**
   * Récupère la liste des compagnies (pour tous les types utilisateurs)
   */
  async listerCompagniesGenerique(
    filtres?: FiltresCompagnies
  ): Promise<ApiResponse<CompagniesListeResponse> | ApiError> {
    try {
      const response = await apiClient.get('/api/compagnies', {
        params: filtres,
      });
      return handleApiResponse<CompagniesListeResponse>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Récupère la liste des compagnies avec filtres et pagination (Admin)
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
   * Récupère les détails d'une compagnie (Public)
   */
  async getCompagniePublic(id: number): Promise<ApiResponse<CompagnieDetaillee> | ApiError> {
    try {
      const response = await apiClient.get(`/api/compagnies/${id}`);
      return handleApiResponse<CompagnieDetaillee>(response);
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
   * Récupère les statistiques du tableau de bord
   */
  async getTableauBord(): Promise<
    ApiResponse<{
      voitures: { disponibles: number; indisponibles: number; total: number };
      voyages: { actifs: number; inactifs: number; annules: number; total: number };
      chauffeurs: { actifs: number; inactifs: number; total: number };
    }> | ApiError
  > {
    try {
      const response = await apiClient.get('/api/adminCompagnie/tableau-bord');
      return handleApiResponse(response);
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
   * Active/désactive les modes VIP et/ou Premium d'une compagnie (super-admin)
   */
  async mettreAJourModes(
    id: number,
    modes: { mode_vip?: boolean; mode_premium?: boolean }
  ): Promise<ApiResponse<Compagnie> | ApiError> {
    try {
      const response = await apiClient.patch(`${this.BASE_PATH}/${id}/modes`, modes);
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
  /**
   * Met à jour uniquement les modes de paiement d'une compagnie
   */
  async updateModesPaiement(
    modes_paiement: (number | ModePaiementDetail)[]
  ): Promise<ApiResponse<CompagnieDetaillee> | ApiError> {
    try {
      const response = await apiClient.put('/api/adminCompagnie/update-paiements', {
        modes_paiement,
      });
      return handleApiResponse<CompagnieDetaillee>(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
}

// Exporter une instance unique du service
export const compagnieService = new CompagnieService();

/** Admin compagnie : informations publiques de SA compagnie. */
export const maCompagnieService = {
  async obtenir() {
    try {
      const response = await apiClient.get('/api/adminCompagnie/ma-compagnie');
      return { statut: true, data: response.data?.data || null };
    } catch (error: any) {
      return { statut: false, message: error.response?.data?.message || 'Impossible de charger les informations.', data: null };
    }
  },

  async mettreAJour(donnees: {
    comp_description?: string | null;
    comp_phone?: string | null;
    comp_email?: string | null;
    comp_adresse?: string | null;
    comp_localisation?: number | null;
    provinces_desservies?: number[];
  }) {
    try {
      const response = await apiClient.put('/api/adminCompagnie/ma-compagnie', donnees);
      return response.data;
    } catch (error: any) {
      const data = error.response?.data;
      const premiere = data?.errors ? (Object.values(data.errors)[0] as string[])?.[0] : null;
      return { statut: false, message: premiere || data?.message || 'Erreur réseau : rien n’a été enregistré.' };
    }
  },
};
export default compagnieService;

