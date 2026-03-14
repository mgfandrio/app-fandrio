import { ApiResponse } from '../../types/api';
import { CreateVoitureDTO, UpdateVoitureDTO, Voiture } from '../../types/voiture';
import apiClient from '../api/axiosConfig';

class VoitureService {
  private readonly BASE_PATH = '/api/adminCompagnie/voiture';

  /**
   * Ajouter une nouvelle voiture
   * POST /api/adminCompagnie/voiture/ajout
   */
  async ajouterVoiture(data: CreateVoitureDTO): Promise<ApiResponse<Voiture>> {
    try {
      const response = await apiClient.post<ApiResponse<Voiture>>(
        `${this.BASE_PATH}/ajout`,
        data
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  /**
   * Modifier une voiture existante
   * PUT /api/adminCompagnie/voiture/modifier/{id}
   */
  async modifierVoiture(id: number, data: UpdateVoitureDTO): Promise<ApiResponse<Voiture>> {
    try {
      const response = await apiClient.put<ApiResponse<Voiture>>(
        `${this.BASE_PATH}/modification/${id}`,
        data
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  /**
   * Récupérer la liste des voitures
   * GET /api/adminCompagnie/voiture/liste
   */
  async obtenirListeVoitures(): Promise<ApiResponse<Voiture[]>> {
    try {
      const response = await apiClient.get<any>(
        `${this.BASE_PATH}/liste`
      );
      console.log('Réponse API voitures:', response.data);
      
      // Gérer différents formats de réponse possibles
      let voitures: Voiture[] = [];
      
      if (response.data.data && Array.isArray(response.data.data)) {
        voitures = response.data.data;
      } else if (Array.isArray(response.data.data?.voitures)) {
        voitures = response.data.data.voitures;
      } else if (Array.isArray(response.data)) {
        voitures = response.data;
      }
      
      return {
        statut: response.data.statut || true,
        message: response.data.message || 'Voitures récupérées',
        data: voitures
      };
    } catch (error: any) {
      console.error('Erreur lors du chargement de la liste des voitures:', error);
      
      // Vérifier le statut et le message
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      const errorMessage = errorData?.message || error?.message || '';
      
      // Accepter 404 ou message contenant "voiture"
      if (status === 404 || errorMessage.toLowerCase().includes('voiture')) {
        return {
          statut: true,
          message: 'Aucune voiture trouvée',
          data: []
        };
      }
      
      throw error.response?.data || error;
    }
  }

  /**
   * Récupérer une voiture par ID
   * GET /api/adminCompagnie/voiture/details/{id}
   */
  async obtenirVoiture(id: number): Promise<ApiResponse<Voiture>> {
    try {
      const response = await apiClient.get<ApiResponse<Voiture>>(
        `${this.BASE_PATH}/details/${id}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Erreur lors du chargement de la voiture:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Supprimer une voiture
   * DELETE /api/adminCompagnie/voiture/supprimer/{id}
   */
  async supprimerVoiture(id: number): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.delete<ApiResponse<any>>(
        `${this.BASE_PATH}/supprimer/${id}`
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  /**
   * Changer l'état d'une voiture
   * PUT /api/adminCompagnie/voiture/changerEtat/{id}
   */
  async changerEtatVoiture(id: number): Promise<ApiResponse<Voiture>> {
    try {
      const response = await apiClient.put<ApiResponse<Voiture>>(
        `${this.BASE_PATH}/changerEtat/${id}`
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }
}

export default new VoitureService();
