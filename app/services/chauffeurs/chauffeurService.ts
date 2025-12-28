import { ApiResponse } from '@/app/types/api';
import { Chauffeur, CreateChauffeurDTO, UpdateChauffeurDTO } from '../../types/chauffeur';
import apiClient from '../api/axiosConfig';

class ChauffeurService {
  private readonly BASE_PATH = '/api/adminCompagnie/chauffeur';

  /**
   * Ajouter un nouveau chauffeur
   * POST /api/adminCompagnie/chauffeur/ajout
   */
  async ajouterChauffeur(data: CreateChauffeurDTO): Promise<ApiResponse<Chauffeur>> {
    try {
      const response = await apiClient.post<ApiResponse<Chauffeur>>(
        `${this.BASE_PATH}/ajout`,
        data,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  /**
   * Modifier un chauffeur existant
   * PUT/PATCH /api/adminCompagnie/chauffeur/modification/{id}
   */
  async modifierChauffeur(id: number, data: UpdateChauffeurDTO): Promise<ApiResponse<Chauffeur>> {
    try {
      const response = await apiClient.put<ApiResponse<Chauffeur>>(
        `${this.BASE_PATH}/modification/${id}`,
        data,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  /**
   * Récupérer la liste des chauffeurs
   * GET /api/adminCompagnie/chauffeur/liste
   */
  async obtenirListeChauffeurs(): Promise<ApiResponse<Chauffeur[]>> {
    try {
      const response = await apiClient.get<any>(
        `${this.BASE_PATH}/liste`
      );
      
      // Gérer différents formats de réponse possibles
      let chauffeurs: Chauffeur[] = [];
      
      if (response.data.data && Array.isArray(response.data.data)) {
        chauffeurs = response.data.data;
      } else if (Array.isArray(response.data.data?.chauffeurs)) {
        chauffeurs = response.data.data.chauffeurs;
      } else if (Array.isArray(response.data)) {
        chauffeurs = response.data;
      }
      
      return {
        statut: response.data.statut || true,
        message: response.data.message || 'Chauffeurs récupérés',
        data: chauffeurs
      };
    } catch (error: any) {
      console.error('Erreur lors du chargement de la liste des chauffeurs:', error);
      
      // Vérifier le statut et le message
      const status = error?.response?.status;
      const errorData = error?.response?.data;
      const errorMessage = errorData?.message || error?.message || '';
      
      // Accepter 404 ou message contenant "chauffeur"
      if (status === 404 || errorMessage.toLowerCase().includes('chauffeur')) {
        return {
          statut: true,
          message: 'Aucun chauffeur trouvé',
          data: []
        };
      }
      
      throw error.response?.data || error;
    }
  }

  /**
   * Récupérer un chauffeur par ID
   * GET /api/adminCompagnie/chauffeur/details/{id}
   */
  async obtenirChauffeur(id: number): Promise<ApiResponse<Chauffeur>> {
    try {
      const response = await apiClient.get<ApiResponse<Chauffeur>>(
        `${this.BASE_PATH}/details/${id}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Erreur lors du chargement du chauffeur:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Supprimer un chauffeur
   * PUT /api/adminCompagnie/chauffeur/suppression/{id}
   */
  async supprimerChauffeur(id: number): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.put<ApiResponse<any>>(
        `${this.BASE_PATH}/suppression/${id}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Erreur lors de la suppression du chauffeur:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Changer l'état d'un chauffeur
   * PUT /api/adminCompagnie/chauffeur/changement_etat/{id}
   */
  async changerEtatChauffeur(id: number): Promise<ApiResponse<Chauffeur>> {
    try {
      const response = await apiClient.put<ApiResponse<Chauffeur>>(
        `${this.BASE_PATH}/changement_etat/${id}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Erreur lors du changement d\'état du chauffeur:', error);
      throw error.response?.data || error;
    }
  }
}

export default new ChauffeurService();
